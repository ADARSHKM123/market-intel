import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

router.post('/scrape/:source', adminController.triggerScrape);
router.post('/scrape-direct/:source', adminController.triggerDirectScrape);
router.post('/cluster-direct', adminController.triggerDirectCluster);
router.get('/jobs', adminController.getJobStatus);
router.get('/db-stats', adminController.getDbStats);

export default router;
