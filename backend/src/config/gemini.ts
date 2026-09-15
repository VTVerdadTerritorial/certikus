import { VertexAI } from '@google-cloud/vertexai';

// ============================================================================
// CONFIGURACIÓN DE VERTEX AI (GEMINI 2.5 FLASH)
// ============================================================================

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'my-project-certikus-507922';
const LOCATION = process.env.VERTEX_AI_LOCATION || 'us-central1';
const MODEL_NAME = process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash';

if (!PROJECT_ID) {
  throw new Error('Falta la variable de entorno GCP_PROJECT_ID');
}

export const vertexAI = new VertexAI({
  project: PROJECT_ID,
  location: LOCATION,
});

export const generativeModel = vertexAI.getGenerativeModel({
  model: MODEL_NAME,
});

export const geminiConfig = {
  projectId: PROJECT_ID,
  location: LOCATION,
  modelName: MODEL_NAME,
};