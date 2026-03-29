import prisma from '../config/prisma.js';

export async function getAll(userId) {
  return prisma.watch.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function create(userId, data) {
  return prisma.watch.create({
    data: { ...data, userId },
  });
}

export async function update(id, userId, data) {
  return prisma.watch.updateMany({
    where: { id, userId },
    data,
  });
}

export async function remove(id, userId) {
  return prisma.watch.deleteMany({
    where: { id, userId },
  });
}
