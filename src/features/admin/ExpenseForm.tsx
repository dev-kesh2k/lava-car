import { useState } from 'react';
import { addExpense } from '@/api/finance';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { EXPENSE_CATEGORIES } from '@/lib/cashflow';
import { errorMessage } from '@/lib/errors';
import { parseMoney } from '@/lib/format';

/** Lançamento manual de despesa (shampoo, cera, água, luz...). */
export function ExpenseForm({ tenantId, userId, today, onSaved }: { tenantId: string; userId: string; today: string; onSaved: () => void }) {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseMoney(amount);
    if (!(value > 0)) return setError('Valor inválido.');
    setBusy(true);
    setError(null);
    try {
      await addExpense(tenantId, userId, { category, description: description.trim(), amount: value, occurred_on: date });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="exp-cat">Categoria</Label>
        <NativeSelect id="exp-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="exp-desc">Descrição</Label>
        <Input id="exp-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Galão de shampoo 5 L" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="exp-amount">Valor (R$)</Label>
          <Input id="exp-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exp-date">Data</Label>
          <Input id="exp-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      <Button type="submit" variant="destructive" className="w-full" disabled={busy}>
        Lançar despesa
      </Button>
    </form>
  );
}
