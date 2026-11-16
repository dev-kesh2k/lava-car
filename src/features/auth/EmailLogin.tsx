import { Mail } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

/** Link mágico por e-mail (sem senha) e login com Google. */
export function EmailLogin({ tenantSlug }: { tenantSlug: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectTo = `${window.location.origin}/auth/callback`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo, data: { tenant_slug: tenantSlug } },
    });
    setBusy(false);
    if (error) setError(errorMessage(error));
    else setSent(true);
  }

  async function google() {
    setError(null);
    // O slug vai pela URL de volta: o cadastro do Google não aceita metadata própria.
    localStorage.setItem('lavacar:loja', tenantSlug);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) setError(errorMessage(error));
  }

  if (sent) {
    return (
      <Alert kind="success">
        Pronto! Abra o link que mandamos para <strong>{email}</strong> neste aparelho para entrar.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={sendLink} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          <Mail /> Receber link de acesso
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={google}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
        </svg>
        Entrar com Google
      </Button>
    </div>
  );
}
