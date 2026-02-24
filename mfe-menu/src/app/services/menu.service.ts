import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { MenuItem, User, MenuConfigResponse } from '../models/menu.model';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private menuCache: MenuItem[] | null = null;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutos
  private lastCacheTime = 0;

  constructor(private http: HttpClient) {}

  getMenuItems(user?: User): Observable<MenuItem[]> {
    return from(this.getMenuItemsAsync(user));
  }

  private async getMenuItemsAsync(user?: User): Promise<MenuItem[]> {
    console.log('MenuService: Carregando itens do menu para usuário:', user);
    
    // Verificar cache
    if (this.isCacheValid() && this.menuCache) {
      console.log('MenuService: Usando cache');
      return this.filterByPermissionsAndScopes(this.menuCache, user?.permissions || [], user?.scopes || []);
    }

    try {
      // Carregar de arquivo JSON estático do Portal
      const portalUrl = 'http://localhost:4200/assets/config/menu-items.json';
      console.log('MenuService: Carregando de:', portalUrl);
      
      const response = await this.http.get<MenuConfigResponse>(portalUrl).toPromise();
      console.log('MenuService: Resposta recebida:', response);
      
      this.menuCache = response!.menuItems;
      this.lastCacheTime = Date.now();
      
      const filteredItems = this.filterByPermissionsAndScopes(this.menuCache, user?.permissions || [], user?.scopes || []);
      console.log('MenuService: Itens filtrados:', filteredItems);
      
      return filteredItems;
    } catch (error) {
      console.error('MenuService: Erro ao carregar menu:', error);
      return this.getFallbackMenu();
    }
  }

  private filterByPermissionsAndScopes(items: MenuItem[], userPermissions: string[], userScopes: string[]): MenuItem[] {
    console.log('MenuService: Filtrando por permissões e scopes:', {
      items: items.length,
      userPermissions: userPermissions,
      userScopes: userScopes
    });
    
    const filtered = items
      .filter(item => item.active)
      .filter(item => {
        // Verificar permissões (compatibilidade)
        let hasPermission = true;
        if (item.permissions && item.permissions.length > 0) {
          hasPermission = item.permissions.some(permission => userPermissions.includes(permission));
        }

        // Verificar scopes (nova funcionalidade)
        let hasScope = true;
        if (item.scopes && item.scopes.length > 0) {
          hasScope = item.scopes.some(scope => userScopes.includes(scope));
        }

        const hasAccess = hasPermission && hasScope;
        
        console.log(`MenuService: Item ${item.label} - Permissões: ${item.permissions} - Scopes: ${item.scopes} - Usuário tem acesso: ${hasAccess}`);
        return hasAccess;
      })
      .sort((a, b) => a.order - b.order);
      
    console.log('MenuService: Itens após filtro:', filtered);
    return filtered;
  }

  private isCacheValid(): boolean {
    return (Date.now() - this.lastCacheTime) < this.cacheExpiry;
  }

  private getFallbackMenu(): MenuItem[] {
    console.log('MenuService: Usando menu de fallback');
    return [
      {
        id: 'home',
        label: 'Início',
        icon: '🏠',
        description: 'Página inicial',
        route: '/',
        order: 0,
        permissions: [],
        scopes: [],
        active: true,
        category: 'system'
      },
      {
        id: 'produto',
        label: 'Produtos (Fallback)',
        icon: '📦',
        description: 'Gestão de produtos',
        mfeName: 'mfe-produto',
        route: '/produto',
        order: 1,
        permissions: ['read'],
        scopes: ['sc_produto'],
        active: true,
        category: 'business'
      }
    ];
  }

  async reloadMenu(): Promise<void> {
    this.menuCache = null;
    this.lastCacheTime = 0;
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const items = await this.getMenuItemsAsync();
    return items.find(item => item.id === id);
  }

  // Método legado para compatibilidade
  getMenuItemSync(id: string): MenuItem | undefined {
    if (this.menuCache) {
      return this.menuCache.find(item => item.id === id);
    }
    return undefined;
  }
}