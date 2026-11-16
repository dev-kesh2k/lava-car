import express from 'express';
import bcrypt from 'bcryptjs';
import {
  prisma,
  HttpError,
  wrap,
  requireAdmin,
  todayStr,
  isDay,
  isMonth,
  addDays,
  weekStart,
  monthRange,
  text,
  email,
  password,
  phone,
  mobile,
  int,
  oneOf,
  image,
  getSettings,
  checkSchedule,
  url,
  formatPhone,
} from './util.js';
import { isConfigured, sendWhatsApp, bridgeConfigured, bridgeStatus, WA_EVENTS } from './whatsapp.js';
import { loadServices, loyaltyOf } from './orders.js';
import { SIZES, commissionReport, summarizeCash, EXPENSE_CATEGORIES } from './rules.js';

// Só o dono (admin): painel gerencial, equipe e boxes, serviços e preços, comissões, caixa e configurações.
export const admin = express.Router();
admin.use(requireAdmin);

const sumIncome = async (where) => (await prisma.cashEntry.aggregate({ where: { type: 'income', ...where }, _sum: { amountCents: true } }))._sum.amountCents || 0;
const WASHED = ['ready', 'delivered'];

// ---------- Painel gerencial ----------
admin.get('/dashboard', wrap(async (req, res) => {
  const today = todayStr();
  const month = isMonth(req.query.month) ? req.query.month : today.slice(0, 7);
  const { from, to } = monthRange(month);
  const [revenueToday, revenueMonth, washedToday, washedMonth, paidMonth, settings, unread, feedbackUnread, yard, scheduledToday] = await Promise.all([
    sumIncome({ day: today }),
    sumIncome({ day: { gte: from, lte: to } }),
    prisma.order.count({ where: { status: { in: WASHED }, finishedDay: today } }),
    prisma.order.findMany({ where: { status: { in: WASHED }, finishedDay: { gte: from, lte: to } }, select: { id: true, finishedDay: true } }),
    prisma.cashEntry.findMany({ where: { type: 'income', orderId: { not: null }, day: { gte: from, lte: to } }, select: { amountCents: true, day: true } }),
    getSettings(),
    prisma.notification.count({ where: { userId: req.user.id, read: false } }),
    prisma.feedback.count({ where: { read: false } }),
    prisma.order.groupBy({ by: ['status'], where: { status: { in: ['waiting', 'washing', 'finishing', 'ready'] } }, _count: { _all: true } }),
    prisma.order.count({ where: { status: 'scheduled', date: today } }),
  ]);
  const items = await prisma.orderItem.groupBy({
    by: ['name'],
    where: { orderId: { in: washedMonth.map((o) => o.id) } },
    _count: { _all: true },
    _sum: { priceCents: true },
  });
  const top = items
    .map((i) => ({ name: i.name, qty: i._count._all, revenueCents: i._sum.priceCents || 0 }))
    .sort((a, b) => b.qty - a.qty || b.revenueCents - a.revenueCents)
    .slice(0, 5);
  const days = [];
  for (let d = from; d <= to && d <= today; d = addDays(d, 1)) {
    days.push({ day: d, revenueCents: paidMonth.filter((p) => p.day === d).reduce((s, p) => s + p.amountCents, 0), cars: washedMonth.filter((o) => o.finishedDay === d).length });
  }
  res.json({
    today,
    month,
    studioName: settings.studioName,
    revenueToday,
    revenueMonth,
    washedToday,
    washedMonth: washedMonth.length,
    avgTicket: paidMonth.length ? Math.round(paidMonth.reduce((s, p) => s + p.amountCents, 0) / paidMonth.length) : 0,
    paidCount: paidMonth.length,
    top,
    days,
    yard: Object.fromEntries(yard.map((y) => [y.status, y._count._all])),
    scheduledToday,
    unread,
    feedbackUnread,
  });
}));

// ---------- Equipe ----------
const teamView = (u) => {
  const { passwordHash, ...rest } = u;
  return rest;
};

admin.get('/team', wrap(async (_req, res) => {
  const [users, boxes] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
    prisma.box.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
  ]);
  res.json({ team: users.map(teamView), boxes });
}));

function memberData(body) {
  return {
    name: text(body.name, 'Nome', { required: true, max: 80 }),
    email: email(body.email),
    phone: phone(body.phone),
    role: oneOf(body.role || 'operator', 'Papel', ['admin', 'operator']),
    commissionPct: int(body.commissionPct ?? 0, 'Comissão (%)', { min: 0, max: 100 }),
    active: body.active !== false,
  };
}

