// ============================================
// Módulo de Empresas
// ============================================

import { Router } from 'express';
import { getCompanies, getCompanyById, createCompany, updateCompany, deactivateCompany } from '../../controllers/company.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { validate } from '../../middlewares/validators';

const router = Router();

router.use(authenticateToken);

// GET /api/v1/companies
router.get('/', checkPermission('companies.view'), getCompanies);

// GET /api/v1/companies/:id
router.get('/:id', checkPermission('companies.view'), validate({
  params: { id: { type: 'string', validate: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v), message: 'ID inválido' } },
}), getCompanyById);

// POST /api/v1/companies
router.post('/', checkPermission('companies.create'), validate({
  body: {
    name: { type: 'string', required: true },
    legalName: { type: 'string', required: true },
    taxId: { type: 'string', required: true },
    email: { type: 'string', required: true },
    currency: { type: 'string' },
  },
}), createCompany);

// PUT /api/v1/companies/:id
router.put('/:id', checkPermission('companies.edit'), validate({
  params: { id: { type: 'string', validate: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v), message: 'ID inválido' } },
}), updateCompany);

// PATCH /api/v1/companies/:id/deactivate
router.patch('/:id/deactivate', checkPermission('companies.delete'), validate({
  params: { id: { type: 'string', validate: (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v), message: 'ID inválido' } },
}), deactivateCompany);

export const companiesRouter = router;
