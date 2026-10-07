import { ValidationError } from '../errors/AppError';

export type PriceLine = { productId: string; name: string; quantityMilli: number;
  unitPriceMinor: number; discountMinor: number; taxRateBps: number };
export type CalculatedLine = PriceLine & { subtotalMinor: number; taxMinor: number;
  totalMinor: number };

function safeMinor(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new ValidationError('Importe fuera de rango');
  return Number(value);
}
const roundDiv = (value: bigint, denominator: bigint) =>
  (value + denominator / 2n) / denominator;

/** Deterministic integer arithmetic; no client-supplied totals are accepted. */
export function calculateOrder(lines: PriceLine[]) {
  let subtotal = 0n, discount = 0n, tax = 0n, total = 0n;
  const items: CalculatedLine[] = lines.map((line) => {
    if (![line.quantityMilli, line.unitPriceMinor, line.discountMinor, line.taxRateBps]
      .every(Number.isSafeInteger) || line.quantityMilli <= 0 ||
      line.unitPriceMinor < 0 || line.discountMinor < 0 ||
      line.taxRateBps < 0 || line.taxRateBps > 10000)
      throw new ValidationError('Línea monetaria inválida');
    const gross = roundDiv(BigInt(line.quantityMilli) * BigInt(line.unitPriceMinor), 1000n);
    if (BigInt(line.discountMinor) > gross)
      throw new ValidationError('Descuento superior al subtotal');
    const taxable = gross - BigInt(line.discountMinor);
    const lineTax = roundDiv(taxable * BigInt(line.taxRateBps), 10000n);
    const lineTotal = taxable + lineTax;
    subtotal += gross; discount += BigInt(line.discountMinor);
    tax += lineTax; total += lineTotal;
    return { ...line, subtotalMinor: safeMinor(gross),
      taxMinor: safeMinor(lineTax), totalMinor: safeMinor(lineTotal) };
  });
  return { items, subtotalMinor: safeMinor(subtotal), discountMinor: safeMinor(discount),
    taxMinor: safeMinor(tax), totalMinor: safeMinor(total) };
}