admin.post('/team', wrap(async (req, res) => {
  const data = memberData(req.body);
  if (await prisma.user.findUnique({ where: { email: data.email } })) throw new HttpError(409, 'Esse e-mail já está em uso');
  const user = await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password(req.body.password), 10) } });
  res.status(201).json({ member: teamView(user) });
}));

admin.put('/team/:id', wrap(async (req, res) => {
  const data = memberData(req.body);
  const cur = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!cur) throw new HttpError(404, 'Funcionário não encontrado');
  if (cur.id === req.user.id && (data.role !== 'admin' || !data.active)) throw new HttpError(400, 'Você não pode tirar o seu próprio acesso de dono');
  if (data.email !== cur.email && (await prisma.user.findUnique({ where: { email: data.email } }))) throw new HttpError(409, 'Esse e-mail já está em uso');
  const extra = req.body.password ? { passwordHash: await bcrypt.hash(password(req.body.password), 10) } : {};
  const user = await prisma.user.update({ where: { id: cur.id }, data: { ...data, ...extra } });
  res.json({ member: teamView(user) });
}));

// ---------- Boxes de lavagem ----------
admin.post('/boxes', wrap(async (req, res) => {
  const name = text(req.body.name, 'Nome do box', { required: true, max: 40 });
  const max = await prisma.box.aggregate({ _max: { sortOrder: true } });
  res.status(201).json({ box: await prisma.box.create({ data: { name, sortOrder: (max._max.sortOrder ?? 0) + 1 } }) });
}));

admin.put('/boxes/:id', wrap(async (req, res) => {
  const name = text(req.body.name, 'Nome do box', { required: true, max: 40 });
  const active = req.body.active !== false;
  if (!active) {
    const upcoming = await prisma.order.count({ where: { boxId: req.params.id, status: 'scheduled', date: { gte: todayStr() } } });
    if (upcoming) throw new HttpError(409, `Esse box tem ${upcoming} agendamento(s) futuro(s). Remarque antes de desativar.`);
  }
  res.json({ box: await prisma.box.update({ where: { id: req.params.id }, data: { name, active } }) });
}));

admin.delete('/boxes/:id', wrap(async (req, res) => {
  if (await prisma.order.count({ where: { boxId: req.params.id } })) throw new HttpError(409, 'Box com histórico de OS. Desative em vez de excluir.');
  await prisma.box.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ---------- Serviços e matriz de preços ----------
const ICONS = ['droplet', 'sparkles', 'car', 'armchair', 'spray', 'circle', 'star', 'shield'];

admin.get('/services', wrap(async (_req, res) => {
  res.json({ services: await loadServices({ onlyActive: false }), icons: ICONS, sizes: SIZES });
}));

function serviceData(body) {
  const prices = [];
  for (const size of SIZES) {
    const v = body.prices?.[size];
    if (v === null || v === undefined || v === '') continue;
    prices.push({ size, priceCents: int(v, 'Preço', { min: 0, max: 10_000_000 }) });
  }
  if (!prices.length) throw new HttpError(400, 'Informe o preço de pelo menos um porte');
  return {
    data: {
      name: text(body.name, 'Nome', { required: true, max: 60 }),
      description: text(body.description, 'Descrição', { max: 300 }),
      kind: oneOf(body.kind || 'main', 'Tipo', ['main', 'addon']),
      durationMin: int(body.durationMin, 'Duração', { min: 5, max: 600 }),
      icon: ICONS.includes(body.icon) ? body.icon : 'droplet',
      active: body.active !== false,
    },
    prices,
  };
}

admin.post('/services', wrap(async (req, res) => {
  const { data, prices } = serviceData(req.body);
  const max = await prisma.service.aggregate({ _max: { sortOrder: true } });
  const service = await prisma.service.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1, prices: { create: prices } }, include: { prices: true } });
  res.status(201).json({ service });
}));

admin.put('/services/:id', wrap(async (req, res) => {
  const { data, prices } = serviceData(req.body);
  const service = await prisma.$transaction(async (tx) => {
    await tx.servicePrice.deleteMany({ where: { serviceId: req.params.id } });
    return tx.service.update({ where: { id: req.params.id }, data: { ...data, prices: { create: prices } }, include: { prices: true } });
  });
  res.json({ service });
}));

admin.patch('/services/:id/active', wrap(async (req, res) => {
  res.json({ service: await prisma.service.update({ where: { id: req.params.id }, data: { active: req.body.active === true } }) });
}));

