import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { updateStatusSchema } from '../validators/opportunities.schema.js';
import * as opportunitiesController from '../controllers/opportunities.controller.js';

const router = Router();

router.get('/', opportunitiesController.getAll);
router.get('/:id', opportunitiesController.getById);
router.get('/:id/signals', opportunitiesController.getSignals);
router.get('/:id/trend', opportunitiesController.getTrend);
router.patch('/:id/status', validate(updateStatusSchema), opportunitiesController.updateStatus);

export default router;
