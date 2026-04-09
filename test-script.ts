import { PrismaClient } from './packages/database/node_modules/@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- Users ---');
  console.log(users);

  const accounts = await prisma.account.findMany();
  console.log('--- Accounts ---');
  console.log(accounts);

  const streams = await prisma.stream.count();
  console.log('--- Total Streams ---');
  console.log(streams);

  const albums = await prisma.album.count();
  const artists = await prisma.artist.count();
  const tracks = await prisma.track.count();
  console.log(`--- Stats: ${albums} Albums, ${artists} Artists, ${tracks} Tracks ---`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
