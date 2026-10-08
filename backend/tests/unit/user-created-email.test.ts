import mongoose from 'mongoose';
import { config, validateConfig } from '../../src/config/env';
import { userService, Actor } from '../../src/services/user.service';
import { notifyUserCreated } from '../../src/services/user-created-notification.service';
import * as notificationService from '../../src/services/user-created-notification.service';
import * as emailService from '../../src/services/email.service';
import { userRepository } from '../../src/repositories/user.repository';
import { auditService } from '../../src/services/audit.service';
import { Role } from '../../src/models/role.model';
import { Branch } from '../../src/models/branch.model';
import { Company } from '../../src/models/company.model';
import { User } from '../../src/models/user.model';
import { logger } from '../../src/utils/logger';
import { checkPermission } from '../../src/middlewares/auth';
import { createUser } from '../../src/controllers/user.controller';

const companyId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439012';
const roleId = '507f1f77bcf86cd799439013';
const createdId = '507f1f77bcf86cd799439014';
const actor: Actor = { companyId, userId, roleId, permissions: ['users.create'] };
const payload = { email: 'new@example.test', name: 'New User', password: 'ValidPass123', roleId };
const created = {
  _id: createdId,
  companyId,
  roleId,
  name: payload.name,
  email: payload.email,
  status: 'active',
  createdAt: new Date('2026-10-08T16:35:00.000Z'),
} as any;

const query = (value: unknown) => ({ exec: jest.fn().mockResolvedValue(value) }) as any;

beforeEach(() => {
  (config as any).userCreatedEmailNotifications = true;
  jest.spyOn(mongoose, 'startSession').mockResolvedValue({
    withTransaction: async (callback: () => Promise<void>) => callback(),
    endSession: async () => undefined,
  } as any);
  jest
    .spyOn(Role, 'findOne')
    .mockReturnValue(query({ _id: roleId, name: 'Vendedor', status: 'active', permissions: [] }));
  jest.spyOn(userRepository, 'create').mockResolvedValue(created);
  jest.spyOn(auditService, 'log').mockResolvedValue();
  jest.spyOn(logger, 'info').mockImplementation(() => logger);
  jest.spyOn(logger, 'error').mockImplementation(() => logger);
});

afterEach(() => {
  (config as any).userCreatedEmailNotifications = false;
  jest.restoreAllMocks();
});

test('solicita un correo una sola vez después del commit y auditoría', async () => {
  let committed = false;
  (mongoose.startSession as jest.Mock).mockResolvedValue({
    withTransaction: async (callback: () => Promise<void>) => {
      await callback();
      committed = true;
    },
    endSession: async () => undefined,
  });
  const notify = jest
    .spyOn(notificationService, 'notifyUserCreated')
    .mockImplementation(async () => {
      expect(committed).toBe(true);
      expect(auditService.log).toHaveBeenCalledTimes(1);
    });
  const result = await userService.create(actor, payload, '', '');
  expect(result.id).toBe(createdId);
  expect(notify).toHaveBeenCalledTimes(1);
  expect(notify).toHaveBeenCalledWith(
    expect.objectContaining({
      createdUser: expect.objectContaining({ email: payload.email }),
      roleName: 'Vendedor',
    }),
  );
});

test.each([
  [
    'save falla',
    () => {
      jest.spyOn(userRepository, 'create').mockRejectedValue(new Error('save failed'));
      return payload;
    },
  ],
  [
    'auditoría falla',
    () => {
      jest.spyOn(auditService, 'log').mockRejectedValue(new Error('audit failed'));
      return payload;
    },
  ],
  ['tenant arbitrario', () => ({ ...payload, companyId: '507f1f77bcf86cd799439099' })],
  [
    'rol inválido',
    () => {
      jest.spyOn(Role, 'findOne').mockReturnValue(query(null));
      return payload;
    },
  ],
  [
    'sucursal inválida',
    () => {
      jest.spyOn(Branch, 'findOne').mockReturnValue(query(null));
      return { ...payload, branchId: '507f1f77bcf86cd799439098' };
    },
  ],
])('%s no solicita correo', async (_name, makePayload) => {
  const notify = jest.spyOn(notificationService, 'notifyUserCreated').mockResolvedValue();
  await expect(userService.create(actor, makePayload(), '', '')).rejects.toBeDefined();
  expect(notify).not.toHaveBeenCalled();
});

