import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, LogOut, Send, User, XCircle } from 'lucide-react';
import { api, API_BASE, useApi, type DaySchedule } from '../../api';
import { useAuth } from '../../auth';
import { reloadConfig } from '../../config';
import { ErrorBox, Field, FormError, Loading, PageHead, Switch, toast } from '../../ui';
import { fmtDateTime, resizeImage } from '../../util';

interface S {
  studioName: string;
  slotIntervalMin: number;
  loyaltyGoal: number;
  pixEnabled: boolean;
  phone: string;
  whatsapp: string;
  address: string;
  hours: string;
  schedule: DaySchedule[];
  logoVersion: number;
  about: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  website: string;
  googleReviewUrl: string;
  waEnabled: string;
  waNotifyStudio: string;
  waEvents: string;
  waBridge: boolean;
  waConfigured: boolean;
}
type Form = Omit<S, 'pixEnabled' | 'waBridge' | 'waConfigured'>;

interface BridgeStatus {
  configured: boolean;
  reachable: boolean;
  connected: boolean;
  error?: string;
}

const WA_EVENTS: { id: string; label: string; hint: string }[] = [
  { id: 'confirmed', label: 'Agendamento confirmado', hint: 'Logo depois que o cliente agenda' },
  { id: 'reminder', label: 'Lembrete na véspera', hint: 'A partir das 10h do dia anterior' },
  { id: 'ready', label: 'Carro pronto', hint: '"Seu [modelo] placa [placa] já está limpo e pronto para retirada!"' },
  { id: 'delivered', label: 'Pedido de avaliação', hint: 'Na entrega do carro' },
  { id: 'cancelled', label: 'Cancelado pela loja', hint: 'Com o motivo informado' },
];

interface LogItem {
  id: string;
  to: string;
  event: string;
  text: string;
  status: 'sent' | 'failed';
  error: string;
  createdAt: string;
}

