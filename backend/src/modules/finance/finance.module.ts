// ============================================
// Módulo de Finanzas
// ============================================

import { Router } from 'express';
import { getFinances, getInvoice, createInvoice, getAccountsReceivable, getAccountsPayable } from '../../controllers/finance.controller';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { validate } from '../../middlewares/validators';

const router = Router();

router.use(authenticateToken);

// Cuentas por cobrar
router.get('/accounts-receivable', checkPermission('finances.view'), getAccountsReceivable);

// Cuentas por pagar
router.get('/accounts-payable', checkPermission('finances.view'), getAccountsPayable);

// Facturación
router.get('/invoices', checkPermission('finances.view'), getInvoice);
router.post('/invoices', checkPermission('finances.create'), createInvoice);

// Finanzas generales
router.get('/', checkPermission('finances.view'), getFinances);

export const financeRouter = router;
