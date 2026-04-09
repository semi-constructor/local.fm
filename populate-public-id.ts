import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { publicId: null }
    });

    console.log(`Found ${users.length} users with null publicId`);

    for (const user of users) {
        const publicId = createId();
        await prisma.user.update({
            where: { id: user.id },
            data: { publicId }
        });
        console.log(`Updated user ${user.email} with publicId ${publicId}`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
