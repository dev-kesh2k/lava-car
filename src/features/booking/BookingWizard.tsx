import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useMemo, useReducer, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bookAppointment } from '@/api/appointments';
import { listMyVehicles } from '@/api/vehicles';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageSpinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/hooks/useAuth';
import { useCatalog } from '@/hooks/useCatalog';
import { errorMessage } from '@/lib/errors';
import { formatBRL } from '@/lib/format';
import { quote as buildQuote } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { PixPayment } from './PixPayment';
import { StepSchedule } from './StepSchedule';
import { StepServices } from './StepServices';
import { StepSummary } from './StepSummary';
import { StepVehicle } from './StepVehicle';
import { STEPS, canAdvance, initialWizard, wizardReducer } from './wizard';

/** Agendamento em 4 passos (meta: menos de 40 segundos do início ao fim). */
export function BookingWizard() {
  const { profile, tenant } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const vehicles = useAsync(() => listMyVehicles(profile.id), [profile.id]);
  const catalog = useCatalog();
  const [step, setStep] = useState(0);
  const [state, dispatch] = useReducer(wizardReducer, initialWizard, (s) => s);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixOs, setPixOs] = useState<string | null>(null);

  // Com um carro só, ele já vem escolhido.
  const list = vehicles.data ?? [];
  const vehicleId = state.vehicleId ?? (list.length === 1 ? list[0].id : null);
  const effective = { ...state, vehicleId };
  const vehicle = list.find((v) => v.id === vehicleId) ?? null;
  const q = useMemo(
    () => (vehicle ? buildQuote(catalog.services, catalog.matrix, vehicle.category, state.mainId, state.addonIds) : null),
    [vehicle, catalog.services, catalog.matrix, state.mainId, state.addonIds],
  );

  if (vehicles.loading || catalog.loading) return <PageSpinner />;

  async function confirm() {
    if (!vehicle || !state.mainId || !state.slotStart) return;
    setBusy(true);
    setError(null);
    try {
      const os = await bookAppointment({
        vehicleId: vehicle.id,
        serviceId: state.mainId,
        addonIds: state.addonIds,
        scheduledAt: state.slotStart,
        payment: state.payment,
        notes: state.notes,
      });
      if (state.payment === 'PIX') setPixOs(os.id);
      else {
        toast('Agendado! Te esperamos.');
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
      // Horário pego por outra pessoa enquanto o cliente decidia: volta para a grade.
      if ((err as { code?: string }).code === '23P01') setStep(2);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-4 flex gap-1" aria-label="Passos">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <div className={cn('h-1.5 rounded-full', i <= step ? 'bg-primary' : 'bg-muted')} />
            <p className={cn('mt-1 text-center text-[11px]', i === step ? 'font-semibold text-primary' : 'text-muted-foreground')}>{label}</p>
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="pt-4">
          {step === 0 && <StepVehicle vehicles={list} value={vehicleId} onChange={(id) => dispatch({ type: 'vehicle', id })} />}
          {step === 1 && vehicle && (
            <StepServices
              mains={catalog.mains}
              addons={catalog.addons}
              matrix={catalog.matrix}
              category={vehicle.category}
              mainId={state.mainId}
              addonIds={state.addonIds}
              onMain={(id) => dispatch({ type: 'main', id })}
              onToggleAddon={(id) => dispatch({ type: 'toggleAddon', id })}
            />
          )}
          {step === 2 && q && (
            <StepSchedule
              tenant={tenant}
              durationMin={q.durationMin}
              dateKey={state.dateKey}
              slotStart={state.slotStart}
              onDate={(d) => dispatch({ type: 'date', dateKey: d })}
              onSlot={(s) => dispatch({ type: 'slot', start: s })}
            />
          )}
          {step === 3 && vehicle && q && state.slotStart && (
            <StepSummary
              tenant={tenant}
              vehicle={vehicle}
              quote={q}
              slotStart={state.slotStart}
              payment={state.payment}
              notes={state.notes}
              onPayment={(m) => dispatch({ type: 'payment', method: m })}
              onNotes={(t) => dispatch({ type: 'notes', text: t })}
            />
          )}
          {error && (
            <Alert kind="error" className="mt-4">
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Barra fixa com total e navegação, acima da barra de menus no celular. */}
      <div className="sticky bottom-20 mt-4 flex items-center gap-2 rounded-lg border bg-background p-3 shadow-lg md:bottom-4">
        {step > 0 ? (
          <Button variant="outline" size="lg" onClick={() => setStep(step - 1)} aria-label="Voltar">
            <ArrowLeft />
          </Button>
        ) : (
          <Button variant="outline" size="lg" asChild>
            <Link to="/">Cancelar</Link>
          </Button>
        )}
        <div className="flex-1 text-right text-sm">
          {q && q.items.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-bold">{formatBRL(q.total)}</p>
            </>
          )}
        </div>
        {step < 3 ? (
          <Button size="lg" disabled={!canAdvance(step, effective)} onClick={() => setStep(step + 1)}>
            Continuar <ArrowRight />
          </Button>
        ) : (
          <Button size="lg" variant="success" disabled={busy} onClick={confirm}>
            <CheckCircle2 /> Confirmar
          </Button>
        )}
      </div>

      <Dialog open={!!pixOs} onOpenChange={(o) => !o && navigate('/', { replace: true })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagamento via Pix</DialogTitle>
          </DialogHeader>
          {pixOs && <PixPayment osId={pixOs} onPaid={() => setTimeout(() => navigate('/', { replace: true }), 1500)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
