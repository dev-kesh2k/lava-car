// Regras do lava-car em funções puras (sem banco): placa, porte, preços, boxes, fidelidade,
// comissão, caixa e status. Testadas em test/rules.test.js; o frontend repete só o que mostra.

// ---------- Placa ----------
/** Só letras e números, maiúsculo, até 7 caracteres. */
export const normalizePlate = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
/** Padrão antigo (ABC1234) ou Mercosul (ABC1D23). */
export const isValidPlate = (v) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizePlate(v));
export const isMercosulPlate = (v) => /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(normalizePlate(v));
/** Exibição: Mercosul sem traço (ABC1D23), antiga com traço (ABC-1234). */
export function formatPlate(v) {
  const p = normalizePlate(v);
  if (!isValidPlate(p)) return p;
  return isMercosulPlate(p) ? p : `${p.slice(0, 3)}-${p.slice(3)}`;
}

// ---------- Porte ----------
export const SIZES = ['small', 'medium', 'large', 'pickup'];
export const SIZE_LABEL = { small: 'Pequeno/Hatch', medium: 'Médio/Sedan', large: 'Grande/SUV', pickup: 'Caminhonete' };

// ---------- Horários ----------
export const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};
export const fromMin = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// ---------- Preços ----------
/** Preço do serviço para o porte (null = não atende esse porte). */
export function priceFor(service, size) {
  const p = (service.prices || []).find((x) => x.size === size);
  return p ? p.priceCents : null;
}

/**
 * Orçamento: 1 serviço principal + adicionais (sem repetir), todos ativos e com preço para o porte.
 * Lança Error com mensagem para o cliente quando algo não vale.
 */
export function quote(services, size, mainId, addonIds = []) {
  if (!SIZES.includes(size)) throw new Error('Porte do veículo inválido');
  const byId = new Map(services.map((s) => [s.id, s]));
  const main = byId.get(mainId);
  if (!main || !main.active || main.kind !== 'main') throw new Error('Escolha um serviço principal');
  const ids = [...new Set((addonIds || []).filter((a) => a && a !== mainId))];
  const items = [];
  for (const s of [main, ...ids.map((id) => byId.get(id))]) {
    if (!s || !s.active) throw new Error('Algum serviço escolhido não está mais disponível');
    if (s !== main && s.kind !== 'addon') throw new Error('Escolha só um serviço principal');
    const price = priceFor(s, size);
    if (price === null) throw new Error(`${s.name} não está disponível para ${SIZE_LABEL[size]}`);
    items.push({ serviceId: s.id, kind: s.kind, name: s.name, priceCents: price, durationMin: s.durationMin });
  }
  return {
    items,
    totalCents: items.reduce((t, i) => t + i.priceCents, 0),
    durationMin: items.reduce((t, i) => t + i.durationMin, 0),
  };
}

// ---------- Boxes e agenda ----------
/** Status que ocupam um box no intervalo agendado (Pronto/Entregue já liberaram o box). */
export const BLOCKING = ['scheduled', 'waiting', 'washing', 'finishing'];

const overlaps = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;

/**
 * Primeiro box livre durante todo o intervalo [start, start + duração).
 * busy: [{ boxId, time, durationMin }] já filtrado pelo dia e pelos status que bloqueiam.
 */
export function freeBox(boxes, busy, time, durationMin) {
  const s = toMin(time);
  const e = s + durationMin;
  for (const box of boxes) {
    const clash = busy.some((b) => b.boxId === box.id && overlaps(s, e, toMin(b.time), toMin(b.time) + b.durationMin));
    if (!clash) return box;
  }
  return null;
}

/** Quantos boxes ficam livres no intervalo inteiro. */
export function freeBoxCount(boxes, busy, time, durationMin) {
  const s = toMin(time);
  const e = s + durationMin;
  return boxes.filter((box) => !busy.some((b) => b.boxId === box.id && overlaps(s, e, toMin(b.time), toMin(b.time) + b.durationMin))).length;
}

/**
 * Grade de horários do dia: começa na abertura, de `interval` em `interval` minutos, e o serviço
 * precisa terminar até o fechamento. Livre = algum box livre durante toda a duração.
 * nowMin: minutos de agora (só quando o dia é hoje) — horários que já passaram ficam indisponíveis.
 */
export function buildSlots({ day, interval = 30, durationMin, boxes, busy, nowMin = null, leadMin = 15 }) {
  if (!day?.open || durationMin <= 0 || interval <= 0) return [];
  const open = toMin(day.from);
  const close = toMin(day.to);
  const out = [];
  for (let m = open; m + durationMin <= close; m += interval) {
    const time = fromMin(m);
    const free = freeBoxCount(boxes, busy, time, durationMin);
    const past = nowMin !== null && m < nowMin + leadMin;
    out.push({ time, available: !past && free > 0, free: past ? 0 : free });
  }
  return out;
}

