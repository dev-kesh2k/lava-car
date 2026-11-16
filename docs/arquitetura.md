# Arquitetura

```
Celular/tablet (PWA React)
   │  supabase-js (anon key + JWT do usuário)
   ▼
Supabase
   ├─ Auth ............ OTP por WhatsApp/SMS, link mágico por e-mail, Google
   ├─ Postgres ........ tabelas + RLS + funções (book_appointment, open_walk_in, relatórios)
   ├─ Realtime ........ mudanças em appointments_os (pátio e tracker do cliente)
   ├─ Storage ......... bucket privado vehicle-photos (vistoria)
   └─ Edge Functions .. create-pix · mp-webhook · notify-status
                          │                 ▲
                          ▼                 │
                    Mercado Pago (Pix) ─────┘ webhook
```

## Princípios
1. **O banco é a fonte da verdade.** Preço, duração, capacidade de boxes, comissão e caixa são calculados em SQL. O frontend repete as contas (`src/lib`) só para a tela responder na hora.
2. **RLS em tudo.** Não existe backend próprio: a segurança vem das políticas. Funções `SECURITY DEFINER` só onde o cliente precisa de algo além do que pode ler (ex.: horários ocupados sem dados pessoais).
3. **Realtime no lugar de F5.** O pátio e o cliente assinam `appointments_os`; o RLS decide quem recebe cada evento.
4. **Mobile-first.** Botões grandes no pátio (`size="xl"`), folhas de baixo para cima no celular, barra de navegação inferior.
