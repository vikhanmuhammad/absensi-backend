import { Router } from 'express';
import * as manpowerRequestsController from './manpower-requests.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole, blockItMaintenanceApproval } from '../../middlewares/role.middleware';

const router = Router();

router.use(requireAuth);

router.get('/pending', requireRole(['SUPERVISOR', 'HRD', 'SUPER_ADMIN']), manpowerRequestsController.listPending);
router.post('/', manpowerRequestsController.create);
router.patch(
  '/:id/approve',
  requireRole(['SUPERVISOR', 'HRD', 'SUPER_ADMIN']),
  blockItMaintenanceApproval,
  manpowerRequestsController.approve,
);
router.patch(
  '/:id/reject',
  requireRole(['SUPERVISOR', 'HRD', 'SUPER_ADMIN']),
  blockItMaintenanceApproval,
  manpowerRequestsController.reject,
);

export default router;
