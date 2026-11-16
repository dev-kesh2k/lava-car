import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Star } from 'lucide-react';
import { api, inspectionPhotoUrl, useApi, type Loyalty, type Order } from '../../api';
import { useSavedPhone } from '../../client';
import PhoneGate from './PhoneGate';
import { useConfig } from '../../config';
import { ErrorBox, Field, FormError, Lightbox, Loading, PageHead, Plate, Sheet, Stars, StatusPill, toast } from '../../ui';
import { brl, duration, fmtDate, formatPlate, isOpen, METHOD, sizeLabel, STATUS, WEEKDAYS_SHORT, waLink, weekdayOf } from '../../util';
import { WhatsAppIcon } from '../../layout';
import { LoyaltyCard, Tracker } from './parts';

export default function BookingDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const config = useConfig();
  const [phone, setPhone] = useSavedPhone();
  const { data, error, loading, reload } = useApi<{ order: Order; loyalty: Loyalty }>(phone ? `/orders/${id}?phone=${encodeURIComponent(phone)}` : null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);
  const [photo, setPhoto] = useState<number | null>(null);

  // Acompanhamento ao vivo: consulta a cada 10 s enquanto a OS está em andamento e a aba está visível.
  const live = !!data && isOpen(data.order.status);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, 10_000);
    return () => clearInterval(t);
  }, [live, reload]);

  // Link do WhatsApp após a entrega: /agenda/<id>?avaliar=1 abre a avaliação direto.
  const wantsReview = params.get('avaliar') === '1';
  const canReview = !!data && ['ready', 'delivered'].includes(data.order.status) && !data.order.review;
  useEffect(() => {
    if (wantsReview && canReview) setReviewOpen(true);
  }, [wantsReview, canReview]);

  if (!phone)
    return (
      <div className="mx-auto max-w-2xl">
        <PageHead back="/agenda" title="Lavagem" />
        <PhoneGate onSubmit={setPhone} text="Informe o celular usado neste agendamento." />
      </div>
    );
  if (loading && !data) return <Loading />;
  if (!data)
    return (
      <div className="mx-auto max-w-2xl">
        <PageHead back="/agenda" title="Lavagem" />
        <ErrorBox message={error || 'Agendamento não encontrado'} onRetry={reload} />
        <button className="btn-secondary mt-4 w-full" onClick={() => setPhone('')}>
          Usar outro celular
        </button>
      </div>
    );
  const o = data.order;
  const today = config?.today || '';
  const canCancel = o.status === 'scheduled' && o.date >= today;
  const photos = o.photos.map((p) => inspectionPhotoUrl(p, phone));
  const store = config?.whatsapp || config?.phone || '';

  async function run(fn: () => Promise<unknown>, ok: string, close: () => void) {
    setBusy(true);
    setErr('');
    try {
      await fn();
      toast(ok);
      close();
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitReview() {
    setBusy(true);
    setErr('');
    try {
      const r = await api.post<{ googleReviewUrl: string | null }>(`/orders/${o.id}/review`, { rating, comment, phone });
      setReviewOpen(false);
      if (r.googleReviewUrl) setGoogleUrl(r.googleReviewUrl);
      else toast('Obrigado pela avaliação!');
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead back="/agenda" eyebrow={`OS ${o.number}`} title={o.items.find((i) => i.kind === 'main')?.name || 'Lavagem'} />

      {params.get('novo') && o.status === 'scheduled' && (
        <div className="mb-5 flex items-start gap-3 rounded-card bg-okbg p-4 animate-pop-in">
          <CheckCircle2 className="mt-0.5 shrink-0 text-ok" />
          <div>
            <p className="font-bold text-ok">Agendamento confirmado!</p>
            <p className="text-sm text-soft">Te esperamos no horário. Acompanhe a lavagem por aqui: esta tela atualiza sozinha.</p>
          </div>
        </div>
      )}

      <section className="card p-5">
        <div className="mb-5 flex items-center gap-3">
          <Plate plate={o.plate} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold">{o.model || 'Seu carro'}</p>
            <p className="truncate text-sm text-muted">{[o.color, sizeLabel(o.size)].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        {o.status === 'cancelled' ? (
          <StatusPill status="cancelled" />
        ) : (
          <>
            <p className={`mb-4 text-title2 font-bold ${STATUS[o.status].text}`}>{STATUS[o.status].label}</p>
            <Tracker order={o} />
            {live && (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                <span className="h-2 w-2 animate-pulse rounded-full bg-ok" /> Ao vivo · atualiza sozinho
              </p>
            )}
          </>
        )}
      </section>

      <div className="card mt-5 divide-y divide-line">
        {[
          ['Quando', `${WEEKDAYS_SHORT[weekdayOf(o.date)]}, ${fmtDate(o.date)} · ${o.time}`],
          ['Duração', `cerca de ${duration(o.durationMin)}`],
          ...o.items.map((i) => [i.name, brl(i.priceCents)]),
          ...(o.discountCents ? [['Lavagem grátis (fidelidade)', `- ${brl(o.discountCents)}`]] : []),
          ['Total', brl(o.dueCents)],
          ['Pagamento', o.paymentStatus === 'paid' ? `Pago (${METHOD[o.paidMethod] || o.paidMethod})` : 'No local, na retirada'],
        ].map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 px-5 py-4">
            <span className="min-w-0 text-muted">{k}</span>
            <span className="shrink-0 text-right font-medium">{v}</span>
          </div>
        ))}
        {o.cancelReason && o.status === 'cancelled' && (
          <div className="px-5 py-4">
            <p className="text-muted">Motivo</p>
            <p className="mt-1">{o.cancelReason}</p>
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <section className="mt-5">
          <h2 className="h2 mb-3">Vistoria de entrada</h2>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((url, i) => (
              <button key={url} onClick={() => setPhoto(i)} className="aspect-square overflow-hidden rounded-[14px] bg-surface2" aria-label={`Foto ${i + 1} da vistoria`}>
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>
      )}

      {o.status !== 'cancelled' && (
        <div className="mt-5">
          <LoyaltyCard loyalty={data.loyalty} compact />
        </div>
      )}

      {o.review && (
        <section className="card mt-5 p-4">
          <p className="mb-1 font-bold">Sua avaliação</p>
          <Stars value={o.review.rating} />
          {o.review.comment && <p className="mt-2 text-soft">{o.review.comment}</p>}
          {o.review.rating >= 4 && config?.googleReviewUrl && (
            <a href={config.googleReviewUrl} target="_blank" rel="noreferrer" className="btn-secondary mt-4 w-full">
              <GoogleG /> Avaliar também no Google
            </a>
          )}
        </section>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {store && (
          <a className="btn-secondary" href={waLink(store, `Olá! Sobre a lavagem do meu ${o.model || 'carro'} placa ${formatPlate(o.plate)} (OS ${o.number}).`)} target="_blank" rel="noreferrer">
            <WhatsAppIcon size={20} /> Falar com a loja no WhatsApp
          </a>
        )}
        {canReview && (
          <button className="btn-primary" onClick={() => setReviewOpen(true)}>
            <Star size={20} /> Avaliar lavagem
          </button>
        )}
        {canCancel && (
          <button className="btn-danger" onClick={() => setCancelOpen(true)}>
            Cancelar agendamento
          </button>
        )}
      </div>

      {photo !== null && <Lightbox urls={photos} index={photo} onIndex={setPhoto} onClose={() => setPhoto(null)} />}

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancelar agendamento?">
        <p className="mb-4 text-soft">O horário fica livre para outra pessoa.</p>
        <Field label="Motivo (opcional)">
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </Field>
        <div className="mt-4">
          <FormError message={err} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="btn-secondary" onClick={() => setCancelOpen(false)}>
            Voltar
          </button>
          <button className="btn-danger" disabled={busy} onClick={() => run(() => api.post(`/orders/${o.id}/cancel`, { reason, phone }), 'Agendamento cancelado', () => setCancelOpen(false))}>
            Cancelar
          </button>
        </div>
      </Sheet>

      <Sheet open={reviewOpen} onClose={() => setReviewOpen(false)} title="Avaliar lavagem">
        <div className="mb-4 flex justify-center gap-2" role="radiogroup" aria-label="Nota">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n} estrelas`} onClick={() => setRating(n)} className="flex h-12 w-12 items-center justify-center text-warn">
              <Star size={34} fill={n <= rating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
        <p className="-mt-2 mb-4 text-center text-sm text-muted">{['', 'Muito ruim', 'Ruim', 'Regular', 'Boa', 'Excelente'][rating]}</p>
        <Field label={rating <= 3 ? 'O que podemos melhorar? (opcional)' : 'Comentário (opcional)'}>
          <textarea className="input min-h-[100px]" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <div className="mt-4">
          <FormError message={err} />
        </div>
        <button className="btn-primary mt-4 w-full" disabled={busy} onClick={submitReview}>
          Enviar avaliação
        </button>
      </Sheet>

      <Sheet open={!!googleUrl} onClose={() => setGoogleUrl(null)} title="Obrigado!">
        <p className="mb-5 text-soft">Que bom que você curtiu! Pode deixar essa avaliação também no Google? Ajuda muito o lava-car a ser encontrado.</p>
        {googleUrl && (
          <a href={googleUrl} target="_blank" rel="noreferrer" className="btn-primary w-full" onClick={() => setGoogleUrl(null)}>
            <GoogleG /> Avaliar no Google
          </a>
        )}
        <button className="btn-secondary mt-3 w-full" onClick={() => setGoogleUrl(null)}>
          Agora não
        </button>
      </Sheet>
    </div>
  );
}

/** "G" do Google (logo simples em SVG). */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
