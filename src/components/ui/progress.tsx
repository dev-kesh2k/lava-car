import { cn } from '@/lib/utils';

/** Barra de progresso simples (0–100). */
export function Progress({ value, className }: { value: number; className?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${v}%` }} />
    </div>
  );
}
