// Avisos automáticos pelo WhatsApp usando a ponte do servidor (WAHA + bridge FastAPI do Hub).
// O app só fala com a ponte: POST ${WHATSAPP_BRIDGE_URL}/send/text com o header X-Bridge-Secret.
// Sem WHATSAPP_BRIDGE_URL/BRIDGE_SECRET no ambiente, nada é enviado (o botão wa.me continua funcionando).
import { prisma, getSettings, todayStr, nowTime, addDays, phoneKey, brl, shortDate } from './util.js';
import { formatPlate, readyMessage } from './rules.js';

const BRIDGE_URL = () => String(process.env.WHATSAPP_BRIDGE_URL || '').replace(/\/+$/, '');
const BRIDGE_SECRET = () => String(process.env.BRIDGE_SECRET || '');
const TIMEOUT = 10_000;

/** A ponte está declarada no ambiente do container? */
export const bridgeConfigured = () => !!BRIDGE_URL() && !!BRIDGE_SECRET();

/** Eventos que o dono pode ligar/desligar em Configurações → WhatsApp. */
export const WA_EVENTS = ['confirmed', 'arrived', 'washing', 'finishing', 'ready', 'delivered', 'cancelled', 'reminder'];

/** Evento de WhatsApp de cada etapa do pátio (só quando a OS avança). */
export const STATUS_EVENT = { waiting: 'arrived', washing: 'washing', finishing: 'finishing', ready: 'ready', delivered: 'delivered' };
const FLOW = ['scheduled', 'waiting', 'washing', 'finishing', 'ready', 'delivered'];

/** Evento a avisar ao mudar de etapa: só avanço (voltar uma etapa não manda mensagem). */
export function statusEvent(from, to) {
  return FLOW.indexOf(to) > FLOW.indexOf(from) ? STATUS_EVENT[to] || null : null;
}
export const eventsOf = (s) => String(s.waEvents ?? WA_EVENTS.join(',')).split(',').filter((e) => WA_EVENTS.includes(e));

/** Avisos automáticos ligados e ponte configurada. */
export const isConfigured = (s) => s.waEnabled === 'true' && bridgeConfigured();

/** Número no formato internacional (só dígitos, com 55). */
export function waNumber(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length >= 12) return d;
  const key = phoneKey(d);
  return key.length >= 10 ? `55${key}` : '';
}

/**
 * Variações do número para tentar. Muitos celulares (ex.: DDD 45) estão no WhatsApp SEM o 9 da frente:
 * a ponte não tem checagem de existência, então tenta com o 9 e, se der erro de número, sem o 9.
 * 55 + DDD + 9 + 8 dígitos (13) → [com 9, sem 9]; qualquer outro formato → só ele.
 */
export function numberVariants(raw) {
  const n = waNumber(raw);
  if (!n) return [];
  if (n.length === 13 && n.startsWith('55') && n[4] === '9') return [n, `${n.slice(0, 4)}${n.slice(5)}`];
  return [n];
}

// Variação que já funcionou para cada número (evita repetir a tentativa que falha).
const knownGood = new Map();

/** Erro que não adianta tentar outra variação do número (secret errado, ponte/WAHA fora do ar, corpo inválido). */
const fatal = (status) => [401, 403, 422, 503].includes(status);

async function log(to, event, text, status, error = '') {
  await prisma.whatsAppLog.create({ data: { to, event, text: text.slice(0, 1000), status, error: error.slice(0, 500) } }).catch(() => undefined);
}

