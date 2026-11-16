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
