export interface ILead {
  id: string;
  businessId: string;
  visitorName: string;
  mobileNumber: string;
  productCode?: string | null;
  createdAt: Date;
}
