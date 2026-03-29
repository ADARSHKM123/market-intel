import { Router } from 'express';
import * as signalsController from '../controllers/signals.controller.js';

const router = Router();

router.get('/', signalsController.getAll);
router.get('/search', signalsController.search);

export default router;
