import { useEffect, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
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
/**
 * Barra de navegação do iOS: título grande (Large Title) que, ao rolar, vira o título
 * pequeno centralizado na barra translúcida do topo. O "Voltar" fica na barra.
 */
export function PageHead({
  title,
  subtitle,
  action,
  back,
  onBack,
  eyebrow,
  barTitle,
  toolbar,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  back?: string | true;
  onBack?: () => void;
  eyebrow?: ReactNode;
  /** Texto do título pequeno da barra (padrão: o próprio título, se for texto). */
  barTitle?: string;
  /** Botões de ícone à direita na barra de navegação (use a classe bar-btn). */
  toolbar?: ReactNode;
}) {
  const nav = useNavigate();
  const ref = useRef<HTMLHeadingElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const check = () => {
      const el = ref.current;
      if (el) setCollapsed(el.getBoundingClientRect().bottom < 52);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);
  const small = barTitle ?? (typeof title === 'string' ? title : '');
  const hasBack = !!(back || onBack);
  return (
    <header className="mb-6">
      <div
        className={`pointer-events-none fixed inset-x-0 top-0 z-30 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow] duration-200 md:[.has-side_&]:left-64 ${
          collapsed ? 'glass hairline-b' : ''
        }`}
      >
        <div className="relative mx-auto flex h-11 max-w-5xl items-center px-2 md:px-6">
          {hasBack && (
            <button
              type="button"
              aria-label="Voltar"
              onClick={() => (onBack ? onBack() : back === true ? nav(-1) : nav(back as string))}
              className="btn-text pointer-events-auto relative z-10 -ml-0.5 pr-3"
            >
              <ChevronLeft size={28} strokeWidth={2.2} className="-mr-1" /> Voltar
            </button>
          )}
          <p
            aria-hidden
            className={`absolute inset-x-24 truncate text-center text-body font-semibold text-ink transition-opacity duration-200 ${collapsed ? 'opacity-100' : 'opacity-0'}`}
          >
            {small}
          </p>
          {toolbar && <div className="pointer-events-auto relative z-10 ml-auto flex items-center">{toolbar}</div>}
        </div>
      </div>
      {eyebrow && <p className="mb-0.5 text-subhead text-muted">{eyebrow}</p>}
      <div className="flex items-center gap-3">
        <h1 ref={ref} className="h1 min-w-0 flex-1">
          {title}
        </h1>
        {action}
      </div>
      {subtitle && <p className="mt-1.5 text-subhead text-muted">{subtitle}</p>}
    </header>
  );
}

// ---------- Switch ----------
/** Igual ao do iPhone: 51×31, verde do sistema, botão branco com sombra. */
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
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ease-out disabled:opacity-50 ${checked ? 'bg-okfill' : 'bg-[rgb(120_120_128_/_0.24)]'}`}
    >
      <span
        className={`absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition-transform duration-200 ease-out ${checked ? 'translate-x-5' : ''}`}
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
      ? 'h-16 w-16 text-title2 min-[380px]:h-[76px] min-[380px]:w-[76px] min-[380px]:text-title1'
      : size === 'sm' ? 'h-10 w-10 text-subhead' : 'h-12 w-12 text-body';
  if (src && !failed) return <img src={src} alt={name} onError={() => setFailed(true)} className={`shrink-0 rounded-full bg-surface2 object-cover ${s}`} />;
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${s}`}
      style={{ background: accent ? 'linear-gradient(160deg,#2BB8F0,#0A6CD6)' : 'linear-gradient(160deg,#A1A1A8,#7C7C83)' }}
    >
      {initials(name)}
    </div>
  );
}

// ---------- Status ----------
export function StatusPill({ status, plain }: { status: OrderStatus; plain?: boolean }) {
  const s = STATUS[status];
  if (plain) return <span className={`text-subhead font-semibold ${s.text}`}>{s.label}</span>;
  return (
    <span className={`inline-flex min-h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-footnote font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.bar}`} aria-hidden />
      {s.label}
    </span>
  );
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
/** Cor de cada ícone, no estilo dos ícones do app Ajustes do iPhone. */
const SERVICE_TINT: Record<string, [string, string]> = {
  droplet: ['#3FC3F5', '#0A6CD6'],
  sparkles: ['#8E8CFF', '#5856D6'],
  car: ['#52D3E8', '#0A8FB0'],
  armchair: ['#FFB547', '#FF8A00'],
  spray: ['#5EDB7E', '#22A447'],
  circle: ['#A1A1A8', '#6C6C72'],
  star: ['#FFD43B', '#FF9F0A'],
  shield: ['#D88CFF', '#A54BD8'],
};
export const SERVICE_ICON_KEYS = Object.keys(SERVICE_ICONS);

export function ServiceIcon({ icon, active = true, size = 'md' }: { icon: string; active?: boolean; size?: 'sm' | 'md' }) {
  const I = SERVICE_ICONS[icon] || Droplet;
  const [a, b] = active ? SERVICE_TINT[icon] || SERVICE_TINT.droplet : ['#C7C7CC', '#AEAEB2'];
  const box = size === 'sm' ? 'h-10 w-10 rounded-[11px]' : 'h-12 w-12 rounded-[13px]';
  const style: CSSProperties = { background: `linear-gradient(160deg, ${a}, ${b})` };
  return (
    <div className={`flex shrink-0 items-center justify-center text-white ${box}`} style={style}>
      <I size={size === 'sm' ? 21 : 24} strokeWidth={2} />
    </div>
  );
}

/** Ícone colorido de linha de lista, como no app Ajustes do iPhone. */
export function Tile({ icon: I, color }: { icon: LucideIcon; color: string }) {
  return (
    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] text-white" style={{ background: color }}>
      <I size={18} strokeWidth={2} />
    </span>
  );
}

