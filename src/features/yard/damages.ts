import type { Damage, DamageArea, DamageType } from '@/lib/database.types';

export const DAMAGE_AREAS: { area: DamageArea; label: string }[] = [
  { area: 'FRONT', label: 'Frente' },
  { area: 'REAR', label: 'Traseira' },
  { area: 'LEFT', label: 'Lado esquerdo' },
  { area: 'RIGHT', label: 'Lado direito' },
  { area: 'ROOF', label: 'Teto' },
  { area: 'INTERIOR', label: 'Interior' },
];

export const DAMAGE_TYPES: { type: DamageType; label: string }[] = [
  { type: 'SCRATCH', label: 'Risco' },
  { type: 'DENT', label: 'Amassado' },
  { type: 'BROKEN', label: 'Quebrado' },
  { type: 'STAIN', label: 'Mancha' },
  { type: 'OTHER', label: 'Outro' },
];

/** Liga/desliga uma avaria (mesma área + tipo só uma vez). */
export function toggleDamage(list: Damage[], area: DamageArea, type: DamageType): Damage[] {
  const exists = list.some((d) => d.area === area && d.type === type);
  return exists ? list.filter((d) => !(d.area === area && d.type === type)) : [...list, { area, type }];
}

/** Resumo em texto ("Frente: risco, amassado · Teto: mancha"). */
export function describeDamages(list: Damage[]): string {
  if (!list.length) return 'Sem avarias';
  return DAMAGE_AREAS.filter((a) => list.some((d) => d.area === a.area))
    .map((a) => {
      const types = list.filter((d) => d.area === a.area).map((d) => DAMAGE_TYPES.find((t) => t.type === d.type)?.label.toLowerCase() ?? d.type);
      return `${a.label}: ${types.join(', ')}`;
    })
    .join(' · ');
}
