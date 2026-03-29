import { z } from 'zod';

export const createSourceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['hackernews', 'youtube']),
  config: z.record(z.any()).default({}),
  enabled: z.boolean().default(true),
});

export const updateSourceSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.record(z.any()).optional(),
  enabled: z.boolean().optional(),
});
