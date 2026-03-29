import prisma from '../config/prisma.js';

export async function getAll({ page = 1, limit = 20, type, minConfidence }) {
  const where = {};
  if (type) where.type = type;
  if (minConfidence) where.confidence = { gte: parseFloat(minConfidence) };

  const [data, total] = await Promise.all([
    prisma.signal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        rawPost: { select: { title: true, url: true, source: { select: { name: true, type: true } } } },
      },
    }),
    prisma.signal.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function search({ q, page = 1, limit = 20 }) {
  // Full-text search using PostgreSQL tsvector on raw_posts
  // then pull associated signals
  const offset = (page - 1) * limit;

  const posts = await prisma.$queryRawUnsafe(
    `SELECT id, title, body,
       ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
     FROM raw_posts
     WHERE search_vector @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT $2 OFFSET $3`,
    q,
    limit,
    offset
  );

  // If full-text search is not set up yet, fall back to LIKE
  if (!posts || posts.length === 0) {
    const likeQuery = `%${q}%`;
    const fallbackData = await prisma.signal.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });
    const fallbackTotal = await prisma.signal.count({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
    });
    return { data: fallbackData, total: fallbackTotal, page, limit };
  }

  const postIds = posts.map((p) => p.id);
  const signals = await prisma.signal.findMany({
    where: { rawPostId: { in: postIds } },
    include: {
      rawPost: { select: { title: true, url: true } },
    },
  });

  return { data: signals, total: signals.length, page, limit };
}
