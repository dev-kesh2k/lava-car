import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePlate, isValidPlate, isMercosulPlate, formatPlate,
  priceFor, quote, freeBox, freeBoxCount, buildSlots, earliestSlot,
  nextStatus, prevStatus, canMove, progress,
  stamp, rewardDiscount, commissionOf, commissionReport, summarizeCash, readyMessage,
} from '../src/rules.js';

test('placa: padrão antigo e Mercosul', () => {
  assert.equal(normalizePlate(' abc-1234 '), 'ABC1234');
  assert.ok(isValidPlate('ABC-1234'));
  assert.ok(isValidPlate('abc1d23'));
  assert.ok(isMercosulPlate('ABC1D23'));
  assert.ok(!isMercosulPlate('ABC1234'));
  for (const bad of ['', 'AB1234', 'ABCD123', '1BC1234', 'ABC12345'.slice(0, 6), 'ABC1DD3']) assert.ok(!isValidPlate(bad), bad);
  assert.equal(formatPlate('abc1234'), 'ABC-1234');
  assert.equal(formatPlate('abc1d23'), 'ABC1D23');
});

const S = [
  { id: 'simples', name: 'Lavagem Simples', kind: 'main', active: true, durationMin: 30, prices: [{ size: 'small', priceCents: 3500 }, { size: 'large', priceCents: 5000 }] },
  { id: 'completa', name: 'Lavagem Completa', kind: 'main', active: true, durationMin: 60, prices: [{ size: 'small', priceCents: 5500 }, { size: 'pickup', priceCents: 9500 }] },
  { id: 'cera', name: 'Cera', kind: 'addon', active: true, durationMin: 15, prices: [{ size: 'small', priceCents: 2000 }, { size: 'large', priceCents: 3000 }] },
  { id: 'pneu', name: 'Pretinho', kind: 'addon', active: false, durationMin: 5, prices: [{ size: 'small', priceCents: 1000 }] },
];

test('preço por porte', () => {
  assert.equal(priceFor(S[0], 'large'), 5000);
  assert.equal(priceFor(S[0], 'pickup'), null);
  const q = quote(S, 'large', 'simples', ['cera', 'cera', 'simples']);
  assert.equal(q.totalCents, 8000);
  assert.equal(q.durationMin, 45);
  assert.equal(q.items.length, 2);
  assert.throws(() => quote(S, 'pickup', 'simples'), /não está disponível/);
  assert.throws(() => quote(S, 'small', 'cera'), /principal/);
  assert.throws(() => quote(S, 'small', 'simples', ['completa']), /só um serviço principal/);
  assert.throws(() => quote(S, 'small', 'simples', ['pneu']), /não está mais disponível/);
  assert.throws(() => quote(S, 'gigante', 'simples'), /Porte/);
});

const boxes = [{ id: 'b1' }, { id: 'b2' }];

test('capacidade de boxes: livre só se um box fica livre durante toda a duração', () => {
  const busy = [{ boxId: 'b1', time: '09:00', durationMin: 60 }, { boxId: 'b2', time: '10:00', durationMin: 60 }];
  // 09:30–10:30: o pico é 1 carro, mas nenhum box fica livre o tempo todo.
  assert.equal(freeBox(boxes, busy, '09:30', 60), null);
  assert.equal(freeBox(boxes, busy, '09:00', 60).id, 'b2');
  assert.equal(freeBoxCount(boxes, busy, '11:00', 30), 2);
  assert.equal(freeBox(boxes, busy, '10:00', 60).id, 'b1'); // termina exatamente quando começa
});

test('grade do dia: lotação, fechamento e horários que já passaram', () => {
  const day = { open: true, from: '08:00', to: '10:00' };
  const busy = [{ boxId: 'b1', time: '08:00', durationMin: 60 }, { boxId: 'b2', time: '08:00', durationMin: 60 }];
  const slots = buildSlots({ day, interval: 30, durationMin: 60, boxes, busy });
  assert.deepEqual(slots.map((s) => s.time), ['08:00', '08:30', '09:00']); // 09:30 + 60 passa do fechamento
  assert.deepEqual(slots.map((s) => s.available), [false, false, true]);
  assert.equal(slots[2].free, 2);
  const today = buildSlots({ day, interval: 30, durationMin: 30, boxes, busy: [], nowMin: 8 * 60 + 40 });
  assert.deepEqual(today.filter((s) => s.available).map((s) => s.time), ['09:00', '09:30']);
  assert.deepEqual(buildSlots({ day: { open: false, from: '08:00', to: '18:00' }, durationMin: 30, boxes, busy: [] }), []);
  assert.ok(buildSlots({ day, interval: 30, durationMin: 30, boxes: [], busy: [] }).every((s) => !s.available));
});

