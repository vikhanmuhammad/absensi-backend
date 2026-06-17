import { Router } from 'express';
import * as divisionsController from './divisions.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', divisionsController.list);
router.get('/:id', divisionsController.getById);
router.post('/', requireRole(['SUPER_ADMIN', 'HRD']), divisionsController.create);
router.patch('/:id', requireRole(['SUPER_ADMIN', 'HRD']), divisionsController.update);

export default router;
