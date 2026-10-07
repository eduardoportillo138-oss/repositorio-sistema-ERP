import { Request, Response } from 'express';
import { projectService } from '../services/project.service';

const context = (req: Request) => ({ actor: req.user!, ip: String(req.ip || ''),
  device: req.get('user-agent') || '' });
export async function getProjects(req: Request, res: Response) {
  res.json({ success: true, ...await projectService.list(req.user!, req.query) });
}
export async function getProjectById(req: Request, res: Response) {
  res.json({ success: true, data: await projectService.get(req.user!, req.params.id!) });
}
export async function createProject(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.status(201).json({ success: true,
    data: await projectService.create(actor, req.body, ip, device) });
}
export async function updateProject(req: Request, res: Response) {
  const { actor, ip, device } = context(req);
  res.json({ success: true,
    data: await projectService.update(actor, req.params.id!, req.body, ip, device) });
}
export const transitionProject = (action: 'activate' | 'complete' | 'cancel') =>
  async (req: Request, res: Response) => {
    const { actor, ip, device } = context(req);
    res.json({ success: true,
      data: await projectService.transition(actor, req.params.id!, action, ip, device) });
  };
