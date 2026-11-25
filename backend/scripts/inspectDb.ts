import { prisma } from '../src/config/prisma';

async function inspect() {
  console.log('Inspecting Neon DB tables and schemas...');
  const tables = await prisma.$queryRawUnsafe<any[]>(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    ORDER BY table_schema, table_name;
  `);
  console.log('--- FOUND TABLES IN DB ---');
  console.table(tables);

  const usersCount = await prisma.user.count();
  console.log('Total users in prisma.user:', usersCount);

  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, role: true, createdAt: true }
  });
  console.log('Recent 5 users:');
  console.table(recentUsers);
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
