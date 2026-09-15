import { Router } from 'express';
import { register, login, me, logout } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// RUTAS PÚBLICAS
// ============================================================================
router.post('/register', register);
router.post('/login', login);

// ============================================================================
// RUTAS PROTEGIDAS (requieren JWT)
// ============================================================================
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

export default router;