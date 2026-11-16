// Idempotente: roda a cada publicação. Cria o admin inicial, os boxes e o catálogo inicial
// (serviços com preço por porte) só quando ainda não existem; depois tudo é editado pelo painel.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Preços em reais por porte: Pequeno/Hatch, Médio/Sedan, Grande/SUV, Caminhonete.
const SERVICES = [
  { name: 'Lavagem Simples', description: 'Externa com shampoo neutro, rodas e secagem.', kind: 'main', durationMin: 30, icon: 'droplet', prices: [35, 40, 50, 60] },
  { name: 'Lavagem Completa', description: 'Externa + aspiração, painel, vidros e pretinho.', kind: 'main', durationMin: 60, icon: 'sparkles', prices: [55, 65, 80, 95] },
  { name: 'Higienização Interna', description: 'Bancos, carpetes e teto com extratora e secagem.', kind: 'main', durationMin: 180, icon: 'armchair', prices: [180, 200, 250, 280] },
  { name: 'Cera Líquida', description: 'Brilho e proteção da pintura.', kind: 'addon', durationMin: 15, icon: 'shield', prices: [20, 25, 30, 35] },
  { name: 'Pretinho nos Pneus', description: 'Acabamento brilhante nos pneus.', kind: 'addon', durationMin: 5, icon: 'circle', prices: [10, 10, 15, 15] },
  { name: 'Hidratação de Couro', description: 'Limpeza e hidratação dos bancos de couro.', kind: 'addon', durationMin: 40, icon: 'armchair', prices: [60, 70, 90, 90] },
  { name: 'Limpeza do Motor', description: 'Desengraxante e proteção das partes plásticas.', kind: 'addon', durationMin: 20, icon: 'spray', prices: [40, 45, 50, 60] },
];
const SIZES = ['small', 'medium', 'large', 'pickup'];

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Administrador';
  if (!email) throw new Error('SEED_ADMIN_EMAIL não definido');
  if (!password) throw new Error('SEED_ADMIN_PASSWORD não definido');

  if ((await prisma.user.count({ where: { role: 'admin' } })) === 0) {
    await prisma.user.upsert({
      where: { email },
      update: { role: 'admin', active: true },
      create: { email, name, role: 'admin', passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`Admin criado: ${email}`);
  }

  if ((await prisma.box.count()) === 0) {
    await prisma.box.createMany({ data: [{ name: 'Box 1', sortOrder: 1 }, { name: 'Box 2', sortOrder: 2 }] });
    console.log('Boxes iniciais criados');
  }

  if ((await prisma.service.count()) === 0) {
    for (const [i, s] of SERVICES.entries()) {
      const { prices, ...data } = s;
      await prisma.service.create({
        data: { ...data, sortOrder: i, prices: { create: SIZES.map((size, j) => ({ size, priceCents: prices[j] * 100 })) } },
      });
    }
    console.log('Catálogo inicial criado');
  }

  await prisma.setting.upsert({ where: { key: 'studioName' }, update: {}, create: { key: 'studioName', value: "Lava Car" } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
