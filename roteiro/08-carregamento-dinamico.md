# 🔄 Roteiro Documental - Parte 8: Carregamento Híbrido de MFEs

## 🎯 Objetivo da Sessão

Compreender o **sistema de carregamento híbrido** implementado na PoC, explorando a distinção entre MFEs estáticos e dinâmicos, suas estratégias de carregamento e as implicações arquiteturais desta abordagem.

## 🏗️ Visão Geral do Carregamento Híbrido

### Conceito de Carregamento Híbrido

Nossa PoC implementa uma **estratégia híbrida** de carregamento de MFEs, onde diferentes microfrontends são carregados de formas distintas baseadas em suas características e necessidades:

```
┌─────────────────────────────────────────────────────────────┐
│                    ESTRATÉGIA HÍBRIDA                       │
├─────────────────────────────┬───────────────────────────────┤
│        MFEs ESTÁTICOS       │        MFEs DINÂMICOS         │
│                             │                               │
│ 🏗️ Carregados no main.ts    │ 🔄 Carregados sob demanda     │
│ 📦 Sempre disponíveis       │ 📋 Baseados em configuração   │
│ 🛡️ Com fallbacks           │ ⚠️ Sem fallbacks              │
│ ⚡ Inicialização rápida     │ 💾 Economia de recursos       │
│                             │                               │
│ • mfe-login                 │ • mfe-produto                 │
│ • mfe-menu                  │ • mfe-alcada                  │
└─────────────────────────────┴───────────────────────────────┘
```

### Justificativa da Abordagem

#### **MFEs Estáticos** (Login e Menu)
- **Essenciais**: Sempre necessários para funcionamento básico
- **Pequenos**: Baixo impacto no bundle inicial
- **Estáveis**: Mudanças menos frequentes
- **Críticos**: Falhas impactam toda a aplicação

#### **MFEs Dinâmicos** (Produto e Alçada)
- **Contextuais**: Carregados apenas quando necessários
- **Maiores**: Podem ter impacto significativo no bundle
- **Evolutivos**: Mudanças mais frequentes
- **Especializados**: Funcionalidades específicas

## 🔧 Implementação do Carregamento Estático

### Configuração no main.ts do Portal

```typescript
// main.ts (Portal)
import { initFederation } from '@angular-architects/native-federation';

// Configuração de MFEs estáticos
initFederation({
  'mfe-login': 'http://localhost:4201/remoteEntry.json',
  'mfe-menu': 'http://localhost:4202/remoteEntry.json'
})
.catch(err => console.error('Erro ao inicializar federation:', err))
.then(_ => import('./bootstrap'))
.catch(err => console.error('Erro ao carregar bootstrap:', err));
```

### Bootstrap da Aplicação

```typescript
// bootstrap.ts (Portal)
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

console.log('[Bootstrap] 🚀 Inicializando Portal com MFEs estáticos...');

// MFEs estáticos já estão registrados via initFederation
console.log('[Bootstrap] ✅ MFEs estáticos disponíveis: mfe-login, mfe-menu');

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    console.log('[Bootstrap] ✅ Portal inicializado com sucesso');
    
    // Marcar MFEs estáticos como carregados
    (window as any).mfeLoadingInfo = {
      'mfe-login': {
        method: 'static',
        timestamp: new Date().toISOString(),
        loadedBy: 'main-federation'
      },
      'mfe-menu': {
        method: 'static', 
        timestamp: new Date().toISOString(),
        loadedBy: 'main-federation'
      }
    };
  })
  .catch(err => console.error('Erro ao inicializar Portal:', err));
```

### Carregamento de MFEs Estáticos

