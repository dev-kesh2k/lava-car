import { Download, Share } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

/** Sugere instalar o PWA na tela inicial (Android: botão; iPhone: dica do Compartilhar). */
export function InstallBanner() {
  const { canInstall, showIosHint, install } = useInstallPrompt();
  const [closed, setClosed] = useState(() => localStorage.getItem('lavacar:install-hint') === 'off');

  if (closed || (!canInstall && !showIosHint)) return null;
  const close = () => {
    localStorage.setItem('lavacar:install-hint', 'off');
    setClosed(true);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
      {canInstall ? <Download className="h-5 w-5 text-primary" /> : <Share className="h-5 w-5 text-primary" />}
      <p className="flex-1">
        {canInstall ? 'Instale o app para agendar mais rápido.' : 'No iPhone: toque em Compartilhar e "Adicionar à Tela de Início".'}
      </p>
      {canInstall && (
        <Button size="sm" onClick={install}>
          Instalar
        </Button>
      )}
      <button className="text-xs text-muted-foreground" onClick={close}>
        Agora não
      </button>
    </div>
  );
}
