export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  description: string;
  mfeName?: string | null;
  route: string;
  order: number;
  permissions: string[];
  scopes?: string[]; // Novo campo para scopes
  active: boolean;
  category: string;
  action?: 'navigate' | 'fake' | 'external';
  params?: Record<string, any>;
  children?: MenuItem[];
  metadata?: {
    tooltip?: string;
    badge?: string;
    newWindow?: boolean;
  };
  // Campos legados para compatibilidade
  url?: string;
  isActive?: boolean;
  productId?: string;
}

export interface MenuConfigResponse {
  version: string;
  lastUpdated: string;
  menuItems: MenuItem[];
}

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  permissions?: string[];
  roles?: string[];
  scopes?: string[]; // Novo campo para scopes
}

export interface MfeInputData {
  user?: User;
  permissions?: string[];
  scopes?: string[]; // Novo campo para scopes
  [key: string]: any;
}

export interface MfeOutputData {
  type: string;
  payload: any;
}