```typescript
// mfe-loader.component.ts (para MFEs estáticos)
@Component({
  selector: 'app-mfe-loader',
  standalone: true,
  template: `
    <div class="mfe-container" [ngClass]="'mfe-' + mfeName">
      <ng-container *ngIf="component; else fallbackTemplate">
        <ng-container *ngComponentOutlet="component"></ng-container>
      </ng-container>
      
      <ng-template #fallbackTemplate>
        <div class="mfe-fallback" *ngIf="showFallback">
          <ng-container *ngComponentOutlet="fallbackComponent"></ng-container>
        </div>
        <div class="mfe-loading" *ngIf="!showFallback">
          <div class="loading-spinner"></div>
          <p>Carregando {{ displayName }}...</p>
        </div>
      </ng-template>
    </div>
  `
})
export class MfeLoaderComponent implements OnInit {
  @Input() mfeName!: string;
  @Input() displayName!: string;
  @Input() fallbackComponent?: Type<any>;
  
  component?: Type<any>;
  showFallback = false;
  
  async ngOnInit(): Promise<void> {
    console.log(`[MfeLoader] 🔄 Carregando MFE estático: ${this.mfeName}`);
    
    try {
      // Para MFEs estáticos, usar loadRemoteModule diretamente
      const module = await loadRemoteModule(this.mfeName, './Component');
      this.component = module.default || module[Object.keys(module)[0]];
      
      console.log(`[MfeLoader] ✅ MFE estático carregado: ${this.mfeName}`);
      
    } catch (error: any) {
      console.error(`[MfeLoader] ❌ Erro ao carregar MFE estático ${this.mfeName}:`, error);
      
      if (this.fallbackComponent) {
        console.log(`[MfeLoader] 🔄 Usando fallback para: ${this.mfeName}`);
        this.showFallback = true;
      } else {
        console.error(`[MfeLoader] ❌ Nenhum fallback disponível para: ${this.mfeName}`);
      }
    }
  }
}
```

## 🔄 Implementação do Carregamento Dinâmico

### Configuração JSON de MFEs

```json
// mfes.json
{
  "version": "2.0.0",
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
      "loadType": "static",
      "permissions": [],
      "fallbackComponent": "DefaultLoginComponent",
      "metadata": {
        "description": "Módulo de autenticação",
        "team": "Security Team",
        "essential": true
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
      "loadType": "static",
      "permissions": ["read"],
      "metadata": {
        "description": "Sistema de navegação",
        "team": "UI Team",
        "essential": true
      }
    },
    {
      "name": "mfe-produto",
      "displayName": "Gestão de Produtos",
      "url": "http://localhost:4203", 
      "remoteEntry": "/remoteEntry.json",
      "exposedModule": "./Component",
      "version": "2.0.0",
      "status": "active",
      "loadType": "dynamic",
      "permissions": ["read", "write"],
      "fallbackComponent": null,
      "metadata": {
        "description": "Módulo de gestão de produtos",
        "team": "Product Team",
        "essential": false,
        "loadOnDemand": true
      }
    },
    {
      "name": "mfe-alcada",
      "displayName": "Validação de Alçada",
      "url": "http://localhost:4204",
      "remoteEntry": "/remoteEntry.json", 
      "exposedModule": "./Component",
      "version": "1.0.0",
      "status": "active",
      "loadType": "dynamic",
      "permissions": ["validate"],
      "fallbackComponent": null,
      "metadata": {
        "description": "Módulo de validação de operações críticas",
        "team": "Security Team",
        "essential": false,
        "loadOnDemand": true,
        "type": "platform",
        "internal": true
      }
    }
  ]
}
```

### Serviço de Carregamento Dinâmico

