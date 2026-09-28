import { checkPermission } from '../../src/middlewares/auth';
import { sanitizeLogData } from '../../src/utils/logger';
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
test('rechaza contraseñas que bcrypt truncaría, contando bytes UTF-8', () => {
  expect(isValidPassword('Aa1' + 'a'.repeat(69))).toBe(true);
  expect(isValidPassword('Aa1' + 'a'.repeat(70))).toBe(false);
  expect(isValidPassword('Aa1' + 'é'.repeat(35))).toBe(false);
});
