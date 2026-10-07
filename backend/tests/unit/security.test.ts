import { checkPermission } from '../../src/middlewares/auth';
import { errorLogFields, sanitizeLogData } from '../../src/utils/logger';
import { isValidPassword } from '../../src/utils/validation';

test('un permiso platform requiere marca de plataforma, incluso si existe en el rol', () => {
  const next = jest.fn();
  checkPermission('platform.company.create')(
    { user: { permissions: ['platform.company.create'], isPlatformAdmin: false } } as any,
    {} as any,
    next,
  );
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
});
test('redacta secretos en arreglos y cadenas URI sin exponer credenciales', () => {
  const data = sanitizeLogData({
    nested: [
      {
        passwordHash: 'secret',
        message: 'mongodb+srv://username:password@cluster.invalid/db',
        valid: 'ok',
      },
    ],
    token: 'secret',
  });
  expect(JSON.stringify(data)).not.toMatch(/username|password@|secret/);
  expect(data.nested[0].valid).toBe('ok');
});
test('conserva la causa de startup sin revelar credenciales', () => {
  const error = Object.assign(
    new Error('Authentication failed for mongodb+srv://username:password@cluster.invalid/db'),
    { code: 18 },
  );
  const fields = errorLogFields(error);
  expect(fields).toMatchObject({ errorName: 'Error', errorCode: 18 });
  expect(fields.errorMessage).toContain('Authentication failed');
  expect(JSON.stringify(fields)).not.toMatch(/username|password@/);
});
test('redacta secretos de entorno en mensajes y stacks', () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'startup-test-secret-value-32-characters';
  try {
    const error = new Error(`Invalid value ${process.env.JWT_SECRET}`);
    const fields = errorLogFields(error);
    expect(fields.errorMessage).toContain('Invalid value');
    expect(JSON.stringify(fields)).not.toContain(process.env.JWT_SECRET);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
});
test('rechaza contraseñas que bcrypt truncaría, contando bytes UTF-8', () => {
  expect(isValidPassword('Aa1' + 'a'.repeat(69))).toBe(true);
  expect(isValidPassword('Aa1' + 'a'.repeat(70))).toBe(false);
  expect(isValidPassword('Aa1' + 'é'.repeat(35))).toBe(false);
});
