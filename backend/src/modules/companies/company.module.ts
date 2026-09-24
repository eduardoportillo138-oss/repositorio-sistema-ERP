import { Router } from 'express';
import { getCompanies, getCompanyById, createCompany, updateCompany, deactivateCompany } from '../../controllers/company.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('companies.view'), asyncHandler(getCompanies));
router.get('/:id', checkPermission('companies.view'), asyncHandler(getCompanyById));
router.post('/', checkPermission('platform.company.create'), asyncHandler(createCompany));
router.put('/:id', checkPermission('companies.edit'), asyncHandler(updateCompany));
router.patch('/:id', checkPermission('companies.edit'), asyncHandler(updateCompany));
router.patch('/:id/deactivate', checkPermission('companies.disable'), asyncHandler(deactivateCompany));
export const companiesRouter = router;
