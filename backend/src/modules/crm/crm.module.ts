import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { listLeads, getLead, createLead, updateLead, leadState,
  listOpportunities, getOpportunity, createOpportunity, updateOpportunity,
  setOpportunityStage, cancelOpportunity } from '../../controllers/crm.controller';

const router = Router();
router.use(authenticateToken);
router.get('/leads', checkPermission('crm.view'), asyncHandler(listLeads));
router.get('/leads/:id', checkPermission('crm.view'), asyncHandler(getLead));
router.post('/leads', checkPermission('crm.create'), asyncHandler(createLead));
router.put('/leads/:id', checkPermission('crm.edit'), asyncHandler(updateLead));
router.patch('/leads/:id', checkPermission('crm.edit'), asyncHandler(updateLead));
router.patch('/leads/:id/qualify', checkPermission('crm.edit'),
  asyncHandler(leadState('qualify')));
router.patch('/leads/:id/deactivate', checkPermission('crm.disable'),
  asyncHandler(leadState('deactivate')));
router.get('/opportunities', checkPermission('crm.view'), asyncHandler(listOpportunities));
router.get('/opportunities/:id', checkPermission('crm.view'), asyncHandler(getOpportunity));
router.post('/opportunities', checkPermission('crm.create'), asyncHandler(createOpportunity));
router.put('/opportunities/:id', checkPermission('crm.edit'), asyncHandler(updateOpportunity));
router.patch('/opportunities/:id', checkPermission('crm.edit'), asyncHandler(updateOpportunity));
router.patch('/opportunities/:id/stage', checkPermission('crm.edit'),
  asyncHandler(setOpportunityStage));
router.patch('/opportunities/:id/cancel', checkPermission('crm.disable'),
  asyncHandler(cancelOpportunity));
export const crmRouter = router;
