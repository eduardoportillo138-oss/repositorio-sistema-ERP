import { Router } from 'express';
import { authenticateToken, checkPermission } from '../../middlewares/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getUnits, getUnitById, createUnit, updateUnit,
  deactivateUnit } from '../../controllers/unit.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', checkPermission('units.view'), asyncHandler(getUnits));
router.get('/:id', checkPermission('units.view'), asyncHandler(getUnitById));
router.post('/', checkPermission('units.create'), asyncHandler(createUnit));
router.put('/:id', checkPermission('units.edit'), asyncHandler(updateUnit));
router.patch('/:id', checkPermission('units.edit'), asyncHandler(updateUnit));
router.patch('/:id/deactivate', checkPermission('units.disable'), asyncHandler(deactivateUnit));

export const unitsRouter = router;
