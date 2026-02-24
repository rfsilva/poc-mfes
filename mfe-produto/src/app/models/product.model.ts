export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: Date;
  updatedAt: Date;
  sku?: string; // Adicionado campo SKU
  supplier?: string; // Adicionado campo fornecedor
}

export interface ProductMetrics {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalValue: number;
  lowStockProducts: number;
  categories: CategoryMetric[];
}

export interface CategoryMetric {
  name: string;
  count: number;
  value: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  permissions?: string[];
  scopes?: string[];
  department?: string; // Adicionado campo departamento
  role?: string; // Adicionado campo role
  level?: string; // Adicionado campo level para validação de alçada
}

export interface MfeInputData {
  user?: User;
  productId?: string;
  permissions?: string[];
  scopes?: string[];
  token?: string;
  [key: string]: any;
}

export interface MfeOutputData {
  type: string;
  payload: any;
}