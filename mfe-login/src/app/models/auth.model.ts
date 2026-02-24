export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    username: string;
    name: string;
    email?: string;
    permissions?: string[];
    scopes?: string[];
  };
  error?: string;
}

export interface MfeInputData {
  title?: string;
  allowRememberMe?: boolean;
  [key: string]: any;
}

export interface MfeOutputData {
  type: string;
  payload: any;
}