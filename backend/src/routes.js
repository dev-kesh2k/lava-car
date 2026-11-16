import express from 'express';
import bcrypt from 'bcryptjs';
import {
  prisma,
  HttpError,
  wrap,
  todayStr,
  nowTime,
  isDay,
  signToken,
  isStaffRequest,
  publicUser,
  requireAuth,
  requireStaff,
  tooManyAttempts,
  recordFailure,
  clearFailures,
  text,
  email,
  password,
  phone,
  int,
  oneOf,
  mobile,
  phoneKey,
  formatPhone,
  limitLookup,
  getSettings,
  getPublicSettings,
  notifyAdmins,
  CANCELABLE,
  STAFF_ROLES,
  brl,
  shortDate,
} from './util.js';
// Clientes não têm conta: agendam e acompanham pelo celular. Só a equipe (admin/operador) faz login.
import {
  loadServices,
  daySlots,
  vehicleData,
  upsertVehicle,
  createOrder,
  checkWhen,
  orderInclude,
  clientView,
  orderForPhone,
  loyaltyOf,
} from './orders.js';
import { quote, SIZES } from './rules.js';
import { admin } from './admin.js';
import { staff } from './staff.js';
import { social } from './social.js';
import { notifyClientWA, notifyStudioWA } from './whatsapp.js';

export const api = express.Router();

api.get('/health', wrap(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true, db: 'up' });
}));

api.get('/config', wrap(async (_req, res) => {
  const [pub, s, boxes] = await Promise.all([getPublicSettings(), getSettings(), prisma.box.count({ where: { active: true } })]);
  res.json({ ...pub, slotIntervalMin: s.slotIntervalMin, loyaltyGoal: s.loyaltyGoal, pixEnabled: s.pixEnabled, schedule: s.schedule, boxes, today: todayStr(), now: nowTime() });
}));

// Logo da loja (pública; a URL leva ?v=<versão>).
api.get('/logo', wrap(async (_req, res) => {
  const row = await prisma.setting.findUnique({ where: { key: 'logo' } });
  const m = row && /^data:([\w/+.-]+);base64,(.+)$/.exec(row.value);
  if (!m) throw new HttpError(404, 'Sem logo');
  res.set('Content-Type', m[1]).set('Cache-Control', 'public, max-age=31536000, immutable').send(Buffer.from(m[2], 'base64'));
}));

// ---------- Serviços (públicos, com a matriz de preços por porte) ----------
api.get('/services', wrap(async (_req, res) => {
  const services = await loadServices();
  res.json({ services, sizes: SIZES });
}));

/** Horários do dia para os serviços escolhidos e o porte (duração = principal + adicionais). */
api.get('/availability', wrap(async (req, res) => {
  const date = String(req.query.date || '');
  if (!isDay(date)) throw new HttpError(400, 'Data inválida');
  const size = String(req.query.size || '');
  const addons = String(req.query.addons || '').split(',').filter(Boolean);
  let q;
  try {
    q = quote(await loadServices(), size, String(req.query.serviceId || ''), addons);
  } catch (e) {
    throw new HttpError(400, e.message);
  }
  res.json({ date, durationMin: q.durationMin, slots: await daySlots(date, q.durationMin) });
}));

// ---------- Garagem do cliente (identificado pelo celular) ----------
api.get('/vehicles', wrap(async (req, res) => {
  limitLookup(`veh:${req.ip}`);
  const { key } = mobile(req.query.phone);
  const vehicles = await prisma.vehicle.findMany({ where: { phoneKey: key, archived: false }, orderBy: { updatedAt: 'desc' } });
  res.json({ vehicles });
}));

api.post('/vehicles', wrap(async (req, res) => {
  limitLookup(`veh:${req.ip}`);
  const { key } = mobile(req.body.phone);
  if ((await prisma.vehicle.count({ where: { phoneKey: key, archived: false } })) >= 10) throw new HttpError(400, 'Limite de 10 carros na garagem');
  const vehicle = await upsertVehicle(key, vehicleData(req.body));
  res.status(201).json({ vehicle });
}));

async function vehicleOf(id, rawPhone) {
  const key = phoneKey(rawPhone);
  const v = await prisma.vehicle.findUnique({ where: { id: String(id) } });
  if (!v || key.length < 10 || v.phoneKey !== key || v.archived) throw new HttpError(404, 'Carro não encontrado na sua garagem');
  return v;
}

