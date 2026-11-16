import { useMemo } from 'react';
import { getCatalog } from '@/api/services';
import { buildPriceMatrix } from '@/lib/pricing';
import { useAsync } from './useAsync';

/** Serviços ativos da loja + matriz de preços por porte. */
export function useCatalog(includeInactive = false) {
  const state = useAsync(() => getCatalog(includeInactive), [includeInactive]);
  const matrix = useMemo(() => buildPriceMatrix(state.data?.prices ?? []), [state.data]);
  const services = state.data?.services ?? [];
  return {
    ...state,
    services,
    mains: services.filter((s) => s.kind === 'MAIN'),
    addons: services.filter((s) => s.kind === 'ADDON'),
    matrix,
  };
}
