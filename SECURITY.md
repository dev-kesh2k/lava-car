# Segurança

## Como reportar
Encontrou uma falha? Não abra issue pública: escreva pelo e-mail do mantenedor no perfil do GitHub com os passos para reproduzir.

## Modelo de segurança
- Cliente identificado pelo celular (sem senha): as consultas pelo celular têm limite por IP e só devolvem os dados daquele número.
- Equipe com login (`/admin/login`, senha com hash e JWT): operador vê pátio, agenda e OS; financeiro, preços, equipe e configurações só para o dono.
- Preço, duração e vaga são calculados no servidor; o cliente não manda valor. A reserva usa trava no banco por dia para dois clientes não pegarem o último box.
- Fotos da vistoria só aparecem para a equipe.
- Segredos (`JWT_SECRET`, senha do admin, token do WhatsApp) ficam só no `.env` do servidor — nunca no repositório.
