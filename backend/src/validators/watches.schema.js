import { z } from 'zod';

export const createWatchSchema = z.object({
  type: z.enum(['keyword', 'opportunity', 'source']),
  target: z.string().min(1),
  config: z.record(z.any()).default({}),
  enabled: z.boolean().default(true),
});

export const updateWatchSchema = z.object({
  config: z.record(z.any()).optional(),
  enabled: z.boolean().optional(),
});
