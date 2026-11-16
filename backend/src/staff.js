// Rotas da equipe (admin e operador): pátio, OS avulsa no balcão, agenda, vistoria e pagamento.
import express from 'express';
import { prisma, HttpError, wrap, todayStr, isDay, addDays, text, mobile, oneOf, image, phoneKey, formatPhone } from './util.js';
import {
  loadServices,
  activeBoxes,
  daySlots,
  vehicleData,
  upsertVehicle,
  createOrder,
  checkWhen,
  orderInclude,
  serializeOrder,
  loadOrder,
  moveStatus,
  payOrder,
  unpayOrder,
  redeemReward,
  cancelOrder,
  loyaltyOf,
} from './orders.js';
import { quote, readyMessage } from './rules.js';
import { notifyClientWA } from './whatsapp.js';

export const staff = express.Router();

const PAY_METHODS = ['cash', 'pix', 'card'];

/** Dados para os formulários do balcão: serviços com preços, boxes e equipe (para escolher quem lava). */
staff.get('/catalog', wrap(async (_req, res) => {
  const [services, boxes, team] = await Promise.all([
    loadServices(),
    activeBoxes(),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } }),
  ]);
  res.json({ services, boxes, team });
}));

// ---------- Pátio (Kanban) ----------
staff.get('/yard', wrap(async (_req, res) => {
  const today = todayStr();
  const [inYard, arriving, deliveredToday] = await Promise.all([
    // Carros no pátio (de qualquer dia, até serem entregues).
    prisma.order.findMany({ where: { status: { in: ['waiting', 'washing', 'finishing', 'ready'] } }, include: orderInclude, orderBy: [{ date: 'asc' }, { time: 'asc' }] }),
    prisma.order.findMany({ where: { status: 'scheduled', date: { lte: today } }, include: orderInclude, orderBy: [{ date: 'asc' }, { time: 'asc' }] }),
    prisma.order.count({ where: { status: 'delivered', deliveredAt: { gte: new Date(Date.now() - 24 * 3600_000) } } }),
  ]);
  res.json({ today, orders: inYard.map(serializeOrder), arriving: arriving.map(serializeOrder), deliveredToday });
}));

// ---------- Agenda ----------
staff.get('/orders', wrap(async (req, res) => {
  const from = String(req.query.from || '');
  const to = String(req.query.to || from);
  if (!isDay(from) || !isDay(to) || to < from || to > addDays(from, 62)) throw new HttpError(400, 'Período inválido');
  const list = await prisma.order.findMany({ where: { date: { gte: from, lte: to } }, include: orderInclude, orderBy: [{ date: 'asc' }, { time: 'asc' }] });
  res.json({ orders: list.map(serializeOrder), today: todayStr() });
}));

staff.get('/orders/:id', wrap(async (req, res) => {
  const o = await loadOrder(req.params.id);
  const inspection = await prisma.inspection.findUnique({ where: { orderId: o.id } });
  res.json({ order: serializeOrder(o), inspection: inspection || { damages: [], notes: '' }, loyalty: o.phoneKey ? await loyaltyOf(o.phoneKey) : null });
}));

/** Horários livres para um agendamento feito pelo balcão (mesma regra do app). */
staff.get('/availability', wrap(async (req, res) => {
  const date = String(req.query.date || '');
  if (!isDay(date)) throw new HttpError(400, 'Data inválida');
  let q;
  try {
    q = quote(await loadServices(), String(req.query.size || ''), String(req.query.serviceId || ''), String(req.query.addons || '').split(',').filter(Boolean));
  } catch (e) {
    throw new HttpError(400, e.message);
  }
  res.json({ slots: await daySlots(date, q.durationMin), durationMin: q.durationMin });
}));

/**
 * OS pelo balcão. Sem data/hora = OS avulsa: o carro entra direto na fila do pátio ("No pátio")
 * no primeiro box que fica livre. Com data/hora = agendamento por telefone/WhatsApp.
 */
staff.post('/orders', wrap(async (req, res) => {
  const v = vehicleData(req.body);
  const clientName = text(req.body.clientName, 'Nome do cliente', { max: 100 });
  const rawPhone = text(req.body.clientPhone, 'Celular', { max: 30 });
  const key = rawPhone ? mobile(rawPhone).key : '';
  const notes = text(req.body.notes, 'Observações', { max: 500 });
  const scheduled = !!req.body.date;
  const date = scheduled ? String(req.body.date) : todayStr();
  const time = scheduled ? String(req.body.time || '') : '';
  if (scheduled) await checkWhen(date, time);
  if (scheduled && !key) throw new HttpError(400, 'Para agendar, informe o celular do cliente');
  const vehicle = await upsertVehicle(key, v);
  const created = await createOrder({
    vehicle,
    serviceId: req.body.serviceId,
    addonIds: req.body.addonIds,
    date,
    time,
    data: {
      origin: 'counter',
      phoneKey: key,
      clientName: clientName || (key ? `Cliente ${formatPhone(key)}` : ''),
      clientPhone: rawPhone,
      notes,
      status: scheduled ? 'scheduled' : 'waiting',
      arrivedAt: scheduled ? null : new Date(),
    },
  });
  if (key && clientName) await prisma.clientProfile.upsert({ where: { phoneKey: key }, update: {}, create: { phoneKey: key, name: clientName } });
  const order = await loadOrder(created.id);
  if (scheduled) notifyClientWA('confirmed', order);
  res.status(201).json({ order: serializeOrder(order) });
}));

