import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createWatchSchema, updateWatchSchema } from '../validators/watches.schema.js';
import * as watchesController from '../controllers/watches.controller.js';

const router = Router();

router.get('/', watchesController.getAll);
router.post('/', validate(createWatchSchema), watchesController.create);
router.put('/:id', validate(updateWatchSchema), watchesController.update);
router.delete('/:id', watchesController.remove);

export default router;
