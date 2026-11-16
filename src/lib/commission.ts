import type { CommissionRow } from './database.types';

/** Comissão de um valor com percentual (arredondada em centavos, como no banco). */
export function commissionOf(gross: number, pct: number): number {
  return Math.round(gross * pct) / 100;
}

/** Totais do fechamento da semana (para o rodapé do relatório). */
export function commissionTotals(rows: Pick<CommissionRow, 'os_count' | 'gross' | 'commission'>[]) {
  return rows.reduce(
    (acc, r) => ({
      osCount: acc.osCount + Number(r.os_count),
      gross: Math.round((acc.gross + Number(r.gross)) * 100) / 100,
      commission: Math.round((acc.commission + Number(r.commission)) * 100) / 100,
    }),
    { osCount: 0, gross: 0, commission: 0 },
  );
}

/** Texto do fechamento para mandar ao funcionário (WhatsApp ou impressão). */
export function commissionReceipt(row: Pick<CommissionRow, 'full_name' | 'commission_pct' | 'os_count' | 'gross' | 'commission'>, period: string): string {
  const brl = (n: number) => `R$ ${Number(n).toFixed(2).replace('.', ',')}`;
  return [
    `Fechamento ${period}`,
    `${row.full_name}`,
    `${row.os_count} serviço(s) · ${brl(row.gross)}`,
    `Comissão ${Number(row.commission_pct)}%: ${brl(row.commission)}`,
  ].join('\n');
}
