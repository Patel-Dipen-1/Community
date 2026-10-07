import { Router } from 'express';
import { ProductController } from './product.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requireVerifiedUser, enforceCommunityIsolation } from '../../middleware/community.middleware';

const router = Router();

// GLOBAL CATEGORIES & ATTRIBUTES OPTIONS
router.get('/options', ProductController.getGlobalOptions);

// SUBMIT CATEGORY / ATTRIBUTE REQUEST
router.post('/category-requests', authenticateToken, ProductController.submitCategoryRequest);

// SUPER ADMIN CATEGORY & ATTRIBUTE REQUEST MANAGEMENT
router.get('/admin/category-requests', authenticateToken, ProductController.getCategoryRequests);
router.post('/admin/category-requests/create', authenticateToken, ProductController.createAdminCategoryOption);
router.put('/admin/category-requests/:id/approve', authenticateToken, ProductController.approveCategoryRequest);
router.put('/admin/category-requests/:id/reject', authenticateToken, ProductController.rejectCategoryRequest);
router.put('/admin/category-requests/:id', authenticateToken, ProductController.updateCategoryOption);
router.delete('/admin/category-requests/:id', authenticateToken, ProductController.deleteCategoryRequest);

// CREATE
router.post('/', authenticateToken, requireVerifiedUser, ProductController.create);

// READ SEARCH / LIST (Community Isolated)
router.get('/search', enforceCommunityIsolation, ProductController.search);

// READ SINGLE (By ID or Product Code)
router.get('/:id', ProductController.getById);

// UPDATE
router.put('/:id', authenticateToken, requireVerifiedUser, ProductController.update);

// UPDATE STATUS (Active / Inactive)
router.patch('/:id/status', authenticateToken, requireVerifiedUser, ProductController.toggleStatus);

// DELETE
router.delete('/:id', authenticateToken, requireVerifiedUser, ProductController.delete);

export default router;