const EVENT: Record<string, string> = {
  test: 'Teste',
  confirmed: 'Confirmação',
  cancelled: 'Cancelado',
  ready: 'Carro pronto',
  delivered: 'Pedido de avaliação',
  reminder: 'Lembrete',
  studio_booking: 'Loja: novo agendamento',
  studio_cancel: 'Loja: cancelamento',
};

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <section className="card grid grid-cols-1 gap-4 p-5 [&>*]:min-w-0">
      <div>
        <h2 className="h2">{title}</h2>
        {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function ScheduleEditor({ value, onChange }: { value: DaySchedule[]; onChange: (v: DaySchedule[]) => void }) {
  const upd = (i: number, patch: Partial<DaySchedule>) => onChange(value.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  return (
    <div className="grid gap-2">
      {DAY_ORDER.map((i) => {
        const d = value[i];
        return (
          <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex min-h-[44px] w-36 items-center gap-3">
              <Switch checked={d.open} onChange={(v) => upd(i, { open: v })} label={DAY_NAMES[i]} />
              <span className={d.open ? 'font-medium' : 'text-muted'}>{DAY_NAMES[i]}</span>
            </div>
            {d.open ? (
              <div className="flex items-center gap-2">
                <input type="time" className="input w-[7.5rem]" value={d.from} onChange={(e) => upd(i, { from: e.target.value })} aria-label={`Abre ${DAY_NAMES[i]}`} />
                <span className="text-muted">às</span>
                <input type="time" className="input w-[7.5rem]" value={d.to} onChange={(e) => upd(i, { to: e.target.value })} aria-label={`Fecha ${DAY_NAMES[i]}`} />
              </div>
            ) : (
              <span className="text-muted">Fechado</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Toggle({ label, hint, on, set }: { label: string; hint?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-cell bg-surface2 px-4 py-3">
      <span className="min-w-0">
        <span className="block">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <Switch checked={on} onChange={set} label={label} />
    </div>
  );
}

/** Situação da ponte de WhatsApp do servidor (GET /health da bridge). */
function BridgeBadge({ status, loading, onRetry }: { status: BridgeStatus | null; loading: boolean; onRetry: () => void }) {
  if (loading) return <p className="rounded-cell bg-surface2 px-4 py-3 text-sm text-muted">Verificando a ponte do WhatsApp…</p>;
  const ok = !!status?.connected;
  const text = !status
    ? 'Não consegui verificar a ponte.'
    : !status.configured
      ? 'Ponte não configurada no servidor (WHATSAPP_BRIDGE_URL e BRIDGE_SECRET).'
      : !status.reachable
        ? `Ponte fora do ar${status.error ? `: ${status.error}` : ''}.`
        : ok
          ? 'Ponte conectada: o WhatsApp do servidor está pronto para enviar.'
          : 'Ponte no ar, mas o WhatsApp do servidor está desconectado (precisa ler o QR Code no Hub).';
  return (
    <div className={`flex items-start gap-2 rounded-cell px-4 py-3 text-sm ${ok ? 'bg-okbg text-ok' : 'bg-warnbg text-warn'}`}>
      {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}
      <span className="min-w-0 flex-1 break-words">{text}</span>
      <button type="button" className="shrink-0 font-bold underline" onClick={onRetry}>
        Atualizar
      </button>
    </div>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { data, error, loading, reload } = useApi<{ settings: S }>('/admin/settings');
  const log = useApi<{ log: LogItem[] }>('/admin/whatsapp/log');
  const bridge = useApi<BridgeStatus>('/admin/whatsapp/status');
  const [f, setF] = useState<Form | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testErr, setTestErr] = useState('');

  useEffect(() => {
    if (!data) return;
    const { pixEnabled: _p, waBridge: _b, waConfigured: _c, ...rest } = data.settings;
    void _p;
    void _b;
    void _c;
    setF(rest);
    setTestTo((t) => t || data.settings.whatsapp);
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error || !data || !f) return <ErrorBox message={error || 'Erro ao carregar'} onRetry={reload} />;
  const s = data.settings;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF({ ...f, [k]: v });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f) return;
    setBusy(true);
    setErr('');
    try {
      // O endereço do app entra nos links das mensagens do WhatsApp.
      const appUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
      await api.put('/admin/settings', { ...f, appUrl });
      bridge.reload();
      await Promise.all([reloadConfig(), reload()]);
      toast('Configurações salvas');
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function pickLogo(file?: File) {
    if (!file) return;
    try {
      await api.post('/admin/logo', { image: await resizeImage(file, 512, 'image/png') });
      await Promise.all([reloadConfig(), reload()]);
      toast('Logo atualizada');
    } catch (e2) {
      toast((e2 as Error).message, true);
    }
  }

  async function removeLogo() {
    if (!confirm('Remover a logo?')) return;
    try {
      await api.del('/admin/logo');
      await Promise.all([reloadConfig(), reload()]);
      toast('Logo removida');
    } catch (e2) {
      toast((e2 as Error).message, true);
    }
  }

  async function test() {
    setTestErr('');
    try {
      await api.post('/admin/whatsapp/test', { to: testTo });
      toast('Mensagem de teste enviada');
      log.reload();
    } catch (e2) {
      setTestErr((e2 as Error).message);
    } finally {
      log.reload();
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead back="/admin" title="Configurações" />

      <Link to="/admin/conta" className="card mb-6 flex min-h-[64px] items-center gap-4 px-5">
        <User size={22} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Minha conta</span>
          <span className="block truncate text-sm text-muted">{user?.email} · alterar dados e senha</span>
        </span>
        <ChevronRight size={20} className="text-soft" />
      </Link>

      <form onSubmit={save} className="grid gap-6">
        <Section title="Loja">
          <Field label="Logo do app" hint="Aparece no topo do app e na tela de login da equipe.">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-cell bg-surface2">
                {s.logoVersion ? <img src={`${API_BASE}/logo?v=${s.logoVersion}`} alt="Logo" className="h-full w-full object-contain" /> : <span className="text-sm text-muted">Padrão</span>}
              </div>
              <label className="btn-secondary cursor-pointer">
                {s.logoVersion ? 'Trocar logo' : 'Enviar logo'}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    pickLogo(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              {s.logoVersion > 0 && (
                <button type="button" className="text-base text-accent" onClick={removeLogo}>
                  Remover
                </button>
              )}
            </div>
          </Field>
          <Field label="Nome do lava-car">
            <input className="input" maxLength={60} value={f.studioName} onChange={(e) => set('studioName', e.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cartão fidelidade: lavagens para ganhar 1 grátis" hint="Cada lavagem pronta vale 1 selo (2 a 50).">
              <input className="input" inputMode="numeric" value={String(f.loyaltyGoal)} onChange={(e) => set('loyaltyGoal', Number(e.target.value.replace(/\D/g, '').slice(0, 2)) || 0)} />
            </Field>
            <Field label="Agenda: horários de quantos em quantos minutos">
              <select className="input" value={f.slotIntervalMin} onChange={(e) => set('slotIntervalMin', Number(e.target.value))}>
                {[10, 15, 20, 30, 60].map((n) => (
                  <option key={n} value={n}>
                    {n} min
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="rounded-cell bg-surface2 p-4 text-sm text-muted">Pagamento: por enquanto só no local (sem sinal). O Pix antecipado fica desligado até integrarmos um gateway de pagamento.</p>
          <Field label="Telefone">
            <input className="input" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </Section>

        <Section title="Sobre e localização" hint="Aparece na página Sobre do app, com o mapa e o botão Como chegar.">
          <Field label="Sobre a loja">
            <textarea className="input min-h-[120px] resize-y" maxLength={3000} value={f.about} onChange={(e) => set('about', e.target.value)} placeholder="Quem somos, serviços, produtos que usamos…" />
          </Field>
          <Field label="Horário de atendimento" hint="Dias e horário de funcionamento: a lavagem precisa terminar até o fechamento.">
            <ScheduleEditor value={f.schedule} onChange={(v) => set('schedule', v)} />
          </Field>
          <Field label="Observação do horário (opcional)">
            <textarea className="input min-h-[70px] resize-y" maxLength={300} value={f.hours} onChange={(e) => set('hours', e.target.value)} placeholder="Ex.: feriados sob consulta" />
          </Field>
          <Field label="Endereço completo" hint="Usado no mapa: rua, número, bairro, cidade">
            <input className="input" maxLength={200} value={f.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
        </Section>

        <Section title="Redes sociais" hint="Só aparecem as preenchidas.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Instagram">
              <input className="input" placeholder="@seunegocio" value={f.instagram} onChange={(e) => set('instagram', e.target.value)} />
            </Field>
            <Field label="TikTok">
              <input className="input" placeholder="@seunegocio" value={f.tiktok} onChange={(e) => set('tiktok', e.target.value)} />
            </Field>
          </div>
          <Field label="Facebook (link)">
            <input className="input" type="url" inputMode="url" placeholder="https://facebook.com/…" value={f.facebook} onChange={(e) => set('facebook', e.target.value)} />
          </Field>
          <Field label="YouTube (link)">
            <input className="input" type="url" inputMode="url" placeholder="https://youtube.com/@…" value={f.youtube} onChange={(e) => set('youtube', e.target.value)} />
          </Field>
          <Field label="Site (link)">
            <input className="input" type="url" inputMode="url" placeholder="https://…" value={f.website} onChange={(e) => set('website', e.target.value)} />
          </Field>
        </Section>

        <Section
          title="Avaliação no Google"
          hint="Depois de avaliar a lavagem com 4 ou 5 estrelas, o cliente é convidado a avaliar também no Google. Pegue o link no Perfil da Empresa no Google → Pedir avaliações → Compartilhar."
        >
          <Field label="Link de avaliação do Google">
            <input className="input" type="url" inputMode="url" placeholder="https://g.page/r/…/review" value={f.googleReviewUrl} onChange={(e) => set('googleReviewUrl', e.target.value)} />
          </Field>
        </Section>

        <Section
          title="WhatsApp"
          hint="Avisos automáticos pelo WhatsApp do servidor (a mesma ponte que os outros apps usam). O número que envia é o conectado na ponte; aqui você escolhe o que mandar."
        >
          <BridgeBadge status={bridge.data} loading={bridge.loading && !bridge.data} onRetry={bridge.reload} />
          <Field label="WhatsApp da loja" hint="Aparece para o cliente no botão Suporte e no acompanhamento, e recebe os avisos da loja.">
            <input className="input" type="tel" inputMode="tel" placeholder="(45) 99123-4567" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
          </Field>
          <Toggle label="Enviar avisos automáticos" hint={!s.waBridge ? 'Precisa da ponte configurada no servidor' : f.waEnabled === 'true' ? 'Ligado: o cliente recebe os avisos marcados abaixo' : 'Desligado: nenhuma mensagem automática é enviada'} on={f.waEnabled === 'true'} set={(v) => set('waEnabled', String(v))} />
          {f.waEnabled === 'true' && (
            <div className="grid gap-1">
              <span className="label">Avisos para o cliente</span>
              {WA_EVENTS.map((ev) => {
                const list = f.waEvents.split(',').filter(Boolean);
                const on = list.includes(ev.id);
                return (
                  <Toggle
                    key={ev.id}
                    label={ev.label}
                    hint={ev.hint}
                    on={on}
                    set={(v) => set('waEvents', (v ? [...list, ev.id] : list.filter((x) => x !== ev.id)).join(','))}
                  />
                );
              })}
              <Toggle label="Avisar o WhatsApp da loja" hint="Novo agendamento e cancelamento pelo cliente" on={f.waNotifyStudio === 'true'} set={(v) => set('waNotifyStudio', String(v))} />
            </div>
          )}
        </Section>

        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 md:bottom-4">
          <FormError message={err} />
          <button className={`btn-primary w-full shadow-xl ${err ? 'mt-3' : ''}`} disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar configurações'}
          </button>
        </div>
      </form>

      <section className="card mt-6 grid grid-cols-1 gap-4 p-5 [&>*]:min-w-0">
        <h2 className="h2">Testar WhatsApp</h2>
        <p className="text-sm text-muted">Manda uma mensagem pela ponte do servidor para o número abaixo (funciona mesmo com os avisos automáticos desligados).</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="input" type="tel" inputMode="tel" placeholder="(45) 99123-4567" value={testTo} onChange={(e) => setTestTo(e.target.value)} aria-label="Número para o teste" />
          <button type="button" className="btn-secondary shrink-0" onClick={test} disabled={!s.waBridge}>
            <Send size={18} /> Enviar teste
          </button>
        </div>
        <FormError message={testErr} />
        <div>
          <p className="label">Últimos envios</p>
          {log.data && log.data.log.length === 0 && <p className="text-sm text-muted">Nenhuma mensagem enviada ainda.</p>}
          <ul className="divide-y divide-line">
            {log.data?.log.map((l) => (
              <li key={l.id} className="py-3">
                <p className="flex flex-wrap items-center gap-x-2 text-sm">
                  <span className={`font-bold ${l.status === 'sent' ? 'text-ok' : 'text-accent'}`}>{l.status === 'sent' ? 'Enviada' : 'Falhou'}</span>
                  <span>{EVENT[l.event] || l.event}</span>
                  <span className="text-muted">· +{l.to} · {fmtDateTime(l.createdAt)}</span>
                </p>
                <p className="mt-1 line-clamp-2 break-all text-sm text-muted">{l.text}</p>
                {l.error && <p className="mt-1 break-all text-sm text-accent">{l.error}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <button onClick={signOut} className="list cell mt-6 justify-center text-body text-danger active:bg-surface2">
        <LogOut size={22} /> Sair
      </button>
    </div>
  );
}
