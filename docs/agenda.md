# Agenda e capacidade de boxes

A loja atende `box_capacity` carros ao mesmo tempo. Um horário só aparece livre se **durante toda a duração do serviço** houver box sobrando.

## Algoritmo
Para um início `t` e duração `d` (soma do principal + adicionais):

1. Pega as OS não canceladas que cruzam `[t, t+d)`.
2. A lotação só sobe quando uma OS começa, então o pico está em `t` ou no início de alguma OS dentro do intervalo.
3. Conta quantas estão ativas em cada um desses pontos; o maior valor é o pico.
4. Livre se `pico < box_capacity`, o serviço termina antes do fechamento e respeita a antecedência mínima (30 min).

Implementado duas vezes, de propósito:
- `src/lib/availability.ts` (`peakOverlap`, `buildSlots`) monta a grade na tela, com testes em `availability.test.ts`.
- `os_peak_overlap` no banco é a palavra final dentro de `book_appointment`, com `pg_advisory_xact_lock` por loja para dois clientes não pegarem o último box no mesmo instante. Se perder a corrida, o app mostra "Horário esgotado" e volta para a grade.

## Fuso horário
`opening_hours` é local da loja (`tenants.timezone`, padrão `America/Sao_Paulo`). O app converte com `zonedTimeToUtc` (`src/lib/timezone.ts`) e o banco com `at time zone`.

## Cliente avulso
`open_walk_in` não bloqueia por capacidade: o carro já está no pátio. Ele entra como `WAITING` com início agora e passa a ocupar box na grade dos próximos clientes.
