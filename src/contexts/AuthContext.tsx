import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getMyProfile } from '@/api/profiles';
import { getTenant } from '@/api/tenants';
import type { Profile, Tenant } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  tenant: Tenant | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

/** Sessão do Supabase + perfil (papel) + loja do usuário, disponíveis para todo o app. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setProfile(null);
      setTenant(null);
      setLoading(false);
      return;
    }
    try {
      const p = await getMyProfile(s.user.id);
      setProfile(p);
      setTenant(p ? await getTenant(p.tenant_id) : null);
    } catch (err) {
      console.error('Falha ao carregar o perfil', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      // TOKEN_REFRESHED não muda o perfil: só atualiza a sessão.
      if (event === 'TOKEN_REFRESHED') setSession(s);
      else void load(s);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      tenant,
      loading,
      refresh: async () => {
        const { data } = await supabase.auth.getSession();
        await load(data.session);
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, tenant, loading, load],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
