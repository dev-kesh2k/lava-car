# Lava Car

App de lava-car (web e celular, instalável na Tela de Início), feito a partir do template de agendamento do Hub. O nome da loja é configurado em Configurações (`studioName`, padrão "Lava Car").

- **Cliente (sem login, identificado pelo celular):** garagem com os carros (placa antiga ou Mercosul, modelo, cor e porte com seletor visual), agendamento em 4 etapas (veículo → serviço principal + adicionais com o preço do porte → data/horário com box livre → resumo e pagamento no local), acompanhamento ao vivo (Agendado ➔ No pátio ➔ Lavando ➔ Finalizando ➔ Pronto para retirada, atualiza a cada 10 s), cartão fidelidade em selos, avaliação, feedback e página Sobre com mapa.
- **Equipe (login em `/admin/login`):**
  - *Operador:* pátio (Kanban Aguardando | Em lavagem | Acabamento | Pronto com botões grandes de avançar/voltar), OS avulsa no balcão (placa, porte, serviço → fila), vistoria com até 4 fotos e avarias, pagamento, botão do WhatsApp no carro pronto, agenda.
  - *Dono (admin):* tudo do operador + painel (faturamento do dia/mês, carros lavados, ticket médio, mais vendidos), fluxo de caixa (entradas automáticas das OS pagas + despesas), comissões por funcionário com fechamento semanal, serviços com matriz de preço por porte, equipe e boxes, feedback e configurações.

## Estrutura
- `frontend/`: React + Vite + TypeScript + Tailwind (fontes Big Shoulders Display e DM Sans, ícones lucide). Ícones do PWA em `public/icons`.
- `backend/`: Express + Prisma (PostgreSQL).
  - `src/rules.js`: regras puras (placa, preço por porte, boxes livres, status, fidelidade, comissão, caixa) — testes em `test/rules.test.js` (`npm test`).
  - `src/orders.js`: agendamento/OS com banco (trava por dia, box atribuído, status, pagamento, fidelidade).
  - `src/routes.js` (cliente), `src/staff.js` (`/api/staff`, admin e operador), `src/admin.js` (`/api/admin`, só o dono), `src/whatsapp.js`, `src/social.js`.

## Regras
- **Boxes:** cada box lava um carro por vez. Um horário só aparece livre se algum box ficar livre durante toda a duração (principal + adicionais); o sistema atribui o box. A criação usa `pg_advisory_xact_lock` por dia e confere de novo dentro da transação (dois clientes não pegam o último box). Pronto/Entregue/Cancelado liberam o box.
- **Horário:** por dia da semana em Configurações; a lavagem precisa terminar até o fechamento; horários de 10/15/20/30/60 min. OS avulsa entra no primeiro box livre a partir de agora.
- **Preço:** um valor por porte (Pequeno/Hatch, Médio/Sedan, Grande/SUV, Caminhonete); sem valor = o serviço não aparece para o porte. O preço e a duração ficam gravados na OS (`OrderItem`).
- **Status:** anda uma etapa por vez. Lavando grava quem começou (base da comissão; dá para trocar na ficha). Pronto (1ª vez) carimba 1 selo no celular e avisa o cliente pelo WhatsApp (se configurado).
- **Fidelidade:** meta configurável (padrão 10). Ao completar, ganha 1 lavagem grátis: na ficha da OS, "Usar grátis" zera o serviço principal (adicionais são cobrados). Lavagem grátis não gera selo.
- **Pagamento:** só no local (dinheiro, Pix ou cartão no balcão), sem sinal. Ao registrar, entra sozinho no caixa; estorno (só o dono) remove a entrada. **Pix antecipado** está preparado e desligado: integre o gateway em `POST /api/orders` (`routes.js`) e chame `payOrder()` no webhook.

## WhatsApp
- **Botões (sem configuração):** "Suporte" no menu do cliente e "Falar com a loja no WhatsApp" no acompanhamento abrem o wa.me do *WhatsApp da loja* (Configurações → WhatsApp). Na equipe, o carro Pronto tem o botão que abre o wa.me do cliente com "Olá [Nome], seu [Modelo] placa [Placa] já está limpo e pronto para retirada!".
- **Avisos automáticos pela ponte do servidor** (WAHA + bridge FastAPI do Hub, a mesma dos outros apps): `backend/src/whatsapp.js` faz `POST ${WHATSAPP_BRIDGE_URL}/send/text` com o header `X-Bridge-Secret: ${BRIDGE_SECRET}` e `{"to": "55…", "text": "…"}` (timeout de 10 s, nunca lança, tudo vai para "Últimos envios"). Situação da ponte: `GET /health` (Configurações mostra se está conectada).
  - No servidor: `WHATSAPP_BRIDGE_URL=http://whatsapp-bridge:5001` e o mesmo `BRIDGE_SECRET` de `/opt/whatsapp-python/.env` no `.env` do app (`/hub-apps/servicos/lava-car/.env`), e `docker network connect --alias whatsapp-bridge hub-lava-car_hub whatsapp-bridge` (refazer se o container da ponte for recriado). Sem essas variáveis nada é enviado.
  - Em Configurações → WhatsApp: ligar/desligar os avisos, quais eventos (agendamento confirmado, lembrete na véspera a partir das 10h, carro pronto, pedido de avaliação na entrega, cancelamento pela loja), aviso para o WhatsApp da loja (novo agendamento e cancelamento), "Enviar teste" e "Últimos envios".
  - **Número sem o 9:** muitos celulares (ex.: DDD 45) estão no WhatsApp sem o 9 da frente, e a ponte não tem checagem de existência. Para `55 + DDD + 9 + 8 dígitos` o app tenta com o 9 e, se a ponte devolver erro, tenta sem o 9; a forma que funcionou fica lembrada (em memória) para os próximos envios. Erros que não dependem do número (401 secret, 422, 503 ponte/WAHA fora do ar, timeout) não geram a 2ª tentativa.
  - Testes com uma ponte falsa local: `backend/test/whatsapp.test.js` (`npm test`).

## Login inicial
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` do `backend/.env.example` (criado no primeiro start; a senha é gerada pelo Hub no 1º deploy e fica no Cofre). O seed cria também 2 boxes e o catálogo inicial (Lavagem Simples, Completa, Higienização Interna + adicionais com preço por porte), só uma vez.
