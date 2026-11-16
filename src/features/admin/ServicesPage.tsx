import { Plus } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageSpinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/hooks/useAuth';
import { useCatalog } from '@/hooks/useCatalog';
import type { Service } from '@/lib/database.types';
import { formatBRL, formatDuration } from '@/lib/format';
import { priceFor } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { CATEGORIES, CATEGORY_INFO } from '@/lib/vehicle';
import { ServiceForm } from './ServiceForm';

/** Gestão de serviços: matriz de preços (serviço × porte do veículo). */
export function ServicesPage() {
  const { tenant } = useSession();
  const toast = useToast();
  const catalog = useCatalog(true);
  const [editing, setEditing] = useState<Service | 'new' | null>(null);

  if (catalog.loading) return <PageSpinner />;

  const section = (title: string, items: Service[]) => (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Serviço</th>
              {CATEGORIES.map((c) => (
                <th key={c} className="p-3 text-right">
                  {CATEGORY_INFO[c].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((s) => (
              <tr key={s.id} onClick={() => setEditing(s)} className={cn('cursor-pointer hover:bg-accent', !s.active && 'opacity-50')}>
                <td className="p-3">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(s.duration_min)} {!s.active && <Badge variant="outline">inativo</Badge>}
                  </p>
                </td>
                {CATEGORIES.map((c) => {
                  const p = priceFor(catalog.matrix, s.id, c);
                  return (
                    <td key={c} className="p-3 text-right tabular-nums">
                      {p === null ? '—' : formatBRL(p)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Serviços e preços"
        description="Toque num serviço para editar. Preço vazio = não oferecido para aquele porte."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus /> Serviço
          </Button>
        }
      />
      {catalog.error && <Alert kind="error">{catalog.error}</Alert>}
      {section('Principais', catalog.mains)}
      {section('Adicionais', catalog.addons)}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Novo serviço' : 'Editar serviço'}</DialogTitle>
          </DialogHeader>
          {editing !== null && (
            <ServiceForm
              tenantId={tenant.id}
              service={editing === 'new' ? undefined : editing}
              matrix={catalog.matrix}
              onSaved={() => {
                toast('Serviço salvo');
                setEditing(null);
                void catalog.reload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