```typescript
// dynamic-mfe-loader.service.ts
@Injectable({
  providedIn: 'root'
})
export class DynamicMfeLoaderService {
  private componentCache = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();
  private structuralMfes = new Set<string>(['mfe-login', 'mfe-menu']);
  
  constructor(private configService: ConfigService) {}
  
  /**
   * Carregar MFE com estratégia híbrida
   */
  async loadMfeComponent(mfeName: string): Promise<any> {
    console.log(`[DynamicMfeLoader] 🚀 Iniciando carregamento: ${mfeName}`);
    
    // Verificar cache primeiro
    if (this.componentCache.has(mfeName)) {
      console.log(`[DynamicMfeLoader] ✅ Componente encontrado no cache: ${mfeName}`);
      return this.componentCache.get(mfeName);
    }
    
    // Verificar se já está sendo carregado
    if (this.loadingPromises.has(mfeName)) {
      console.log(`[DynamicMfeLoader] ⏳ Aguardando carregamento em progresso: ${mfeName}`);
      return this.loadingPromises.get(mfeName);
    }
    
    // Obter configuração
    const config = await this.configService.getMfeByName(mfeName);
    if (!config) {
      throw new Error(`MFE ${mfeName} não encontrado na configuração`);
    }
    
    console.log(`[DynamicMfeLoader] 📋 Configuração obtida:`, {
      name: config.name,
      loadType: config.loadType,
      url: config.url,
      hasCache: this.componentCache.has(mfeName)
    });
    
    // Criar promise de carregamento
    const loadingPromise = this.performLoad(mfeName, config);
    this.loadingPromises.set(mfeName, loadingPromise);
    
    try {
      const component = await loadingPromise;
      
      // Armazenar no cache
      this.componentCache.set(mfeName, component);
      console.log(`[DynamicMfeLoader] 💾 Componente armazenado no cache: ${mfeName}`);
      
      return component;
      
    } finally {
      // Limpar promise de carregamento
      this.loadingPromises.delete(mfeName);
    }
  }
  
  /**
   * Executar carregamento baseado no tipo
   */
  private async performLoad(mfeName: string, config: any): Promise<any> {
    const loadType = config.loadType || 'dynamic';
    
    console.log(`[DynamicMfeLoader] 🔧 Tipo de carregamento: ${loadType}`);
    
    switch (loadType) {
      case 'static':
        return this.loadStaticMfe(mfeName, config);
        
      case 'dynamic':
        return this.loadDynamicMfe(mfeName, config);
        
      default:
        throw new Error(`Tipo de carregamento não suportado: ${loadType}`);
    }
  }
  
  /**
   * Carregar MFE estático (já registrado)
   */
  private async loadStaticMfe(mfeName: string, config: any): Promise<any> {
    console.log(`[DynamicMfeLoader] 🏗️ Carregando MFE estático: ${mfeName}`);
    
    try {
      // MFE estático já está registrado no main.ts
      const module = await loadRemoteModule(mfeName, config.exposedModule);
      const component = this.extractComponent(module, config);
      
      this.markMfeAsLoaded(mfeName, 'static');
      return component;
      
    } catch (error: any) {
      console.error(`[DynamicMfeLoader] ❌ Erro ao carregar MFE estático:`, error);
      
      // Tentar fallback se disponível
      if (config.fallbackComponent) {
        console.log(`[DynamicMfeLoader] 🔄 Usando fallback: ${config.fallbackComponent}`);
        const fallback = await this.loadFallbackComponent(config.fallbackComponent);
        this.markMfeAsLoaded(mfeName, 'fallback');
        return fallback;
      }
      
      throw error;
    }
  }
  
  /**
   * Carregar MFE dinâmico (sob demanda)
   */
  private async loadDynamicMfe(mfeName: string, config: any): Promise<any> {
    console.log(`[DynamicMfeLoader] 🔄 Carregando MFE dinâmico: ${mfeName}`);
    
    const remoteEntryUrl = `${config.url}${config.remoteEntry}`;
    console.log(`[DynamicMfeLoader] 🌐 URL: ${remoteEntryUrl}`);
    
    // Verificar disponibilidade primeiro
    await this.checkMfeAvailability(remoteEntryUrl);
    
    try {
      // Carregar dinamicamente
      const module = await loadRemoteModule({
        remoteEntry: remoteEntryUrl,
        exposedModule: config.exposedModule
      });
      
      const component = this.extractComponent(module, config);
      this.markMfeAsLoaded(mfeName, 'dynamic');
      
      console.log(`[DynamicMfeLoader] ✅ MFE dinâmico carregado: ${mfeName}`);
      return component;
      
    } catch (error: any) {
      console.error(`[DynamicMfeLoader] ❌ Erro ao carregar MFE dinâmico:`, error);
      
      // Para MFEs dinâmicos, NÃO há fallback - deve estar disponível
      if (config.fallbackComponent === null) {
        console.error(`[DynamicMfeLoader] ⚠️ MFE dinâmico deve estar disponível: ${mfeName}`);
        throw new Error(`MFE dinâmico ${mfeName} não está disponível e não possui fallback`);
      }
      
      throw error;
    }
  }
  
  /**
   * Verificar disponibilidade do MFE
   */
  private async checkMfeAvailability(remoteEntryUrl: string): Promise<void> {
    console.log(`[DynamicMfeLoader] 🔍 Verificando disponibilidade: ${remoteEntryUrl}`);
    
    try {
      const response = await fetch(remoteEntryUrl, { 
        method: 'HEAD',
        timeout: 5000 
      } as any);
      
      if (!response.ok) {
        throw new Error(`RemoteEntry não acessível: ${response.status}`);
      }
      
      console.log(`[DynamicMfeLoader] ✅ MFE disponível`);
      
    } catch (error: any) {
      console.error(`[DynamicMfeLoader] ❌ MFE não disponível:`, error);
      throw new Error(`MFE não está disponível: ${error.message}`);
    }
  }
  
  /**
   * Extrair componente do módulo
   */
  private extractComponent(module: any, config: any): any {
    console.log(`[DynamicMfeLoader] 🔧 Extraindo componente...`);
    
    let component = module?.default || module?.[Object.keys(module || {})[0]];
    
    if (!component) {
      const availableKeys = Object.keys(module || {});
      throw new Error(
        `Componente não encontrado no módulo ${config.exposedModule}. ` +
        `Chaves disponíveis: ${availableKeys.join(', ')}`
      );
    }
    
    console.log(`[DynamicMfeLoader] ✅ Componente extraído com sucesso`);
    return component;
  }
  
  /**
   * Marcar MFE como carregado
   */
  private markMfeAsLoaded(mfeName: string, method: 'static' | 'dynamic' | 'fallback'): void {
    const loadingInfo = {
      mfeName,
      method,
      timestamp: new Date().toISOString(),
      loadedBy: 'dynamic-loader'
    };
    
    // Armazenar informações globais
    if (!(window as any).mfeLoadingInfo) {
      (window as any).mfeLoadingInfo = {};
    }
    (window as any).mfeLoadingInfo[mfeName] = loadingInfo;
    
    // Disparar evento
    const event = new CustomEvent('mfe-loaded', {
      detail: loadingInfo,
      bubbles: true
    });
    window.dispatchEvent(event);
    
    console.log(`[DynamicMfeLoader] 📝 MFE marcado como carregado: ${mfeName} (${method})`);
  }
  
  /**
   * Carregar componente de fallback
   */
  private async loadFallbackComponent(fallbackName: string): Promise<any> {
    console.log(`[DynamicMfeLoader] 🔄 Carregando fallback: ${fallbackName}`);
    
    const fallbackComponents: Record<string, () => Promise<any>> = {
      'DefaultLoginComponent': () => import('../components/fallback/default-login.component'),
      'DefaultMenuComponent': () => import('../components/fallback/default-menu.component')
      // Note: Não há fallbacks para MFEs dinâmicos
    };
    
    const loader = fallbackComponents[fallbackName];
    if (loader) {
      const module = await loader();
      return module.default;
    }
    
    throw new Error(`Componente de fallback ${fallbackName} não encontrado`);
  }
  
  /**
   * Verificar se MFE é estático
   */
  isStaticMfe(mfeName: string): boolean {
    return this.structuralMfes.has(mfeName);
  }
  
  /**
   * Verificar se MFE é dinâmico
   */
  isDynamicMfe(mfeName: string): boolean {
    return !this.structuralMfes.has(mfeName);
  }
  
  /**
   * Obter informações de carregamento
   */
  getMfeLoadingInfo(mfeName: string): any {
    return (window as any).mfeLoadingInfo?.[mfeName] || null;
  }
  
  /**
   * Limpar cache
   */
  clearCache(mfeName?: string): void {
    if (mfeName) {
      this.componentCache.delete(mfeName);
      this.loadingPromises.delete(mfeName);
    } else {
      this.componentCache.clear();
      this.loadingPromises.clear();
    }
  }
  
  /**
   * Obter estatísticas de carregamento
   */
  getLoadingStats(): any {
    const loadingInfo = (window as any).mfeLoadingInfo || {};
    
    const stats = {
      totalLoaded: Object.keys(loadingInfo).length,
      static: 0,
      dynamic: 0,
      fallback: 0,
      cached: this.componentCache.size,
      loading: this.loadingPromises.size
    };
    
    Object.values(loadingInfo).forEach((info: any) => {
      stats[info.method as keyof typeof stats]++;
    });
    
    return stats;
  }
}
```

