// ============================================
// Prueba Unitaria de Ejemplo
// ============================================

describe('ERP Backend - Pruebas Unitarias', () => {
  describe('Validación de entrada', () => {
    test('debe validar email correctamente', () => {
      const { isValidEmail } = require('../../packages/validation/src');
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
    });

    test('debe validar UUID correctamente', () => {
      const { isValidUUID } = require('../../packages/validation/src');
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('invalid-uuid')).toBe(false);
    });
  });

  describe('Validación de contraseña', () => {
    test('debe validar contraseña débil', () => {
      const { validatePassword } = require('../../packages/validation/src');
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('debe aceptar contraseña fuerte', () => {
      const { validatePassword } = require('../../packages/validation/src');
      const result = validatePassword('Str0ngP@ssw0rd!');
      expect(result.valid).toBe(true);
    });
  });
});
