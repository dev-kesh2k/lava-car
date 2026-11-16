import { useState } from 'react';
import type { OsStatus } from '@/lib/database.types';
import { STATUS_LABELS } from '@/lib/status';
import { cn } from '@/lib/utils';

const COLORS: Partial<Record<OsStatus, string>> = {
  WAITING: 'bg-slate-500',
  WASHING: 'bg-sky-500',
  FINISHING: 'bg-amber-500',
  READY: 'bg-green-600',
};

/** Coluna do Kanban; aceita soltar um cartão arrastado (no tablet os botões fazem o mesmo). */
export function YardColumn({ status, count, onDropOs, children }: { status: OsStatus; count: number; onDropOs: (id: string) => void; children: React.ReactNode }) {
  const [over, setOver] = useState(false);
  return (
    <section
      aria-label={STATUS_LABELS[status]}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData('text/os-id');
        if (id) onDropOs(id);
      }}
      className={cn('flex min-h-[50vh] w-[85vw] shrink-0 snap-start flex-col gap-2 rounded-xl bg-muted/60 p-2 transition sm:w-80 lg:w-auto', over && 'ring-2 ring-primary')}
    >
      <header className="flex items-center gap-2 px-1 py-1">
        <span className={cn('h-3 w-3 rounded-full', COLORS[status])} />
        <h2 className="font-semibold">{STATUS_LABELS[status]}</h2>
        <span className="ml-auto rounded-full bg-background px-2 text-sm font-semibold">{count}</span>
      </header>
      {children}
    </section>
  );
}
