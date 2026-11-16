import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Armchair,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Droplet,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  SprayCan,
  Star,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { OrderStatus, Size } from './api';
import { formatPlate, SIZE_INFO, SIZES, STATUS, initials } from './util';

// ---------- Cabeçalho de página ----------
export function PageHead({
  title,
  subtitle,
  action,
  back,
  onBack,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  back?: string | true;
  onBack?: () => void;
  eyebrow?: ReactNode;
}) {
  const nav = useNavigate();
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3">
        {(back || onBack) && (
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => (onBack ? onBack() : back === true ? nav(-1) : nav(back as string))}
            className="icon-btn border-transparent"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="mb-1 text-sm font-bold uppercase tracking-[0.12em] text-muted">{eyebrow}</p>}
          <h1 className="h1">{title}</h1>
        </div>
        {action}
      </div>
      {subtitle && <p className="mt-3 text-base text-muted">{subtitle}</p>}
    </header>
  );
}

// ---------- Switch ----------
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative h-[30px] w-[52px] shrink-0 rounded-full transition disabled:opacity-50 ${checked ? 'bg-accent' : 'bg-surface2'}`}
    >
      <span
        className={`absolute top-[4px] h-[22px] w-[22px] rounded-full transition-all ${checked ? 'left-[26px] bg-bg' : 'left-[4px] bg-muted'}`}
      />
      <span className="absolute -inset-2" />
    </button>
  );
}

// ---------- Avatar ----------
/** Foto quando houver; senão (ou se a imagem falhar), as iniciais. */
export function Avatar({ name, size = 'md', accent, src }: { name: string; size?: 'sm' | 'md' | 'lg'; accent?: boolean; src?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  const s =
    size === 'lg'
      ? `h-14 w-14 text-lg min-[380px]:h-[72px] min-[380px]:w-[72px] min-[380px]:text-2xl ${accent ? 'rounded-full' : 'rounded-2xl min-[380px]:rounded-[20px]'}`
      : size === 'sm' ? 'h-11 w-11 text-sm rounded-xl' : 'h-14 w-14 text-lg rounded-2xl';
  if (src && !failed) return <img src={src} alt={name} onError={() => setFailed(true)} className={`shrink-0 bg-surface2 object-cover ${s}`} />;
  return (
    <div className={`flex shrink-0 items-center justify-center font-bold ${s} ${accent ? 'bg-accent text-bg' : 'bg-surface2 text-ink'}`}>
      {initials(name)}
    </div>
  );
}

// ---------- Status ----------
export function StatusPill({ status, plain }: { status: OrderStatus; plain?: boolean }) {
  const s = STATUS[status];
  if (plain) return <span className={`text-sm font-bold ${s.text}`}>{s.label}</span>;
  return <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm font-bold ${s.bg} ${s.text}`}>{s.label}</span>;
}

// ---------- Ícones de serviço ----------
const SERVICE_ICONS: Record<string, LucideIcon> = {
  droplet: Droplet,
  sparkles: Sparkles,
  car: Car,
  armchair: Armchair,
  spray: SprayCan,
  circle: CircleDot,
  star: Star,
  shield: ShieldCheck,
};
export const SERVICE_ICON_KEYS = Object.keys(SERVICE_ICONS);

export function ServiceIcon({ icon, active = true, size = 'md' }: { icon: string; active?: boolean; size?: 'sm' | 'md' }) {
  const I = SERVICE_ICONS[icon] || Droplet;
  const box = size === 'sm' ? 'h-11 w-11 rounded-xl' : 'h-12 w-12 rounded-[14px] min-[380px]:h-14 min-[380px]:w-14';
  return (
    <div className={`flex shrink-0 items-center justify-center ${box} ${active ? 'stripes text-accent' : 'bg-surface2 text-muted'}`}>
      <I size={size === 'sm' ? 22 : 24} />
    </div>
  );
}