async function bridgeFetch(path, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(`${BRIDGE_URL()}${path}`, { ...init, signal: ctrl.signal, headers: { 'X-Bridge-Secret': BRIDGE_SECRET(), ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { detail: e?.name === 'AbortError' ? 'Tempo esgotado ao falar com a ponte do WhatsApp' : `Ponte do WhatsApp inacessível: ${e?.message || e}` } };
  } finally {
    clearTimeout(timer);
  }
}

const detailOf = (r) => {
  const d = r.data?.detail;
  return (typeof d === 'string' ? d : d ? JSON.stringify(d) : '') || `HTTP ${r.status}`;
};

/** Situação da ponte (GET /health): { configured, reachable, connected }. */
export async function bridgeStatus() {
  if (!bridgeConfigured()) return { configured: false, reachable: false, connected: false };
  const r = await bridgeFetch('/health');
  return { configured: true, reachable: r.ok, connected: r.ok && r.data?.waha_connected === true, error: r.ok ? '' : detailOf(r) };
}

/**
 * Envia um texto pela ponte. `force` ignora a chave de ligar/desligar (usado no "Enviar teste").
 * Nunca lança: o resultado vai para o histórico (WhatsAppLog).
 */
export async function sendWhatsApp(toRaw, text, event, settings, { force = false } = {}) {
  const s = settings || (await getSettings());
  if (!bridgeConfigured()) return { ok: false, error: 'Ponte do WhatsApp não configurada no servidor' };
  if (!force && s.waEnabled !== 'true') return { ok: false, error: 'Avisos pelo WhatsApp desligados' };
  const variants = numberVariants(toRaw);
  if (!variants.length) {
    await log(String(toRaw || ''), event, text, 'failed', 'Número inválido');
    return { ok: false, error: 'Número inválido' };
  }
  const known = knownGood.get(variants[0]);
  const order = known ? [known, ...variants.filter((v) => v !== known)] : variants;
  let last = { ok: false, error: '' };
  for (const to of order) {
    const r = await bridgeFetch('/send/text', { method: 'POST', body: JSON.stringify({ to, text }) });
    if (r.ok) {
      knownGood.set(variants[0], to);
      await log(to, event, text, 'sent');
      return { ok: true, id: r.data?.message_id, to };
    }
    last = { ok: false, error: detailOf(r) };
    if (r.status === 0 || fatal(r.status)) break; // fora do ar ou configuração errada: outra variação não ajuda
  }
  await log(order.join(' / '), event, text, 'failed', last.error);
  return last;
}

const first = (name) => (name || '').trim().split(/\s+/)[0] || '';
const hello = (o) => (first(o.clientName) && !/^Cliente /.test(o.clientName) ? `Olá, ${first(o.clientName)}!` : 'Olá!');
const when = (o) => `${shortDate(o.date)} às ${o.time}`;
const link = (s, o, extra = '') => (s.appUrl ? `\n${s.appUrl.replace(/\/+$/, '')}/agenda/${o.id}${extra}` : '');
const car = (o) => `${o.model || 'carro'} placa ${formatPlate(o.plate)}`;
const services = (o) => (o.items || []).map((i) => i.name).join(' + ');

/** Texto da mensagem ao cliente para cada evento da OS. */
export function clientMessage(event, o, s) {
  switch (event) {
    case 'confirmed':
      return `${hello(o)} Seu agendamento no ${s.studioName} está confirmado: ${services(o)} no ${car(o)}, ${when(o)}. Total ${brl(o.totalCents - (o.discountCents || 0))}, pago no local.${link(s, o)}`;
    case 'cancelled':
      return `${hello(o)} Seu agendamento (${when(o)}) foi cancelado pelo ${s.studioName}.${o.cancelReason ? ` Motivo: ${o.cancelReason}.` : ''}${link(s, o)}`;
    case 'arrived':
      return `${hello(o)} Seu ${car(o)} chegou ao ${s.studioName} e já está na fila. Avisamos a cada etapa.${link(s, o)}`;
    case 'washing':
      return `${hello(o)} Começamos a lavar seu ${car(o)}.${link(s, o)}`;
    case 'finishing':
      return `${hello(o)} Seu ${car(o)} está no acabamento, falta pouco!${link(s, o)}`;
    case 'ready':
      return `${readyMessage({ name: o.clientName, model: o.model, plate: o.plate })}${link(s, o)}`;
    case 'delivered':
      return `${hello(o)} Obrigado por lavar com a gente! Conta pra nós como foi: leva 1 minuto.${link(s, o, '?avaliar=1')}`;
    case 'reminder':
      return `${hello(o)} Lembrete: amanhã às ${o.time} tem ${services(o)} no seu ${car(o)} no ${s.studioName}.${s.address ? ` Endereço: ${s.address}.` : ''}${link(s, o)}`;
    default:
      return '';
  }
}

/** Avisa o cliente (sem bloquear a resposta da API). */
export function notifyClientWA(event, order) {
  getSettings()
    .then((s) => {
      if (!isConfigured(s) || !order.clientPhone || !eventsOf(s).includes(event)) return;
      const text = clientMessage(event, order, s);
      if (text) return sendWhatsApp(order.clientPhone, text, event, s);
    })
    .catch((e) => console.error('WhatsApp:', e));
}

/** Avisa o WhatsApp da loja (Configurações → WhatsApp da loja). */
export function notifyStudioWA(event, text) {
  getSettings()
    .then((s) => {
      if (!isConfigured(s) || s.waNotifyStudio !== 'true' || !s.whatsapp) return;
      return sendWhatsApp(s.whatsapp, `${s.studioName}: ${text}`, event, s);
    })
    .catch((e) => console.error('WhatsApp:', e));
}

/** Lembrete de véspera: a partir das 10h, uma vez por agendamento. */
export async function sendReminders() {
  const s = await getSettings();
  if (!isConfigured(s) || !eventsOf(s).includes('reminder') || nowTime() < '10:00') return 0;
  const list = await prisma.order.findMany({
    where: { date: addDays(todayStr(), 1), status: 'scheduled', reminderSentAt: null, clientPhone: { not: '' } },
    include: { items: { select: { name: true } } },
    take: 50,
  });
  for (const o of list) {
    // Marca antes de enviar: se houver 2 réplicas, só uma pega o agendamento.
    const claimed = await prisma.order.updateMany({ where: { id: o.id, reminderSentAt: null }, data: { reminderSentAt: new Date() } });
    if (claimed.count) await sendWhatsApp(o.clientPhone, clientMessage('reminder', o, s), 'reminder', s);
  }
  return list.length;
}

export function startReminderLoop() {
  const run = () => sendReminders().catch((e) => console.error('Lembretes WhatsApp:', e));
  setTimeout(run, 30_000);
  setInterval(run, 15 * 60_000).unref();
}
