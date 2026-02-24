# 🔧 Alternativas para Configuração Dinâmica de MFEs (Sem Banco de Dados)

## 🎯 **Contexto**

Como MFEs não devem ter acesso direto a banco de dados, precisamos de alternativas práticas para implementar a abordagem dinâmica de carregamento e configuração de microfrontends.

---

## 🚀 **Alternativa 1: Arquivos de Configuração JSON Estáticos**

### **📁 Estrutura de Arquivos**
```
mfe-portal/
├── src/
│   └── assets/
│       └── config/
│           ├── mfes.json
│           ├── menu-items.json
│           └── permissions.json
```

### **🔧 Implementação**

#### **1.1 Configuração de MFEs (mfes.json)**
```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-01-15T10:30:00Z",
  "mfes": [
    {
      "name": "mfe-login",
      "displayName": "Sistema de Login",
      "url": "http://localhost:4201",
      "remoteEntry": "/remoteEntry.json",
      "exposedModule": "./Component",
      "version": "1.2.0",
      "status": "active",
      "permissions": [],
      "healthCheck": "/health",
      "fallbackComponent": "DefaultLoginComponent",
      "metadata": {
        "description": "Módulo de autenticação",
        "team": "Security Team",
        "contact": "security@empresa.com"
      }
    },
    {
      "name": "mfe-menu",
      "displayName": "Menu Principal",
      "url": "http://localhost:4202",
      "remoteEntry": "/remoteEntry.json",
      "exposedModule": "./Component",
      "version": "1.1.0",
      "status": "active",
      "permissions": ["read"],
      "healthCheck": "/health"
    },
    {
      "name": "mfe-produto",
      "displayName": "Gestão de Produtos",
      "url": "http://localhost:4203",
      "remoteEntry": "/remoteEntry.json",
      "exposedModule": "./Component",
      "version": "2.0.0",
      "status": "active",
      "permissions": ["read", "write"],
      "healthCheck": "/health"
    }
  ]
}
```

#### **1.2 Configuração de Menu (menu-items.json)**
```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-01-15T10:30:00Z",
  "menuItems": [
    {
      "id": "produto",
      "label": "Produtos",
      "icon": "📦",
      "description": "Gestão de produtos",
      "mfeName": "mfe-produto",
      "route": "/produto",
      "order": 1,
      "permissions": ["read"],
      "active": true,
      "category": "business",
      "params": {
        "defaultView": "dashboard",
        "theme": "default"
      }
    },
    {
      "id": "dashboard",
      "label": "Dashboard",
      "icon": "📊",
      "description": "Painel de controle",
      "mfeName": "mfe-dashboard",
      "route": "/dashboard",
      "order": 0,
      "permissions": ["read"],
      "active": false,
      "category": "analytics"
    }
  ]
}
```

#### **1.3 Serviço de Configuração**
```typescript
// src/app/services/config.service.ts
@Injectable({ providedIn: 'root' })
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
      this.mfeConfigCache = response.mfes;
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
      this.menuConfigCache = response.menuItems;
      this.lastCacheTime = Date.now();
      return this.filterMenuByPermissions(this.menuConfigCache, userPermissions);
    } catch (error) {
      console.error('Erro ao carregar configuração de menu:', error);
      return this.getFallbackMenuConfig();
    }
  }

  private isCacheValid(): boolean {
    return (Date.now() - this.lastCacheTime) < this.cacheExpiry;
  }

  private filterMenuByPermissions(items: MenuItem[], userPermissions: string[]): MenuItem[] {
    return items.filter(item => {
      if (!item.active) return false;
      if (!item.permissions || item.permissions.length === 0) return true;
      return item.permissions.some(permission => userPermissions.includes(permission));
    });
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

  // Método para recarregar configurações
  async reloadConfig(): Promise<void> {
    this.mfeConfigCache = null;
    this.menuConfigCache = null;
    this.lastCacheTime = 0;
  }
}
```

### **✅ Vantagens:**
- ✅ **Zero dependência** de backend/banco
- ✅ **Fácil manutenção** via arquivos JSON
- ✅ **Versionamento** junto com o código
- ✅ **Cache local** para performance
- ✅ **Fallback** em caso de erro