test('permiso denegado no ejecuta creación ni correo', () => {
  const next = jest.fn();
  const notify = jest.spyOn(notificationService, 'notifyUserCreated').mockResolvedValue();
  checkPermission('users.create')({ user: { ...actor, permissions: [] } } as any, {} as any, next);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  expect(userRepository.create).not.toHaveBeenCalled();
  expect(notify).not.toHaveBeenCalled();
});

test('flag desactivado no solicita correo', async () => {
  (config as any).userCreatedEmailNotifications = false;
  const notify = jest.spyOn(notificationService, 'notifyUserCreated').mockResolvedValue();
  await userService.create(actor, payload, '', '');
  expect(notify).not.toHaveBeenCalled();
});

test('fallo del proveedor mantiene usuario creado y respuesta 201', async () => {
  jest
    .spyOn(notificationService, 'notifyUserCreated')
    .mockRejectedValue(new Error('provider error'));
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  await createUser(
    {
      user: actor,
      body: payload,
      ip: '',
      get: () => '',
    } as any,
    { status } as any,
  );
  expect(status).toHaveBeenCalledWith(201);
  expect(json).toHaveBeenCalledWith({
    success: true,
    data: expect.objectContaining({ id: createdId, email: payload.email }),
  });
  expect(logger.error).toHaveBeenCalledWith('USER_CREATED_EMAIL_NOTIFICATION_FAILED', {
    userId: createdId,
  });
  expect(userRepository.create).toHaveBeenCalledTimes(1);
});

test('compone destinatario y contenido sin secretos y escapa HTML', async () => {
  jest
    .spyOn(Company, 'findOne')
    .mockReturnValue({ select: () => query({ name: 'ERP & Co' }) } as any);
  jest.spyOn(User, 'findOne').mockReturnValue({ select: () => query({ name: 'Admin' }) } as any);
  const send = jest.spyOn(emailService, 'sendEmail').mockResolvedValue();
  (config as any).adminAlertEmail = 'admin@example.test';
  await notifyUserCreated({
    createdUser: {
      id: createdId,
      companyId,
      name: '<Juan>',
      email: payload.email,
      createdAt: new Date('2026-10-08T16:35:00.000Z'),
    },
    actorUserId: userId,
    roleName: 'Vendedor',
    branchName: 'Matriz',
  });
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'admin@example.test',
      subject: 'Nuevo usuario registrado en ERP',
      text: expect.stringContaining('Sucursal: Matriz'),
      html: expect.stringContaining('&lt;Juan&gt;'),
    }),
  );
  const message = JSON.stringify(send.mock.calls[0][0]);
  expect(message).not.toContain(payload.password);
  expect(message).not.toContain('passwordHash');
});

test('configuración exige credenciales solo con el flag activado', () => {
  const original = {
    resendApiKey: config.resendApiKey,
    emailFrom: config.emailFrom,
    adminAlertEmail: config.adminAlertEmail,
    userCreatedEmailNotifications: config.userCreatedEmailNotifications,
  };
  try {
    (config as any).resendApiKey = '';
    (config as any).emailFrom = '';
    (config as any).adminAlertEmail = '';
    expect(() => validateConfig()).toThrow(/RESEND_API_KEY/);
    (config as any).userCreatedEmailNotifications = false;
    expect(() => validateConfig()).not.toThrow();
  } finally {
    Object.assign(config, original);
  }
});
