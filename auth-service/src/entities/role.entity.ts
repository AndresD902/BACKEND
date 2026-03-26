// Defines role types and the Role entity used for authentication and authorization.

export enum RoleName {
  admin = 'admin',
  user = 'HR',
  viewer = 'viewer',
}

export interface Role {
  id: number;
  name: RoleName;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}
