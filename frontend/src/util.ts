import type { OrderStatus, Service, Size } from './api';

export function brl(cents: number) {
  const v = cents / 100;
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export const priceFrom = (cents: number) => (cents === 0 ? 'Grátis' : `a partir de ${brl(cents)}`);

export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const parts = (day: string) => day.split('-').map(Number) as [number, number, number];
export const weekdayOf = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const weekStart = (day: string) => addDays(day, -((weekdayOf(day) + 6) % 7));

/** "23 out 2026" */
export function fmtDate(day: string) {
  const [y, m, d] = parts(day);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** "Sáb 17, 10:00" */
export function fmtShort(day: string, time?: string) {
  const [, , d] = parts(day);
  return `${WEEKDAYS_SHORT[weekdayOf(day)]} ${d}${time ? `, ${time}` : ''}`;
}

/** "Sexta, 16 de outubro" */
export function fmtLong(day: string) {
  const [, m, d] = parts(day);
  return `${WEEKDAYS[weekdayOf(day)]}, ${d} de ${MONTHS[m - 1]}`;
}

export const dayNum = (day: string) => parts(day)[2];
export const monthShort = (day: string) => MONTHS_SHORT[parts(day)[1] - 1];

export function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '');
}

export function duration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export const STATUS: Record<OrderStatus, { label: string; text: string; bg: string; bar: string }> = {
  scheduled: { label: 'Agendado', text: 'text-soft', bg: 'bg-surface2', bar: 'bg-muted' },
  waiting: { label: 'No pátio', text: 'text-warn', bg: 'bg-warnbg', bar: 'bg-warn' },
  washing: { label: 'Lavando', text: 'text-accent', bg: 'bg-tint', bar: 'bg-accent' },
  finishing: { label: 'Finalizando', text: 'text-indigo', bg: 'bg-indigobg', bar: 'bg-indigo' },
  ready: { label: 'Pronto para retirada', text: 'text-ok', bg: 'bg-okbg', bar: 'bg-ok' },
  delivered: { label: 'Entregue', text: 'text-muted', bg: 'bg-surface2', bar: 'bg-dis' },
  cancelled: { label: 'Cancelado', text: 'text-danger', bg: 'bg-dangerbg', bar: 'bg-danger' },
};

/** Etapas do acompanhamento ao vivo do cliente. */
export const TRACK_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'scheduled', label: 'Agendado' },
  { status: 'waiting', label: 'No pátio' },
  { status: 'washing', label: 'Lavando' },
  { status: 'finishing', label: 'Finalizando' },
  { status: 'ready', label: 'Pronto' },
];
const FLOW: OrderStatus[] = ['scheduled', 'waiting', 'washing', 'finishing', 'ready', 'delivered'];
export const nextStatus = (s: OrderStatus) => (FLOW.indexOf(s) >= 0 && FLOW.indexOf(s) < FLOW.length - 1 ? FLOW[FLOW.indexOf(s) + 1] : null);
export const prevStatus = (s: OrderStatus) => (FLOW.indexOf(s) > 0 ? FLOW[FLOW.indexOf(s) - 1] : null);
/** Barra de progresso: Agendado 0% → Pronto 100%. */
export function progress(s: OrderStatus) {
  if (s === 'cancelled') return 0;
  const i = Math.min(FLOW.indexOf(s), 4);
  return i < 0 ? 0 : Math.round((i / 4) * 100);
}
export const isOpen = (s: OrderStatus) => s !== 'delivered' && s !== 'cancelled';

export const METHOD: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  card: 'Cartão',
  onsite: 'No local',
};

// ---------- Porte e placa ----------
export const SIZES: Size[] = ['small', 'medium', 'large', 'pickup'];
export const SIZE_INFO: Record<Size, { label: string; short: string; example: string }> = {
  small: { label: 'Pequeno', short: 'Hatch', example: 'Onix, HB20, Gol' },
  medium: { label: 'Médio', short: 'Sedan', example: 'Corolla, Virtus, Cruze' },
  large: { label: 'Grande', short: 'SUV', example: 'Compass, Creta, T-Cross' },
  pickup: { label: 'Caminhonete', short: 'Pick-up', example: 'Hilux, S10, Ranger' },
};
export const sizeLabel = (s: Size) => `${SIZE_INFO[s].label}/${SIZE_INFO[s].short}`;

export const normalizePlate = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
/** Padrão antigo (ABC1234) ou Mercosul (ABC1D23). */
export const isValidPlate = (v: string) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizePlate(v));
export function formatPlate(v: string) {
  const p = normalizePlate(v);
  if (!isValidPlate(p)) return p;
  return /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(p) ? p : `${p.slice(0, 3)}-${p.slice(3)}`;
}
/** Máscara enquanto digita: ABC-1234 ou ABC1D23. */
export function maskPlate(v: string) {
  const p = normalizePlate(v);
  return p.length > 4 && /^[A-Z]{3}[0-9]{2}/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
}

export const priceFor = (s: Service, size: Size) => s.prices.find((p) => p.size === size)?.priceCents ?? null;
export const minPrice = (s: Service) => (s.prices.length ? Math.min(...s.prices.map((p) => p.priceCents)) : 0);

export const readyMessage = (o: { clientName: string; model: string; plate: string }) => {
  const first = o.clientName.trim().split(/\s+/)[0];
  return `Olá${first && !/^Cliente$/.test(first) ? ` ${first}` : ''}, seu ${o.model.trim() || 'carro'} placa ${formatPlate(o.plate)} já está limpo e pronto para retirada!`;
};

/** Converte "350,00" / "350" em centavos. */
export function parseMoney(v: string): number | null {
  const s = v.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export const moneyInput = (cents: number) => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Reduz a imagem no navegador (máx. 1280 px, JPEG) antes de enviar. */
export function resizeImage(file: File, max = 1280, type = 'image/jpeg'): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type && !file.type.startsWith('image/')) return reject(new Error('Escolha uma imagem'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL(type, 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem'));
    };
    img.src = url;
  });
}

/** Recorta o centro da imagem em quadrado (avatar), em JPEG. */
export function squareImage(file: File, size = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type && !file.type.startsWith('image/')) return reject(new Error('Escolha uma imagem'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const out = Math.min(size, side);
      const canvas = document.createElement('canvas');
      canvas.width = out;
      canvas.height = out;
      canvas.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem'));
    };
    img.src = url;
  });
}

export const waLink = (phone: string, text = '') => {
  let d = phone.replace(/\D/g, '');
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

/** Agrupa dias seguidos com o mesmo expediente: "Seg a Sáb: 09:00 às 18:00". */
export function scheduleLines(schedule: { open: boolean; from: string; to: string }[]): string[] {
  const short = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const order = [1, 2, 3, 4, 5, 6, 0];
  const lines: string[] = [];
  for (let i = 0; i < order.length; ) {
    const d = schedule[order[i]];
    let j = i;
    while (j + 1 < order.length && JSON.stringify(schedule[order[j + 1]]) === JSON.stringify(d)) j++;
    if (d.open) {
      const days = i === j ? short[order[i]] : `${short[order[i]]} a ${short[order[j]]}`;
      lines.push(`${days}: ${d.from} às ${d.to}`);
    }
    i = j + 1;
  }
  return lines;
}
