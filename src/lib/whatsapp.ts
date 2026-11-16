import { normalizePhoneBR } from './phone';
import { formatPlate } from './plate';

/** Mensagem padrão do botão "avisar que está pronto". */
export function readyMessage(o: { name: string; model: string; plate: string; shop?: string }): string {
  const first = o.name.trim().split(/\s+/)[0] || 'cliente';
  const model = o.model.trim() || 'carro';
  const sign = o.shop ? `\n\n${o.shop}` : '';
  return `Olá ${first}, seu ${model} placa ${formatPlate(o.plate)} já está limpo e pronto para retirada!${sign}`;
}

/** Link wa.me que abre o WhatsApp Web/App com a mensagem pronta (null se o telefone for inválido). */
export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const digits = phone ? normalizePhoneBR(phone) : null;
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
