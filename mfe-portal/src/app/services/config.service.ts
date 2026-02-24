import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MfeConfig, MfeConfigResponse, MenuItem, MenuConfigResponse } from '../models/config.model';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private mfeConfigCache: MfeConfig[] | null = null;
  private menuConfigCache: MenuItem[] | null = null;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutos
  private lastCacheTime = 0;

  constructor(private http: HttpClient) {}

  async getMfeConfig(): Promise<MfeConfig[]> {
    if (this.isCacheValid() && this.mfeConfigCache) {
      return this.mfeConfigCache;
    }

    try {
      const response = await this.http.get<MfeConfigResponse>('/assets/config/mfes.json').toPromise();
      this.mfeConfigCache = response!.mfes.filter(mfe => mfe.status === 'active');
      this.lastCacheTime = Date.now();
      return this.mfeConfigCache;
    } catch (error) {
      console.error('Erro ao carregar configuração de MFEs:', error);
      return this.getFallbackMfeConfig();
    }
  }

  async getMenuConfig(userPermissions: string[] = []): Promise<MenuItem[]> {
    if (this.isCacheValid() && this.menuConfigCache) {
      return this.filterMenuByPermissions(this.menuConfigCache, userPermissions);
    }

    try {
      const response = await this.http.get<MenuConfigResponse>('/assets/config/menu-items.json').toPromise();
      this.menuConfigCache = response!.menuItems;
      this.lastCacheTime = Date.now();
      return this.filterMenuByPermissions(this.menuConfigCache, userPermissions);
    } catch (error) {
      console.error('Erro ao carregar configuração de menu:', error);
      return this.getFallbackMenuConfig();
    }
  }

  async getMfeByName(name: string): Promise<MfeConfig | undefined> {
    const mfes = await this.getMfeConfig();
    return mfes.find(mfe => mfe.name === name);
  }

  async checkMfeHealth(mfeName: string): Promise<boolean> {
    const mfe = await this.getMfeByName(mfeName);
    if (!mfe || !mfe.healthCheck) return true; // Assume healthy if no health check

    try {
      const response = await fetch(`${mfe.url}${mfe.healthCheck}`, {
        method: 'GET'
      });
      return response.ok;
    } catch {
      console.warn(`Health check failed for ${mfeName}, assuming healthy`);
      return true; // Graceful degradation
    }
  }

  private isCacheValid(): boolean {
    return (Date.now() - this.lastCacheTime) < this.cacheExpiry;
  }

  private filterMenuByPermissions(items: MenuItem[], userPermissions: string[]): MenuItem[] {
    return items
      .filter(item => item.active)
      .filter(item => {
        if (!item.permissions || item.permissions.length === 0) return true;
        return item.permissions.some(permission => userPermissions.includes(permission));
      })
      .sort((a, b) => a.order - b.order);
  }

  private getFallbackMfeConfig(): MfeConfig[] {
    return [
      {
        name: 'mfe-login',
        displayName: 'Login',
        url: 'http://localhost:4201',
        remoteEntry: '/remoteEntry.json',
        exposedModule: './Component',
        version: '1.0.0',
        status: 'active',
        permissions: []
      }
    ];
  }

  private getFallbackMenuConfig(): MenuItem[] {
    return [
      {
        id: 'home',
        label: 'Início',
        icon: '🏠',
        description: 'Página inicial',
        route: '/',
        order: 0,
        permissions: [],
        active: true,
        category: 'system'
      }
    ];
  }

  // Método para recarregar configurações (útil para desenvolvimento)
  async reloadConfig(): Promise<void> {
    this.mfeConfigCache = null;
    this.menuConfigCache = null;
    this.lastCacheTime = 0;
  }
}