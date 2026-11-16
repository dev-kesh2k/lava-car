/** Mensagem amigável para erros do Supabase/PostgREST (as funções do banco já falam português). */
export function errorMessage(err: unknown, fallback = 'Algo deu errado. Tente de novo.'): string {
  if (!err) return fallback;
  const e = err as { message?: string; code?: string; status?: number };
  const msg = e.message ?? (typeof err === 'string' ? err : '');
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Sem conexão. Confira a internet e tente de novo.';
  if (e.code === '23505') return 'Esse registro já existe (placa ou nome repetido).';
  if (e.code === '42501') return msg && !/permission denied|row-level security/i.test(msg) ? msg : 'Você não tem permissão para isso.';
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/Token has expired|otp.*(expired|invalid)/i.test(msg)) return 'Código expirado ou inválido. Peça um novo.';
  if (/JWT expired/i.test(msg)) return 'Sua sessão expirou. Entre de novo.';
  return msg || fallback;
}
