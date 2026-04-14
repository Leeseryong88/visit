export type FieldType = 'text' | 'textarea' | 'tel' | 'date' | 'time' | 'select' | 'radio' | 'checkbox' | 'file';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // For select, radio, checkbox
  placeholder?: string;
}

export interface VisitPurpose {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  isActive: boolean;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
  notificationEnabled?: boolean;
  notificationImage?: string;
}

export interface VisitorLog {
  id: string;
  purposeId: string;
  purposeName: string;
  visitorName: string;
  visitorContact: string;
  data: Record<string, any>;
  signature: string;
  ownerId: string;
  visitDate: any;
  createdAt: any;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'admin';
  createdAt: any;
  isSubscribed?: boolean;
  qrText?: string;
  qrTitle?: string;
}
