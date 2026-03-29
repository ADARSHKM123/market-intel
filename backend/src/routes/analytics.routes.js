import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';

const router = Router();

router.get('/overview', analyticsController.getOverview);
router.get('/trends', analyticsController.getTrends);
router.get('/niches', analyticsController.getNiches);

export default router;
