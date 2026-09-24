// ============================================
// Prueba de Integración - Validación
// ============================================

import request from 'supertest';
import { app } from '../../src/app';

describe('API de Validación - Integración', () => {
  describe('Protección de rutas', () => {
    test('debe rechazar acceso a /api/v1/users sin autenticación', async () => {
      const response = await request(app)
        .get('/api/v1/users');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