## 🎨 Componente de Carregamento Híbrido

### MfeLoaderComponent Atualizado

```typescript
// mfe-loader.component.ts
@Component({
  selector: 'app-mfe-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mfe-container" [ngClass]="getMfeContainerClass()">
      
      <!-- MFE Carregado -->
      <ng-container *ngIf="component && !isLoading; else loadingTemplate">
        <ng-container *ngComponentOutlet="component"></ng-container>
      </ng-container>
      
      <!-- Estados de Carregamento -->
      <ng-template #loadingTemplate>
        
        <!-- Loading -->
        <div class="mfe-loading" *ngIf="isLoading && !hasError">
          <div class="loading-content">
            <div class="loading-spinner" [ngClass]="getLoadingSpinnerClass()"></div>
            <h3>{{ getLoadingTitle() }}</h3>
            <p>{{ getLoadingMessage() }}</p>
            <div class="loading-progress" *ngIf="showProgress">
              <div class="progress-bar" [style.width.%]="loadingProgress"></div>
            </div>
          </div>
        </div>
        
        <!-- Erro -->
        <div class="mfe-error" *ngIf="hasError && !showFallback">
          <div class="error-content">
            <div class="error-icon">⚠️</div>
            <h3>Erro ao Carregar {{ displayName }}</h3>
            <p class="error-message">{{ errorMessage }}</p>
            <div class="error-details" *ngIf="showErrorDetails">
              <details>
                <summary>Detalhes Técnicos</summary>
                <pre>{{ errorDetails }}</pre>
              </details>
            </div>
            <div class="error-actions">
              <button 
                class="btn-retry" 
                (click)="retryLoad()"
                [disabled]="isRetrying"
              >
                <span *ngIf="!isRetrying">🔄 Tentar Novamente</span>
                <span *ngIf="isRetrying">⏳ Tentando...</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Fallback (apenas para MFEs estáticos) -->
        <div class="mfe-fallback" *ngIf="showFallback && fallbackComponent">
          <div class="fallback-header">
            <div class="fallback-icon">🔄</div>
            <p>Usando versão simplificada de {{ displayName }}</p>
          </div>
          <ng-container *ngComponentOutlet="fallbackComponent"></ng-container>
        </div>
        
      </ng-template>
      
    </div>
  `,
  styleUrls: ['./mfe-loader.component.scss']
})
export class MfeLoaderComponent implements OnInit, OnDestroy {
  @Input() mfeName!: string;
  @Input() displayName!: string;
  @Input() loadType?: 'static' | 'dynamic';
  @Input() fallbackComponent?: Type<any>;
  @Input() showErrorDetails = false;
  
