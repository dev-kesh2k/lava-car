// Telefones do Brasil para login por OTP e link do WhatsApp (formato E.164 sem "+": 5545999990000).
export function normalizePhoneBR(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (!/^55\d{10,11}$/.test(d)) return null;
  return d;
}

/** "+55 (45) 99999-0000" */
export function formatPhoneBR(input: string): string {
  const d = normalizePhoneBR(input);
  if (!d) return input;
  const ddd = d.slice(2, 4);
  const num = d.slice(4);
  const split = num.length === 9 ? 5 : 4;
  return `+55 (${ddd}) ${num.slice(0, split)}-${num.slice(split)}`;
}

/** Formato que o Supabase Auth espera no OTP por SMS/WhatsApp. */
export function toE164(input: string): string | null {
  const d = normalizePhoneBR(input);
  return d ? `+${d}` : null;
}
