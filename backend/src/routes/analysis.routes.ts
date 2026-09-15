import { Router } from 'express';
import { analyze, getReport, downloadPDF } from '../controllers/analysis.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/:id/analyze', analyze);
router.get('/:id/report', getReport);
router.get('/:id/report/pdf', downloadPDF);

export default router;