api.put('/vehicles/:id', wrap(async (req, res) => {
  const v = await vehicleOf(req.params.id, req.body.phone);
  const data = vehicleData(req.body);
  if (data.plate !== v.plate && (await prisma.vehicle.findUnique({ where: { phoneKey_plate: { phoneKey: v.phoneKey, plate: data.plate } } }))) {
    throw new HttpError(409, 'Essa placa já está na sua garagem');
  }
  res.json({ vehicle: await prisma.vehicle.update({ where: { id: v.id }, data }) });
}));

/** Tira da garagem (as OS antigas continuam com os dados do carro). */
api.delete('/vehicles/:id', wrap(async (req, res) => {
  const v = await vehicleOf(req.params.id, req.body?.phone ?? req.query.phone);
  await prisma.vehicle.update({ where: { id: v.id }, data: { archived: true } });
  res.json({ ok: true });
}));

// ---------- Agendamento pelo app ----------
api.post('/orders', wrap(async (req, res) => {
  limitLookup(`book:${req.ip}`, 20);
  const { raw, key } = mobile(req.body.phone);
  const name = text(req.body.name, 'Nome', { required: true, max: 100 });
  const notes = text(req.body.notes, 'Observações', { max: 500 });
  // Por enquanto só "pagar no local". Pix antecipado: integrar o gateway aqui (criar a cobrança e
  // devolver o QR Code) e ligar pixEnabled; o webhook do gateway chama payOrder() de orders.js.
  const method = oneOf(req.body.paymentMethod || 'onsite', 'Forma de pagamento', ['onsite', 'pix']);
  if (method === 'pix' && !(await getSettings()).pixEnabled) throw new HttpError(400, 'Pagamento por Pix ainda não está disponível. Escolha pagar no local.');
  const vehicle = await vehicleOf(req.body.vehicleId, raw);
  const date = String(req.body.date || '');
  const time = String(req.body.time || '');
  await checkWhen(date, time);
  const created = await createOrder({
    vehicle,
    serviceId: req.body.serviceId,
    addonIds: req.body.addonIds,
    date,
    time,
    data: { origin: 'app', phoneKey: key, clientName: name, clientPhone: raw, notes, paymentMethod: method, status: 'scheduled' },
  });
  await prisma.clientProfile.upsert({ where: { phoneKey: key }, update: {}, create: { phoneKey: key, name } });
  const order = await prisma.order.findUnique({ where: { id: created.id }, include: orderInclude });
  const summary = `${name} · ${order.items.map((i) => i.name).join(' + ')} · ${order.model || order.plate} · ${shortDate(order.date)}, ${order.time}`;
  await notifyAdmins('Novo agendamento', summary, '/admin/agenda');
  notifyStudioWA('studio_booking', `novo agendamento: ${summary} (${brl(order.totalCents)}). Celular ${formatPhone(key)}.`);
  notifyClientWA('confirmed', order);
  res.status(201).json({ order: clientView(order) });
}));

api.get('/orders/by-phone', wrap(async (req, res) => {
  limitLookup(`list:${req.ip}`);
  const { key } = mobile(req.query.phone);
  const list = await prisma.order.findMany({ where: { phoneKey: key }, include: orderInclude, orderBy: [{ date: 'desc' }, { time: 'desc' }], take: 100 });
  res.json({ orders: list.map(clientView), today: todayStr(), now: nowTime() });
}));

// Acompanhamento ao vivo: a tela do cliente consulta a cada 10 s.
api.get('/orders/:id', wrap(async (req, res) => {
  limitLookup(`get:${req.ip}`, 400);
  const o = await orderForPhone(req.params.id, req.query.phone);
  res.json({ order: clientView(o), loyalty: await loyaltyOf(o.phoneKey) });
}));

api.post('/orders/:id/cancel', wrap(async (req, res) => {
  const o = await orderForPhone(req.params.id, req.body.phone);
  if (!CANCELABLE.includes(o.status)) throw new HttpError(400, 'O carro já está no pátio: fale com a loja para cancelar');
  if (o.date < todayStr()) throw new HttpError(400, 'Esse agendamento já passou');
  const reason = text(req.body.reason, 'Motivo', { max: 300 });
  await prisma.$transaction(async (tx) => {
    if (o.rewardUsed) await tx.loyaltyCard.update({ where: { phoneKey: o.phoneKey }, data: { rewards: { increment: 1 } } });
    await tx.order.update({ where: { id: o.id }, data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason || 'Cancelado pelo cliente', rewardUsed: false, discountCents: 0 } });
  });
  const summary = `${o.clientName} · ${o.model || o.plate} · ${shortDate(o.date)}, ${o.time}`;
  await notifyAdmins('Agendamento cancelado pelo cliente', summary, '/admin/agenda');
  notifyStudioWA('studio_cancel', `o cliente cancelou: ${summary}${reason ? ` (motivo: ${reason})` : ''}.`);
  res.json({ ok: true });
}));

