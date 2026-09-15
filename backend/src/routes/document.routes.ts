import { Router } from 'express';
import multer from 'multer';
import { upload, list, download, remove } from '../controllers/document.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
  },
});

router.use(requireAuth);

router.post('/:caseId/documents', uploadMiddleware.single('file'), upload);
router.get('/:caseId/documents', list);

export default router;

// Rutas de documentos por ID (fuera del prefijo /cases)
export const documentIdRouter = Router();
documentIdRouter.use(requireAuth);
documentIdRouter.get('/:id/download', download);
documentIdRouter.delete('/:id', remove);