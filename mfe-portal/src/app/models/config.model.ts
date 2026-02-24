export interface MfeConfig {
  name: string;
  displayName: string;
  url: string;
  remoteEntry: string;
  exposedModule: string;
  version: string;
  status: 'active' | 'inactive' | 'maintenance';
  permissions: string[];
  healthCheck?: string;
  fallbackComponent?: string;
  metadata?: {
    description?: string;
    team?: string;
    contact?: string;
  };
}

export interface MfeConfigResponse {
  version: string;
  lastUpdated: string;
  mfes: MfeConfig[];
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  description: string;
  mfeName?: string | null;
  route: string;
  order: number;
  permissions: string[];
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
}

export interface MenuConfigResponse {
  version: string;
  lastUpdated: string;
  menuItems: MenuItem[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  roles: string[];
}