staff.post('/orders/:id/status', wrap(async (req, res) => {
  const to = oneOf(req.body.status, 'Etapa', ['scheduled', 'waiting', 'washing', 'finishing', 'ready', 'delivered']);
  const { order, becameReady } = await moveStatus(req.params.id, to, { userId: req.user.id, employeeId: req.body.employeeId });
  if (becameReady) notifyClientWA('ready', order);
  if (to === 'delivered') notifyClientWA('delivered', order);
  res.json({
    order: serializeOrder(order),
    whatsappText: to === 'ready' ? readyMessage({ name: order.clientName, model: order.model, plate: order.plate }) : null,
  });
}));

/** Troca quem lavou (base da comissão). */
staff.put('/orders/:id/employee', wrap(async (req, res) => {
  const id = req.body.employeeId ? String(req.body.employeeId) : null;
  if (id && !(await prisma.user.findUnique({ where: { id } }))) throw new HttpError(400, 'Funcionário inválido');
  const o = await prisma.order.update({ where: { id: req.params.id }, data: { employeeId: id }, include: orderInclude });
  res.json({ order: serializeOrder(o) });
}));

staff.post('/orders/:id/pay', wrap(async (req, res) => {
  const method = oneOf(req.body.method || 'cash', 'Forma de pagamento', PAY_METHODS);
  res.json({ order: serializeOrder(await payOrder(req.params.id, method)) });
}));

staff.post('/orders/:id/unpay', wrap(async (req, res) => {
  if (req.user.role !== 'admin') throw new HttpError(403, 'Só o dono estorna pagamentos');
  res.json({ order: serializeOrder(await unpayOrder(req.params.id)) });
}));

staff.post('/orders/:id/redeem', wrap(async (req, res) => {
  res.json({ order: serializeOrder(await redeemReward(req.params.id)) });
}));

staff.post('/orders/:id/cancel', wrap(async (req, res) => {
  const reason = text(req.body.reason, 'Motivo', { max: 300 });
  const o = await cancelOrder(req.params.id, reason || 'Cancelado pela loja');
  notifyClientWA('cancelled', o);
  res.json({ order: serializeOrder(o) });
}));

// ---------- Vistoria de entrada ----------
const AREAS = ['frente', 'traseira', 'lateral_esq', 'lateral_dir', 'teto', 'interior', 'rodas', 'vidros'];
const DAMAGE_TYPES = ['risco', 'amassado', 'trinca', 'mancha', 'faltando', 'outro'];

staff.put('/orders/:id/inspection', wrap(async (req, res) => {
  const o = await loadOrder(req.params.id);
  const list = Array.isArray(req.body.damages) ? req.body.damages.slice(0, 30) : [];
  const damages = list.map((d) => ({
    area: oneOf(d?.area, 'Local da avaria', AREAS),
    type: oneOf(d?.type, 'Tipo de avaria', DAMAGE_TYPES),
    note: text(d?.note, 'Observação da avaria', { max: 200 }),
  }));
  const notes = text(req.body.notes, 'Observações da vistoria', { max: 1000 });
  const inspection = await prisma.inspection.upsert({ where: { orderId: o.id }, update: { damages, notes }, create: { orderId: o.id, damages, notes } });
  res.json({ inspection });
}));

staff.post('/orders/:id/photos', wrap(async (req, res) => {
  const o = await loadOrder(req.params.id);
  const { mime, data } = image(req.body.image);
  if (data.length > 1_500_000) throw new HttpError(413, 'Foto muito grande (máx. 1,5 MB)');
  if ((await prisma.inspectionPhoto.count({ where: { orderId: o.id } })) >= 4) throw new HttpError(400, 'Máximo de 4 fotos por vistoria');
  const photo = await prisma.inspectionPhoto.create({ data: { orderId: o.id, mime, data }, select: { id: true } });
  res.status(201).json({ photo });
}));

staff.delete('/photos/:id', wrap(async (req, res) => {
  await prisma.inspectionPhoto.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ---------- Busca rápida pelo celular ou placa (balcão) ----------
staff.get('/lookup', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const key = phoneKey(q);
  const plate = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const vehicles = await prisma.vehicle.findMany({
    where: { archived: false, OR: [...(key.length >= 10 ? [{ phoneKey: key }] : []), ...(plate.length >= 3 ? [{ plate: { startsWith: plate } }] : [])] },
    take: 10,
    orderBy: { updatedAt: 'desc' },
  });
  const profiles = await prisma.clientProfile.findMany({ where: { phoneKey: { in: [...new Set(vehicles.map((v) => v.phoneKey).filter(Boolean))] } } });
  const names = new Map(profiles.map((p) => [p.phoneKey, p.name]));
  res.json({ vehicles: vehicles.map((v) => ({ ...v, phone: v.phoneKey ? formatPhone(v.phoneKey) : '', clientName: names.get(v.phoneKey) || '' })) });
}));