admin.delete('/services/:id', wrap(async (req, res) => {
  if (await prisma.orderItem.count({ where: { serviceId: req.params.id } })) throw new HttpError(409, 'Serviço com OS no histórico. Desative em vez de excluir.');
  await prisma.service.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ---------- Comissões (fechamento semanal, segunda a domingo) ----------
admin.get('/commissions', wrap(async (req, res) => {
  const ref = isDay(req.query.week) ? req.query.week : todayStr();
  const from = weekStart(ref);
  const to = addDays(from, 6);
  const [team, orders] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.order.findMany({
      where: { status: { in: WASHED }, finishedDay: { gte: from, lte: to } },
      select: { id: true, number: true, employeeId: true, totalCents: true, discountCents: true, plate: true, model: true, finishedDay: true },
    }),
  ]);
  const rows = commissionReport(team, orders).filter((r) => r.count > 0 || team.find((u) => u.id === r.id)?.active);
  res.json({
    from,
    to,
    rows,
    unassigned: orders.filter((o) => !o.employeeId).length,
    totals: rows.reduce((t, r) => ({ count: t.count + r.count, grossCents: t.grossCents + r.grossCents, commissionCents: t.commissionCents + r.commissionCents }), { count: 0, grossCents: 0, commissionCents: 0 }),
  });
}));

// ---------- Fluxo de caixa ----------
admin.get('/cash', wrap(async (req, res) => {
  const month = isMonth(req.query.month) ? req.query.month : todayStr().slice(0, 7);
  const { from, to } = monthRange(month);
  const entries = await prisma.cashEntry.findMany({ where: { day: { gte: from, lte: to } }, orderBy: [{ day: 'desc' }, { createdAt: 'desc' }] });
  const pending = await prisma.order.aggregate({
    where: { paymentStatus: 'pending', status: { in: ['waiting', 'washing', 'finishing', 'ready', 'delivered'] } },
    _sum: { totalCents: true, discountCents: true },
    _count: { _all: true },
  });
  res.json({
    month,
    entries,
    summary: summarizeCash(entries),
    categories: EXPENSE_CATEGORIES,
    pendingCents: (pending._sum.totalCents || 0) - (pending._sum.discountCents || 0),
    pendingCount: pending._count._all,
  });
}));

admin.post('/cash', wrap(async (req, res) => {
  const type = oneOf(req.body.type || 'expense', 'Tipo', ['income', 'expense']);
  const day = isDay(req.body.day) ? req.body.day : todayStr();
  const entry = await prisma.cashEntry.create({
    data: {
      type,
      category: text(req.body.category, 'Categoria', { required: true, max: 60 }),
      description: text(req.body.description, 'Descrição', { max: 200 }),
      amountCents: int(req.body.amountCents, 'Valor', { min: 1, max: 100_000_000 }),
      day,
    },
  });
  res.status(201).json({ entry });
}));

admin.delete('/cash/:id', wrap(async (req, res) => {
  const e = await prisma.cashEntry.findUnique({ where: { id: req.params.id } });
  if (!e) throw new HttpError(404, 'Lançamento não encontrado');
  if (e.orderId) throw new HttpError(400, 'Entrada automática de OS: estorne o pagamento na OS');
  await prisma.cashEntry.delete({ where: { id: e.id } });
  res.json({ ok: true });
}));

// ---------- Cartão fidelidade (consulta e ajuste manual) ----------
admin.get('/loyalty', wrap(async (req, res) => {
  const { key } = mobile(req.query.phone);
  res.json({ loyalty: await loyaltyOf(key), phone: formatPhone(key) });
}));

/** Resgate avulso (fora de uma OS): tira 1 lavagem grátis do cartão. */
admin.post('/loyalty/redeem', wrap(async (req, res) => {
  const { key } = mobile(req.body.phone);
  const card = await prisma.loyaltyCard.findUnique({ where: { phoneKey: key } });
  if (!card || card.rewards < 1) throw new HttpError(400, 'Sem lavagem grátis disponível');
  await prisma.loyaltyCard.update({ where: { phoneKey: key }, data: { rewards: { decrement: 1 } } });
  res.json({ loyalty: await loyaltyOf(key) });
}));

// ---------- Configurações ----------
async function settingsView() {
  const s = await getSettings();
  return { ...s, waBridge: bridgeConfigured(), waConfigured: isConfigured(s) };
}

admin.get('/settings', wrap(async (_req, res) => {
  res.json({ settings: await settingsView() });
}));

const handle = (v) => text(v, 'Rede social', { max: 120 }).replace(/^@/, '');
// Validação de cada campo; só os campos enviados são gravados.
const SETTING_FIELDS = {
  studioName: (v) => text(v, 'Nome do lava-car', { required: true, max: 60 }),
  slotIntervalMin: (v) => String(oneOf(Number(v), 'Intervalo da agenda', [10, 15, 20, 30, 60])),
  loyaltyGoal: (v) => String(int(v, 'Meta do cartão fidelidade', { min: 2, max: 50 })),
  phone: (v) => phone(v),
  whatsapp: (v) => phone(v),
  address: (v) => text(v, 'Endereço', { max: 200 }),
  hours: (v) => text(v, 'Observação do horário', { max: 300 }),
  schedule: (v) => checkSchedule(v),
  about: (v) => text(v, 'Sobre a loja', { max: 3000 }),
  instagram: handle,
  facebook: (v) => url(v, 'Facebook'),
  tiktok: handle,
  youtube: (v) => url(v, 'YouTube'),
  website: (v) => url(v, 'Site'),
  googleReviewUrl: (v) => url(v, 'Link de avaliação do Google'),
  appUrl: (v) => url(v, 'Endereço do app'),
  waEnabled: (v) => String(v === true || v === 'true'),
  waEvents: (v) => {
    const list = (Array.isArray(v) ? v : String(v || '').split(',')).map(String);
    return WA_EVENTS.filter((e) => list.includes(e)).join(',');
  },
  waNotifyStudio: (v) => String(v === true || v === 'true'),
};

admin.post('/logo', wrap(async (req, res) => {
  const { mime, data } = image(req.body.image);
  if (data.length > 600_000) throw new HttpError(413, 'Logo muito grande (máx. 600 KB)');
  const cur = Number((await prisma.setting.findUnique({ where: { key: 'logoVersion' } }))?.value) || 0;
  const version = String(cur + 1);
  await prisma.$transaction([
    prisma.setting.upsert({ where: { key: 'logo' }, update: { value: `data:${mime};base64,${data.toString('base64')}` }, create: { key: 'logo', value: `data:${mime};base64,${data.toString('base64')}` } }),
    prisma.setting.upsert({ where: { key: 'logoVersion' }, update: { value: version }, create: { key: 'logoVersion', value: version } }),
  ]);
  res.json({ logoVersion: Number(version) });
}));

admin.delete('/logo', wrap(async (_req, res) => {
  await prisma.setting.deleteMany({ where: { key: { in: ['logo', 'logoVersion'] } } });
  res.json({ logoVersion: 0 });
}));

admin.put('/settings', wrap(async (req, res) => {
  const values = {};
  for (const [key, fn] of Object.entries(SETTING_FIELDS)) if (key in req.body) values[key] = fn(req.body[key]);
  if (values.waEnabled === 'true' && !bridgeConfigured()) {
    throw new HttpError(400, 'A ponte do WhatsApp não está configurada no servidor (WHATSAPP_BRIDGE_URL e BRIDGE_SECRET)');
  }
  await prisma.$transaction(
    Object.entries(values).map(([key, value]) => prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })),
  );
  res.json({ settings: await settingsView() });
}));

