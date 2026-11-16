import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { listStaff, searchCustomers, updateStaffMember } from '@/api/profiles';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/hooks/useAuth';
import type { AppRole, Profile } from '@/lib/database.types';
import { errorMessage } from '@/lib/errors';
import { formatPhoneBR } from '@/lib/phone';
import { CommissionReport } from './CommissionReport';

/** Equipe: papel, % de comissão e fechamento semanal. Funcionário novo entra pelo app e o dono promove. */
export function TeamPage() {
  const { profile: me, tenant } = useSession();
  const toast = useToast();
  const staff = useAsync(listStaff, []);
  const [adding, setAdding] = useState(false);
  const [term, setTerm] = useState('');
  const found = useAsync(() => (adding ? searchCustomers(term) : Promise.resolve([] as Profile[])), [adding, term]);

  async function update(p: Profile, patch: { role?: AppRole; commission_pct?: number; active?: boolean }) {
    try {
      await updateStaffMember(p.id, patch);
      await staff.reload();
      toast('Equipe atualizada');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Equipe e comissões"
        actions={
          <Button onClick={() => setAdding(true)}>
            <UserPlus /> Funcionário
          </Button>
        }
      />
      {staff.error && <Alert kind="error">{staff.error}</Alert>}
      <div className="space-y-2">
        {(staff.data ?? []).map((p) => (
          <Card key={p.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-[10rem] flex-1">
              <p className="font-semibold">{p.full_name || p.email || 'Sem nome'}</p>
              <p className="text-xs text-muted-foreground">{p.phone ? formatPhoneBR(p.phone) : p.email}</p>
            </div>
            <NativeSelect className="w-40" value={p.role} disabled={p.id === me.id} onChange={(e) => update(p, { role: e.target.value as AppRole })}>
              <option value="ADMIN">Administrador</option>
              <option value="OPERATOR">Operador</option>
              <option value="CUSTOMER">Remover da equipe</option>
            </NativeSelect>
            <label className="flex items-center gap-1 text-sm">
              <Input
                className="w-20 text-right"
                inputMode="decimal"
                defaultValue={String(p.commission_pct)}
                onBlur={(e) => {
                  const v = Number(e.target.value.replace(',', '.'));
                  if (Number.isFinite(v) && v >= 0 && v <= 100 && v !== Number(p.commission_pct)) void update(p, { commission_pct: v });
                }}
                aria-label="Comissão em %"
              />
              %
            </label>
            <Switch checked={p.active} disabled={p.id === me.id} onCheckedChange={(v) => update(p, { active: v })} label="Ativo" />
          </Card>
        ))}
      </div>

      <CommissionReport timeZone={tenant.timezone} />

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar funcionário</DialogTitle>
            <DialogDescription>Peça para a pessoa entrar uma vez no app com o celular dela e depois encontre-a aqui.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Nome, telefone ou e-mail" value={term} onChange={(e) => setTerm(e.target.value)} autoFocus />
          <ul className="max-h-72 divide-y overflow-y-auto">
            {(found.data ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm font-medium">{p.full_name || 'Sem nome'}</p>
                  <p className="text-xs text-muted-foreground">{p.phone ? formatPhoneBR(p.phone) : p.email}</p>
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    await update(p, { role: 'OPERATOR' });
                    setAdding(false);
                  }}
                >
                  Tornar operador
                </Button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