### **❌ Desvantagens:**
- ❌ **Rebuild necessário** para mudanças
- ❌ **Não dinâmico** em runtime
- ❌ **Sem personalização** por usuário

---

## 🌐 **Alternativa 2: Configuração via Environment Variables**

### **🔧 Implementação**

#### **2.1 Configuração de Ambiente**
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  mfeConfig: {
    'mfe-login': {
      url: 'http://localhost:4201',
      exposedModule: './Component',
      permissions: []
    },
    'mfe-menu': {
      url: 'http://localhost:4202',
      exposedModule: './Component',
      permissions: ['read']
    },
    'mfe-produto': {
      url: 'http://localhost:4203',
      exposedModule: './Component',
      permissions: ['read', 'write']
    }
  },
  menuConfig: [
    {
      id: 'produto',
      label: 'Produtos',
      mfeName: 'mfe-produto',
      permissions: ['read']
    }
  ]
};
```

#### **2.2 Serviço de Environment**
```typescript
// src/app/services/environment-config.service.ts
@Injectable({ providedIn: 'root' })
export class EnvironmentConfigService {
  
  getMfeConfig(): MfeConfig[] {
    const config = environment.mfeConfig;
    return Object.keys(config).map(name => ({
      name,
      displayName: this.formatDisplayName(name),
      url: config[name].url,
      remoteEntry: '/remoteEntry.json',
      exposedModule: config[name].exposedModule,
      version: '1.0.0',
      status: 'active',
      permissions: config[name].permissions
    }));
  }

  getMenuConfig(userPermissions: string[] = []): MenuItem[] {
    return environment.menuConfig.filter(item =>
      !item.permissions || 
      item.permissions.some(permission => userPermissions.includes(permission))
    );
  }

  private formatDisplayName(name: string): string {
    return name.replace('mfe-', '').replace('-', ' ').toUpperCase();
  }
}
```

### **✅ Vantagens:**
- ✅ **Configuração por ambiente** (dev/prod)
- ✅ **Zero dependência externa**
- ✅ **Integração nativa** com Angular
- ✅ **Type safety** com TypeScript

### **❌ Desvantagens:**
- ❌ **Rebuild obrigatório** para mudanças
- ❌ **Limitado** a configurações simples
- ❌ **Não escalável** para muitos MFEs

---

## 🔄 **Alternativa 3: Configuração Híbrida (Recomendada)**

### **🎯 Conceito**
Combinar **configuração estática** (para MFEs core) com **configuração dinâmica** (para MFEs opcionais).

### **🔧 Implementação**

#### **3.1 Configuração Base (Estática)**
```typescript
// src/app/config/base-mfe.config.ts
export const BASE_MFE_CONFIG: MfeConfig[] = [
  {
    name: 'mfe-login',
    displayName: 'Sistema de Login',
    url: 'http://localhost:4201',
    remoteEntry: '/remoteEntry.json',
    exposedModule: './Component',
    version: '1.0.0',
    status: 'active',
    permissions: [],
    type: 'core' // MFE essencial
  },
  {
    name: 'mfe-menu',
    displayName: 'Menu Principal',
    url: 'http://localhost:4202',
    remoteEntry: '/remoteEntry.json',
    exposedModule: './Component',
    version: '1.0.0',
    status: 'active',
    permissions: ['read'],
    type: 'core'
  }
];

export const BASE_MENU_CONFIG: MenuItem[] = [
  {
    id: 'home',
    label: 'Início',
    icon: '🏠',
    route: '/',
    permissions: [],
    active: true,
    type: 'core'
  }
];
```

#### **3.2 Serviço Híbrido**
```typescript
// src/app/services/hybrid-config.service.ts
@Injectable({ providedIn: 'root' })
export class HybridConfigService {
  private dynamicMfes: MfeConfig[] = [];
  private dynamicMenuItems: MenuItem[] = [];

  constructor(private http: HttpClient) {}

