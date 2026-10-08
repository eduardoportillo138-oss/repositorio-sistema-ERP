import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { auditedMutation } from '../../src/services/auditedMutation';
import { auditService } from '../../src/services/audit.service';

const root = path.resolve(__dirname, '../../..');

test('.env.example tiene claves únicas y sólo MONGODB_URI de ejemplo', () => {
  const content = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  const entries = content.split(/\r?\n/).filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line));
  const keys = entries.map((line) => line.split('=')[0]);
  expect(keys.filter((key) => key === 'JWT_SECRET')).toHaveLength(1);
  expect(keys.filter((key) => key === 'MONGODB_URI')).toHaveLength(1);
  expect(content).toContain(
    'MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.example.mongodb.net/erp',
  );
  expect(content).not.toMatch(
    /mongodb(?:\+srv)?:\/\/[^\s]*@(?!(?:cluster\.example\.mongodb\.net))/i,
  );
});

test('Render instala tooling de build y web usa VITE_API_BASE_URL', () => {
  const render = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
  expect(render).toContain(
    'npm ci --include=dev && npm run build:packages && npm run backend:build',
  );
  expect(render).toContain('healthCheckPath: /health');
  const entry = fs.readFileSync(path.join(root, 'apps/web/src/index.tsx'), 'utf8');
  expect(entry).toContain("initializeWebApi(import.meta.env.VITE_API_BASE_URL, import.meta.env.PROD)");
});

test('la auditoría fallida impide que auditedMutation confirme éxito', async () => {
  const session = {
    withTransaction: async (callback: () => Promise<void>) => callback(),
    endSession: jest.fn(),
  } as any;
  jest.spyOn(mongoose, 'startSession').mockResolvedValue(session);
  const log = jest.spyOn(auditService, 'log').mockRejectedValue(new Error('audit unavailable'));
  await expect(
    auditedMutation(
      async () => 'write',
      () => ({
        userId: '507f1f77bcf86cd799439013',
        companyId: '507f1f77bcf86cd799439011',
        module: 'test',
        action: 'write',
        entity: 'test',
        entityId: '1',
        ip: 'test',
        device: 'test',
      }),
    ),
  ).rejects.toThrow('audit unavailable');
  expect(log).toHaveBeenCalledWith(
    expect.objectContaining({ eventId: expect.any(String) }),
    session,
  );
  expect(session.endSession).toHaveBeenCalled();
  jest.restoreAllMocks();
});
