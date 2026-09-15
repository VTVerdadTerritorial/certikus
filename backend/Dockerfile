# ============================================================================
# CERTIKUS Backend — Dockerfile corregido (Prisma 7 + Node 22)
# ============================================================================

# Stage 1: Build
FROM node:22-slim AS builder

WORKDIR /app

# Instalar OpenSSL (necesario para Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copiar archivos de configuración y dependencias
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma7.config.ts ./

# Instalar todas las dependencias
RUN npm ci

# Generar el cliente de Prisma (CRÍTICO: debe ir antes de 'npm run build')
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Copiar el resto del código fuente
COPY . .

# Compilar TypeScript (ahora tsc ya ve los archivos generados por Prisma)
RUN npm run build

# Stage 2: Production
FROM node:22-slim

WORKDIR /app

# Instalar OpenSSL (necesario para Prisma en runtime)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copiar package.json e instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar el código compilado y los archivos generados
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./
COPY --from=builder /app/assets ./assets

# Puerto y entorno
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Arrancar la aplicación
CMD ["node", "dist/index.js"]