  async getMfeConfig(): Promise<MfeConfig[]> {
    const baseMfes = [...BASE_MFE_CONFIG];
    
    // Tentar carregar MFEs dinâmicos (opcional)
    try {
      const dynamicConfig = await this.loadDynamicMfeConfig();
      this.dynamicMfes = dynamicConfig;
    } catch (error) {
      console.warn('Configuração dinâmica não disponível, usando apenas base:', error);
      this.dynamicMfes = [];
    }

    return [...baseMfes, ...this.dynamicMfes];
  }

  async getMenuConfig(userPermissions: string[] = []): Promise<MenuItem[]> {
    const baseMenu = [...BASE_MENU_CONFIG];
    
    // Tentar carregar menu dinâmico (opcional)
    try {
      const dynamicMenu = await this.loadDynamicMenuConfig();
      this.dynamicMenuItems = dynamicMenu;
    } catch (error) {
      console.warn('Menu dinâmico não disponível, usando apenas base:', error);
      this.dynamicMenuItems = [];
    }

    const allItems = [...baseMenu, ...this.dynamicMenuItems];
    return this.filterByPermissions(allItems, userPermissions);
  }

  private async loadDynamicMfeConfig(): Promise<MfeConfig[]> {
    // Tentar múltiplas fontes
    const sources = [
      '/assets/config/dynamic-mfes.json',
      '/api/mfes/config', // Se disponível
      localStorage.getItem('dynamic-mfes') // Cache local
    ];

    for (const source of sources) {
      try {
        if (typeof source === 'string' && source.startsWith('/')) {
          const response = await this.http.get<{mfes: MfeConfig[]}>(source).toPromise();
          return response.mfes || [];
        } else if (typeof source === 'string') {
          return JSON.parse(source) || [];
        }
      } catch (error) {
        continue; // Tentar próxima fonte
      }
    }
    
    return [];
  }

  private async loadDynamicMenuConfig(): Promise<MenuItem[]> {
    // Similar ao loadDynamicMfeConfig
    try {
      const response = await this.http.get<{menuItems: MenuItem[]}>('/assets/config/dynamic-menu.json').toPromise();
      return response.menuItems || [];
    } catch {
      return [];
    }
  }

  private filterByPermissions(items: MenuItem[], userPermissions: string[]): MenuItem[] {
    return items.filter(item => {
      if (!item.active) return false;
      if (!item.permissions || item.permissions.length === 0) return true;
      return item.permissions.some(permission => userPermissions.includes(permission));
    });
  }

  // Método para adicionar MFE dinamicamente (via admin)
  addDynamicMfe(mfe: MfeConfig): void {
    this.dynamicMfes.push(mfe);
    localStorage.setItem('dynamic-mfes', JSON.stringify(this.dynamicMfes));
  }

  // Método para remover MFE dinâmico
  removeDynamicMfe(mfeName: string): void {
    this.dynamicMfes = this.dynamicMfes.filter(mfe => mfe.name !== mfeName);
    localStorage.setItem('dynamic-mfes', JSON.stringify(this.dynamicMfes));
  }
}
```

### **✅ Vantagens:**
- ✅ **MFEs essenciais** sempre disponíveis
- ✅ **Flexibilidade** para MFEs opcionais
- ✅ **Graceful degradation** se dinâmico falhar
- ✅ **Múltiplas fontes** de configuração
- ✅ **Cache local** para offline

### **❌ Desvantagens:**
- ❌ **Complexidade adicional** no código
- ❌ **Múltiplos pontos** de configuração

---

## 🎮 **Alternativa 4: Configuração via LocalStorage/SessionStorage**

### **🔧 Implementação**

#### **4.1 Serviço de Storage**
```typescript
// src/app/services/storage-config.service.ts
@Injectable({ providedIn: 'root' })
export class StorageConfigService {
  private readonly MFE_CONFIG_KEY = 'mfe-config';
  private readonly MENU_CONFIG_KEY = 'menu-config';

  constructor() {
    this.initializeDefaultConfig();
  }

