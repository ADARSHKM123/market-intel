import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createSourceSchema, updateSourceSchema } from '../validators/sources.schema.js';
import * as sourcesController from '../controllers/sources.controller.js';

const router = Router();

router.get('/', sourcesController.getAll);
router.get('/:id', sourcesController.getById);
router.post('/', validate(createSourceSchema), sourcesController.create);
router.put('/:id', validate(updateSourceSchema), sourcesController.update);
router.delete('/:id', sourcesController.remove);

export default router;