// ---------- Placa e porte ----------
/** Placa no estilo Mercosul (faixa azul no topo). */
export function Plate({ plate, size = 'md' }: { plate: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 'min-w-[8.5rem] text-2xl' : size === 'sm' ? 'min-w-[5.5rem] text-sm' : 'min-w-[7rem] text-lg';
  return (
    <span className={`inline-flex shrink-0 flex-col overflow-hidden rounded-md border-2 border-[#1d2b36] bg-white text-center font-mono font-bold leading-none text-[#0f172a] ${s}`}>
      <span className="h-1.5 bg-[#0b4fa3]" aria-hidden />
      <span className="px-2 py-1 tracking-[0.06em]">{formatPlate(plate)}</span>
    </span>
  );
}

/** Silhueta do carro por porte (seletor visual). */
export function CarSilhouette({ size, className = '' }: { size: Size; className?: string }) {
  const paths: Record<Size, string> = {
    small: 'M14 40v-8c0-3 2-5 4-6l6-2 8-10c2-2 4-3 7-3h18c3 0 5 1 7 3l8 10h2c3 0 6 3 6 6v10z',
    medium: 'M6 40v-7c0-3 2-5 4-6l10-3 10-10c2-2 4-3 7-3h22c3 0 5 1 7 3l9 10 8 2c2 1 3 3 3 5v9z',
    large: 'M8 40V25c0-3 2-6 5-6l9-1 8-8c2-2 4-3 7-3h28c3 0 5 2 6 4l5 9 7 2c2 1 3 3 3 5v13z',
    pickup: 'M4 40v-9c0-2 2-4 4-4h40V14c0-2 2-4 4-4h16c3 0 5 1 6 3l7 12 7 2c2 1 3 3 3 5v8z',
  };
  return (
    <svg viewBox="0 0 92 52" className={className} aria-hidden>
      <path d={paths[size]} fill="currentColor" />
      <circle cx={size === 'small' ? 26 : 22} cy="42" r="7" fill="#0A0F14" stroke="currentColor" strokeWidth="3" />
      <circle cx={size === 'small' ? 66 : 72} cy="42" r="7" fill="#0A0F14" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

export function SizePicker({ value, onChange }: { value: Size | ''; onChange: (s: Size) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="radiogroup" aria-label="Porte do veículo">
      {SIZES.map((s) => {
        const on = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s)}
            className={`flex min-w-0 flex-col items-center rounded-[18px] border px-2 py-3 text-center transition active:scale-[0.98] ${on ? 'border-accent bg-tint text-accent' : 'border-line bg-surface text-soft'}`}
          >
            <CarSilhouette size={s} className="h-9 w-16" />
            <span className={`mt-1 text-base font-bold ${on ? 'text-ink' : ''}`}>{SIZE_INFO[s].label}</span>
            <span className="text-sm text-muted">{SIZE_INFO[s].short}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Estados ----------
export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
      <Loader2 className="animate-spin" size={20} /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-6 text-center">
      <AlertCircle className="text-danger" />
      <p className="text-soft">{message}</p>
      {onRetry && (
        <button className="btn-secondary min-h-[44px]" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function Empty({ icon: I, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface2 text-accent">
        <I size={26} />
      </div>
      <p className="text-lg font-bold">{title}</p>
      {text && <p className="max-w-sm text-muted">{text}</p>}
      {action && <div className="mt-3 w-full max-w-xs">{action}</div>}
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-dangerbg px-4 py-3 text-sm text-danger">
      <AlertCircle size={18} className="mt-0.5 shrink-0" /> <span className="min-w-0 break-words">{message}</span>
    </p>
  );
}

// ---------- Campos ----------
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-muted">{hint}</span>}
    </label>
  );
}

export function IconInput({ icon: I, ...props }: { icon: LucideIcon } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <I size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input {...props} className="input pl-12" />
    </div>
  );
}

export function PasswordInput({ icon: I, ...props }: { icon?: LucideIcon } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      {I && <I size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />}
      <input {...props} type={show ? 'text' : 'password'} className={`input pr-14 ${I ? 'pl-12' : ''}`} />
      <button
        type="button"
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        onClick={() => setShow((s) => !s)}
        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted"
      >
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}

// ---------- Rádio ----------
export function Radio({ on }: { on: boolean }) {
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-accent' : 'border-line2'}`}>
      {on && <span className="h-3 w-3 rounded-full bg-accent" />}
    </span>
  );
}

export function Checkbox({ on }: { on: boolean }) {
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-accent bg-accent text-bg' : 'border-line2'}`}>
      {on && <Check size={16} strokeWidth={3} />}
    </span>
  );
}

// ---------- Etapas do agendamento ----------
const STEPS = ['Veículo', 'Serviços', 'Horário', 'Resumo'];
export function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Etapas do agendamento">
      {STEPS.map((s, i) => (
        <li key={s} className="min-w-0" aria-current={i === step ? 'step' : undefined}>
          <div className={`h-1.5 rounded-full ${i <= step ? 'bg-accent' : 'bg-surface2'}`} />
          <p className={`mt-2 truncate text-sm ${i === step ? 'font-bold text-ink' : i < step ? 'text-soft' : 'text-muted'}`}>{s}</p>
        </li>
      ))}
    </ol>
  );
}

// ---------- Bottom sheet / modal ----------
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] border border-line bg-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 md:max-w-lg md:rounded-[24px]">
        <div className="mb-5 flex items-center gap-3">
          <h2 className="h2 min-w-0 flex-1 break-words">{title}</h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="icon-btn h-11 w-11 bg-surface2">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Visualizador de fotos ----------
export function Lightbox({
  urls,
  index,
  onIndex,
  onClose,
  caption,
}: {
  urls: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  caption?: ReactNode;
}) {
  const [touchX, setTouchX] = useState<number | null>(null);
  const count = urls.length;
  const go = (d: number) => count > 1 && onIndex((index + d + count) % count);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Foto ampliada"
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        setTouchX(null);
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="text-sm text-soft">{count > 1 ? `${index + 1} de ${count}` : ''}</span>
        <button className="icon-btn" aria-label="Fechar" onClick={onClose}>
          <X size={22} />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
        <img src={urls[index]} alt="" className="h-full w-full object-contain" />
        {count > 1 && (
          <>
            <button className="icon-btn absolute left-3 top-1/2 -translate-y-1/2 bg-bg/80" aria-label="Foto anterior" onClick={() => go(-1)}>
              <ChevronLeft size={24} />
            </button>
            <button className="icon-btn absolute right-3 top-1/2 -translate-y-1/2 bg-bg/80" aria-label="Próxima foto" onClick={() => go(1)}>
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>
      {caption && <div className="mx-auto w-full max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{caption}</div>}
    </div>
  );
}

// ---------- Toast ----------
type ToastMsg = { id: number; text: string; error?: boolean };
let pushToast: (t: ToastMsg) => void = () => {};
export const toast = (text: string, error = false) => pushToast({ id: Date.now() + Math.random(), text, error });

export function Toaster() {
  const [list, setList] = useState<ToastMsg[]>([]);
  useEffect(() => {
    pushToast = (t) => {
      setList((l) => [...l, t]);
      setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 3200);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 px-4">
      {list.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`max-w-md rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl ${t.error ? 'border-danger/50 bg-dangerbg text-danger' : 'border-line bg-surface2 text-ink'}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-accent" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} fill={i <= value ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}
