import mongoose from 'mongoose';

export const isValidObjectId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f\d]{24}$/i.test(value) && mongoose.Types.ObjectId.isValid(value);

export const isValidEmail = (value: unknown): value is string =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isValidPassword = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 8 && value.length <= 128 &&
  /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);

export const isValidMoney = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && Math.round(value * 100) === value * 100;

export const isValidQuantity = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const isValidDateRange = (start: unknown, end: unknown): boolean => {
  const a = new Date(String(start));
  const b = new Date(String(end));
  return !Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime()) && a <= b;
};

export function pagination(query: Record<string, unknown>): { page: number; limit: number; skip: number } {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Paginación inválida');
  }
  return { page, limit, skip: (page - 1) * limit };
}

export const sanitizeString = (value: string): string => value.trim();