// ---------- Placa e porte ----------
/** Placa no padrão Mercosul: faixa azul com "BRASIL", emblema e bandeira; letras pretas em fundo branco. */
export function Plate({ plate, size = 'md' }: { plate: string; size?: 'sm' | 'md' | 'lg' }) {
  const s =
    size === 'lg'
      ? { w: 'min-w-[9.5rem]', band: 'h-[13px]', text: 'text-[26px] px-3 pb-1 pt-0.5', r: 'rounded-[7px]' }
      : size === 'sm'
        ? { w: 'min-w-[5.6rem]', band: 'h-[8px]', text: 'text-[15px] px-2 pb-[3px] pt-px', r: 'rounded-[4px]' }
        : { w: 'min-w-[7.25rem]', band: 'h-[10px]', text: 'text-[19px] px-2.5 pb-1 pt-0.5', r: 'rounded-[5px]' };
  return (
    <span
      className={`inline-flex shrink-0 flex-col overflow-hidden border-[1.5px] border-[#1C1C1E] bg-white text-center font-sans font-bold leading-none text-[#111] tabular-nums shadow-[0_1px_2px_rgba(0,0,0,0.12)] ${s.w} ${s.r}`}
      aria-label={`Placa ${formatPlate(plate)}`}
    >
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className={`block w-full ${s.band}`} aria-hidden>
        <rect width="100" height="10" fill="#0039A6" />
        <circle cx="6" cy="5" r="2.6" fill="none" stroke="#fff" strokeWidth="0.6" />
        <text x="50" y="7.4" textAnchor="middle" fill="#fff" fontSize="6.6" fontWeight="700" fontFamily="Arial, sans-serif" letterSpacing="1.2">
          BRASIL
        </text>
        <rect x="89" y="2.2" width="7" height="5.6" fill="#009C3B" />
        <path d="M92.5 2.9 95.6 5 92.5 7.1 89.4 5z" fill="#FFDF00" />
        <circle cx="92.5" cy="5" r="1.2" fill="#002776" />
      </svg>
      <span className={`whitespace-nowrap tracking-[0.08em] ${s.text}`} style={{ fontStretch: '90%' }}>{formatPlate(plate)}</span>
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
      <circle cx={size === 'small' ? 26 : 22} cy="42" r="7" fill="rgb(var(--surface))" stroke="currentColor" strokeWidth="3" />
      <circle cx={size === 'small' ? 66 : 72} cy="42" r="7" fill="rgb(var(--surface))" stroke="currentColor" strokeWidth="3" />
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
            className={`relative flex min-w-0 flex-col items-center rounded-card bg-surface px-2 pb-3 pt-3.5 text-center shadow-[var(--shadow-card)] ring-2 transition-[box-shadow,color] duration-200 ${on ? 'text-accent ring-accent' : 'text-dis ring-transparent'}`}
          >
            {on && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-onaccent">
                <Check size={13} strokeWidth={3} />
              </span>
            )}
            <CarSilhouette size={s} className="h-9 w-16" />
            <span className="mt-1.5 text-subhead font-semibold text-ink">{SIZE_INFO[s].label}</span>
            <span className="text-footnote text-muted">{SIZE_INFO[s].short}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Estados ----------
export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-subhead text-muted" role="status">
      <Loader2 className="animate-spin" size={20} /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-6 text-center">
      <AlertCircle className="text-danger" />
      <p className="text-subhead text-soft">{message}</p>
      {onRetry && (
        <button className="btn-text font-semibold" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function Empty({ icon: I, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-1.5 px-6 py-9 text-center">
      <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-tint text-accent">
        <I size={26} strokeWidth={1.75} />
      </div>
      <p className="text-body font-semibold">{title}</p>
      {text && <p className="max-w-sm text-subhead text-muted">{text}</p>}
      {action && <div className="mt-3 w-full max-w-xs">{action}</div>}
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex animate-fade-in items-start gap-2 rounded-cell bg-dangerbg px-4 py-3 text-subhead text-danger">
      <AlertCircle size={18} className="mt-px shrink-0" /> <span className="min-w-0 break-words">{message}</span>
    </p>
  );
}

// ---------- Campos ----------
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block px-1 text-footnote text-muted">{hint}</span>}
    </label>
  );
}

export function IconInput({ icon: I, ...props }: { icon: LucideIcon } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <I size={20} strokeWidth={1.75} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input {...props} className="input pl-12" />
    </div>
  );
}