  component?: Type<any>;
  isLoading = false;
  hasError = false;
  showFallback = false;
  errorMessage = '';
  errorDetails = '';
  isRetrying = false;
  loadingProgress = 0;
  showProgress = false;
  
  private retryCount = 0;
  private maxRetries = 3;
  private loadingStartTime = 0;
  
  constructor(
    private dynamicLoader: DynamicMfeLoaderService,
    private cdr: ChangeDetectorRef
  ) {}
  
  async ngOnInit(): Promise<void> {
    await this.loadMfe();
  }
  
  /**
   * Carregar MFE
   */
  private async loadMfe(): Promise<void> {
    console.log(`[MfeLoader] 🚀 Iniciando carregamento: ${this.mfeName}`);
    
    this.isLoading = true;
    this.hasError = false;
    this.showFallback = false;
    this.loadingStartTime = Date.now();
    
    // Mostrar progresso para MFEs dinâmicos
    if (this.loadType === 'dynamic') {
      this.showProgress = true;
      this.simulateProgress();
    }
    
    try {
      this.component = await this.dynamicLoader.loadMfeComponent(this.mfeName);
      
      const loadTime = Date.now() - this.loadingStartTime;
      console.log(`[MfeLoader] ✅ MFE carregado em ${loadTime}ms: ${this.mfeName}`);
      
    } catch (error: any) {
      console.error(`[MfeLoader] ❌ Erro ao carregar MFE:`, error);
      
      this.hasError = true;
      this.errorMessage = this.getErrorMessage(error);
      this.errorDetails = error.stack || error.toString();
      
      // Para MFEs estáticos, tentar fallback
      if (this.loadType === 'static' && this.fallbackComponent) {
        console.log(`[MfeLoader] 🔄 Usando fallback para MFE estático: ${this.mfeName}`);
        this.showFallback = true;
        this.hasError = false;
      }
      
    } finally {
      this.isLoading = false;
      this.showProgress = false;
      this.loadingProgress = 0;
      this.cdr.detectChanges();
    }
  }
  
