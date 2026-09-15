import { Router } from 'express';
import { extract } from '../controllers/gemini.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas de extracción requieren autenticación
router.use(requireAuth);

// POST /api/v1/documents/:id/extract
router.post('/:id/extract', extract);

export default router;