export function PasswordInput({ icon: I, ...props }: { icon?: LucideIcon } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      {I && <I size={20} strokeWidth={1.75} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />}
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
/** Marca de seleção do iOS: círculo vazio ou preenchido com check. */
export function Radio({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${on ? 'bg-brand text-onaccent' : 'border-[1.5px] border-line2'}`}
    >
      {on && <Check size={14} strokeWidth={3.2} />}
    </span>
  );
}

export function Checkbox({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] transition-colors duration-200 ${on ? 'bg-brand text-onaccent' : 'border-[1.5px] border-line2'}`}
    >
      {on && <Check size={14} strokeWidth={3.2} />}
    </span>
  );
}

// ---------- Etapas do agendamento ----------
const STEPS = ['Veículo', 'Serviços', 'Horário', 'Resumo'];
export function Stepper({ step }: { step: number }) {
  return (
    <ol className="-mt-3 mb-6 grid grid-cols-4 gap-1.5" aria-label="Etapas do agendamento">
      {STEPS.map((s, i) => (
        <li key={s} className="min-w-0" aria-current={i === step ? 'step' : undefined}>
          <div className="h-1 overflow-hidden rounded-full bg-surface2">
            <div className={`h-full rounded-full bg-brand transition-[width] duration-300 ease-out ${i <= step ? 'w-full' : 'w-0'}`} />
          </div>
          <p className={`mt-1.5 truncate text-footnote ${i === step ? 'font-semibold text-ink' : i < step ? 'text-soft' : 'text-muted'}`}>{s}</p>
        </li>
      ))}
    </ol>
  );
}

// ---------- Folha modal (sheet do iOS) ----------
/**
 * Folha que sobe de baixo, com alça. `header` fica fixo sob o título, `footer` fica fixo no rodapé
 * (área segura) e só o meio rola. `tall` fixa a altura (bom para folhas com abas, que não "pulam").
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  header,
  footer,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  tall?: boolean;
}) {
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
  const pad = 'px-4 min-[380px]:px-5';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} />
      <div
        className={`relative flex w-full animate-sheet-up flex-col overflow-hidden rounded-t-[14px] bg-elevated shadow-2xl md:max-w-lg md:animate-pop-in md:rounded-[14px] ${
          tall ? 'h-[92dvh] md:h-[min(760px,88dvh)]' : 'max-h-[94dvh]'
        }`}
      >
        <div className={`shrink-0 pb-3 pt-2 ${pad} ${header ? 'hairline-b' : ''}`}>
          <div className="mx-auto mb-2.5 h-[5px] w-9 rounded-full bg-line md:hidden" aria-hidden />
          <div className="flex items-center gap-3">
            <h2 className="min-w-0 flex-1 break-words text-title3 font-bold">{title}</h2>
            <button type="button" aria-label="Fechar" onClick={onClose} className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface2 text-muted">
                <X size={17} strokeWidth={2.6} />
              </span>
            </button>
          </div>
          {header}
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain pt-1 ${pad} ${footer ? 'pb-5' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]'}`}>{children}</div>
        {footer && <div className={`glass hairline-t shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 ${pad}`}>{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Action sheet do iOS ----------
export type SheetAction = { label: string; onClick: () => void; destructive?: boolean; icon?: LucideIcon };

/** Lista de ações que sobe de baixo, com o "Cancelar" separado, como no iPhone. */
export function ActionSheet({ open, onClose, title, actions }: { open: boolean; onClose: () => void; title?: string; actions: SheetAction[] }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const group = 'overflow-hidden rounded-[14px] bg-[rgb(var(--surface)/0.92)] backdrop-blur-xl';
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title || 'Ações'}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md animate-sheet-up px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:animate-pop-in">
        <div className={group}>
          {title && <p className="px-4 py-3.5 text-center text-footnote text-muted hairline-b">{title}</p>}
          {actions.map((a, i) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                onClose();
                a.onClick();
              }}
              className={`flex min-h-[56px] w-full items-center justify-center gap-2 px-4 text-[19px] transition-colors active:bg-surface2 ${a.destructive ? 'text-danger' : 'text-accent'} ${i ? 'hairline-t' : ''}`}
            >
              {a.icon && <a.icon size={20} strokeWidth={1.9} />}
              {a.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} className={`${group} mt-2 flex min-h-[56px] w-full items-center justify-center text-[19px] font-semibold text-accent active:bg-surface2`}>
          Cancelar
        </button>
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
            <button className="icon-btn absolute left-3 top-1/2 -translate-y-1/2" aria-label="Foto anterior" onClick={() => go(-1)}>
              <ChevronLeft size={24} />
            </button>
            <button className="icon-btn absolute right-3 top-1/2 -translate-y-1/2" aria-label="Próxima foto" onClick={() => go(1)}>
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
          className={`glass flex max-w-md animate-toast-in items-center gap-2 rounded-full px-5 py-3 text-subhead font-semibold shadow-[0_8px_30px_rgba(0,0,0,0.16)] ${t.error ? 'text-danger' : 'text-ink'}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[#FF9F0A]" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} fill={i <= value ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}
