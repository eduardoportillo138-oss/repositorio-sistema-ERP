import { Request, Response } from 'express';
import { reportService } from '../services/report.service';

export async function getDashboard(req: Request, res: Response) {
  res.json({ success: true, data: await reportService.dashboard(req.user!) });
}

export async function getSalesReport(req: Request, res: Response) {
  res.json({ success: true, data: await reportService.sales(req.user!, req.query) });
}

export async function getInventoryReport(req: Request, res: Response) {
  res.json({ success: true, data: await reportService.inventory(req.user!) });
}

export async function getFinanceReport(req: Request, res: Response) {
  res.json({ success: true, data: await reportService.finance(req.user!) });
}
