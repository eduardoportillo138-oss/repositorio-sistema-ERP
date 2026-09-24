// ============================================
// Prueba Unitaria de Ejemplo
// ============================================

describe('ERP Backend - Pruebas Unitarias', () => {
  describe('Validación de entrada', () => {
    test('debe validar email correctamente', () => {
      const { isValidEmail } = require('../../src/utils/validation');
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
    });

    test('debe validar ObjectId correctamente', () => {
      const { isValidObjectId } = require('../../src/utils/validation');
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(isValidObjectId('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    });
  });

  describe('Validación de contraseña', () => {
    test('debe validar contraseña débil', () => {
      const { isValidPassword } = require('../../src/utils/validation');
      expect(isValidPassword('short')).toBe(false);
    });

    test('debe aceptar contraseña fuerte', () => {
      const { isValidPassword } = require('../../src/utils/validation');
      expect(isValidPassword('Str0ngP@ssw0rd!')).toBe(true);
    });
  });
});
