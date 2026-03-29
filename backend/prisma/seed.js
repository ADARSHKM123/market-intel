import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@marketintel.dev' },
    update: {},
    create: { email: 'admin@marketintel.dev', password: adminPassword, name: 'Admin', role: 'admin' },
  });

  const user = await prisma.user.upsert({
    where: { email: 'demo@marketintel.dev' },
    update: {},
    create: { email: 'demo@marketintel.dev', password: userPassword, name: 'Demo User', role: 'user' },
  });

  console.log('Users created');

  // 2. Create sources
  const sources = await Promise.all([
    prisma.source.create({
      data: {
        name: 'HN Top Stories',
        type: 'hackernews',
        config: { storyType: 'top', limit: 50 },
        lastScrapedAt: new Date(Date.now() - 3 * 3600000),
      },
    }),
    prisma.source.create({
      data: {
        name: 'HN Search: SaaS & Startups',
        type: 'hackernews',
        config: { keywords: ['saas', 'startup', 'side project', 'entrepreneur'], storyType: 'search', limit: 30 },
        lastScrapedAt: new Date(Date.now() - 2 * 3600000),
      },
    }),
    prisma.source.create({
      data: {
        name: 'HN Search: Developer Tools',
        type: 'hackernews',
        config: { keywords: ['developer tools', 'devtools', 'open source'], storyType: 'search', limit: 30 },
      },
    }),
    prisma.source.create({
      data: {
        name: 'YouTube Tech Reviews',
        type: 'youtube',
        config: { keywords: ['saas review', 'startup tools', 'productivity apps'], maxResults: 10, includeComments: true },
      },
    }),
    prisma.source.create({
      data: {
        name: 'Dev.to SaaS & Startups',
        type: 'devto',
        config: { tags: ['saas', 'startup', 'productivity', 'devtools'], perPage: 20, includeComments: true },
      },
    }),
    prisma.source.create({
      data: {
        name: 'Dev.to Webdev & Tools',
        type: 'devto',
        config: { tags: ['webdev', 'javascript', 'opensource', 'ai'], perPage: 15, includeComments: false },
      },
    }),
    prisma.source.create({
      data: {
        name: 'GitHub Trending Repos',
        type: 'github_trending',
        config: { keywords: ['saas', 'developer-tools', 'productivity', 'ai'], languages: [null, 'typescript', 'python'], minStars: 5, perPage: 15 },
      },
    }),
    prisma.source.create({
      data: {
        name: 'Product Hunt Daily',
        type: 'producthunt',
        config: { maxPosts: 30, pages: 2 },
      },
    }),
  ]);

  console.log('Sources created');

  // Create keyword watches for demo user
  await prisma.watch.createMany({
    data: [
      { userId: user.id, type: 'keyword', target: 'cold email', config: { alertThreshold: 10 } },
      { userId: user.id, type: 'keyword', target: 'SaaS analytics', config: { alertThreshold: 5 } },
    ],
  });

  console.log('Watches created');
  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
