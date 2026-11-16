import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}
