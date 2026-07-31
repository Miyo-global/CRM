export interface OnboardEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  whatsappSameAsPhone?: boolean;
  whatsappNumber?: string;
  gender?: string;
  password: string;
  designation: string;
  departmentId?: number;
  role: string;
  employeeId?: string;
  joiningDate?: Date | string;
  dateOfBirth?: Date | string;
  skills?: string;
  experienceYears?: number;
  taxId?: string;
  monthlySalary?: number;
  bankDetails?: {
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    ifsc?: string;
    accountHolder?: string;
    pfUanNumber?: string;
  };
}
