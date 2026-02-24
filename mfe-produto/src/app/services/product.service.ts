import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Product, ProductMetrics, CategoryMetric } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  
  private fakeProducts: Product[] = [
    {
      id: '1',
      name: 'Smartphone Galaxy Pro',
      description: 'Smartphone avançado com câmera de alta resolução',
      category: 'Eletrônicos',
      price: 2499.99,
      stock: 45,
      status: 'active',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-02-10'),
      sku: 'SGP-001',
      supplier: 'TechCorp Ltda'
    },
    {
      id: '2',
      name: 'Notebook UltraBook',
      description: 'Notebook leve e potente para trabalho e estudos',
      category: 'Informática',
      price: 3299.99,
      stock: 23,
      status: 'active',
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-02-05'),
      sku: 'NUB-002',
      supplier: 'CompuMax S.A.'
    },
    {
      id: '3',
      name: 'Fone Bluetooth Premium',
      description: 'Fone de ouvido sem fio com cancelamento de ruído',
      category: 'Áudio',
      price: 599.99,
      stock: 8,
      status: 'active',
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-12'),
      sku: 'FBP-003',
      supplier: 'AudioTech Inc.'
    },
    {
      id: '4',
      name: 'Tablet Pro 12"',
      description: 'Tablet profissional com tela de 12 polegadas',
      category: 'Eletrônicos',
      price: 1899.99,
      stock: 0,
      status: 'inactive',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-02-08'),
      sku: 'TPR-004',
      supplier: 'TechCorp Ltda'
    },
    {
      id: '5',
      name: 'Smartwatch Fitness',
      description: 'Relógio inteligente com monitoramento de saúde',
      category: 'Wearables',
      price: 899.99,
      stock: 67,
      status: 'active',
      createdAt: new Date('2024-01-25'),
      updatedAt: new Date('2024-02-11'),
      sku: 'SWF-005',
      supplier: 'WearTech Solutions'
    },
    {
      id: '6',
      name: 'Câmera DSLR Pro',
      description: 'Câmera profissional para fotografia avançada',
      category: 'Fotografia',
      price: 4599.99,
      stock: 12,
      status: 'active',
      createdAt: new Date('2024-01-30'),
      updatedAt: new Date('2024-02-09'),
      sku: 'CDP-006',
      supplier: 'PhotoPro Equipment'
    }
  ];

  constructor() {}

  getProducts(): Observable<Product[]> {
    return of(this.fakeProducts).pipe(delay(800));
  }

  getProduct(id: string): Observable<Product | undefined> {
    const product = this.fakeProducts.find(p => p.id === id);
    return of(product).pipe(delay(500));
  }

  getProductMetrics(): Observable<ProductMetrics> {
    const activeProducts = this.fakeProducts.filter(p => p.status === 'active');
    const inactiveProducts = this.fakeProducts.filter(p => p.status === 'inactive');
    const lowStockProducts = this.fakeProducts.filter(p => p.stock < 10);
    
    const totalValue = this.fakeProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    
    // Agrupar por categoria
    const categoryMap = new Map<string, CategoryMetric>();
    this.fakeProducts.forEach(product => {
      const existing = categoryMap.get(product.category);
      if (existing) {
        existing.count++;
        existing.value += product.price * product.stock;
      } else {
        categoryMap.set(product.category, {
          name: product.category,
          count: 1,
          value: product.price * product.stock
        });
      }
    });

    const metrics: ProductMetrics = {
      totalProducts: this.fakeProducts.length,
      activeProducts: activeProducts.length,
      inactiveProducts: inactiveProducts.length,
      totalValue: totalValue,
      lowStockProducts: lowStockProducts.length,
      categories: Array.from(categoryMap.values())
    };

    return of(metrics).pipe(delay(600));
  }

  updateProduct(product: Product): Observable<Product> {
    const index = this.fakeProducts.findIndex(p => p.id === product.id);
    if (index !== -1) {
      this.fakeProducts[index] = { ...product, updatedAt: new Date() };
      return of(this.fakeProducts[index]).pipe(delay(500));
    }
    throw new Error('Produto não encontrado');
  }

  createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Observable<Product> {
    const newProduct: Product = {
      ...product,
      id: (this.fakeProducts.length + 1).toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.fakeProducts.push(newProduct);
    return of(newProduct).pipe(delay(500));
  }

  deleteProduct(id: string): Observable<boolean> {
    const index = this.fakeProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      this.fakeProducts.splice(index, 1);
      return of(true).pipe(delay(500));
    }
    return of(false).pipe(delay(500));
  }
}