  getMfeConfig(): MfeConfig[] {
    const stored = localStorage.getItem(this.MFE_CONFIG_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Erro ao parsear configuração de MFEs:', error);
      }
    }
    return this.getDefaultMfeConfig();
  }

  getMenuConfig(userPermissions: string[] = []): MenuItem[] {
    const stored = localStorage.getItem(this.MENU_CONFIG_KEY);
    let menuItems: MenuItem[] = [];
    
    if (stored) {
      try {
        menuItems = JSON.parse(stored);
      } catch (error) {
        console.error('Erro ao parsear configuração de menu:', error);
        menuItems = this.getDefaultMenuConfig();
      }
    } else {
      menuItems = this.getDefaultMenuConfig();
    }

    return this.filterByPermissions(menuItems, userPermissions);
  }

  updateMfeConfig(config: MfeConfig[]): void {
    localStorage.setItem(this.MFE_CONFIG_KEY, JSON.stringify(config));
  }

  updateMenuConfig(config: MenuItem[]): void {
    localStorage.setItem(this.MENU_CONFIG_KEY, JSON.stringify(config));
  }

  addMfe(mfe: MfeConfig): void {
    const current = this.getMfeConfig();
    const updated = [...current.filter(m => m.name !== mfe.name), mfe];
    this.updateMfeConfig(updated);
  }

  removeMfe(mfeName: string): void {
    const current = this.getMfeConfig();
    const updated = current.filter(m => m.name !== mfeName);
    this.updateMfeConfig(updated);
  }

  private initializeDefaultConfig(): void {
    if (!localStorage.getItem(this.MFE_CONFIG_KEY)) {
      this.updateMfeConfig(this.getDefaultMfeConfig());
    }
    if (!localStorage.getItem(this.MENU_CONFIG_KEY)) {
      this.updateMenuConfig(this.getDefaultMenuConfig());
    }
  }

  private getDefaultMfeConfig(): MfeConfig[] {
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
      },
      {
        name: 'mfe-menu',
        displayName: 'Menu',
        url: 'http://localhost:4202',
        remoteEntry: '/remoteEntry.json',
        exposedModule: './Component',
        version: '1.0.0',
        status: 'active',
        permissions: ['read']
      },
      {
        name: 'mfe-produto',
        displayName: 'Produtos',
        url: 'http://localhost:4203',
        remoteEntry: '/remoteEntry.json',
        exposedModule: './Component',
        version: '1.0.0',
        status: 'active',
        permissions: ['read', 'write']
      }
    ];
  }

  private getDefaultMenuConfig(): MenuItem[] {
    return [
      {
        id: 'produto',
        label: 'Produtos',
        icon: '📦',
        description: 'Gestão de produtos',
        mfeName: 'mfe-produto',
        route: '/produto',
        order: 1,
        permissions: ['read'],
        active: true,
        category: 'business'
      }
    ];
  }

  private filterByPermissions(items: MenuItem[], userPermissions: string[]): MenuItem[] {
    return items.filter(item => {
      if (!item.active) return false;
      if (!item.permissions || item.permissions.length === 0) return true;
      return item.permissions.some(permission => userPermissions.includes(permission));
    });
  }
}
```

#### **4.2 Interface de Administração**
```typescript
// src/app/components/admin/mfe-admin.component.ts
@Component({
  selector: 'app-mfe-admin',
  template: `
    <div class="admin-panel">
      <h2>Administração de MFEs</h2>
      
      <div class="mfe-list">
        <div *ngFor="let mfe of mfes" class="mfe-item">
          <div class="mfe-info">
            <h3>{{ mfe.displayName }}</h3>
            <p>{{ mfe.url }}</p>
            <span class="status" [class]="'status-' + mfe.status">{{ mfe.status }}</span>
          </div>
          <div class="mfe-actions">
            <button (click)="editMfe(mfe)">Editar</button>
            <button (click)="removeMfe(mfe.name)" class="danger">Remover</button>
          </div>
        </div>
      </div>

      <button (click)="showAddForm = true" class="add-btn">Adicionar MFE</button>

      <div *ngIf="showAddForm" class="add-form">
        <h3>Adicionar Novo MFE</h3>
        <form [formGroup]="mfeForm" (ngSubmit)="addMfe()">
          <input formControlName="name" placeholder="Nome do MFE">
          <input formControlName="displayName" placeholder="Nome de Exibição">
          <input formControlName="url" placeholder="URL do MFE">
          <button type="submit">Adicionar</button>
          <button type="button" (click)="showAddForm = false">Cancelar</button>
        </form>
      </div>
    </div>
  `
})
export class MfeAdminComponent implements OnInit {
  mfes: MfeConfig[] = [];
  showAddForm = false;
  mfeForm: FormGroup;

