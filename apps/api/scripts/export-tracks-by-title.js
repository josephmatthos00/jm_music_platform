const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();

(async () => {
  const tracks = await p.track.findMany({
    where: { streamKey: { not: null }, album: { slug: 'tempo-indomavel' } },
    select: { streamKey: true, previewKey: true, title: true },
  });

  const lines = [];
  for (const t of tracks) {
    const sk = (t.streamKey || '').replace(/'/g, "''");
    const pk = (t.previewKey || '').replace(/'/g, "''");
    const title = t.title.replace(/'/g, "''");
    lines.push(
      `UPDATE tracks SET stream_key = '${sk}', preview_key = '${pk}' WHERE title = '${title}' AND album_id = (SELECT id FROM albums WHERE slug = 'tempo-indomavel');`,
    );
  }

  fs.writeFileSync('/tmp/update-tracks-by-title.sql', lines.join('\n'));
  console.log(`Gerados ${lines.length} UPDATEs em /tmp/update-tracks-by-title.sql`);
  await p.$disconnect();
})();
