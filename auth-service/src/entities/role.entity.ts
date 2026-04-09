// Defines role types and the Role entity used for authentication and authorization.

export enum RoleName {
  admin = 'ADMIN',
  HR = 'HR',
  viewer = 'VIEWER',
}

export interface Role {
  id: number;
  name: RoleName;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}
