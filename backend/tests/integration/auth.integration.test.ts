// ============================================
// Prueba de Integración - Autenticación
// ============================================

import request from 'supertest';
import { createApp } from '../../src/app';
import { userRepository } from '../../src/repositories/user.repository';

const app = createApp();

beforeEach(() => {
  jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
});

afterEach(() => jest.restoreAllMocks());

describe('API de Autenticación - Integración', () => {
  describe('POST /api/v1/auth/login', () => {
    test('debe rechazar login sin credenciales', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('debe rechazar login con email inválido', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'invalid-email', password: 'password123' });

      expect(response.status).toBe(400);
    });

    test('debe rechazar login con usuario inexistente', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