// ---------- WhatsApp: teste e histórico ----------
admin.post('/whatsapp/test', wrap(async (req, res) => {
  const s = await getSettings();
  if (!bridgeConfigured()) throw new HttpError(400, 'A ponte do WhatsApp não está configurada no servidor');
  const to = req.body.to ? phone(req.body.to) : s.whatsapp;
  if (!to) throw new HttpError(400, 'Informe o número para o teste');
  const r = await sendWhatsApp(to, `Teste do ${s.studioName}: os avisos pelo WhatsApp estão funcionando.`, 'test', s, { force: true });
  if (!r.ok) throw new HttpError(422, `A ponte do WhatsApp recusou: ${r.error}`);
  res.json({ ok: true, to: r.to });
}));

/** Situação da ponte (GET /health da bridge): configurada, no ar e com o WhatsApp conectado. */
admin.get('/whatsapp/status', wrap(async (_req, res) => {
  res.json(await bridgeStatus());
}));

admin.get('/whatsapp/log', wrap(async (_req, res) => {
  res.json({ log: await prisma.whatsAppLog.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }) });
}));

// ---------- Feedback e avaliações dos clientes ----------
admin.get('/feedback', wrap(async (_req, res) => {
  const [feedback, reviews] = await Promise.all([
    prisma.feedback.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        order: { select: { number: true, clientName: true, clientPhone: true, date: true, model: true, plate: true, items: { select: { name: true } } } },
      },
    }),
  ]);
  const avg = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : null;
  res.json({
    feedback: feedback.map((f) => ({ ...f, phone: f.phoneKey ? formatPhone(f.phoneKey) : '' })),
    reviews,
    stats: { reviews: reviews.length, average: avg, unreadFeedback: feedback.filter((f) => !f.read).length },
  });
}));

admin.patch('/feedback/:id', wrap(async (req, res) => {
  await prisma.feedback.update({ where: { id: req.params.id }, data: { read: req.body.read !== false } });
  res.json({ ok: true });
}));

admin.delete('/feedback/:id', wrap(async (req, res) => {
  await prisma.feedback.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));
