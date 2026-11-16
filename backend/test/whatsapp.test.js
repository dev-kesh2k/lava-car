// Envio pela ponte do WhatsApp contra um servidor falso local (nenhuma mensagem real).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const calls = [];
let server;
let wa;

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const json = (status, data) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(data));
      if (req.url === '/health') return json(200, { ok: true, waha_connected: true, session: 'default' });
      if (req.url !== '/send/text' || req.method !== 'POST') return json(404, { detail: 'Not Found' });
      if (req.headers['x-bridge-secret'] !== 'segredo-teste') return json(401, { detail: 'Bridge secret inválido.' });
      const { to, text } = JSON.parse(body);
      calls.push(to);
      if (to === '5545999990001') return json(500, { detail: 'WAHA retornou erro 500: no LID found for 5545999990001@c.us' }); // existe sem o 9
      if (to === '5545999990009') return json(503, { detail: 'WAHA fora do ar' });
      if (to === '5545999990002' && text === 'lento') return setTimeout(() => json(200, { message_id: 'tarde' }), 11_000);
      return json(200, { message_id: `msg-${to}` });
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.WHATSAPP_BRIDGE_URL = `http://127.0.0.1:${server.address().port}/`;
  process.env.BRIDGE_SECRET = 'segredo-teste';
  process.env.DATABASE_URL = 'postgresql://x:x@127.0.0.1:1/x'; // o log no banco falha em silêncio
  wa = await import('../src/whatsapp.js');
});

after(() => {
  server.closeAllConnections?.();
  server.close();
});

const S = { waEnabled: 'true', studioName: 'Lava Car' };

test('variações do número: com o 9 e sem o 9', () => {
  assert.deepEqual(wa.numberVariants('(45) 99999-0001'), ['5545999990001', '554599990001']);
  assert.deepEqual(wa.numberVariants('4533334444'), ['554533334444']);
  assert.deepEqual(wa.numberVariants('abc'), []);
});

test('saúde da ponte', async () => {
  assert.deepEqual(await wa.bridgeStatus(), { configured: true, reachable: true, connected: true, error: '' });
});

test('envia com o 9 quando o número existe assim', async () => {
  calls.length = 0;
  const r = await wa.sendWhatsApp('(11) 98888-7777', 'oi', 'test', S);
  assert.equal(r.ok, true);
  assert.equal(r.id, 'msg-5511988887777');
  assert.deepEqual(calls, ['5511988887777']);
});

test('número inexistente com o 9 → tenta sem o 9 e lembra a variação', async () => {
  calls.length = 0;
  const r = await wa.sendWhatsApp('45999990001', 'oi', 'ready', S);
  assert.equal(r.ok, true);
  assert.equal(r.to, '554599990001');
  assert.deepEqual(calls, ['5545999990001', '554599990001']);
  calls.length = 0;
  await wa.sendWhatsApp('45999990001', 'de novo', 'ready', S);
  assert.deepEqual(calls, ['554599990001']); // já vai direto na que funcionou
});

test('ponte fora do ar (503): não insiste em outra variação e não lança', async () => {
  calls.length = 0;
  const r = await wa.sendWhatsApp('45999990009', 'oi', 'ready', S);
  assert.equal(r.ok, false);
  assert.match(r.error, /fora do ar/);
  assert.deepEqual(calls, ['5545999990009']);
});

test('secret errado (401) não lança', async () => {
  process.env.BRIDGE_SECRET = 'errado';
  const r = await wa.sendWhatsApp('11988887777', 'oi', 'test', S);
  process.env.BRIDGE_SECRET = 'segredo-teste';
  assert.equal(r.ok, false);
  assert.match(r.error, /secret/i);
});

test('desligado ou sem ponte: não envia', async () => {
  calls.length = 0;
  assert.equal((await wa.sendWhatsApp('11988887777', 'oi', 'ready', { waEnabled: 'false' })).ok, false);
  assert.equal((await wa.sendWhatsApp('11988887777', 'oi', 'test', { waEnabled: 'false' }, { force: true })).ok, true); // "Enviar teste"
  const url = process.env.WHATSAPP_BRIDGE_URL;
  process.env.WHATSAPP_BRIDGE_URL = '';
  assert.equal(wa.bridgeConfigured(), false);
  assert.equal((await wa.sendWhatsApp('11988887777', 'oi', 'ready', S)).ok, false);
  process.env.WHATSAPP_BRIDGE_URL = url;
  assert.deepEqual(calls, ['5511988887777']);
});

test('timeout de 10 s: devolve erro sem lançar', { timeout: 20_000 }, async () => {
  const r = await wa.sendWhatsApp('45999990002', 'lento', 'test', S);
  assert.equal(r.ok, false);
  assert.match(r.error, /Tempo esgotado/);
});

test('eventos escolhidos e mensagem de carro pronto', () => {
  assert.deepEqual(wa.eventsOf({ waEvents: 'ready,xyz,reminder' }), ['ready', 'reminder']);
  assert.deepEqual(wa.eventsOf({}), wa.WA_EVENTS);
  const msg = wa.clientMessage('ready', { clientName: 'Ana Souza', model: 'Onix', plate: 'abc1d23', id: 'x' }, { appUrl: '' });
  assert.equal(msg, 'Olá Ana, seu Onix placa ABC1D23 já está limpo e pronto para retirada!');
});