  /**
   * Simular progresso de carregamento
   */
  private simulateProgress(): void {
    const interval = setInterval(() => {
      if (!this.isLoading) {
        clearInterval(interval);
        return;
      }
      
      this.loadingProgress += Math.random() * 15;
      if (this.loadingProgress > 90) {
        this.loadingProgress = 90;
      }
      
      this.cdr.detectChanges();
    }, 200);
  }
  
  /**
   * Tentar carregar novamente
   */
  async retryLoad(): Promise<void> {
    if (this.retryCount >= this.maxRetries) {
      console.warn(`[MfeLoader] ⚠️ Máximo de tentativas atingido: ${this.mfeName}`);
      return;
    }
    
    this.retryCount++;
    this.isRetrying = true;
    
    console.log(`[MfeLoader] 🔄 Tentativa ${this.retryCount}/${this.maxRetries}: ${this.mfeName}`);
    
    // Limpar cache antes de tentar novamente
    this.dynamicLoader.clearCache(this.mfeName);
    
    try {
      await this.loadMfe();
      this.retryCount = 0; // Reset em caso de sucesso
    } finally {
      this.isRetrying = false;
    }
  }
  
  /**
   * Obter mensagem de erro amigável
   */
  private getErrorMessage(error: any): string {
    if (error.message?.includes('não está disponível')) {
      return `${this.displayName} não está disponível no momento.`;
    }
    
    if (error.message?.includes('timeout')) {
      return `Tempo limite excedido ao carregar ${this.displayName}.`;
    }
    
    if (error.message?.includes('network')) {
      return `Erro de conexão ao carregar ${this.displayName}.`;
    }
    
    return `Erro inesperado ao carregar ${this.displayName}.`;
  }
  
  /**
   * Classes CSS dinâmicas
   */
  getMfeContainerClass(): string {
    const classes = [`mfe-${this.mfeName}`];
    
    if (this.loadType) {
      classes.push(`load-type-${this.loadType}`);
    }
    
    if (this.isLoading) classes.push('loading');
    if (this.hasError) classes.push('error');
    if (this.showFallback) classes.push('fallback');
    
    return classes.join(' ');
  }
  
  getLoadingSpinnerClass(): string {
    return this.loadType === 'dynamic' ? 'spinner-dynamic' : 'spinner-static';
  }
  
  getLoadingTitle(): string {
    return this.loadType === 'dynamic' 
      ? `Carregando ${this.displayName}...`
      : `Inicializando ${this.displayName}...`;
  }
  
  getLoadingMessage(): string {
    if (this.loadType === 'dynamic') {
      return 'Baixando componente sob demanda...';
    }
    return 'Inicializando componente...';
  }
  
