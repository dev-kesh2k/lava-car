import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const STYLES = {
  info: { box: 'border-primary/30 bg-primary/5 text-foreground', Icon: Info },
  error: { box: 'border-destructive/40 bg-destructive/10 text-destructive', Icon: AlertCircle },
  success: { box: 'border-success/40 bg-success/10 text-foreground', Icon: CheckCircle2 },
};

export function Alert({ kind = 'info', children, className }: { kind?: keyof typeof STYLES; children: React.ReactNode; className?: string }) {
  const { box, Icon } = STYLES[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={cn('flex gap-2 rounded-md border p-3 text-sm', box, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
