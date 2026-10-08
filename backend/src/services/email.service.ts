import { config } from '../config/env';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Sends one request to Resend. Provider details and credentials never reach callers. */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: config.emailFrom, ...message }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Email provider rejected request');
}
