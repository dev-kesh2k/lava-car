// Regras de agendamento/OS compartilhadas entre o cliente e a equipe (com banco).
import { prisma, HttpError, getSettings, todayStr, nowTime, isDay, addDays, weekday, text, phoneKey } from './util.js';
import {
  BLOCKING,
  buildSlots,
  freeBox,
  earliestSlot,
  quote,
  isValidPlate,
  normalizePlate,
  SIZES,
  canMove,
  stamp,
  rewardDiscount,
  toMin,
} from './rules.js';

// ---------- Catálogo ----------
export async function loadServices({ onlyActive = true } = {}) {
  return prisma.service.findMany({
    where: onlyActive ? { active: true } : undefined,
    include: { prices: { select: { size: true, priceCents: true } } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

export const activeBoxes = () => prisma.box.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });

/** OS do dia que ainda ocupam box (para a grade de horários e a trava). */
async function busyOf(db, date, excludeId) {
  return db.order.findMany({
    where: { date, status: { in: BLOCKING }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { boxId: true, time: true, durationMin: true },
  });
}

/** Horários do dia para a duração, marcando os sem box livre. */
export async function daySlots(date, durationMin) {
  const today = todayStr();
  const s = await getSettings();
  if (date < today || date > addDays(today, 60)) return [];
  const [boxes, busy] = await Promise.all([activeBoxes(), busyOf(prisma, date)]);
  return buildSlots({
    day: s.schedule[weekday(date)],
    interval: s.slotIntervalMin,
    durationMin,
    boxes,
    busy,
    nowMin: date === today ? toMin(nowTime()) : null,
  });
}

// ---------- Veículo ----------
export function vehicleData(body) {
  const plate = normalizePlate(body.plate);
  if (!isValidPlate(plate)) throw new HttpError(400, 'Placa inválida: use o padrão ABC-1234 ou Mercosul ABC1D23');
  if (!SIZES.includes(body.size)) throw new HttpError(400, 'Escolha o porte do veículo');
  return {
    plate,
    model: text(body.model, 'Modelo', { max: 60 }),
    color: text(body.color, 'Cor', { max: 30 }),
    size: body.size,
  };
}

/** Cria ou atualiza o carro da garagem (celular + placa). */
export async function upsertVehicle(key, data) {
  return prisma.vehicle.upsert({
    where: { phoneKey_plate: { phoneKey: key, plate: data.plate } },
    update: { ...data, model: data.model || undefined, color: data.color || undefined, archived: false },
    create: { phoneKey: key, ...data },
  });
}

// ---------- Criação da OS ----------
/**
 * Calcula o orçamento e cria a OS numa transação com trava do dia: dois clientes não pegam o último
 * box ao mesmo tempo. Com `time` = horário escolhido (o box tem de estar livre a duração toda);
 * sem `time` = fila do balcão (primeiro box livre a partir de agora).
 */
export async function createOrder({ vehicle, serviceId, addonIds, date, time, data }) {
  const services = await loadServices({ onlyActive: false });
  let q;
  try {
    q = quote(services, vehicle.size, String(serviceId || ''), Array.isArray(addonIds) ? addonIds.map(String) : []);
  } catch (e) {
    throw new HttpError(400, e.message);
  }
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${`lava-car:${date}`}))) AS l`;
    const boxes = await tx.box.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    if (!boxes.length) throw new HttpError(409, 'Nenhum box de lavagem ativo. Cadastre em Equipe → Boxes.');
    const busy = await busyOf(tx, date);
    let slot;
    if (time) {
      const box = freeBox(boxes, busy, time, q.durationMin);
      if (!box) throw new HttpError(409, 'Esse horário acabou de lotar. Escolha outro.');
      slot = { time, box };
    } else {
      slot = earliestSlot(boxes, busy, nowTime(), q.durationMin) || { time: nowTime(), box: null };
    }
    return tx.order.create({
      data: {
        ...data,
        vehicleId: vehicle.id,
        plate: vehicle.plate,
        model: vehicle.model,
        color: vehicle.color,
        size: vehicle.size,
        date,
        time: slot.time,
        boxId: slot.box?.id || null,
        durationMin: q.durationMin,
        totalCents: q.totalCents,
        items: { create: q.items.map((i) => ({ serviceId: i.serviceId, kind: i.kind, name: i.name, priceCents: i.priceCents, durationMin: i.durationMin })) },
      },
    });
  });
}

/** Valida data/horário de um agendamento pelo app. */
export async function checkWhen(date, time) {
  if (!isDay(date)) throw new HttpError(400, 'Data inválida');
  if (!/^\d{2}:\d{2}$/.test(String(time || ''))) throw new HttpError(400, 'Escolha um horário');
  const today = todayStr();
  if (date < today) throw new HttpError(400, 'Não é possível agendar em datas passadas');
  if (date > addDays(today, 60)) throw new HttpError(400, 'Agende com no máximo 60 dias de antecedência');
  const s = await getSettings();
  const day = s.schedule[weekday(date)];
  if (!day.open) throw new HttpError(400, 'O lava-car não abre nesse dia');
  if (toMin(time) < toMin(day.from) || toMin(time) >= toMin(day.to)) throw new HttpError(400, 'Fora do horário de funcionamento');
  if (date === today && toMin(time) <= toMin(nowTime())) throw new HttpError(400, 'Esse horário já passou');
  return day;
}

// ---------- Leitura ----------
export const orderInclude = {
  items: { select: { id: true, serviceId: true, kind: true, name: true, priceCents: true, durationMin: true } },
  box: { select: { id: true, name: true } },
  employee: { select: { id: true, name: true } },
  review: { select: { rating: true, comment: true } },
  photos: { select: { id: true }, orderBy: { createdAt: 'asc' } },
};

export function serializeOrder(o) {
  const { photos, ...rest } = o;
  return { ...rest, photos: (photos || []).map((p) => p.id), dueCents: Math.max(0, o.totalCents - o.discountCents) };
}

/** Visão do cliente: sem dados internos (funcionário). */
export function clientView(o) {
  const { employee, employeeId, ...rest } = serializeOrder(o);
  return rest;
}

export async function loadOrder(id) {
  const o = await prisma.order.findUnique({ where: { id: String(id) }, include: orderInclude });
  if (!o) throw new HttpError(404, 'OS não encontrada');
  return o;
}

/** OS cujo celular confere com o informado. */
export async function orderForPhone(id, rawPhone) {
  const key = phoneKey(rawPhone);
  if (key.length < 10) throw new HttpError(400, 'Informe o celular usado no agendamento');
  const o = await prisma.order.findUnique({ where: { id: String(id) }, include: orderInclude });
  if (!o || o.phoneKey !== key) throw new HttpError(404, 'Agendamento não encontrado para esse celular');
  return o;
}

// ---------- Fidelidade ----------
export async function loyaltyOf(key) {
  const goal = (await getSettings()).loyaltyGoal;
  const card = key ? await prisma.loyaltyCard.findUnique({ where: { phoneKey: key } }) : null;
  const stamps = Math.min(card?.stamps || 0, goal);
  return { goal, stamps, rewards: card?.rewards || 0, totalWashes: card?.totalWashes || 0, remaining: goal - stamps };
}

// ---------- Mudança de status ----------
/**
 * Avança/volta uma etapa. Lavando: grava o início e o responsável (quem começou a lavar, ou o escolhido).
 * Pronto (1ª vez): carimba o selo de fidelidade do celular. Entregue: grava a entrega.
 * Devolve { order, becameReady }.
 */
export async function moveStatus(id, to, { userId, employeeId } = {}) {
  return prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: String(id) } });
    if (!o) throw new HttpError(404, 'OS não encontrada');
    if (o.status === 'cancelled') throw new HttpError(400, 'OS cancelada não muda de status');
    if (!canMove(o.status, to)) throw new HttpError(400, 'Avance ou volte uma etapa por vez');
    const now = new Date();
    const data = { status: to };
    if (to === 'waiting' && !o.arrivedAt) data.arrivedAt = now;
    if (to === 'washing') {
      data.startedAt = o.startedAt || now;
      if (employeeId) {
        const u = await tx.user.findUnique({ where: { id: String(employeeId) } });
        if (!u || !u.active) throw new HttpError(400, 'Funcionário inválido');
        data.employeeId = u.id;
      } else if (!o.employeeId && userId) data.employeeId = userId;
    }
    let becameReady = false;
    if (to === 'ready') {
      data.finishedAt = o.finishedAt || now;
      data.finishedDay = o.finishedDay || todayStr();
      if (!o.stampedAt && !o.rewardUsed && o.phoneKey) {
        const goal = (await getSettings()).loyaltyGoal;
        const card = await tx.loyaltyCard.findUnique({ where: { phoneKey: o.phoneKey } });
        const next = stamp(card, goal);
        await tx.loyaltyCard.upsert({ where: { phoneKey: o.phoneKey }, update: next, create: { phoneKey: o.phoneKey, ...next } });
        data.stampedAt = now;
      }
      becameReady = !o.readyNotified;
      if (becameReady) data.readyNotified = true;
    }
    if (to === 'delivered') data.deliveredAt = now;
    const order = await tx.order.update({ where: { id: o.id }, data, include: orderInclude });
    return { order, becameReady };
  });
}

/** Registra o pagamento (gera a entrada no caixa). */
export async function payOrder(id, method) {
  return prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: String(id) } });
    if (!o) throw new HttpError(404, 'OS não encontrada');
    if (o.status === 'cancelled') throw new HttpError(400, 'OS cancelada');
    if (o.paymentStatus === 'paid') throw new HttpError(400, 'Essa OS já está paga');
    const due = Math.max(0, o.totalCents - o.discountCents);
    await tx.order.update({ where: { id: o.id }, data: { paymentStatus: 'paid', paidMethod: method, paidAt: new Date() } });
    if (due > 0) {
      await tx.cashEntry.create({
        data: { type: 'income', category: 'Serviços', description: `OS ${o.number} · ${o.plate}`, amountCents: due, method, day: todayStr(), orderId: o.id },
      });
    }
    return tx.order.findUnique({ where: { id: o.id }, include: orderInclude });
  });
}

/** Estorna o pagamento (remove a entrada automática do caixa). */
export async function unpayOrder(id) {
  return prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: String(id) } });
    if (!o || o.paymentStatus !== 'paid') throw new HttpError(400, 'Essa OS não está paga');
    await tx.cashEntry.deleteMany({ where: { orderId: o.id, type: 'income' } });
    return tx.order.update({ where: { id: o.id }, data: { paymentStatus: 'pending', paidMethod: '', paidAt: null }, include: orderInclude });
  });
}

/** Usa a lavagem grátis do cartão fidelidade nesta OS (o serviço principal sai de graça). */
export async function redeemReward(id) {
  return prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: String(id) }, include: { items: true } });
    if (!o) throw new HttpError(404, 'OS não encontrada');
    if (!o.phoneKey) throw new HttpError(400, 'OS sem celular do cliente: não tem cartão fidelidade');
    if (o.rewardUsed) throw new HttpError(400, 'Essa OS já usou a lavagem grátis');
    if (o.paymentStatus === 'paid' || o.status === 'cancelled') throw new HttpError(400, 'Só OS em aberto e não paga');
    const card = await tx.loyaltyCard.findUnique({ where: { phoneKey: o.phoneKey } });
    if (!card || card.rewards < 1) throw new HttpError(400, 'O cliente não tem lavagem grátis disponível');
    await tx.loyaltyCard.update({ where: { phoneKey: o.phoneKey }, data: { rewards: { decrement: 1 } } });
    return tx.order.update({ where: { id: o.id }, data: { rewardUsed: true, discountCents: rewardDiscount(o.items) }, include: orderInclude });
  });
}

export async function cancelOrder(id, reason) {
  const o = await prisma.order.findUnique({ where: { id: String(id) } });
  if (!o) throw new HttpError(404, 'OS não encontrada');
  if (['delivered', 'cancelled'].includes(o.status)) throw new HttpError(400, 'Essa OS não pode ser cancelada');
  if (o.paymentStatus === 'paid') throw new HttpError(400, 'Estorne o pagamento antes de cancelar');
  return prisma.$transaction(async (tx) => {
    if (o.rewardUsed) await tx.loyaltyCard.update({ where: { phoneKey: o.phoneKey }, data: { rewards: { increment: 1 } } }).catch(() => undefined);
    return tx.order.update({
      where: { id: o.id },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason, rewardUsed: false, discountCents: 0 },
      include: orderInclude,
    });
  });
}

