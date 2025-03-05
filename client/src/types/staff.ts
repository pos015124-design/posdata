export type StaffMember = {
  _id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  createdAt?: string;
  user?: {
    isApproved: boolean;
    permissions: {
      dashboard: boolean;
      pos: boolean;
      inventory: boolean;
      customers: boolean;
      staff: boolean;
      reports: boolean;
      settings: boolean;
    };
  };
};