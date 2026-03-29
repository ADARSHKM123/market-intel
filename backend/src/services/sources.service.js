import prisma from '../config/prisma.js';

export async function getAll() {
  return prisma.source.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { rawPosts: true } } },
  });
}

export async function getById(id) {
  return prisma.source.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { rawPosts: true } } },
  });
}

export async function create(data) {
  return prisma.source.create({ data });
}

export async function update(id, data) {
  return prisma.source.update({ where: { id }, data });
}

export async function remove(id) {
  return prisma.source.delete({ where: { id } });
}
