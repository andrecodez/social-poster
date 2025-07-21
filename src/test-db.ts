import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // Create a test account (if none exists)
  const account = await prisma.account.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Sky Zone Bethlehem",
      platform: "Facebook",
      apiKey: "placeholder-key"
    },
  });

  console.log("Created/Retrieved Account:", account);

  // Create a test post for that account
  const post = await prisma.post.create({
    data: {
      accountId: account.id,
      content: "This is a test automated post",
      scheduledAt: new Date(Date.now() + 3600 * 1000) // 1 hour from now
    },
  });

  console.log("Created Post:", post);

  // Fetch all posts (with account info)
  const posts = await prisma.post.findMany({
    include: { account: true },
  });
  console.log("All Posts:", posts);
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
