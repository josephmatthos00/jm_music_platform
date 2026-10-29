import { PrismaClient, TrackStatus } from '@prisma/client';

const prisma = new PrismaClient();

const B2_IMAGES_BASE = 'https://f005.backblazeb2.com/file/joseph.matthos/assets/img';

async function main() {
  const artist = await prisma.artist.findUnique({
    where: { name: 'Joseph Matthos' },
  });
  if (!artist) {
    console.error('Artista "Joseph Matthos" não encontrado');
    return;
  }

  const existing = await prisma.album.findUnique({
    where: { slug: 'tempo-indomavel' },
  });
  if (existing) {
    console.log('Tempo Indomável já existe:', existing.id);
    return;
  }

  const album = await prisma.album.create({
    data: {
      title: 'Tempo Indomável',
      slug: 'tempo-indomavel',
      coverUrl: `${B2_IMAGES_BASE}/tempoindomavel.webp`,
      releaseDate: new Date('2027-04-15'),
      artistId: artist.id,
      sortOrder: 30,
    },
  });

  for (let j = 0; j < 10; j++) {
    const track = await prisma.track.create({
      data: {
        albumId: album.id,
        artistId: artist.id,
        title: `Tempo Indomável ${j + 1}`,
        slug: `tempo-indomavel-${j + 1}`,
        genre: 'Hip Hop',
        mood: 'Intenso',
        durationSeconds: 90 + j * 10,
        status: TrackStatus.PUBLISHED,
      },
    });

    const tiers = [
      { hours: 24, name: '24 horas', priceCents: 290 },
      { hours: 48, name: '48 horas', priceCents: 490 },
      { hours: 72, name: '3 dias', priceCents: 690 },
      { hours: 120, name: '5 dias', priceCents: 990 },
      { hours: 240, name: '10 dias', priceCents: 1290 },
      { hours: 360, name: '15 dias', priceCents: 1990 },
    ];
    await prisma.rentalProduct.createMany({
      data: tiers.map((t, idx) => ({
        trackId: track.id,
        name: t.name,
        durationHours: t.hours,
        priceCents: t.priceCents,
        currency: 'BRL',
        active: true,
        sortOrder: idx + 1,
      })),
    });
  }

  await prisma.rentalProduct.createMany({
    data: [
      { hours: 24, name: '24 horas', priceCents: 1290 },
      { hours: 48, name: '48 horas', priceCents: 1990 },
      { hours: 72, name: '3 dias', priceCents: 2990 },
      { hours: 120, name: '5 dias', priceCents: 3990 },
      { hours: 240, name: '10 dias', priceCents: 4990 },
      { hours: 360, name: '15 dias', priceCents: 6990 },
    ].map((t, idx) => ({
      albumId: album.id,
      name: t.name,
      durationHours: t.hours,
      priceCents: t.priceCents,
      currency: 'BRL',
      active: true,
      sortOrder: idx + 1,
    })),
  });

  console.log('✅ Tempo Indomável criado:', album.id);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());