import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Camera, Car, ChevronRight, CircleHelp, Info, Lock, MessageSquareHeart, Smartphone, Stamp } from 'lucide-react';
import { api, apiUrl } from '../../api';
import { forgetClient, getSavedName, getSavedPhone, isValidPhone, maskPhone, saveClient } from '../../client';
import { Avatar, Field, FormError, PageHead, Sheet, Tile, toast } from '../../ui';
import { squareImage } from '../../util';

const MENU = [
  { to: '/agenda', label: 'Minhas lavagens', icon: CalendarDays, color: '#FF3B30' },
  { to: '/garagem', label: 'Garagem', icon: Car, color: '#0A6CD6' },
  { to: '/fidelidade', label: 'Cartão fidelidade', icon: Stamp, color: '#34C759' },
  { to: '/sobre', label: 'Sobre e localização', icon: Info, color: '#5AC8FA' },
  { to: '/perfil/feedback', label: 'Enviar feedback', icon: MessageSquareHeart, color: '#FF2D55' },
  { to: '/perfil/ajuda', label: 'Ajuda e suporte', icon: CircleHelp, color: '#8E8E93' },
];

interface ClientProfile {
  name: string;
  avatar: string | null;
}

export default function Profile() {
  const [phone, setPhone] = useState(getSavedPhone);
  const [name, setName] = useState(getSavedName);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ phone: '', name: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!phone) {
      setProfile(null);
      return;
    }
    let alive = true;
    api
      .get<{ profile: ClientProfile }>(`/client-profile?phone=${encodeURIComponent(phone)}`)
      .then((r) => {
        if (!alive) return;
        setProfile(r.profile);
        // O nome salvo em outro aparelho (ou num comentário) vale aqui também.
        if (!getSavedName() && r.profile.name) {
          saveClient(phone, r.profile.name);
          setName(r.profile.name);
        }
      })
      .catch(() => alive && setProfile(null));
    return () => {
      alive = false;
    };
  }, [phone]);

  function edit() {
    setF({ phone, name });
    setErr('');
    setOpen(true);
  }

  async function save() {
    if (!isValidPhone(f.phone)) return setErr('Informe o celular com DDD, ex.: (45) 99123-4567');
    setBusy(true);
    try {
      const r = await api.put<{ profile: ClientProfile }>('/client-profile', { phone: f.phone, name: f.name });
      saveClient(f.phone, f.name);
      setPhone(getSavedPhone());
      setName(getSavedName());
      setProfile(r.profile);
      setOpen(false);
      toast('Dados salvos');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changeAvatar(file?: File) {
    if (!file) return;
    if (!phone) {
      edit();
      return toast('Informe seu celular para salvar a foto', true);
    }
    setBusy(true);
    try {
      const r = await api.post<{ profile: ClientProfile }>('/client-profile/avatar', { phone, image: await squareImage(file, 512) });
      setProfile(r.profile);
      toast('Foto atualizada');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  async function removeAvatar() {
    if (!confirm('Remover sua foto?')) return;
    try {
      const r = await api.del<{ profile: ClientProfile }>(`/client-profile/avatar?phone=${encodeURIComponent(phone)}`);
      setProfile(r.profile);
      toast('Foto removida');
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  function forget() {
    forgetClient();
    setPhone('');
    setName('');
    setProfile(null);
    toast('Celular removido deste aparelho');
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Perfil" />
      <div className="card flex items-center gap-4 p-5 min-[380px]:p-6">
        <label className={`relative shrink-0 cursor-pointer ${busy ? 'pointer-events-none opacity-60' : ''}`} aria-label="Trocar foto do perfil">
          <Avatar name={name || 'Você'} size="lg" accent src={apiUrl(profile?.avatar)} />
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-brand text-onaccent">
            <Camera size={16} />
          </span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
              changeAvatar(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <button onClick={edit} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="min-w-0 flex-1">
            {phone ? (
              <>
                <span className="block break-words text-title3 font-semibold">{name || 'Seu perfil'}</span>
                <span className="block text-subhead text-muted">{phone}</span>
              </>
            ) : (
              <>
                <span className="block text-title3 font-semibold">Sem celular salvo</span>
                <span className="block text-subhead text-muted">Toque para informar</span>
              </>
            )}
          </span>
          <ChevronRight size={20} className="chev" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 px-1">
        <p className="text-footnote text-muted">Sem cadastro: seu celular guarda a garagem, as lavagens e os selos.</p>
        {profile?.avatar && (
          <button className="min-h-[40px] text-sm font-bold text-accent" onClick={removeAvatar}>
            Remover foto
          </button>
        )}
      </div>

      <nav className="list mt-6" style={{ '--sep-inset': '58px' } as CSSProperties} aria-label="Opções">
        {MENU.map((m) => (
          <Link key={m.to} to={m.to} className="cell">
            <Tile icon={m.icon} color={m.color} />
            <span className="min-w-0 flex-1 text-body">{m.label}</span>
            <ChevronRight size={20} className="chev" />
          </Link>
        ))}
      </nav>

      {phone && (
        <button onClick={forget} className="list cell mt-6 text-body text-danger active:bg-surface2">
          <Smartphone size={20} /> Esquecer meu celular neste aparelho
        </button>
      )}

      <Link to="/admin" className="mt-8 flex min-h-[44px] items-center justify-center gap-2 text-sm text-muted">
        <Lock size={16} /> Área da equipe
      </Link>

      <Sheet open={open} onClose={() => setOpen(false)} title="Seus dados">
        <div className="grid gap-4">
          <Field label="Celular (WhatsApp) *">
            <input className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="(45) 99123-4567" value={f.phone} onChange={(e) => setF({ ...f, phone: maskPhone(e.target.value) })} />
          </Field>
          <Field label="Nome" hint="Aparece nos seus agendamentos e avaliações">
            <input className="input" autoComplete="name" maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <FormError message={err} />
          <button className="btn-primary" disabled={busy} onClick={save}>
            Salvar
          </button>
        </div>
      </Sheet>
    </div>
  );
}