  ngOnDestroy(): void {
    // Cleanup se necessário
  }
}
```

## 📊 Comparação: Estático vs Dinâmico

### Tabela Comparativa

| Aspecto | MFEs Estáticos | MFEs Dinâmicos |
|---------|----------------|----------------|
| **Carregamento** | No `main.ts` | Sob demanda via JSON |
| **Disponibilidade** | Sempre disponível | Apenas quando necessário |
| **Bundle Inicial** | Incluído | Não incluído |
| **Fallback** | ✅ Disponível | ❌ Não disponível |
| **Tempo de Carregamento** | ⚡ Imediato | 🔄 Variável |
| **Uso de Memória** | 📈 Constante | 📊 Sob demanda |
| **Complexidade** | 🟢 Baixa | 🟡 Média |
| **Flexibilidade** | 🟡 Limitada | 🟢 Alta |
| **Casos de Uso** | Essenciais | Contextuais |

### Métricas de Performance

```typescript
// performance-monitor.service.ts
@Injectable({
  providedIn: 'root'
})
export class PerformanceMonitorService {
  private metrics = new Map<string, {
    loadTime: number;
    loadType: 'static' | 'dynamic';
    cacheHit: boolean;
    retries: number;
    timestamp: string;
  }>();
  
  recordMfeLoad(mfeName: string, loadTime: number, loadType: 'static' | 'dynamic', cacheHit: boolean = false): void {
    this.metrics.set(mfeName, {
      loadTime,
      loadType,
      cacheHit,
      retries: 0,
      timestamp: new Date().toISOString()
    });
    
    console.log(`[Performance] 📊 MFE ${mfeName}: ${loadTime}ms (${loadType}${cacheHit ? ', cache' : ''})`);
  }
  
  getLoadingStats(): any {
    const stats = {
      totalMfes: this.metrics.size,
      static: { count: 0, avgTime: 0, totalTime: 0 },
      dynamic: { count: 0, avgTime: 0, totalTime: 0 },
      cacheHits: 0,
      totalRetries: 0
    };
    
    this.metrics.forEach(metric => {
      const category = stats[metric.loadType];
      category.count++;
      category.totalTime += metric.loadTime;
      
      if (metric.cacheHit) stats.cacheHits++;
      stats.totalRetries += metric.retries;
    });
    
    // Calcular médias
    if (stats.static.count > 0) {
      stats.static.avgTime = stats.static.totalTime / stats.static.count;
    }
    
    if (stats.dynamic.count > 0) {
      stats.dynamic.avgTime = stats.dynamic.totalTime / stats.dynamic.count;
    }
    
    return stats;
  }
}
```

## 🎯 Benefícios do Carregamento Híbrido

### 1. **Otimização de Performance**
- ✅ **Bundle Inicial Menor**: Apenas MFEs essenciais
- ✅ **Carregamento Sob Demanda**: Recursos quando necessários
- ✅ **Cache Inteligente**: Reutilização de componentes carregados
- ✅ **Lazy Loading**: Melhora tempo de inicialização

### 2. **Flexibilidade Arquitetural**
- ✅ **Estratégias Diferenciadas**: Cada MFE com sua estratégia
- ✅ **Configuração Externa**: Mudanças sem rebuild
- ✅ **Evolução Independente**: MFEs podem mudar de estratégia
- ✅ **Adição Dinâmica**: Novos MFEs sem alteração do Portal

### 3. **Experiência do Usuário**
- ✅ **Inicialização Rápida**: MFEs essenciais sempre disponíveis
- ✅ **Feedback Visual**: Estados de carregamento claros
- ✅ **Fallbacks Inteligentes**: Apenas onde faz sentido
- ✅ **Retry Automático**: Recuperação de falhas

### 4. **Manutenibilidade**
- ✅ **Separação Clara**: Responsabilidades bem definidas
- ✅ **Monitoramento**: Métricas de performance
- ✅ **Debug Facilitado**: Logs detalhados por estratégia
- ✅ **Testabilidade**: Cada estratégia pode ser testada isoladamente

## 🎯 Próximos Passos

Na **próxima sessão**, exploraremos a implementação do **MFE Login**, analisando como ele funciona como um MFE estático e sua integração com o sistema de autenticação.

### Tópicos da Próxima Sessão
- Implementação do MFE Login
- Formulários reativos com validação
- Integração com sistema de autenticação
- Comunicação com Portal
- Tratamento de erros de login

---

**Duração Estimada**: 35-40 minutos  
**Nível**: Técnico Avançado  
**Próxima Parte**: [09 - MFE Login](./09-mfe-login.md)  
**🆕 Novidade v2.0**: Estratégia híbrida de carregamento estático vs dinâmico