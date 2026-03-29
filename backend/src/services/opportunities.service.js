import prisma from '../config/prisma.js';

export async function getAll({ page = 1, limit = 20, status, category, minScore, sort = 'momentum' }) {
  const where = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (minScore) where.score = { gte: parseFloat(minScore) };

  const orderBy = {};
  if (sort === 'momentum') orderBy.momentum = 'desc';
  else if (sort === 'score') orderBy.score = 'desc';
  else if (sort === 'newest') orderBy.createdAt = 'desc';
  else orderBy.momentum = 'desc';

  const [data, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { signals: true } },
      },
    }),
    prisma.opportunity.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getById(id) {
  return prisma.opportunity.findUniqueOrThrow({
    where: { id },
    include: {
      signals: {
        include: {
          signal: {
            include: {
              rawPost: {
                include: {
                  source: { select: { id: true, name: true, type: true } },
                },
              },
            },
          },
        },
        take: 20,
        orderBy: { weight: 'desc' },
      },
      _count: { select: { signals: true, trendSnapshots: true } },
    },
  });
}

export async function getSignals(id, { page = 1, limit = 20 }) {
  const [data, total] = await Promise.all([
    prisma.signalOpportunity.findMany({
      where: { opportunityId: id },
      include: { signal: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { signal: { confidence: 'desc' } },
    }),
    prisma.signalOpportunity.count({ where: { opportunityId: id } }),
  ]);
  return { data: data.map((so) => ({ ...so.signal, weight: so.weight })), total, page, limit };
}

export async function getTrend(id, { days = 30 }) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.trendSnapshot.findMany({
    where: {
      opportunityId: id,
      snapshotDate: { gte: since },
    },
    orderBy: { snapshotDate: 'asc' },
  });
}

export async function updateStatus(id, status) {
  return prisma.opportunity.update({
    where: { id },
    data: { status },
  });
}
