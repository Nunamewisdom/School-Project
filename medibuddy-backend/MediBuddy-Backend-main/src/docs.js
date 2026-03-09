import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import yaml from 'js-yaml';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.resolve(__dirname, '..', 'openapi.yaml');

let spec;
try {
  spec = yaml.load(fs.readFileSync(specPath, 'utf8'));
} catch (err) {
  console.error('⚠️  Failed to load OpenAPI spec:', err.message);
  spec = { openapi: '3.0.3', info: { title: 'MediBuddy (spec load error)', version: '0.0.0' }, paths: {} };
}

const router = Router();

// Serve Swagger UI at /docs
router.use('/', swaggerUi.serve, swaggerUi.setup(spec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MediBuddy API Docs',
}));

// Serve raw spec as JSON at /docs/spec.json
router.get('/spec.json', (_req, res) => res.json(spec));

export default router;
