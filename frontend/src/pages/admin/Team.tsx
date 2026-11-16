import { useState } from 'react';
import { Pencil, Plus, Trash2, UserPlus, Warehouse } from 'lucide-react';
import { api, useApi, type Box, type User } from '../../api';
import { maskPhone } from '../../client';
import { Avatar, ErrorBox, Field, FormError, Loading, PageHead, PasswordInput, Sheet, Switch, toast } from '../../ui';

const emptyMember = { id: '', name: '', email: '', phone: '', role: 'operator', commissionPct: '0', active: true, password: '' };

/** Equipe (acesso ao app e % de comissão) e boxes de lavagem (capacidade da agenda). */
export default function Team() {
  const { data, error, loading, reload } = useApi<{ team: User[]; boxes: Box[] }>('/admin/team');
  const [m, setM] = useState<typeof emptyMember | null>(null);
  const [boxName, setBoxName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorBox message={error || 'Erro ao carregar'} onRetry={reload} />;

  async function saveMember() {
    if (!m) return;
    setBusy(true);
    setErr('');
    try {
      const body = { ...m, commissionPct: Number(m.commissionPct) || 0, password: m.password || undefined };
      if (m.id) await api.put(`/admin/team/${m.id}`, body);
      else await api.post('/admin/team', body);
      toast('Equipe atualizada');
      setM(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function boxAction(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast(ok);
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  const activeBoxes = data.boxes.filter((b) => b.active).length;

  return (
    <div>
      <PageHead
        title="Equipe"
        action={
          <button
            className="btn-pill"
            aria-label="Adicionar pessoa"
            onClick={() => {
              setErr('');
              setM({ ...emptyMember });
            }}
          >
            <UserPlus size={20} /> <span className="hidden min-[380px]:inline">Pessoa</span>
          </button>
        }
      />
      <div className="grid gap-3 lg:grid-cols-2">
        {data.team.map((u) => (
          <button
            key={u.id}
            className={`card flex items-center gap-4 p-4 text-left transition active:scale-[0.99] ${u.active ? '' : 'opacity-50'}`}
            onClick={() => {
              setErr('');
              setM({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, commissionPct: String(u.commissionPct), active: u.active, password: '' });
            }}
          >
            <Avatar name={u.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-semibold">{u.name}</p>
              <p className="truncate text-sm text-muted">{u.email}</p>
              <p className="text-sm">
                <span className={u.role === 'admin' ? 'font-bold text-accent' : 'text-soft'}>{u.role === 'admin' ? 'Dono' : 'Operador'}</span>
                <span className="text-muted"> · comissão {u.commissionPct}%{u.active ? '' : ' · sem acesso'}</span>
              </p>
            </div>
            <Pencil size={18} className="shrink-0 text-soft" />
          </button>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="h2">Boxes de lavagem</h2>
        <p className="mb-4 mt-2 text-muted">
          Cada box lava um carro por vez: com {activeBoxes} {activeBoxes === 1 ? 'box ativo' : 'boxes ativos'}, a agenda aceita até {activeBoxes} {activeBoxes === 1 ? 'carro' : 'carros'} ao mesmo tempo.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.boxes.map((b) => (
            <div key={b.id} className={`card flex items-center gap-3 p-4 ${b.active ? '' : 'opacity-60'}`}>
              <Warehouse className="shrink-0 text-accent" />
              <p className="min-w-0 flex-1 truncate font-bold">{b.name}</p>
              <Switch label={`${b.name} ativo`} checked={b.active} onChange={(v) => boxAction(() => api.put(`/admin/boxes/${b.id}`, { name: b.name, active: v }), v ? 'Box ativado' : 'Box desativado')} />
              <button className="icon-btn h-11 w-11 border-transparent" aria-label={`Excluir ${b.name}`} onClick={() => confirm(`Excluir ${b.name}?`) && boxAction(() => api.del(`/admin/boxes/${b.id}`), 'Box excluído')}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className="input" placeholder="Nome do novo box (ex.: Box 3)" maxLength={40} value={boxName} onChange={(e) => setBoxName(e.target.value)} />
          <button
            className="btn-primary shrink-0"
            disabled={!boxName.trim()}
            onClick={() =>
              boxAction(async () => {
                await api.post('/admin/boxes', { name: boxName });
                setBoxName('');
              }, 'Box adicionado')
            }
          >
            <Plus size={20} /> <span className="hidden min-[380px]:inline">Adicionar</span>
          </button>
        </div>
      </section>

      <Sheet open={!!m} onClose={() => setM(null)} title={m?.id ? 'Editar pessoa' : 'Nova pessoa'}>
        {m && (
          <div className="grid gap-4">
            <Field label="Nome">
              <input className="input" maxLength={80} value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
            </Field>
            <Field label="E-mail (login)">
              <input className="input" type="email" autoComplete="off" value={m.email} onChange={(e) => setM({ ...m, email: e.target.value })} />
            </Field>
            <Field label="Celular">
              <input className="input" type="tel" value={m.phone} onChange={(e) => setM({ ...m, phone: maskPhone(e.target.value) })} />
            </Field>
            <div>
              <span className="label">Papel</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['operator', 'Operador', 'Pátio e agenda'],
                  ['admin', 'Dono', 'Tudo, inclusive financeiro'],
                ].map(([k, v, h]) => (
                  <button key={k} type="button" onClick={() => setM({ ...m, role: k })} className={`rounded-cell bg-surface p-3 text-left ring-2 transition-[box-shadow] duration-200 ${m.role === k ? 'ring-accent' : 'ring-transparent'}`}>
                    <span className="block font-bold">{v}</span>
                    <span className="block text-sm text-muted">{h}</span>
                  </button>
                ))}
              </div>
            </div>
            <Field label="Comissão (%)" hint="Sobre o valor das lavagens que a pessoa fez">
              <input className="input" inputMode="numeric" value={m.commissionPct} onChange={(e) => setM({ ...m, commissionPct: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
            </Field>
            <Field label={m.id ? 'Nova senha (deixe vazio para manter)' : 'Senha (mín. 8 caracteres)'}>
              <PasswordInput autoComplete="new-password" value={m.password} onChange={(e) => setM({ ...m, password: e.target.value })} />
            </Field>
            <div className="flex items-center justify-between gap-3">
              <span>Acesso liberado</span>
              <Switch label="Acesso liberado" checked={m.active} onChange={(v) => setM({ ...m, active: v })} />
            </div>
            <FormError message={err} />
            <button className="btn-primary" disabled={busy} onClick={saveMember}>
              Salvar
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
