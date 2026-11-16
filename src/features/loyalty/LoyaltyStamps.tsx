import { Droplets, Gift } from 'lucide-react';
import { loyaltyHeadline, loyaltyView } from '@/lib/loyalty';
import { cn } from '@/lib/utils';

/** Cartão fidelidade em selos: cada lavagem concluída carimba um. */
export function LoyaltyStamps({ card, goal, shopName }: { card: { stamps: number; rewards_available: number } | null; goal: number; shopName: string }) {
  const v = loyaltyView(card, goal);
  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-500 p-5 text-white shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider opacity-80">Cartão fidelidade</p>
          <p className="font-bold">{shopName}</p>
        </div>
        {v.rewards > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
            <Gift className="h-4 w-4" /> {v.rewards}
          </span>
        )}
      </div>
      <div className={cn('grid gap-2', v.goal > 6 ? 'grid-cols-5' : 'grid-cols-3')}>
        {v.slots.map((filled, i) => (
          <div
            key={i}
            className={cn(
              'flex aspect-square items-center justify-center rounded-full border-2 border-dashed border-white/50',
              filled && 'border-solid border-white bg-white text-sky-600',
              i === v.goal - 1 && !filled && 'border-yellow-300',
            )}
          >
            {filled ? <Droplets className="h-5 w-5" /> : i === v.goal - 1 ? <Gift className="h-5 w-5 text-yellow-300" /> : null}
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm font-medium">{loyaltyHeadline(v)}</p>
    </div>
  );
}
