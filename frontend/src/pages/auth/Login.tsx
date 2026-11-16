import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { api, type User } from '../../api';
import { useAuth } from '../../auth';
import { Logo } from '../../layout';
import { FormError, IconInput, PasswordInput } from '../../ui';

/** Login da equipe (dono e operadores; clientes não fazem login). */
export default function AdminLogin() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
      signIn(r.token, r.user);
      nav('/admin', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-md px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
        <Logo />
        <p className="mt-10 text-subhead font-semibold text-accent">Área da equipe</p>
        <h1 className="h1 mt-1">Entrar</h1>
        <p className="mt-2 text-base text-muted">Pátio, agenda e balcão para os operadores; painel, preços, comissões e caixa para o dono.</p>
        <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
          <IconInput icon={Mail} type="email" inputMode="email" placeholder="E-mail" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="E-mail" />
          <PasswordInput icon={Lock} placeholder="Senha" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-label="Senha" />
          <FormError message={error} />
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <Link to="/" className="mt-6 flex min-h-[48px] items-center justify-center text-base text-soft">
          Voltar para o app do cliente
        </Link>
      </div>
    </div>
  );
}
