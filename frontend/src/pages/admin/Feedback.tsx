import { useSearchParams } from 'react-router-dom';
import { Check, MessageCircle, MessageSquare, Star, Trash2 } from 'lucide-react';
import { api, useApi } from '../../api';
import { Empty, ErrorBox, Loading, PageHead, Stars, toast } from '../../ui';
import { fmtDate, fmtDateTime, waLink } from '../../util';

interface FeedbackItem {
  id: string;
  kind: 'elogio' | 'sugestao' | 'reclamacao' | 'outro';
  message: string;
  name: string;
  phone: string;
  read: boolean;
  createdAt: string;
}
interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  order: { number: number; clientName: string; clientPhone: string; date: string; model: string; plate: string; items: { name: string }[] };
}
interface Data {
  feedback: FeedbackItem[];
  reviews: ReviewItem[];
  stats: { reviews: number; average: number | null; unreadFeedback: number };
}

const KIND: Record<FeedbackItem['kind'], { label: string; cls: string }> = {
  elogio: { label: 'Elogio', cls: 'bg-okbg text-ok' },
  sugestao: { label: 'Sugestão', cls: 'bg-surface2 text-soft' },
  reclamacao: { label: 'Reclamação', cls: 'bg-dangerbg text-danger' },
  outro: { label: 'Mensagem', cls: 'bg-surface2 text-soft' },
};

const TABS = [
  { id: 'feedback', label: 'Feedback' },
  { id: 'avaliacoes', label: 'Avaliações' },
] as const;

export default function AdminFeedback() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as (typeof TABS)[number]['id']) || 'feedback';
  const { data, error, loading, reload, setData } = useApi<Data>('/admin/feedback');

  async function markRead(f: FeedbackItem) {
    setData((d) => d && { ...d, feedback: d.feedback.map((x) => (x.id === f.id ? { ...x, read: true } : x)), stats: { ...d.stats, unreadFeedback: Math.max(0, d.stats.unreadFeedback - 1) } });
    await api.patch(`/admin/feedback/${f.id}`, { read: true }).catch(() => reload());
  }

  async function del(path: string, msg: string) {
    if (!confirm(msg)) return;
    try {
      await api.del(path);
      toast('Removido');
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  const count = (id: (typeof TABS)[number]['id']) =>
    !data ? 0 : id === 'feedback' ? data.stats.unreadFeedback : data.reviews.length;

  return (
    <div>
      <PageHead
        back="/admin/mais"
        title="Feedback"
        subtitle={data?.stats.average ? `Nota média ${data.stats.average.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} em ${data.stats.reviews} ${data.stats.reviews === 1 ? 'avaliação' : 'avaliações'}` : 'O que os clientes estão dizendo'}
      />
      <div className="mb-5 segmented grid-cols-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={`segment truncate ${tab === t.id ? 'segment-on' : ''}`}
          >
            {t.label}
            {count(t.id) > 0 && <span className="ml-1 hidden opacity-70 min-[400px]:inline">{count(t.id)}</span>}
          </button>
        ))}
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && tab === 'feedback' && (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.feedback.length === 0 && <Empty icon={MessageSquare} title="Nenhum feedback ainda" text="Os clientes enviam pelo app em Perfil → Enviar feedback." />}
          {data.feedback.map((f) => (
            <div key={f.id} className={`card p-5 ${f.read ? '' : 'border-accent/60'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-subhead font-semibold ${KIND[f.kind].cls}`}>{KIND[f.kind].label}</span>
                {!f.read && <span className="text-subhead font-semibold text-accent">Novo</span>}
                <span className="ml-auto text-footnote text-muted">{fmtDateTime(f.createdAt)}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words">{f.message}</p>
              <p className="mt-2 text-footnote text-muted">
                {f.name || 'Anônimo'}
                {f.phone && ` · ${f.phone}`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {f.phone && (
                  <a className="btn-secondary min-h-[44px] px-4 text-subhead" href={waLink(f.phone, `Olá${f.name ? `, ${f.name.split(' ')[0]}` : ''}! Recebemos seu feedback no app do lava-car.`)} target="_blank" rel="noreferrer">
                    <MessageCircle size={18} /> Responder
                  </a>
                )}
                {!f.read && (
                  <button className="btn-secondary min-h-[44px] px-4 text-subhead" onClick={() => markRead(f)}>
                    <Check size={18} /> Marcar como lido
                  </button>
                )}
                <button className="ml-auto flex min-h-[44px] items-center px-2 text-muted" aria-label="Excluir feedback" onClick={() => del(`/admin/feedback/${f.id}`, 'Excluir este feedback?')}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && tab === 'avaliacoes' && (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.reviews.length === 0 && <Empty icon={Star} title="Nenhuma avaliação ainda" text="O cliente avalia depois que o carro fica pronto (e recebe o pedido pelo WhatsApp na entrega, se estiver ligado)." />}
          {data.reviews.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars value={r.rating} size={18} />
                <span className="text-footnote text-muted">{fmtDateTime(r.createdAt)}</span>
              </div>
              {r.comment && <p className="mt-3 whitespace-pre-wrap break-words">“{r.comment}”</p>}
              <p className="mt-2 text-footnote text-muted">
                {r.order.clientName || 'Cliente'} · {r.order.items.map((i) => i.name).join(' + ')} · {r.order.model || r.order.plate} · OS {r.order.number} de {fmtDate(r.order.date)}
              </p>
              {r.rating <= 3 && r.order.clientPhone && (
                <a className="btn-secondary mt-3 min-h-[44px] px-4 text-subhead" href={waLink(r.order.clientPhone, 'Olá! Vimos sua avaliação no app do lava-car e queremos entender o que podemos melhorar.')} target="_blank" rel="noreferrer">
                  <MessageCircle size={18} /> Falar com o cliente
                </a>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