  constructor(
    private storageConfig: StorageConfigService,
    private fb: FormBuilder
  ) {
    this.mfeForm = this.fb.group({
      name: ['', Validators.required],
      displayName: ['', Validators.required],
      url: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadMfes();
  }

  loadMfes(): void {
    this.mfes = this.storageConfig.getMfeConfig();
  }

  addMfe(): void {
    if (this.mfeForm.valid) {
      const formValue = this.mfeForm.value;
      const newMfe: MfeConfig = {
        name: formValue.name,
        displayName: formValue.displayName,
        url: formValue.url,
        remoteEntry: '/remoteEntry.json',
        exposedModule: './Component',
        version: '1.0.0',
        status: 'active',
        permissions: ['read']
      };

      this.storageConfig.addMfe(newMfe);
      this.loadMfes();
      this.showAddForm = false;
      this.mfeForm.reset();
    }
  }

  removeMfe(mfeName: string): void {
    if (confirm(`Remover MFE ${mfeName}?`)) {
      this.storageConfig.removeMfe(mfeName);
      this.loadMfes();
    }
  }

  editMfe(mfe: MfeConfig): void {
    // Implementar edição
  }
}
```

### **✅ Vantagens:**
- ✅ **Configuração persistente** no browser
- ✅ **Interface de admin** simples
- ✅ **Zero dependência** de backend
- ✅ **Mudanças em runtime** sem rebuild

### **❌ Desvantagens:**
- ❌ **Configuração local** apenas
- ❌ **Perda de dados** ao limpar browser
- ❌ **Não compartilhada** entre usuários

---

## 📊 **Comparação das Alternativas**

| Critério | JSON Estático | Environment | Híbrida | LocalStorage |
|----------|---------------|-------------|---------|--------------|
| **Facilidade** | 🟢 Alta | 🟢 Alta | 🟡 Média | 🟢 Alta |
| **Flexibilidade** | 🔴 Baixa | 🔴 Baixa | 🟢 Alta | 🟢 Alta |
| **Performance** | 🟢 Alta | 🟢 Alta | 🟡 Média | 🟢 Alta |
| **Manutenção** | 🟡 Média | 🟡 Média | 🔴 Baixa | 🟢 Alta |
| **Escalabilidade** | 🟡 Média | 🔴 Baixa | 🟢 Alta | 🟡 Média |
| **Sem Backend** | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| **Runtime Changes** | ❌ Não | ❌ Não | 🟡 Parcial | ✅ Sim |

---

## 🎯 **Recomendação Final**

### **Para PoC/Desenvolvimento: Alternativa 1 (JSON Estático)**
- ✅ **Simples de implementar**
- ✅ **Fácil de entender**
- ✅ **Versionamento com código**
- ✅ **Sem complexidade adicional**

### **Para Produção: Alternativa 3 (Híbrida)**
- ✅ **MFEs core sempre disponíveis**
- ✅ **Flexibilidade para expansão**
- ✅ **Graceful degradation**
- ✅ **Preparado para futuro backend**

### **Para Demonstração: Alternativa 4 (LocalStorage)**
- ✅ **Interface de administração**
- ✅ **Mudanças em runtime**
- ✅ **Experiência dinâmica**
- ✅ **Fácil de demonstrar**

---

## 🚀 **Implementação Recomendada para o Projeto Atual**

Sugiro começar com a **Alternativa 1 (JSON Estático)** para manter a simplicidade da PoC, mas estruturar o código de forma que seja fácil migrar para a **Alternativa 3 (Híbrida)** no futuro.

### **Próximos Passos:**
1. ✅ Implementar `ConfigService` com arquivos JSON
2. ✅ Refatorar `MfeLoaderComponent` para usar configuração
3. ✅ Atualizar `MenuService` para carregar de JSON
4. ✅ Criar arquivos de configuração em `assets/config/`
5. ✅ Documentar processo de adição de novos MFEs

Isso mantém a **simplicidade atual** mas prepara o terreno para **evolução futura** quando houver necessidade de maior dinamismo! 🎯