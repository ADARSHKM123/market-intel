import { z } from 'zod';

export const updateStatusSchema = z.object({
  status: z.enum(['identified', 'validated', 'in_progress', 'launched', 'archived']),
});
