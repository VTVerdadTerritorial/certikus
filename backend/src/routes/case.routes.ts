import { Router } from 'express';
import {
  create,
  list,
  getOne,
  update,
  remove,
} from '../controllers/case.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// TODAS LAS RUTAS DE CASOS REQUIEREN AUTENTICACIÓN
// ============================================================================
router.use(requireAuth);

// CRUD completo
router.post('/', create);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;