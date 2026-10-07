import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { Customer } from '../models/customer.model';
import { ILeadDocument } from '../models/lead.model';
import { IOpportunityDocument } from '../models/opportunity.model';
import { Opportunity } from '../models/opportunity.model';
import { crmRepository } from '../repositories/crm.repository';
import { auditedMutation } from './auditedMutation';
import { Actor } from './user.service';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidEmail, isValidObjectId, pagination } from '../utils/validation';

type LeadInput = { name?: string; companyName?: string; email?: string;
  phone?: string; source?: string; assignedTo?: string };
type OpportunityInput = { leadId?: string; customerId?: string; title?: string;
  amountMinor?: number; expectedCloseDate?: string; assignedTo?: string };
const leadLimits = { name: 200, companyName: 200, email: 254, phone: 30,
  source: 100, assignedTo: 24 } as const;
function leadInput(body: unknown, creating: boolean): LeadInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Lead inválido');
  const raw = body as Record<string, unknown>;
  if (!Object.keys(raw).length || Object.keys(raw).some((key) => !(key in leadLimits)))
    throw new ValidationError('Campos de lead no permitidos');
  const input: LeadInput = {};
  for (const key of Object.keys(raw) as (keyof typeof leadLimits)[]) {
    if (typeof raw[key] !== 'string' || raw[key].length > leadLimits[key] ||
      (!raw[key].trim() && ['name', 'source', 'assignedTo'].includes(key)))
      throw new ValidationError(`${key} inválido`);
    input[key] = raw[key].trim();
  }
  if (creating && (!input.name || !input.source))
    throw new ValidationError('Nombre y origen obligatorios');
  if (input.email) {
    input.email = input.email.toLowerCase();
    if (!isValidEmail(input.email)) throw new ValidationError('Email inválido');
  }
  if (input.email === '') input.email = undefined;
  if (input.assignedTo && !isValidObjectId(input.assignedTo))
    throw new ValidationError('Asignación inválida');
  return input;
}
function opportunityInput(body: unknown, creating: boolean): OpportunityInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Oportunidad inválida');
  const raw = body as Record<string, unknown>;
  if (!Object.keys(raw).length || Object.keys(raw).some((key) =>
    !['leadId', 'customerId', 'title', 'amountMinor', 'expectedCloseDate',
      'assignedTo'].includes(key))) throw new ValidationError('Campos de oportunidad no permitidos');
  const input: OpportunityInput = {};
  for (const key of ['leadId', 'customerId', 'title', 'expectedCloseDate',
    'assignedTo'] as const) {
    if (raw[key] !== undefined) {
      if (typeof raw[key] !== 'string' || !raw[key].trim() ||
        raw[key].length > (key === 'title' ? 200 : 24))
        throw new ValidationError(`${key} inválido`);
      input[key] = raw[key].trim();
    }
  }
  for (const key of ['leadId', 'customerId', 'assignedTo'] as const)
    if (input[key] && !isValidObjectId(input[key]))
      throw new ValidationError(`${key} inválido`);
  if (creating && (!input.title || raw.amountMinor === undefined ||
    Number(!!input.leadId) + Number(!!input.customerId) !== 1))
    throw new ValidationError('Título, monto y un origen son obligatorios');
  if (raw.amountMinor !== undefined) {
    if (!Number.isSafeInteger(raw.amountMinor) || Number(raw.amountMinor) < 0)
      throw new ValidationError('Monto inválido');
    input.amountMinor = raw.amountMinor as number;
  }
  if (input.expectedCloseDate) {
    const date = new Date(input.expectedCloseDate + 'T00:00:00.000Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expectedCloseDate) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== input.expectedCloseDate)
      throw new ValidationError('Fecha de cierre inválida');
  }
  return input;
}
function leadJson(lead: ILeadDocument) {
  return { id: String(lead._id), name: lead.name, companyName: lead.companyName,
    email: lead.email, phone: lead.phone, source: lead.source,
    status: lead.status, assignedTo: String(lead.assignedTo),
    createdAt: lead.createdAt, updatedAt: lead.updatedAt };
}
function opportunityJson(opportunity: IOpportunityDocument) {
  return { id: String(opportunity._id), title: opportunity.title,
    leadId: opportunity.leadId ? String(opportunity.leadId) : undefined,
    customerId: opportunity.customerId ? String(opportunity.customerId) : undefined,
    amountMinor: opportunity.amountMinor, stage: opportunity.stage,
    expectedCloseDate: opportunity.expectedCloseDate,
    assignedTo: String(opportunity.assignedTo),
    createdAt: opportunity.createdAt, updatedAt: opportunity.updatedAt };
}
function audit(actor: Actor, action: string, entity: 'lead' | 'opportunity',
  id: string, ip: string, device: string, value: Record<string, unknown>) {
  return { userId: actor.userId, companyId: actor.companyId, module: 'crm', action,
    entity, entityId: id, newValue: value, ip, device };
}
function validateId(id: string) {
  if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
}
function listing(query: Record<string, unknown>, allowed: string[]) {
  let paging;
  try { paging = pagination(query); } catch { throw new ValidationError('Paginación inválida'); }
  if (query.status !== undefined && !allowed.includes(String(query.status)))
    throw new ValidationError('Estado inválido');
  const search = query.search === undefined ? '' : query.search;
  if (typeof search !== 'string' || search.length > 100)
    throw new ValidationError('Búsqueda inválida');
  return { ...paging, status: query.status, safe: search.trim()
    .replace(/[^\p{L}\p{N}\s@._-]/gu, '').replaceAll('.', '\\.') };
}
async function assignee(companyId: string, id: string, session: mongoose.ClientSession) {
  if (!(await User.exists({ _id: id, companyId, status: 'active' })
    .session(session).exec())) throw new ValidationError('Responsable ajeno o inactivo');
}
async function opportunityReferences(companyId: string, input: OpportunityInput,
  session: mongoose.ClientSession) {
  if (input.leadId) {
    const lead = await crmRepository.lead(companyId, input.leadId, session);
    if (!lead || lead.status === 'inactive')
      throw new ValidationError('Lead ajeno o inactivo');
  }
  if (input.customerId && !(await Customer.exists({ _id: input.customerId,
    companyId, status: 'active' }).session(session).exec()))
    throw new ValidationError('Cliente ajeno o inactivo');
}
const openStages = ['prospecting', 'proposal', 'negotiation'];
export const crmService = {
  async listLeads(actor: Actor, query: Record<string, unknown>) {
    const { page, limit, skip, status, safe } = listing(query,
      ['new', 'qualified', 'inactive']);
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (safe) filter.$or = [{ name: new RegExp(safe, 'i') },
      { email: new RegExp(safe, 'i') }, { companyName: new RegExp(safe, 'i') }];
    const { data, total } = await crmRepository.listLeads(actor.companyId, filter, skip, limit);
    return { data: data.map(leadJson), pagination: { page, limit, total,
      pages: Math.ceil(total / limit) } };
  },
  async getLead(actor: Actor, id: string) {
    validateId(id);
    const lead = await crmRepository.lead(actor.companyId, id);
    if (!lead) throw new NotFoundError('Lead');
    return leadJson(lead);
  },
  async createLead(actor: Actor, body: unknown, ip: string, device: string) {
    const input = leadInput(body, true);
    return auditedMutation(async (session) => {
      const assignedTo = input.assignedTo || actor.userId;
      await assignee(actor.companyId, assignedTo, session);
      if (input.email && await crmRepository.leadEmail(actor.companyId, input.email,
        undefined, session)) throw new ConflictError('Email de lead duplicado');
      const lead = await crmRepository.createLead({ ...input, assignedTo,
        companyId: actor.companyId, status: 'new',
        createdBy: actor.userId, updatedBy: actor.userId }, session);
      return leadJson(lead);
    }, (lead) => audit(actor, 'create', 'lead', lead.id, ip, device,
      { name: lead.name, status: lead.status }));
  },
  async updateLead(actor: Actor, id: string, body: unknown, ip: string, device: string) {
    validateId(id); const input = leadInput(body, false);
    return auditedMutation(async (session) => {
      const lead = await crmRepository.lead(actor.companyId, id, session);
      if (!lead) throw new NotFoundError('Lead');
      if (lead.status === 'inactive') throw new ConflictError('Lead inactivo');
      if (input.assignedTo) await assignee(actor.companyId, input.assignedTo, session);
      if (input.email && await crmRepository.leadEmail(actor.companyId, input.email,
        id, session)) throw new ConflictError('Email de lead duplicado');
      Object.assign(lead, input, { updatedBy: actor.userId });
      await crmRepository.saveLead(lead, session);
      return leadJson(lead);
    }, (lead) => audit(actor, 'update', 'lead', id, ip, device,
      { name: lead.name, status: lead.status }));
  },
  async leadState(actor: Actor, id: string, action: 'qualify' | 'deactivate',
    ip: string, device: string) {
    validateId(id);
    return auditedMutation(async (session) => {
      const lead = await crmRepository.lead(actor.companyId, id, session);
      if (!lead) throw new NotFoundError('Lead');
      if (action === 'qualify' && lead.status !== 'new' ||
        action === 'deactivate' && lead.status === 'inactive')
        throw new ConflictError('Transición de lead inválida');
      if (action === 'deactivate' && await Opportunity.exists({ companyId: actor.companyId,
        leadId: id, stage: { $in: openStages } }).session(session).exec())
        throw new ConflictError('Lead con oportunidades abiertas');
      lead.status = action === 'qualify' ? 'qualified' : 'inactive';
      lead.updatedBy = new mongoose.Types.ObjectId(actor.userId);
      await crmRepository.saveLead(lead, session);
      return leadJson(lead);
    }, (lead) => audit(actor, action, 'lead', id, ip, device,
      { status: lead.status }));
  },
  async listOpportunities(actor: Actor, query: Record<string, unknown>) {
    const { page, limit, skip, status, safe } = listing(query,
      [...openStages, 'won', 'lost', 'cancelled']);
    const filter: Record<string, unknown> = {};
    if (status) filter.stage = status;
    if (safe) filter.title = new RegExp(safe, 'i');
    const { data, total } = await crmRepository.listOpportunities(actor.companyId,
      filter, skip, limit);
    return { data: data.map(opportunityJson), pagination: { page, limit, total,
      pages: Math.ceil(total / limit) } };
  },
  async getOpportunity(actor: Actor, id: string) {
    validateId(id);
    const opportunity = await crmRepository.opportunity(actor.companyId, id);
    if (!opportunity) throw new NotFoundError('Oportunidad');
    return opportunityJson(opportunity);
  },
  async createOpportunity(actor: Actor, body: unknown, ip: string, device: string) {
    const input = opportunityInput(body, true);
    return auditedMutation(async (session) => {
      const assignedTo = input.assignedTo || actor.userId;
      await assignee(actor.companyId, assignedTo, session);
      await opportunityReferences(actor.companyId, input, session);
      const { expectedCloseDate, ...fields } = input;
      const opportunity = await crmRepository.createOpportunity({ ...fields,
        expectedCloseDate: expectedCloseDate
          ? new Date(expectedCloseDate + 'T00:00:00.000Z') : undefined,
        assignedTo, companyId: actor.companyId, stage: 'prospecting',
        createdBy: actor.userId, updatedBy: actor.userId }, session);
      return opportunityJson(opportunity);
    }, (opportunity) => audit(actor, 'create', 'opportunity', opportunity.id, ip, device,
      { title: opportunity.title, stage: opportunity.stage }));
  },
  async updateOpportunity(actor: Actor, id: string, body: unknown, ip: string,
    device: string) {
    validateId(id); const input = opportunityInput(body, false);
    return auditedMutation(async (session) => {
      const opportunity = await crmRepository.opportunity(actor.companyId, id, session);
      if (!opportunity) throw new NotFoundError('Oportunidad');
      if (!openStages.includes(opportunity.stage))
        throw new ConflictError('Oportunidad cerrada');
      const leadId = input.leadId || (input.customerId ? undefined : opportunity.leadId);
      const customerId = input.customerId || (input.leadId ? undefined : opportunity.customerId);
      if (Number(!!leadId) + Number(!!customerId) !== 1)
        throw new ValidationError('Selecciona solo un lead o cliente');
      if (input.assignedTo) await assignee(actor.companyId, input.assignedTo, session);
      await opportunityReferences(actor.companyId, input, session);
      const { expectedCloseDate, ...fields } = input;
      Object.assign(opportunity, fields, { updatedBy: actor.userId });
      if (input.leadId) opportunity.customerId = undefined;
      if (input.customerId) opportunity.leadId = undefined;
      if (expectedCloseDate) opportunity.expectedCloseDate =
        new Date(expectedCloseDate + 'T00:00:00.000Z');
      await crmRepository.saveOpportunity(opportunity, session);
      return opportunityJson(opportunity);
    }, (opportunity) => audit(actor, 'update', 'opportunity', id, ip, device,
      { title: opportunity.title, stage: opportunity.stage }));
  },
  async opportunityState(actor: Actor, id: string,
    stage: 'proposal' | 'negotiation' | 'won' | 'lost' | 'cancelled',
    ip: string, device: string) {
    validateId(id);
    return auditedMutation(async (session) => {
      const opportunity = await crmRepository.opportunity(actor.companyId, id, session);
      if (!opportunity) throw new NotFoundError('Oportunidad');
      const allowed: Record<string, string[]> = {
        prospecting: ['proposal', 'negotiation', 'lost', 'cancelled'],
        proposal: ['negotiation', 'won', 'lost', 'cancelled'],
        negotiation: ['won', 'lost', 'cancelled'],
      };
      if (!allowed[opportunity.stage]?.includes(stage))
        throw new ConflictError('Transición de oportunidad inválida');
      opportunity.stage = stage;
      opportunity.updatedBy = new mongoose.Types.ObjectId(actor.userId);
      await crmRepository.saveOpportunity(opportunity, session);
      return opportunityJson(opportunity);
    }, (opportunity) => audit(actor, stage, 'opportunity', id, ip, device,
      { stage: opportunity.stage }));
  },
};
