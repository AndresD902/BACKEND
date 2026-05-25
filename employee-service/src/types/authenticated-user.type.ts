export interface AuthenticatedUser {
  id: string;
  email: string;
  rol: string;
  companyId?: number;
  employeeId?: number;
}
