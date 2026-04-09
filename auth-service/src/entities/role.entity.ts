// Defines role types and the Role entity used for authentication and authorization.

export enum RoleName {
  ADMIN = 'ADMIN',
  HR = 'HR',
  VIEWER = 'VIEWER',
}

export interface Role {
  id: number;
  name: RoleName;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}