/**
 * Fila do balcão: primeiro horário a partir de `fromTime` (de 5 em 5 min, até 23:55) em que algum
 * box fica livre durante toda a duração. Devolve { time, box } ou null se não couber no dia.
 */
export function earliestSlot(boxes, busy, fromTime, durationMin) {
  const start = Math.ceil(toMin(fromTime) / 5) * 5;
  for (let m = start; m + durationMin <= 24 * 60; m += 5) {
    const box = freeBox(boxes, busy, fromMin(m), durationMin);
    if (box) return { time: fromMin(m), box };
  }
  return null;
}

// ---------- Status da OS ----------
export const FLOW = ['scheduled', 'waiting', 'washing', 'finishing', 'ready', 'delivered'];
export const STATUS_LABEL = {
  scheduled: 'Agendado',
  waiting: 'No pátio',
  washing: 'Lavando',
  finishing: 'Finalizando',
  ready: 'Pronto para retirada',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};
export const nextStatus = (s) => {
  const i = FLOW.indexOf(s);
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
};
export const prevStatus = (s) => {
  const i = FLOW.indexOf(s);
  return i > 0 ? FLOW[i - 1] : null;
};
/** Só anda uma etapa por vez (para frente ou para trás). */
export const canMove = (from, to) => to !== from && (nextStatus(from) === to || prevStatus(from) === to);
/** Barra de progresso do cliente: Agendado 0% → Pronto 100%. */
export function progress(status) {
  if (status === 'cancelled') return 0;
  const i = Math.min(FLOW.indexOf(status), 4);
  return i < 0 ? 0 : Math.round((i / 4) * 100);
}

// ---------- Fidelidade ----------
/** Carimba um selo: ao bater a meta, zera os selos e ganha 1 lavagem grátis. */
export function stamp(card, goal) {
  const g = Math.max(1, goal);
  let stamps = (card?.stamps || 0) + 1;
  let rewards = card?.rewards || 0;
  while (stamps >= g) {
    stamps -= g;
    rewards += 1;
  }
  return { stamps, rewards, totalWashes: (card?.totalWashes || 0) + 1 };
}

/** Lavagem grátis = o serviço principal sai de graça (os adicionais são cobrados). */
export function rewardDiscount(items) {
  const main = items.find((i) => i.kind === 'main');
  return main ? main.priceCents : 0;
}

// ---------- Comissão ----------
/** Comissão em centavos (arredondada). */
export const commissionOf = (grossCents, pct) => Math.round((grossCents * pct) / 100);

/** Fechamento por funcionário: OS prontas no período, valor (total - desconto) e comissão. */
export function commissionReport(team, orders) {
  return team
    .map((u) => {
      const mine = orders.filter((o) => o.employeeId === u.id);
      const gross = mine.reduce((t, o) => t + o.totalCents - o.discountCents, 0);
      return { id: u.id, name: u.name, commissionPct: u.commissionPct, count: mine.length, grossCents: gross, commissionCents: commissionOf(gross, u.commissionPct) };
    })
    .sort((a, b) => b.grossCents - a.grossCents || a.name.localeCompare(b.name));
}

// ---------- Caixa ----------
export const EXPENSE_CATEGORIES = ['Produtos (shampoo, cera...)', 'Água', 'Energia', 'Aluguel', 'Salários e comissões', 'Manutenção', 'Impostos', 'Outros'];

export function summarizeCash(entries) {
  let income = 0;
  let expense = 0;
  const cats = new Map();
  for (const e of entries) {
    if (e.type === 'income') income += e.amountCents;
    else expense += e.amountCents;
    const key = `${e.type}:${e.category}`;
    const c = cats.get(key) || { type: e.type, category: e.category, totalCents: 0 };
    c.totalCents += e.amountCents;
    cats.set(key, c);
  }
  return { incomeCents: income, expenseCents: expense, balanceCents: income - expense, byCategory: [...cats.values()].sort((a, b) => b.totalCents - a.totalCents) };
}

// ---------- WhatsApp ----------
export function readyMessage({ name, model, plate }) {
  // OS do balcão sem nome fica como "Cliente (45) 9…": aí a saudação vai sem nome.
  const first = /^Cliente\b/.test(String(name || '').trim()) ? '' : String(name || '').trim().split(/\s+/)[0];
  return `Olá${first ? ` ${first}` : ''}, seu ${String(model || '').trim() || 'carro'} placa ${formatPlate(plate)} já está limpo e pronto para retirada!`;
}
