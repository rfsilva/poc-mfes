export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  level: 'user' | 'supervisor' | 'manager' | 'admin' | 'director';
}

export interface ValidationCredentials {
  username: string;
  password: string;
  justification: string;
}

export interface ValidationResult {
  valid: boolean;
  user?: User;
  reason?: string;
}