test('fila do balcão: primeiro box livre a partir de agora', () => {
  const busy = [{ boxId: 'b1', time: '09:00', durationMin: 60 }, { boxId: 'b2', time: '09:00', durationMin: 45 }];
  assert.deepEqual(earliestSlot(boxes, busy, '09:02', 30), { time: '09:45', box: { id: 'b2' } });
  assert.deepEqual(earliestSlot(boxes, [], '23:50', 30), null);
});

test('fluxo de status e progresso', () => {
  assert.equal(nextStatus('scheduled'), 'waiting');
  assert.equal(nextStatus('ready'), 'delivered');
  assert.equal(nextStatus('delivered'), null);
  assert.equal(prevStatus('washing'), 'waiting');
  assert.ok(canMove('washing', 'finishing'));
  assert.ok(canMove('washing', 'waiting'));
  assert.ok(!canMove('waiting', 'ready'));
  assert.ok(!canMove('cancelled', 'waiting'));
  assert.equal(progress('scheduled'), 0);
  assert.equal(progress('washing'), 50);
  assert.equal(progress('ready'), 100);
  assert.equal(progress('delivered'), 100);
  assert.equal(progress('cancelled'), 0);
});

test('fidelidade: 10 selos viram 1 lavagem grátis', () => {
  let card = null;
  for (let i = 0; i < 9; i++) card = stamp(card, 10);
  assert.deepEqual(card, { stamps: 9, rewards: 0, totalWashes: 9 });
  card = stamp(card, 10);
  assert.deepEqual(card, { stamps: 0, rewards: 1, totalWashes: 10 });
  assert.deepEqual(stamp({ stamps: 4, rewards: 0, totalWashes: 4 }, 3), { stamps: 2, rewards: 1, totalWashes: 5 }); // meta reduzida
  assert.equal(rewardDiscount([{ kind: 'main', priceCents: 5500 }, { kind: 'addon', priceCents: 2000 }]), 5500);
});

test('comissão e fechamento semanal', () => {
  assert.equal(commissionOf(10000, 30), 3000);
  assert.equal(commissionOf(3333, 15), 500);
  const team = [{ id: 'a', name: 'Ana', commissionPct: 30 }, { id: 'b', name: 'Bruno', commissionPct: 20 }];
  const orders = [
    { employeeId: 'a', totalCents: 5500, discountCents: 0 },
    { employeeId: 'a', totalCents: 7500, discountCents: 5500 },
    { employeeId: 'b', totalCents: 20000, discountCents: 0 },
    { employeeId: null, totalCents: 1000, discountCents: 0 },
  ];
  const r = commissionReport(team, orders);
  assert.deepEqual(r.map((x) => [x.name, x.count, x.grossCents, x.commissionCents]), [['Bruno', 1, 20000, 4000], ['Ana', 2, 7500, 2250]]);
});

test('caixa: entradas, despesas e saldo', () => {
  const s = summarizeCash([
    { type: 'income', category: 'Serviços', amountCents: 5000 },
    { type: 'income', category: 'Serviços', amountCents: 2500 },
    { type: 'expense', category: 'Água', amountCents: 1200 },
  ]);
  assert.equal(s.incomeCents, 7500);
  assert.equal(s.expenseCents, 1200);
  assert.equal(s.balanceCents, 6300);
  assert.equal(s.byCategory[0].category, 'Serviços');
});

test('mensagem de carro pronto', () => {
  assert.equal(readyMessage({ name: 'João Silva', model: 'Onix', plate: 'abc1d23' }), 'Olá João, seu Onix placa ABC1D23 já está limpo e pronto para retirada!');
  assert.equal(readyMessage({ name: '', model: '', plate: 'ABC1234' }), 'Olá, seu carro placa ABC-1234 já está limpo e pronto para retirada!');
  assert.equal(readyMessage({ name: 'Cliente (45) 99999-0001', model: 'Corolla', plate: 'XYZ9A88' }), 'Olá, seu Corolla placa XYZ9A88 já está limpo e pronto para retirada!');
});
