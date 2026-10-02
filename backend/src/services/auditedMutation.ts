import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { auditService } from './audit.service';

type Entry = Parameters<typeof auditService.log>[0];

/** The business mutation and audit record commit together. A failed audit aborts the write. */
export async function auditedMutation<T>(
  mutate: (session: mongoose.ClientSession) => Promise<T>,
  entry: (result: T) => Entry,
): Promise<T> {
  const eventId = crypto.randomUUID();
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await mutate(session);
      await auditService.log({ ...entry(result), eventId }, session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
