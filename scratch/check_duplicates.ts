import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function main() {
  const duplicates = await prisma.$queryRaw`
    SELECT "userId", COUNT(*) as count 
    FROM "Membership" 
    WHERE status='active' 
    GROUP BY "userId" 
    HAVING COUNT(*) > 1;
  `;
  
  console.log('Duplicates found:', (duplicates as any[]).length);
  if ((duplicates as any[]).length > 0) {
    console.log('Duplicates detail:', JSON.stringify(duplicates, null, 2));
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
