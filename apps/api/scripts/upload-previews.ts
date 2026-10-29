import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient, TrackStatus } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const s3 = new S3Client({
  region: process.env.B2_MEDIA_REGION!,
  endpoint: process.env.B2_MEDIA_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.B2_MEDIA_BUCKET!;
const ALBUM_SLUG = 'tempo-indomavel';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const album = await prisma.album.findUnique({
    where: { slug: ALBUM_SLUG },
    include: { tracks: true },
  });

  if (!album) {
    console.error(`Álbum "${ALBUM_SLUG}" não encontrado no banco.`);
    return;
  }

  console.log(`📀 Processando álbum: ${album.title} (${album.tracks.length} faixas)`);

  const tmpDir = '/tmp/previews';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  for (const track of album.tracks) {
    // Define o caminho EXATO baseado no que vimos no Backblaze
    // O caminho tem a duplicação josephmatthos/josephmatthos/
    const realB2Key = `josephmatthos/tempoindomavel/${track.title}.mp3`;
    
    const localMp3 = path.join(tmpDir, `${track.id}.mp3`);
    const previewMp3 = path.join(tmpDir, `${track.id}-preview.mp3`);

    try {
      console.log(`⬇️  Baixando ${track.title} do B2...`);
      const response = await s3.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: realB2Key,
      }));

      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(Buffer.from(chunk));
      }
      fs.writeFileSync(localMp3, Buffer.concat(chunks));

      console.log(`✂️  Gerando prévia de 30s...`);
      execSync(
        `ffmpeg -y -i "${localMp3}" -t 30 -acodec libmp3lame -ab 128k "${previewMp3}"`,
        { stdio: 'ignore' },
      );

      const fileBuffer = fs.readFileSync(previewMp3);
      const previewKey = `previews/${slugify(track.title)}-${Date.now()}.mp3`;

      console.log(`⬆️  Subindo prévia para ${previewKey}...`);
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: previewKey,
        Body: fileBuffer,
        ContentType: 'audio/mpeg',
      }));

      await prisma.track.update({
        where: { id: track.id },
        data: {
          streamKey: realB2Key,   // Salva o caminho correto do áudio completo
          previewKey: previewKey, // Salva o caminho da nova prévia
          status: TrackStatus.PUBLISHED,
        },
      });

      console.log(`✅ Prévia de "${track.title}" salva.`);
    } catch (e: any) {
      console.error(`❌ Falha em "${track.title}":`, e.name, e.message);
    } finally {
      if (fs.existsSync(localMp3)) fs.unlinkSync(localMp3);
      if (fs.existsSync(previewMp3)) fs.unlinkSync(previewMp3);
    }
  }

  console.log('🎉 Processo concluído.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());