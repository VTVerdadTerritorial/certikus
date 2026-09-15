import 'dotenv/config';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

// ============================================================================
// CONEXIÓN A POSTGRESQL CON PRISMA 7 + DRIVER ADAPTER
// ============================================================================

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'Falta la variable de entorno DATABASE_URL. Verifica tu archivo .env'
  );
}

// Crear el adapter de PostgreSQL
// Nota: La configuración SSL (sslmode=no-verify) se maneja directamente
// en la URL de conexión. No se necesitan opciones adicionales aquí.
const adapter = new PrismaPg({ connectionString });

// Crear el cliente Prisma con el adapter
export const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
});

// ============================================================================
// CIERRE LIMPIO DE LA CONEXIÓN
// ============================================================================
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});