import { Injectable } from '@angular/core';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class DynamicMfeLoaderService {
  private componentCache = new Map<string, any>();
  private structuralMfes = new Set<string>(['mfe-login', 'mfe-menu']); // MFEs já registrados no main.ts

  constructor(private configService: ConfigService) {}

  async loadMfeComponent(mfeName: string): Promise<any> {
    console.log(`[DynamicMfeLoader] 🚀 Iniciando carregamento do MFE: ${mfeName}`);
    
    // Verificar cache primeiro
    if (this.componentCache.has(mfeName)) {
      console.log(`[DynamicMfeLoader] ✅ Componente encontrado no cache: ${mfeName}`);
      return this.componentCache.get(mfeName);
    }

    console.log(`[DynamicMfeLoader] 📋 Buscando configuração para: ${mfeName}`);
    const config = await this.configService.getMfeByName(mfeName);
    
    if (!config) {
      const error = `MFE ${mfeName} não encontrado na configuração`;
      console.error(`[DynamicMfeLoader] ❌ ${error}`);
      throw new Error(error);
    }

    console.log(`[DynamicMfeLoader] ✅ Configuração encontrada:`, config);

    try {
      let component: any;
      let loadingMethod: 'structural' | 'dynamic' | 'fallback' = 'dynamic';

      if (this.structuralMfes.has(mfeName)) {
        // MFE estrutural - usar Native Federation diretamente
        console.log(`[DynamicMfeLoader] 🏗️ Carregando MFE estrutural via Native Federation...`);
        component = await this.loadViaRegisteredMfe(mfeName, config);
        loadingMethod = 'structural';
      } else {
        // MFE dinâmico - usar loadRemoteModule com URL completa
        console.log(`[DynamicMfeLoader] 🔄 Carregando MFE dinâmico via loadRemoteModule...`);
        component = await this.loadViaDynamicRemoteModule(mfeName, config);
        loadingMethod = 'dynamic';
      }

      // Marcar que o MFE foi carregado dinamicamente
      this.markMfeAsLoaded(mfeName, loadingMethod);

      // Armazenar no cache
      this.componentCache.set(mfeName, component);
      console.log(`[DynamicMfeLoader] 💾 Componente armazenado no cache: ${mfeName}`);
      
      return component;
      
    } catch (error: any) {
      console.error(`[DynamicMfeLoader] ❌ Erro ao carregar MFE ${mfeName}:`, error);
      console.error(`[DynamicMfeLoader] 📊 Detalhes do erro:`, {
        name: error?.name || 'Unknown',
        message: error?.message || 'Erro desconhecido',
        stack: error?.stack || 'Stack não disponível'
      });
      
      // Tentar carregar componente de fallback se disponível
      if (config.fallbackComponent) {
        console.log(`[DynamicMfeLoader] 🔄 Tentando carregar fallback: ${config.fallbackComponent}`);
        try {
          const fallbackComponent = await this.loadFallbackComponent(config.fallbackComponent);
          console.log(`[DynamicMfeLoader] ✅ Fallback carregado com sucesso`);
          
          // Marcar como fallback
          this.markMfeAsLoaded(mfeName, 'fallback');
          
          return fallbackComponent;
        } catch (fallbackError: any) {
          console.error(`[DynamicMfeLoader] ❌ Falha no fallback também:`, fallbackError);
        }
      } else {
        console.log(`[DynamicMfeLoader] ⚠️ Nenhum fallback configurado para ${mfeName}`);
      }
      
      throw error;
    }
  }

  /**
   * Marcar MFE como carregado com informações de método
   */
  private markMfeAsLoaded(mfeName: string, method: 'structural' | 'dynamic' | 'fallback'): void {
    const loadingInfo = {
      mfeName,
      method,
      timestamp: new Date().toISOString(),
      loadedBy: 'portal-dynamic-loader'
    };

    // Armazenar no sessionStorage para que o MFE possa acessar
    sessionStorage.setItem(`${mfeName}-loading-info`, JSON.stringify(loadingInfo));
    
    // Armazenar informação global
    if (!(window as any).mfeLoadingInfo) {
      (window as any).mfeLoadingInfo = {};
    }
    (window as any).mfeLoadingInfo[mfeName] = loadingInfo;

    // Disparar evento personalizado
    const event = new CustomEvent('mfe-loaded', {
      detail: loadingInfo,
      bubbles: true
    });
    window.dispatchEvent(event);

    console.log(`[DynamicMfeLoader] 📝 MFE ${mfeName} marcado como carregado via ${method}`);
  }

  /**
   * Carrega MFE estrutural (já registrado no main.ts)
   */
  private async loadViaRegisteredMfe(mfeName: string, config: any): Promise<any> {
    console.log(`[DynamicMfeLoader] 📦 Carregando MFE estrutural: ${mfeName}`);
    
    const loadPromise = loadRemoteModule(mfeName, config.exposedModule);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout ao carregar MFE estrutural ${mfeName} (5s)`));
      }, 5000);
    });

    const module = await Promise.race([loadPromise, timeoutPromise]);
    return this.extractComponent(module, config);
  }

  /**
   * 🔧 CORRIGIDO: Carrega MFE dinâmico com melhor tratamento de erros
   */
  private async loadViaDynamicRemoteModule(mfeName: string, config: any): Promise<any> {
    const remoteEntryUrl = `${config.url}${config.remoteEntry}`;
    console.log(`[DynamicMfeLoader] 📦 Carregando MFE dinâmico: ${mfeName}`);
    console.log(`[DynamicMfeLoader] 🌐 RemoteEntry: ${remoteEntryUrl}`);
    console.log(`[DynamicMfeLoader] 📋 ExposedModule: ${config.exposedModule}`);
    
    // 🆕 CORREÇÃO: Verificar se o remoteEntry está acessível primeiro
    try {
      console.log(`[DynamicMfeLoader] 🔍 Verificando disponibilidade do remoteEntry...`);
      const response = await fetch(remoteEntryUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`RemoteEntry não acessível: ${response.status} ${response.statusText}`);
      }
      console.log(`[DynamicMfeLoader] ✅ RemoteEntry acessível`);
    } catch (fetchError: any) {
      console.error(`[DynamicMfeLoader] ❌ Erro ao verificar remoteEntry:`, fetchError);
      throw new Error(`RemoteEntry inacessível: ${fetchError.message}`);
    }
    
    // 🆕 CORREÇÃO: Timeout ajustado baseado no ambiente
    const isDevelopment = !!(window as any)['ng'] || location.hostname === 'localhost';
    const timeout = isDevelopment ? 20000 : 10000; // 20s dev, 10s prod
    
    console.log(`[DynamicMfeLoader] ⏱️ Timeout configurado: ${timeout}ms (${isDevelopment ? 'desenvolvimento' : 'produção'})`);
    
    const loadPromise = loadRemoteModule({
      remoteEntry: remoteEntryUrl,
      exposedModule: config.exposedModule
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        console.error(`[DynamicMfeLoader] ⏰ Timeout ao carregar ${mfeName} após ${timeout}ms`);
        reject(new Error(`Timeout ao carregar MFE dinâmico ${mfeName} (${timeout}ms)`));
      }, timeout);
    });

    console.log(`[DynamicMfeLoader] ⏱️ Aguardando carregamento...`);
    const startTime = Date.now();
    
    try {
      const module = await Promise.race([loadPromise, timeoutPromise]);
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      console.log(`[DynamicMfeLoader] ✅ Módulo dinâmico carregado em ${loadTime}ms:`, module);
      return this.extractComponent(module, config);
    } catch (error: any) {
      const endTime = Date.now();
      const attemptTime = endTime - startTime;
      
      console.error(`[DynamicMfeLoader] ❌ Falha após ${attemptTime}ms:`, error);
      
      // 🆕 CORREÇÃO: Análise detalhada do erro
      if (error.message.includes('timeout')) {
        console.error(`[DynamicMfeLoader] 📊 Análise do timeout:`, {
          tentativeTime: attemptTime,
          configuredTimeout: timeout,
          remoteEntryUrl,
          possibleCauses: [
            'MFE pode estar lento para responder',
            'Problemas de rede',
            'MFE pode estar reiniciando',
            'Primeiro carregamento (cold start)'
          ]
        });
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        console.error(`[DynamicMfeLoader] 🌐 Erro de rede detectado:`, {
          remoteEntryUrl,
          error: error.message,
          suggestions: [
            'Verificar se o MFE está rodando',
            'Verificar conectividade de rede',
            'Verificar CORS se aplicável'
          ]
        });
      }
      
      throw error;
    }
  }

  /**
   * 🔧 MELHORADO: Extrai o componente com melhor debug
   */
  private extractComponent(module: any, config: any): any {
    console.log(`[DynamicMfeLoader] 🔧 Analisando módulo carregado...`);
    console.log(`[DynamicMfeLoader] 📊 Tipo do módulo:`, typeof module);
    console.log(`[DynamicMfeLoader] 📝 Propriedades disponíveis:`, Object.keys(module || {}));

    // Extrair componente
    let component = module?.default || module?.[Object.keys(module || {})[0]];
    
    console.log(`[DynamicMfeLoader] 🎯 Componente extraído:`, component);
    console.log(`[DynamicMfeLoader] 🔧 Tipo do componente:`, typeof component);
    
    if (!component) {
      const availableKeys = Object.keys(module || {});
      const error = `Componente não encontrado no módulo ${config.exposedModule}. Chaves disponíveis: ${availableKeys.join(', ')}`;
      console.error(`[DynamicMfeLoader] ❌ ${error}`);
      
      // 🆕 CORREÇÃO: Debug adicional para ajudar na resolução
      console.error(`[DynamicMfeLoader] 🔍 Debug do módulo:`, {
        moduleType: typeof module,
        moduleKeys: availableKeys,
        modulePrototype: Object.getPrototypeOf(module),
        exposedModule: config.exposedModule,
        suggestions: [
          'Verificar se o exposedModule está correto no federation.config.js',
          'Verificar se o componente está sendo exportado corretamente',
          'Verificar se há erros de compilação no MFE'
        ]
      });
      
      throw new Error(error);
    }

    console.log(`[DynamicMfeLoader] ✅ Componente extraído com sucesso`);
    return component;
  }

  private async loadFallbackComponent(fallbackName: string): Promise<any> {
    console.log(`[DynamicMfeLoader] 🔄 Carregando componente de fallback: ${fallbackName}`);
    
    const fallbackComponents: Record<string, () => Promise<any>> = {
      'DefaultLoginComponent': () => import('../components/fallback/default-login.component'),
      'DefaultMenuComponent': () => import('../components/fallback/default-menu.component'),
      'DefaultProductComponent': () => import('../components/fallback/default-product.component'),
      'DefaultAlcadaComponent': () => import('../components/fallback/default-alcada.component')
    };

    const loader = fallbackComponents[fallbackName];
    if (loader) {
      const module = await loader();
      return module.default;
    }

    throw new Error(`Componente de fallback ${fallbackName} não encontrado`);
  }

  /**
   * Obter informações de carregamento de um MFE
   */
  getMfeLoadingInfo(mfeName: string): any {
    const sessionInfo = sessionStorage.getItem(`${mfeName}-loading-info`);
    if (sessionInfo) {
      return JSON.parse(sessionInfo);
    }
    
    const globalInfo = (window as any).mfeLoadingInfo?.[mfeName];
    return globalInfo || null;
  }

  /**
   * Métodos públicos para gerenciamento
   */
  getStructuralMfes(): string[] {
    return Array.from(this.structuralMfes);
  }

  clearCache(mfeName?: string): void {
    if (mfeName) {
      console.log(`[DynamicMfeLoader] 🧹 Limpando cache para: ${mfeName}`);
      this.componentCache.delete(mfeName);
      
      // Limpar informações de carregamento
      sessionStorage.removeItem(`${mfeName}-loading-info`);
      if ((window as any).mfeLoadingInfo?.[mfeName]) {
        delete (window as any).mfeLoadingInfo[mfeName];
      }
    } else {
      console.log(`[DynamicMfeLoader] 🧹 Limpando todo o cache`);
      this.componentCache.clear();
      
      // Limpar todas as informações de carregamento
      Object.keys(sessionStorage).forEach(key => {
        if (key.endsWith('-loading-info')) {
          sessionStorage.removeItem(key);
        }
      });
      if ((window as any).mfeLoadingInfo) {
        (window as any).mfeLoadingInfo = {};
      }
    }
  }

  getCachedComponents(): string[] {
    return Array.from(this.componentCache.keys());
  }

  /**
   * 🆕 NOVO: Método para debug e diagnóstico
   */
  async debugMfeLoading(mfeName: string): Promise<any> {
    console.log(`[DynamicMfeLoader] 🔍 Iniciando debug para: ${mfeName}`);
    
    const config = await this.configService.getMfeByName(mfeName);
    if (!config) {
      console.error(`[DynamicMfeLoader] ❌ MFE não encontrado na configuração`);
      return { success: false, error: 'MFE não encontrado na configuração' };
    }
    
    const remoteEntryUrl = `${config.url}${config.remoteEntry}`;
    
    console.log(`[DynamicMfeLoader] 📊 Informações de debug:`, {
      mfeName,
      config,
      remoteEntryUrl,
      isStructural: this.structuralMfes.has(mfeName),
      cached: this.componentCache.has(mfeName),
      loadingInfo: this.getMfeLoadingInfo(mfeName)
    });
    
    // Testar conectividade
    try {
      const response = await fetch(remoteEntryUrl);
      const remoteEntryContent = await response.text();
      
      console.log(`[DynamicMfeLoader] ✅ RemoteEntry acessível:`, {
        status: response.status,
        contentLength: remoteEntryContent.length,
        contentPreview: remoteEntryContent.substring(0, 200) + '...'
      });
      
      return {
        success: true,
        config,
        remoteEntryUrl,
        connectivity: 'ok',
        remoteEntrySize: remoteEntryContent.length
      };
    } catch (error: any) {
      console.error(`[DynamicMfeLoader] ❌ Erro de conectividade:`, error);
      return {
        success: false,
        config,
        remoteEntryUrl,
        connectivity: 'failed',
        error: error.message
      };
    }
  }
}