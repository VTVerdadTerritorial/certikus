import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import { prisma } from './config/database';
import authRoutes from './routes/auth.routes';
import caseRoutes from './routes/case.routes';
import documentRoutes, { documentIdRouter } from './routes/document.routes';
import geminiRoutes from './routes/gemini.routes';
import analysisRoutes from './routes/analysis.routes';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HEALTH CHECKS
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'certikus-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/health/db', async (_req: Request, res: Response) => {
  try {
    const result = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`;
    const userCount = await prisma.user.count();
    res.json({
      status: 'ok',
      database: 'connected',
      serverTime: result[0]?.now,
      stats: { users: userCount },
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: err instanceof Error ? err.message : 'Error desconocido',
    });
  }
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'CERTIKUS API',
    description: 'Backend de prevalidación documental registral',
    version: '1.0.0',
    legal: 'CERTIKUS no sustituye la calificación oficial de la ORIP (Ley 1579 de 2012)',
  });
});

// RUTAS DE LA API v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/cases', caseRoutes);
app.use('/api/v1/cases', documentRoutes);
app.use('/api/v1/cases', analysisRoutes);
app.use('/api/v1/documents', documentIdRouter);
app.use('/api/v1/documents', geminiRoutes);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'La ruta solicitada no existe.',
      timestamp: new Date().toISOString(),
    },
  });
});

// ERRORES
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error interno:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error inesperado.',
      timestamp: new Date().toISOString(),
    },
  });
});

// INICIAR
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🚀 CERTIKUS Backend');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  ✓ Servidor:   http://localhost:${PORT}`);
  console.log(`  ✓ Health:     http://localhost:${PORT}/health`);
  console.log(`  ✓ Health DB:  http://localhost:${PORT}/health/db`);
  console.log(`  ✓ Auth:       http://localhost:${PORT}/api/v1/auth`);
  console.log(`  ✓ Cases:      http://localhost:${PORT}/api/v1/cases`);
  console.log(`  ✓ Documents:  http://localhost:${PORT}/api/v1/cases/:id/documents`);
  console.log(`  ✓ Extraction: http://localhost:${PORT}/api/v1/documents/:id/extract`);
  console.log(`  ✓ Analyze:    http://localhost:${PORT}/api/v1/cases/:id/analyze`);
  console.log(`  ✓ Report:     http://localhost:${PORT}/api/v1/cases/:id/report`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

export default app;