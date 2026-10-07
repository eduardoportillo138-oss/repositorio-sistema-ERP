import { Request, Response } from 'express';
import { financeService } from '../services/finance.service';

export async function listReceivables(req: Request, res: Response) {
  res.json({ success: true, ...await financeService.listAccounts(req.user!, 'receivable', req.query) });
}
export async function getReceivable(req: Request, res: Response) {
  res.json({ success: true,
    data: await financeService.getAccount(req.user!, 'receivable', req.params.id!) });
}
export async function listPayables(req: Request, res: Response) {
  res.json({ success: true, ...await financeService.listAccounts(req.user!, 'payable', req.query) });
}
export async function getPayable(req: Request, res: Response) {
  res.json({ success: true,
    data: await financeService.getAccount(req.user!, 'payable', req.params.id!) });
}
export async function listPayments(req: Request, res: Response) {
  res.json({ success: true, ...await financeService.listPayments(req.user!, req.query) });
}
export async function recordPayment(req: Request, res: Response) {
  res.status(201).json({ success: true,
    data: await financeService.recordPayment(req.user!, req.body,
      String(req.ip || ''), req.get('user-agent') || '') });
}
