// Placas brasileiras: padrão antigo (ABC1234) e Mercosul (ABC1D23).
export function normalizePlate(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

export function isValidPlate(input: string): boolean {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizePlate(input));
}

export function isMercosulPlate(input: string): boolean {
  return /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(normalizePlate(input));
}

/** Exibição: Mercosul sem traço (ABC1D23), antiga com traço (ABC-1234). */
export function formatPlate(input: string): string {
  const p = normalizePlate(input);
  if (!isValidPlate(p)) return p;
  return isMercosulPlate(p) ? p : `${p.slice(0, 3)}-${p.slice(3)}`;
}
