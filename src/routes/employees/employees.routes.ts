import { Router } from 'express';
import * as employeesController from './employees.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole(['SUPER_ADMIN', 'HRD', 'SUPERVISOR']), employeesController.list);
router.get('/:id', employeesController.getById);
router.patch('/:id', requireRole(['SUPER_ADMIN', 'HRD', 'SUPERVISOR']), employeesController.update);

export default router;
