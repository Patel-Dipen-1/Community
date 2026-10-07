import { Request, Response } from 'express';
import { CreateProductSchema } from './product.validation';
import { ProductService } from './product.service';
import { clearCacheByPattern } from '../../middleware/cache.middleware';

export class ProductController {
  // CREATE
  static async create(req: Request, res: Response) {
    try {
      const validated = CreateProductSchema.parse(req.body);
      const userId = (req as any).user.userId;
      const product = await ProductService.createProduct(userId, validated);
      clearCacheByPattern('/products');
      res.status(201).json({ message: 'Product created successfully', product });
    } catch (error: any) {
      const isUnapproved = error.message && error.message.includes('UNAPPROVED_USER');
      res.status(isUnapproved ? 403 : 400).json({
        error: error.errors || error.message,
        isUnapproved,
      });
    }
  }

  // READ SINGLE
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const product = await ProductService.getProduct(id, userId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (error: any) {
      const isRestricted = error.message && error.message.includes('COMMUNITY_RESTRICTED');
      const isInactive = error.message && error.message.includes('PRODUCT_INACTIVE');
      res.status(isRestricted || isInactive ? 403 : 500).json({ error: error.message });
    }
  }

  // UPDATE
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const updatedProduct = await ProductService.updateProduct(id, userId, req.body);
      clearCacheByPattern('/products');
      res.json({ message: 'Product updated successfully', product: updatedProduct });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // DELETE
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const deleted = await ProductService.deleteProduct(id, userId);
      if (!deleted) {
        return res.status(404).json({ error: 'Product not found or unauthorized' });
      }
      clearCacheByPattern('/products');
      res.json({ message: 'Product deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // TOGGLE ACTIVE / INACTIVE STATUS
  static async toggleStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId || (req as any).user.id;
      const { isActive } = req.body;
      const updated = await ProductService.toggleProductStatus(id, userId, Boolean(isActive));
      clearCacheByPattern('/products');
      clearCacheByPattern('/store');
      res.json({ success: true, message: `Product status updated to ${updated.isActive ? 'Active' : 'Inactive'}`, product: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // SEARCH / LIST
  static async search(req: Request, res: Response) {
    try {
      const { communityId, query, isHotSelling, businessId } = req.query;
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const products = await ProductService.searchProducts(userId, {
        communityId: communityId ? String(communityId) : undefined,
        query: query ? String(query) : undefined,
        isHotSelling: isHotSelling === 'true' || isHotSelling === '1',
        businessId: businessId ? String(businessId) : undefined,
      });
      res.json({ communityId, totalResults: products.length, products });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // GET GLOBAL OPTIONS (DEFAULTS + SUPER ADMIN APPROVED CUSTOM ATTRIBUTES)
  static async getGlobalOptions(req: Request, res: Response) {
    try {
      const options = await ProductService.getGlobalOptions();
      res.json(options);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // GET HIERARCHICAL DYNAMIC SCHEMA (COMMUNITY -> CATEGORY -> SPECIFICATION -> OPTIONS)
  static async getDynamicSchema(req: Request, res: Response) {
    try {
      const schema = await ProductService.getDynamicSchema();
      res.json(schema);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // SUBMIT CUSTOM CATEGORY / ATTRIBUTE REQUEST
  static async submitCategoryRequest(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated user' });
      }

      const request = await ProductService.submitCategoryAttributeRequest(userId, req.body);
      res.status(201).json({
        message: 'Category/Attribute request submitted to Super Admin for confirmation!',
        request,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // SUPER ADMIN: LIST CATEGORY / ATTRIBUTE REQUESTS
  static async getCategoryRequests(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const requests = await ProductService.getCategoryAttributeRequests(status as string);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // SUPER ADMIN: APPROVE REQUEST (Support reclassification type & value)
  static async approveCategoryRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { type, value } = req.body || {};
      const updated = await ProductService.approveCategoryAttributeRequest(id, type, value);
      clearCacheByPattern('/products');
      res.json({
        message: 'Category/Attribute request approved and added globally for all users!',
        request: updated,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // SUPER ADMIN: REJECT REQUEST
  static async rejectCategoryRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const updated = await ProductService.rejectCategoryAttributeRequest(id, reason);
      res.json({
        message: 'Category/Attribute request rejected',
        request: updated,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // SUPER ADMIN: DELETE REQUEST / OPTION
  static async deleteCategoryRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await ProductService.deleteCategoryAttributeRequest(id);
      clearCacheByPattern('/products');
      res.json({
        message: 'Category/Attribute option deleted by Super Admin',
        request: deleted,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // SUPER ADMIN: CREATE NEW OPTION DIRECTLY
  static async createAdminCategoryOption(req: Request, res: Response) {
    try {
      const { type, value, description } = req.body;
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const option = await ProductService.createAdminCategoryAttributeOption(userId, type, value, description);
      clearCacheByPattern('/products');
      res.status(201).json({
        message: `Option '${value}' added globally!`,
        option,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // SUPER ADMIN: UPDATE EXISTING OPTION VALUE & TYPE
  static async updateCategoryOption(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { value, type } = req.body || {};
      const updated = await ProductService.updateCategoryAttributeOption(id, value, type);
      clearCacheByPattern('/products');
      res.json({
        message: 'Category/Attribute option updated!',
        option: updated,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

