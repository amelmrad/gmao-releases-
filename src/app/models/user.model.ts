export type Role = 'ADMIN' | 'RESPONSABLE' | 'TECHNICIAN';

export interface User {
  id?: number;
  uuid?: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  address?: string;
  city?: string;
  postalCode?: string;
  cin?: string;
  profilePicture?: string;
  mustChangePassword?: boolean;
}

export interface AuthUser {
  id: number;
  uuid: string;
  name: string;
  email: string;
  role: Role;
  profilePicture?: string;
  token: string;
  mustChangePassword?: boolean;
}
