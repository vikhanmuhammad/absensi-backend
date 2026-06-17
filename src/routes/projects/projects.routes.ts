import { Router } from 'express';
import * as projectsController from './projects.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', projectsController.list);
router.get('/:id', projectsController.getById);
router.post('/', requireRole(['SUPER_ADMIN', 'HRD']), projectsController.create);

export default router;
