import { Request, Response } from 'express';
import { LeadCaptureSchema } from './lead.validation';
import { LeadService } from './lead.service';

export class LeadController {
  // Get User Category Config for Lead Creation Form (Rules 2, 3, 4)
  static async getCategoryConfig(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED: Sign in required' });
      }

      const config = await LeadService.getUserCategoryConfig(userId);
      res.json({ success: true, ...config });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // Create Trade Lead / Inquiry (Rules 1, 2, 3, 4, 8)
  static async capture(req: Request, res: Response) {
    try {
      const validated = LeadCaptureSchema.parse(req.body);
      const creatorUserId = (req as any).user?.userId || (req as any).user?.id;

      const lead = await LeadService.captureLead(creatorUserId, validated);
      res.status(201).json({
        success: true,
        message: `Trade lead created in category '${lead.targetCategory}'! Targeted to initial batch of ${lead.assignedUserIds.length} eligible vendors.`,
        leadId: lead.id,
        lead,
      });
    } catch (error: any) {
      const isUnapproved = error.message && error.message.includes('UNAPPROVED_USER');
      res.status(isUnapproved ? 403 : 400).json({
        success: false,
        error: error.message || 'Failed to create trade lead',
      });
    }
  }

  // Recipient Vendor Click / Claim Lead (Rule 9 Batch Rotation)
  static async click(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const recipientUserId = (req as any).user?.userId || (req as any).user?.id;

      if (!recipientUserId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED: Sign in required' });
      }

      const lead = await LeadService.clickLead(id, recipientUserId);
      res.json({
        success: true,
        message: 'Lead click registered. Batch updated.',
        lead,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // Get My Inquiries / Targeted Leads (Rules 5, 6, 7, 10)
  static async getMyLeads(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const role = (req as any).user?.role;
      const email = (req as any).user?.email;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED: Sign in required' });
      }

      const result = await LeadService.getLeadsForUser(userId, role, email);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Super Admin Manage Lead Rules & Batches (Rule 10)
  static async adminManage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const role = (req as any).user?.role;
      const email = (req as any).user?.email;

      const isSuperAdmin = role === 'SUPER_ADMIN' || email === 'dnpatel2002@gmail.com';
      if (!isSuperAdmin) {
        return res.status(403).json({ success: false, error: 'Super Admin privileges required to manage lead rules & batches.' });
      }

      const updated = await LeadService.adminManageLead(id, req.body);
      res.json({
        success: true,
        message: 'Super Admin updated lead distribution rules & batch successfully.',
        lead: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
