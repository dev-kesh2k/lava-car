import { Check, Copy, QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPixCharge, type PixCharge } from '@/api/payments';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useRealtimeOS } from '@/hooks/useRealtimeOS';
import { errorMessage } from '@/lib/errors';
import { formatBRL, formatTime } from '@/lib/format';

/** QR Code Pix da OS; a tela vira "Pago!" sozinha quando o webhook confirma (Realtime). */
export function PixPayment({ osId, onPaid }: { osId: string; onPaid?: () => void }) {
  const [charge, setCharge] = useState<PixCharge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    createPixCharge(osId).then(setCharge, (err) => setError(errorMessage(err, 'Não foi possível gerar o Pix.')));
  }, [osId]);

  useRealtimeOS(`id=eq.${osId}`, (row) => {
    if (row.payment_status === 'PAID') {
      setPaid(true);
      onPaid?.();
    }
  });

  if (paid) return <Alert kind="success">Pagamento confirmado! Seu horário está garantido.</Alert>;
  if (error) return <Alert kind="error">{error} Você ainda pode pagar no local.</Alert>;
  if (!charge) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
        <Spinner /> Gerando QR Code Pix...
      </div>
    );
  }

  async function copy() {
    await navigator.clipboard.writeText(charge!.qr_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="flex items-center gap-2 font-semibold">
        <QrCode className="h-5 w-5 text-primary" /> Pague {formatBRL(charge.amount)} com Pix
      </p>
      <img src={`data:image/png;base64,${charge.qr_code_base64}`} alt="QR Code Pix" className="h-56 w-56 rounded-lg border bg-white p-2" />
      <Button variant="outline" className="w-full" onClick={copy}>
        {copied ? <Check /> : <Copy />} {copied ? 'Copiado!' : 'Copiar código Pix'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Válido até {formatTime(charge.expires_at)}. A confirmação é automática, pode deixar esta tela aberta.
      </p>
    </div>
  );
}
