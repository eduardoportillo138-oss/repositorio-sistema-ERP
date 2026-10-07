import { Request, Response } from 'express';
import { crmService } from '../services/crm.service';
import { ValidationError } from '../errors/AppError';

const context = (req: Request) => ({ actor: req.user!, ip: String(req.ip || ''),
  device: req.get('user-agent') || '' });
export async function listLeads(req: Request, res: Response) {
  res.json({ success: true, ...await crmService.listLeads(req.user!, req.query) });
}
export async function getLead(req: Request, res: Response) {
  res.json({ success: true, data: await crmService.getLead(req.user!, req.params.id!) });
}
export async function createLead(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.status(201).json({ success: true,
    data: await crmService.createLead(actor, req.body, ip, device) });
}
export async function updateLead(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.json({ success: true,
    data: await crmService.updateLead(actor, req.params.id!, req.body, ip, device) });
}
export const leadState = (action: 'qualify' | 'deactivate') =>
  async (req: Request, res: Response) => {
    const { actor, ip, device } = context(req);
    res.json({ success: true,
      data: await crmService.leadState(actor, req.params.id!, action, ip, device) });
  };
export async function listOpportunities(req: Request, res: Response) {
  res.json({ success: true, ...await crmService.listOpportunities(req.user!, req.query) });
}
export async function getOpportunity(req: Request, res: Response) {
  res.json({ success: true,
    data: await crmService.getOpportunity(req.user!, req.params.id!) });
}
export async function createOpportunity(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.status(201).json({ success: true,
    data: await crmService.createOpportunity(actor, req.body, ip, device) });
}
export async function updateOpportunity(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.json({ success: true,
    data: await crmService.updateOpportunity(actor, req.params.id!, req.body, ip, device) });
}
export async function setOpportunityStage(req: Request, res: Response) {
  const stage = req.body?.stage;
  if (!['proposal', 'negotiation', 'won', 'lost'].includes(stage))
    throw new ValidationError('Etapa inválida');
  const { actor, ip, device } = context(req);
  res.json({ success: true, data: await crmService.opportunityState(actor,
    req.params.id!, stage, ip, device) });
}
export async function cancelOpportunity(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.json({ success: true, data: await crmService.opportunityState(actor,
    req.params.id!, 'cancelled', ip, device) });
}
