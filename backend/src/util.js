import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// O Postgres do Hub é compartilhado (max_connections baixo): limita o pool deste app.
function dbUrl() {
  const raw = process.env.DATABASE_URL || '';
  try {
    const u = new URL(raw);
    const max = Number(process.env.DB_POOL_SIZE) || 3;
    const current = Number(u.searchParams.get('connection_limit')) || Infinity;
    u.searchParams.set('connection_limit', String(Math.min(current, max)));
    return u.toString();
  } catch {
    return raw;
  }
}

// Imagens (bytes) só são lidas pelas rotas de imagem: ficam fora de todas as outras consultas.
export const prisma = new PrismaClient({ datasources: { db: { url: dbUrl() } }, omit: { clientProfile: { avatar: true }, inspectionPhoto: { data: true } } });

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- Datas no fuso da loja ----------
export const TZ = process.env.TZ || 'America/Sao_Paulo';

/** Dia (YYYY-MM-DD) no fuso da loja. */
export function todayStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Hora atual (HH:MM) no fuso da loja. */
export function nowTime(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

export const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const isMonth = (s) => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

export function addDays(day, n) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo ... 6 = sábado */
export const weekday = (day) => new Date(`${day}T12:00:00Z`).getUTCDay();

/** Segunda-feira da semana de `day`. */
export const weekStart = (day) => addDays(day, -((weekday(day) + 6) % 7));

export function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  const from = `${month}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { from, to: addDays(next, -1) };
}

export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// ---------- Horário de funcionamento ----------
const HHMM = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
/** Padrão: segunda a sexta 08:00–18:00, sábado 08:00–13:00, domingo fechado. Índice = dia da semana (0 = domingo). */
export const DEFAULT_SCHEDULE = Array.from({ length: 7 }, (_, d) => ({ open: d !== 0, from: '08:00', to: d === 6 ? '13:00' : '18:00' }));
/** Lê o JSON salvo; qualquer coisa inválida volta ao padrão. */
export function parseSchedule(raw) {
  try {
    const a = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(a) || a.length !== 7) return DEFAULT_SCHEDULE;
    return a.map((d) => ({ open: !!d?.open, from: HHMM.test(d?.from) ? d.from : '08:00', to: HHMM.test(d?.to) ? d.to : '18:00' }));
  } catch {
    return DEFAULT_SCHEDULE;
  }
}
/** Valida o que o admin enviou (7 dias, abre antes de fechar). */
export function checkSchedule(v) {
  const a = typeof v === 'string' ? JSON.parse(v) : v;
  if (!Array.isArray(a) || a.length !== 7) throw new HttpError(400, 'Horário de funcionamento inválido');
  const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const out = a.map((d, i) => {
    const day = { open: !!d?.open, from: String(d?.from || '08:00'), to: String(d?.to || '18:00') };
    if (!day.open) {
      // Dia fechado: os horários não importam; mantém valores válidos.
      if (!HHMM.test(day.from)) day.from = '08:00';
      if (!HHMM.test(day.to)) day.to = '18:00';
      return day;
    }
    if (!HHMM.test(day.from) || !HHMM.test(day.to)) throw new HttpError(400, `Informe abertura e fechamento de ${names[i]}`);
    if (toMin(day.from) >= toMin(day.to)) throw new HttpError(400, `Em ${names[i]}, o fechamento precisa ser depois da abertura`);
    return day;
  });
  return JSON.stringify(out);
}
/** OS que o cliente ainda pode cancelar. */
export const CANCELABLE = ['scheduled'];
/** OS em andamento (ainda não entregue nem cancelada). */
export const OPEN_STATUSES = ['scheduled', 'waiting', 'washing', 'finishing', 'ready'];

// ---------- Autenticação ----------
const SECRET = process.env.JWT_SECRET || '';
if (!SECRET) console.warn('JWT_SECRET não definido: usando segredo temporário (sessões caem ao reiniciar).');
const KEY = SECRET || crypto.randomBytes(32).toString('hex');

export const signToken = (user) => jwt.sign({ sub: user.id }, KEY, { expiresIn: '30d' });

export const STAFF_ROLES = ['admin', 'operator'];

/** true se o header Authorization traz o token de alguém da equipe (admin ou operador). */
export async function isStaffRequest(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return false;
  try {
    const { sub } = jwt.verify(h.slice(7), KEY);
    const u = await prisma.user.findUnique({ where: { id: sub }, select: { role: true, active: true } });
    return !!u?.active && STAFF_ROLES.includes(u.role);
  } catch {
    return false;
  }
}

export function publicUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const { sub } = jwt.verify(token, KEY);
    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user || !user.active) return res.status(401).json({ error: 'Sessão inválida' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada' });
  }
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') return next(new HttpError(403, 'Apenas o dono (administrador)'));
  next();
}

export function requireStaff(req, _res, next) {
  if (!STAFF_ROLES.includes(req.user?.role)) return next(new HttpError(403, 'Apenas a equipe'));
  next();
}

// Limite simples de tentativas de login por IP+login (memória do processo).
const attempts = new Map();
const WINDOW = 15 * 60_000;
export function tooManyAttempts(key) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < WINDOW);
  attempts.set(key, list);
  return list.length >= 10;
}
export function recordFailure(key) {
  const list = attempts.get(key) || [];
  list.push(Date.now());
  attempts.set(key, list);
}
export const clearFailures = (key) => attempts.delete(key);

// ---------- Validação ----------
/** Mesmo critério da antiga regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/, sem retrocesso: um só @, sem espaços e um ponto no meio do domínio. */
function isEmail(s) {
  if (/\s/.test(s)) return false;
  const at = s.indexOf('@');
  if (at < 1 || at !== s.lastIndexOf('@')) return false;
  const domain = s.slice(at + 1);
  const dot = domain.indexOf('.', 1);
  return dot !== -1 && dot < domain.length - 1;
}

/** Tira as barras do fim (substitui .replace(/\/+$/, ''), que tem retrocesso). */
export function trimTrailingSlashes(s) {
  let end = s.length;
  while (end > 0 && s[end - 1] === '/') end--;
  return s.slice(0, end);
}

export function text(v, field, { max = 200, required = false } = {}) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) throw new HttpError(400, `${field} é obrigatório`);
  if (s.length > max) throw new HttpError(400, `${field} deve ter no máximo ${max} caracteres`);
  return s;
}

export function email(v, { required = true } = {}) {
  const s = text(v, 'E-mail', { max: 160, required }).toLowerCase();
  if (s && !isEmail(s)) throw new HttpError(400, 'E-mail inválido');
  return s;
}

export function password(v) {
  if (typeof v !== 'string' || v.length < 8) throw new HttpError(400, 'A senha deve ter pelo menos 8 caracteres');
  if (v.length > 200) throw new HttpError(400, 'Senha muito longa');
  return v;
}

export const digits = (s) => String(s || '').replace(/\D/g, '');

export function phone(v, { required = false } = {}) {
  const s = text(v, 'Telefone', { max: 30, required });
  if (s && !/^[+\d\s().-]{8,30}$/.test(s)) throw new HttpError(400, 'Telefone inválido');
  return s;
}

/** Celular normalizado (DDD + número, sem o 55): chave para o cliente encontrar seus agendamentos. */
export function phoneKey(v) {
  let d = digits(v);
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d;
}

export function mobile(v) {
  const raw = text(v, 'Celular', { required: true, max: 30 });
  const key = phoneKey(raw);
  if (key.length < 10 || key.length > 11) throw new HttpError(400, 'Informe o celular com DDD (ex.: 11 91234-5678)');
  return { raw, key };
}

/** Formata a chave para exibição: (11) 91234-5678 */
export const formatPhone = (key) =>
  key.length === 11 ? `(${key.slice(0, 2)}) ${key.slice(2, 7)}-${key.slice(7)}` : key.length === 10 ? `(${key.slice(0, 2)}) ${key.slice(2, 6)}-${key.slice(6)}` : key;

// Limite por IP para consultas pelo celular (evita varredura de números).
const lookups = new Map();
export function limitLookup(ip, max = 60) {
  const now = Date.now();
  const list = (lookups.get(ip) || []).filter((t) => now - t < WINDOW);
  if (list.length >= max) throw new HttpError(429, 'Muitas consultas. Aguarde alguns minutos.');
  list.push(now);
  lookups.set(ip, list);
}

export function int(v, field, { min = 0, max = 1_000_000_000 } = {}) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isInteger(n)) throw new HttpError(400, `${field} inválido`);
  if (n < min || n > max) throw new HttpError(400, `${field} deve estar entre ${min} e ${max}`);
  return n;
}

export function oneOf(v, field, list) {
  if (!list.includes(v)) throw new HttpError(400, `${field} inválido`);
  return v;
}

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
/** Decodifica uma imagem em data URL (já reduzida no navegador). */
export function image(v) {
  const m = typeof v === 'string' ? /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(v) : null;
  if (!m || !IMAGE_MIMES.includes(m[1])) throw new HttpError(400, 'Imagem inválida (use JPG, PNG ou WebP)');
  const data = Buffer.from(m[2], 'base64');
  if (data.length > 2_500_000) throw new HttpError(413, 'Imagem muito grande (máx. 2,5 MB)');
  return { mime: m[1], data };
}


// ---------- Configurações da loja ----------
/** Visíveis para o cliente (GET /config). */
export const PUBLIC_SETTINGS = {
  studioName: "Lava Car",
  slotIntervalMin: '30',
  loyaltyGoal: '10',
  // Pix antecipado: preparado, mas desligado até integrar um gateway (Mercado Pago/Asaas) em POST /api/orders.
  pixEnabled: 'false',
  phone: '',
  whatsapp: '',
  address: '',
  hours: '',
  logoVersion: '0',
  schedule: JSON.stringify(DEFAULT_SCHEDULE),
  about: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  youtube: '',
  website: '',
  googleReviewUrl: '',
};

/** Só da loja: avisos automáticos pela ponte de WhatsApp do servidor (WHATSAPP_BRIDGE_URL/BRIDGE_SECRET no ambiente). */
export const PRIVATE_SETTINGS = {
  appUrl: '',
  waEnabled: 'false',
  waEvents: 'confirmed,arrived,washing,finishing,ready,delivered,cancelled,reminder',
  waNotifyStudio: 'true',
};

export const SETTING_DEFAULTS = { ...PUBLIC_SETTINGS, ...PRIVATE_SETTINGS };

export async function getSettings() {
  // A imagem da logo fica na linha "logo" e não deve ser lida a cada consulta.
  const rows = await prisma.setting.findMany({ where: { key: { not: 'logo' } } });
  const s = { ...SETTING_DEFAULTS };
  for (const r of rows) if (r.key in s) s[r.key] = r.value;
  return {
    ...s,
    slotIntervalMin: [10, 15, 20, 30, 60].includes(Number(s.slotIntervalMin)) ? Number(s.slotIntervalMin) : 30,
    loyaltyGoal: Math.min(50, Math.max(2, Number(s.loyaltyGoal) || 10)),
    pixEnabled: false, // sem gateway integrado o Pix fica sempre desligado
    logoVersion: Number(s.logoVersion) || 0,
    schedule: parseSchedule(s.schedule),
  };
}

export async function getPublicSettings() {
  const s = await getSettings();
  return Object.fromEntries(Object.keys(PUBLIC_SETTINGS).map((k) => [k, s[k]]));
}

/** Link http(s) opcional. */
export function url(v, field) {
  const s = text(v, field, { max: 300 });
  if (s && !/^https?:\/\/[^\s]+$/i.test(s)) throw new HttpError(400, `${field}: informe um link começando com https://`);
  return s;
}

export async function notify(userIds, title, body = '', link = '') {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  await prisma.notification.createMany({ data: ids.map((userId) => ({ userId, title, body, link })) });
}

export async function notifyAdmins(title, body = '', link = '') {
  const admins = await prisma.user.findMany({ where: { role: { in: STAFF_ROLES }, active: true }, select: { id: true } });
  await notify(admins.map((a) => a.id), title, body, link);
}

export const brl = (cents) => `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const shortDate = (day) => {
  const [, m, d] = day.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};
