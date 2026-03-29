import prisma from '../config/prisma.js';

export async function getOverview() {
  const [totalSignals, totalOpportunities, totalSources, totalPosts] = await Promise.all([
    prisma.signal.count(),
    prisma.opportunity.count(),
    prisma.source.count({ where: { enabled: true } }),
    prisma.rawPost.count(),
  ]);

  const signalsByType = await prisma.signal.groupBy({
    by: ['type'],
    _count: { id: true },
  });

  const opportunitiesByStatus = await prisma.opportunity.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const topMomentum = await prisma.opportunity.findMany({
    orderBy: { momentum: 'desc' },
    take: 5,
    select: { id: true, title: true, momentum: true, score: true, category: true },
  });

  return {
    totalSignals,
    totalOpportunities,
    totalSources,
    totalPosts,
    signalsByType: signalsByType.map((s) => ({ type: s.type, count: s._count.id })),
    opportunitiesByStatus: opportunitiesByStatus.map((o) => ({ status: o.status, count: o._count.id })),
    topMomentum,
  };
}

export async function getTrends({ days = 30 }) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const snapshots = await prisma.trendSnapshot.findMany({
    where: { snapshotDate: { gte: since } },
    orderBy: { snapshotDate: 'asc' },
    include: {
      opportunity: { select: { title: true, category: true } },
    },
  });

  // Group by date
  const byDate = {};
  for (const s of snapshots) {
    const dateKey = s.snapshotDate.toISOString().split('T')[0];
    if (!byDate[dateKey]) byDate[dateKey] = { date: dateKey, totalMentions: 0, opportunities: [] };
    byDate[dateKey].totalMentions += s.mentionCount;
    byDate[dateKey].opportunities.push({
      id: s.opportunityId,
      title: s.opportunity.title,
      momentum: s.momentum,
      mentionCount: s.mentionCount,
    });
  }

  return Object.values(byDate);
}

export async function getNiches() {
  const byCategory = await prisma.opportunity.groupBy({
    by: ['category'],
    _count: { id: true },
    _avg: { score: true, momentum: true },
  });

  return byCategory.map((c) => ({
    category: c.category,
    count: c._count.id,
    avgScore: Math.round((c._avg.score || 0) * 100) / 100,
    avgMomentum: Math.round((c._avg.momentum || 0) * 100) / 100,
  }));
}