api.post('/orders/:id/review', wrap(async (req, res) => {
  const o = await orderForPhone(req.params.id, req.body.phone);
  if (!['ready', 'delivered'].includes(o.status)) throw new HttpError(400, 'Avalie depois que o carro ficar pronto');
  if (o.review) throw new HttpError(409, 'Você já avaliou esta lavagem');
  const rating = int(req.body.rating, 'Nota', { min: 1, max: 5 });
  const comment = text(req.body.comment, 'Comentário', { max: 500 });
  await prisma.review.create({ data: { orderId: o.id, rating, comment } });
  await notifyAdmins(`Nova avaliação: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`, `${o.clientName} · ${o.model || o.plate}${comment ? ` · "${comment}"` : ''}`, '/admin/feedback');
  // Quem gostou (4 ou 5 estrelas) é convidado a avaliar também no Google.
  const { googleReviewUrl } = await getSettings();
  res.status(201).json({ ok: true, googleReviewUrl: rating >= 4 && googleReviewUrl ? googleReviewUrl : null });
}));

// ---------- Cartão fidelidade ----------
api.get('/loyalty', wrap(async (req, res) => {
  limitLookup(`loy:${req.ip}`);
  const { key } = mobile(req.query.phone);
  res.json({ loyalty: await loyaltyOf(key) });
}));

// ---------- Fotos da vistoria: a equipe (token) ou o dono da OS (?phone=) ----------
api.get('/inspection-photos/:id', wrap(async (req, res) => {
  const p = await prisma.inspectionPhoto.findUnique({ where: { id: req.params.id }, omit: { data: false }, include: { order: { select: { phoneKey: true } } } });
  if (!p) throw new HttpError(404, 'Foto não encontrada');
  const key = phoneKey(req.query.phone);
  const ok = (await isStaffRequest(req)) || (key.length >= 10 && key === p.order.phoneKey);
  if (!ok) throw new HttpError(404, 'Foto não encontrada');
  res.set('Content-Type', p.mime).set('Cache-Control', 'private, max-age=86400').send(Buffer.from(p.data));
}));

// Perfil/avatar do cliente e feedback (públicos).
api.use(social);

// ---------- Login da equipe (dono e operadores) ----------
api.post('/auth/login', wrap(async (req, res) => {
  const login = email(req.body.login ?? req.body.email);
  const pass = typeof req.body.password === 'string' ? req.body.password : '';
  if (!pass) throw new HttpError(400, 'Informe a senha');
  const key = `${req.ip}:${login}`;
  if (tooManyAttempts(key)) throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos.');
  const user = await prisma.user.findUnique({ where: { email: login } });
  if (!user || !user.active || !STAFF_ROLES.includes(user.role) || !(await bcrypt.compare(pass, user.passwordHash))) {
    recordFailure(key);
    throw new HttpError(401, 'E-mail ou senha incorretos');
  }
  clearFailures(key);
  res.json({ token: signToken(user), user: publicUser(user) });
}));

api.use(requireAuth);

api.get('/auth/me', wrap(async (req, res) => {
  const unread = await prisma.notification.count({ where: { userId: req.user.id, read: false } });
  res.json({ user: publicUser(req.user), unread });
}));

api.put('/me', wrap(async (req, res) => {
  const name = text(req.body.name, 'Nome', { required: true, max: 100 });
  const mail = email(req.body.email);
  const tel = phone(req.body.phone);
  if (mail !== req.user.email && (await prisma.user.findUnique({ where: { email: mail } }))) {
    throw new HttpError(409, 'Esse e-mail já está em uso');
  }
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { name, email: mail, phone: tel } });
  res.json({ user: publicUser(user) });
}));

api.put('/me/password', wrap(async (req, res) => {
  const current = typeof req.body.current === 'string' ? req.body.current : '';
  const next = password(req.body.password);
  if (!(await bcrypt.compare(current, req.user.passwordHash))) throw new HttpError(400, 'Senha atual incorreta');
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  res.json({ ok: true });
}));

// ---------- Notificações da equipe ----------
api.get('/notifications', wrap(async (req, res) => {
  const list = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json({ notifications: list });
}));

api.post('/notifications/read-all', wrap(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
  res.json({ ok: true });
}));

// Pátio, balcão e agenda: admin e operador. Financeiro, equipe, preços e configurações: só o admin.
api.use('/staff', requireStaff, staff);
api.use('/admin', admin);
