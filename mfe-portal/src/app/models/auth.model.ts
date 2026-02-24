export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  permissions?: string[];
  roles?: string[];
  scopes?: string[];
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface MfeInputData {
  token?: string;
  [key: string]: any;
}

export interface MfeOutputData {
  [key: string]: any;
}