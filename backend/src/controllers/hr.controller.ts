import { Request, Response } from 'express';
import { employeeService } from '../services/employee.service';

const context = (req: Request) => ({ actor: req.user!, ip: String(req.ip || ''),
  device: req.get('user-agent') || '' });
export async function getEmployees(req: Request, res: Response) {
  res.json({ success: true, ...await employeeService.list(req.user!, req.query) });
}
export async function getEmployeeById(req: Request, res: Response) {
  res.json({ success: true, data: await employeeService.get(req.user!, req.params.id!) });
}
export async function createEmployee(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.status(201).json({ success: true,
    data: await employeeService.create(actor, req.body, ip, device) });
}
export async function updateEmployee(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.json({ success: true,
    data: await employeeService.update(actor, req.params.id!, req.body, ip, device) });
}
export async function deactivateEmployee(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.json({ success: true,
    data: await employeeService.deactivate(actor, req.params.id!, ip, device) });
}
