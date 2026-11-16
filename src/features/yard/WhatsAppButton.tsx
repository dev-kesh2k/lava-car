import { MessageCircle } from 'lucide-react';
import type { OsWithDetails } from '@/api/appointments';
import { Button } from '@/components/ui/button';
import { readyMessage, whatsappLink } from '@/lib/whatsapp';

/** Abre o WhatsApp com "Olá [Nome], seu [Modelo] placa [Placa] já está limpo e pronto para retirada!". */
export function WhatsAppButton({ os, shopName }: { os: OsWithDetails; shopName: string }) {
  const link = whatsappLink(
    os.customer_phone,
    readyMessage({ name: os.customer_name, model: os.vehicle?.model ?? '', plate: os.vehicle?.plate ?? '', shop: shopName }),
  );
  if (!link) {
    return (
      <Button variant="outline" size="lg" disabled className="flex-1" title="Cliente sem telefone">
        <MessageCircle /> Sem telefone
      </Button>
    );
  }
  return (
    <Button asChild size="lg" className="flex-1 bg-[#25D366] text-white hover:bg-[#1ebe5b]">
      <a href={link} target="_blank" rel="noreferrer">
        <MessageCircle /> Avisar no WhatsApp
      </a>
    </Button>
  );
}
