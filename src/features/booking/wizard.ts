import type { PaymentMethod } from '@/lib/database.types';

export interface WizardState {
  vehicleId: string | null;
  mainId: string | null;
  addonIds: string[];
  dateKey: string | null;
  slotStart: string | null;
  payment: PaymentMethod;
  notes: string;
}

export const STEPS = ['Veículo', 'Serviços', 'Horário', 'Resumo'] as const;

export const initialWizard: WizardState = {
  vehicleId: null,
  mainId: null,
  addonIds: [],
  dateKey: null,
  slotStart: null,
  payment: 'ON_SITE',
  notes: '',
};

export type WizardAction =
  | { type: 'vehicle'; id: string }
  | { type: 'main'; id: string }
  | { type: 'toggleAddon'; id: string }
  | { type: 'date'; dateKey: string }
  | { type: 'slot'; start: string }
  | { type: 'payment'; method: PaymentMethod }
  | { type: 'notes'; text: string };

/**
 * Trocar o carro muda os preços (e às vezes quais serviços existem): limpa serviços e horário.
 * Trocar serviços muda a duração: limpa o horário escolhido.
 */
export function wizardReducer(s: WizardState, a: WizardAction): WizardState {
  switch (a.type) {
    case 'vehicle':
      return s.vehicleId === a.id ? s : { ...s, vehicleId: a.id, mainId: null, addonIds: [], slotStart: null };
    case 'main':
      return { ...s, mainId: a.id, slotStart: null };
    case 'toggleAddon':
      return {
        ...s,
        addonIds: s.addonIds.includes(a.id) ? s.addonIds.filter((x) => x !== a.id) : [...s.addonIds, a.id],
        slotStart: null,
      };
    case 'date':
      return { ...s, dateKey: a.dateKey, slotStart: null };
    case 'slot':
      return { ...s, slotStart: a.start };
    case 'payment':
      return { ...s, payment: a.method };
    case 'notes':
      return { ...s, notes: a.text.slice(0, 300) };
  }
}

/** Pode ir para o próximo passo? */
export function canAdvance(step: number, s: WizardState): boolean {
  if (step === 0) return !!s.vehicleId;
  if (step === 1) return !!s.mainId;
  if (step === 2) return !!s.slotStart;
  return true;
}
