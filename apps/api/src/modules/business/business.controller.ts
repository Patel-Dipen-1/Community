import { Request, Response } from 'express';
import { BusinessService } from './business.service';

export class BusinessController {
  static async getProfile(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const profile = await BusinessService.getProfile(businessId);
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const updated = await BusinessService.updateProfile(businessId, req.body);
      res.json({ message: 'Business profile updated successfully', profile: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
