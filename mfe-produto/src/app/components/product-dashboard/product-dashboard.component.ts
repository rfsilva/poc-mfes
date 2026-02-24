import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { MfeCommunicationService } from '../../services/mfe-communication.service';
import { AuthService } from '../../services/auth.service';
import { Product, ProductMetrics, User } from '../../models/product.model';

interface LoadingStatus {
  type: 'native-federation' | 'fallback' | 'unknown';
  timestamp: Date;
  source: string;
  method?: 'structural' | 'dynamic' | 'fallback';
  detectedBy: string;
}

@Component({
  selector: 'app-product-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-dashboard.component.html',
  styleUrls: ['./product-dashboard.component.scss']
})
export class ProductDashboardComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  metrics: ProductMetrics | null = null;
  currentUser: User | null = null;
  isLoading = true;
  selectedView: 'dashboard' | 'products' = 'dashboard';
  validationResult: any = null;
  loadingStatus: LoadingStatus = {
    type: 'unknown',
    timestamp: new Date(),
    source: 'Inicializando...',
    detectedBy: 'constructor'
  };
  
  private subscriptions: Subscription[] = [];

  constructor(
    private productService: ProductService,
    private mfeCommunicationService: MfeCommunicationService,
    private authService: AuthService
  ) {
    // Detectar como o componente foi carregado
    this.detectLoadingMethod();
  }

  ngOnInit(): void {
    // Verificar se está autenticado
    if (!this.authService.isAuthenticated()) {
      console.warn('ProductDashboard: Usuário não autenticado');
      return;
    }

    // Obter usuário atual do serviço de autenticação
    this.currentUser = this.authService.getCurrentUser();
    console.log('ProductDashboard: Usuário autenticado:', this.currentUser);

    // Escutar dados de entrada do portal
    const inputSub = this.mfeCommunicationService.inputData$.subscribe(data => {
      console.log('ProductDashboard: Dados recebidos do portal:', data);
      if (data.user) {
        this.currentUser = data.user;
        this.loadData();
      }
    });
    this.subscriptions.push(inputSub);

    // Escutar respostas de validação
    this.setupValidationListener();

    // Carregar dados iniciais
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Detectar método de carregamento do MFE
   */
  private detectLoadingMethod(): void {
    try {
      console.log('[ProductDashboard] 🔍 Detectando método de carregamento...');
      
      // 1. Verificar informações do portal (mais confiável)
      const portalLoadingInfo = this.checkPortalLoadingInfo();
      
      // 2. Verificar contexto de Native Federation
      const nativeFederationContext = this.checkNativeFederationContext();
      
      // 3. Verificar se é fallback
      const fallbackContext = this.checkFallbackContext();
      
      // 4. Verificar eventos de carregamento
      const loadingEvents = this.checkLoadingEvents();
      
      console.log('[ProductDashboard] 📊 Resultados da detecção:', {
        portalLoadingInfo,
        nativeFederationContext,
        fallbackContext,
        loadingEvents
      });
      
      // Determinar o método baseado nas evidências
      if (portalLoadingInfo) {
        this.loadingStatus = {
          type: portalLoadingInfo.method === 'fallback' ? 'fallback' : 'native-federation',
          timestamp: new Date(portalLoadingInfo.timestamp),
          source: `Portal Dynamic Loader (${portalLoadingInfo.method})`,
          method: portalLoadingInfo.method,
          detectedBy: 'portal-loading-info'
        };
        console.log('[ProductDashboard] ✅ Detectado via informações do portal:', portalLoadingInfo.method);
      } else if (fallbackContext) {
        this.loadingStatus = {
          type: 'fallback',
          timestamp: new Date(),
          source: 'Componente de Fallback',
          method: 'fallback',
          detectedBy: 'fallback-context'
        };
        console.log('[ProductDashboard] ⚠️ Detectado como fallback');
      } else if (nativeFederationContext) {
        this.loadingStatus = {
          type: 'native-federation',
          timestamp: new Date(),
          source: 'Native Federation (dinâmico)',
          method: 'dynamic',
          detectedBy: 'native-federation-context'
        };
        console.log('[ProductDashboard] 🚀 Detectado via Native Federation');
      } else {
        this.loadingStatus = {
          type: 'unknown',
          timestamp: new Date(),
          source: 'Método não identificado',
          detectedBy: 'fallback-detection'
        };
        console.log('[ProductDashboard] ❓ Método de carregamento não identificado');
      }
      
    } catch (error: unknown) {
      console.error('[ProductDashboard] ❌ Erro ao detectar método de carregamento:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.loadingStatus = {
        type: 'unknown',
        timestamp: new Date(),
        source: 'Erro na detecção: ' + errorMessage,
        detectedBy: 'error-fallback'
      };
    }
  }

  /**
   * Verificar informações de carregamento do portal
   */
  private checkPortalLoadingInfo(): any {
    try {
      // Verificar sessionStorage
      const sessionInfo = sessionStorage.getItem('mfe-produto-loading-info');
      if (sessionInfo) {
        console.log('[ProductDashboard] 📋 Informação encontrada no sessionStorage:', sessionInfo);
        return JSON.parse(sessionInfo);
      }
      
      // Verificar window global
      const globalInfo = (window as any).mfeLoadingInfo?.['mfe-produto'];
      if (globalInfo) {
        console.log('[ProductDashboard] 🌐 Informação encontrada no window global:', globalInfo);
        return globalInfo;
      }
      
      // Verificar eventos recentes
      const recentEvents = (window as any).mfeLoadingEvents?.['mfe-produto'];
      if (recentEvents && recentEvents.length > 0) {
        const latestEvent = recentEvents[recentEvents.length - 1];
        console.log('[ProductDashboard] 📅 Evento recente encontrado:', latestEvent);
        return latestEvent;
      }
      
      return null;
    } catch (error: unknown) {
      console.warn('[ProductDashboard] ⚠️ Erro ao verificar informações do portal:', error);
      return null;
    }
  }

  /**
   * Verificar contexto de Native Federation
   */
  private checkNativeFederationContext(): boolean {
    try {
      // Verificar se existe contexto de Native Federation
      const hasWebpackRequire = !!(window as any).__webpack_require__;
      const hasShareScopes = !!(window as any).__webpack_share_scopes__;
      const hasRemoteEntry = !!(window as any).__remoteEntryInitialized__;
      
      // Verificar se existe referência ao portal
      const hasPortalContext = !!(window as any).mfePortalContext;
      
      // Verificar se foi carregado dinamicamente (DOM)
      const hasDynamicMarker = document.querySelector('[data-mfe-source="dynamic"]') !== null;
      
      // Verificar URL atual
      const isStandalone = window.location.port === '4203'; // Porta do mfe-produto
      
      console.log('[ProductDashboard] 🔍 Contexto Native Federation:', {
        hasWebpackRequire,
        hasShareScopes,
        hasRemoteEntry,
        hasPortalContext,
        hasDynamicMarker,
        isStandalone
      });
      
      // Se está rodando standalone, não é Native Federation
      if (isStandalone) {
        return false;
      }
      
      return hasWebpackRequire || hasShareScopes || hasRemoteEntry || hasPortalContext || hasDynamicMarker;
    } catch (error: unknown) {
      console.warn('[ProductDashboard] ⚠️ Erro ao verificar contexto Native Federation:', error);
      return false;
    }
  }

  /**
   * Verificar se é um componente de fallback
   */
  private checkFallbackContext(): boolean {
    try {
      // Verificar se o nome da classe indica fallback
      const isFallbackComponent = this.constructor.name.includes('Fallback') ||
                                 this.constructor.name.includes('Default');
      
      // Verificar se existe classe CSS de fallback no DOM
      const hasFallbackClass = document.body.classList.contains('fallback-mode') ||
                              document.querySelector('.fallback-container') !== null;
      
      // Verificar se existe flag de fallback
      const hasFallbackFlag = sessionStorage.getItem('mfe-produto-fallback') === 'true';
      
      // Verificar se o componente pai tem indicadores de fallback
      const hasParentFallback = document.querySelector('[data-mfe-fallback="true"]') !== null;
      
      console.log('[ProductDashboard] 🔍 Contexto de fallback:', {
        isFallbackComponent,
        hasFallbackClass,
        hasFallbackFlag,
        hasParentFallback
      });
      
      return isFallbackComponent || hasFallbackClass || hasFallbackFlag || hasParentFallback;
    } catch (error: unknown) {
      console.warn('[ProductDashboard] ⚠️ Erro ao verificar contexto de fallback:', error);
      return false;
    }
  }

  /**
   * Verificar eventos de carregamento
   */
  private checkLoadingEvents(): any {
    try {
      // Escutar eventos de carregamento de MFE
      window.addEventListener('mfe-loaded', (event: any) => {
        if (event.detail?.mfeName === 'mfe-produto') {
          console.log('[ProductDashboard] 📡 Evento de carregamento recebido:', event.detail);
          this.updateLoadingStatusFromEvent(event.detail);
        }
      });
      
      return null;
    } catch (error: unknown) {
      console.warn('[ProductDashboard] ⚠️ Erro ao verificar eventos de carregamento:', error);
      return null;
    }
  }

  /**
   * Atualizar status de carregamento baseado em evento
   */
  private updateLoadingStatusFromEvent(eventDetail: any): void {
    this.loadingStatus = {
      type: eventDetail.method === 'fallback' ? 'fallback' : 'native-federation',
      timestamp: new Date(eventDetail.timestamp),
      source: `Portal Dynamic Loader (${eventDetail.method})`,
      method: eventDetail.method,
      detectedBy: 'mfe-loaded-event'
    };
    
    console.log('[ProductDashboard] 🔄 Status atualizado via evento:', this.loadingStatus);
  }

  /**
   * Obter classe CSS para o banner de status
   */
  getLoadingStatusClass(): string {
    const baseClass = 'loading-status-banner';
    switch (this.loadingStatus?.type) {
      case 'native-federation':
        return `${baseClass} native-federation`;
      case 'fallback':
        return `${baseClass} fallback`;
      default:
        return `${baseClass} unknown`;
    }
  }

  /**
   * Obter ícone para o status de carregamento
   */
  getLoadingStatusIcon(): string {
    switch (this.loadingStatus?.type) {
      case 'native-federation':
        return '🚀';
      case 'fallback':
        return '⚠️';
      default:
        return '❓';
    }
  }

  /**
   * Obter título do status de carregamento
   */
  getLoadingStatusTitle(): string {
    switch (this.loadingStatus?.type) {
      case 'native-federation':
        return 'MFE Carregado via Native Federation';
      case 'fallback':
        return 'MFE Carregado via Fallback';
      default:
        return 'Método de Carregamento Desconhecido';
    }
  }

  /**
   * Obter descrição do status de carregamento
   */
  getLoadingStatusDescription(): string {
    if (this.loadingStatus?.method) {
      switch (this.loadingStatus.method) {
        case 'dynamic':
          return 'Componente carregado dinamicamente pelo Portal usando Native Federation';
        case 'structural':
          return 'Componente carregado como MFE estrutural via Native Federation';
        case 'fallback':
          return 'Componente de fallback carregado devido a falha no carregamento principal';
        default:
          return this.loadingStatus.source || 'Método não identificado';
      }
    }
    
    switch (this.loadingStatus?.type) {
      case 'native-federation':
        return 'Componente carregado dinamicamente pelo Portal usando Native Federation';
      case 'fallback':
        return 'Componente de fallback carregado devido a falha no carregamento principal';
      default:
        return 'Não foi possível determinar como o componente foi carregado';
    }
  }

  /**
   * Obter timestamp formatado do carregamento
   */
  getLoadingTimestamp(): string {
    if (!this.loadingStatus?.timestamp) {
      return 'Timestamp não disponível';
    }
    
    const detectionInfo = this.loadingStatus.detectedBy ? ` (${this.loadingStatus.detectedBy})` : '';
    return `Carregado em: ${this.loadingStatus.timestamp.toLocaleString('pt-BR')}${detectionInfo}`;
  }

  private setupValidationListener(): void {
    // Escutar respostas de validação do Portal
    window.addEventListener('mfe-validation-response', (event: any) => {
      console.log('[ProductDashboard] Resposta de validação recebida:', event.detail);
      this.handleValidationResponse(event.detail.context);
    });
  }

  private handleValidationResponse(response: any): void {
    console.log('[ProductDashboard] Processando resposta de validação:', response);
    
    this.validationResult = {
      action: response.action,
      resourceId: response.resourceId,
      validated: response.validated,
      validatedBy: response.validatedBy,
      reason: response.reason,
      timestamp: response.timestamp
    };

    if (response.validated) {
      console.log('[ProductDashboard] Operação aprovada pela alçada superior');
      // Aqui você executaria a operação real
      this.executeApprovedOperation(response);
    } else {
      console.log('[ProductDashboard] Operação rejeitada:', response.reason);
    }
  }

  private executeApprovedOperation(response: any): void {
    // Simular execução da operação aprovada
    console.log('[ProductDashboard] Executando operação aprovada:', response);
    
    if (response.resourceId && response.action === 'validation_response') {
      // Encontrar o produto e simular a operação
      const product = this.products.find(p => p.id === response.resourceId);
      if (product) {
        console.log('[ProductDashboard] Operação executada com sucesso no produto:', product.name);
      }
    }
  }

  private loadData(): void {
    console.log('ProductDashboard: Carregando dados...');
    this.isLoading = true;
    
    // Carregar métricas e produtos em paralelo
    const metricsSub = this.productService.getProductMetrics().subscribe({
      next: (metrics) => {
        console.log('ProductDashboard: Métricas carregadas:', metrics);
        this.metrics = metrics;
        this.checkLoadingComplete();
      },
      error: (error) => {
        console.error('Erro ao carregar métricas:', error);
        this.checkLoadingComplete();
      }
    });

    const productsSub = this.productService.getProducts().subscribe({
      next: (products) => {
        console.log('ProductDashboard: Produtos carregados:', products.length);
        this.products = products;
        this.checkLoadingComplete();
      },
      error: (error) => {
        console.error('Erro ao carregar produtos:', error);
        this.checkLoadingComplete();
      }
    });

    this.subscriptions.push(metricsSub, productsSub);
  }

  private checkLoadingComplete(): void {
    if (this.metrics !== null && this.products.length >= 0) {
      this.isLoading = false;
      console.log('ProductDashboard: Carregamento concluído');
    }
  }

  switchView(view: 'dashboard' | 'products'): void {
    console.log('ProductDashboard: Mudando para view:', view);
    this.selectedView = view;
    
    // Notificar o portal sobre a mudança de view
    this.mfeCommunicationService.sendDataToPortal({
      type: 'PRODUCT_ACTION',
      payload: {
        action: 'view_changed',
        view: view,
        user: this.currentUser?.username,
        timestamp: new Date().toISOString()
      }
    });
  }

  onProductAction(action: string, product?: Product): void {
    console.log(`ProductDashboard: Ação do produto: ${action}`, product);
    
    // Verificar permissões antes de executar ações
    if (action === 'edit' || action === 'delete') {
      if (!this.authService.hasPermission('write')) {
        console.warn('Usuário não tem permissão para esta ação:', action);
        return;
      }
    }
    
    // Notificar o portal sobre a ação
    this.mfeCommunicationService.sendDataToPortal({
      type: 'PRODUCT_ACTION',
      payload: {
        action: action,
        product: product,
        user: this.currentUser?.username,
        timestamp: new Date().toISOString(),
        authorized: true
      }
    });
  }

  /**
   * Solicitar validação de alçada para exclusão de produto
   */
  requestProductDeletion(product: Product): void {
    console.log('[ProductDashboard] Solicitando validação para exclusão do produto:', product);
    
    // Limpar resultado anterior
    this.validationResult = null;
    
    // Enviar solicitação de validação para o Portal
    const validationRequest = {
      type: 'VALIDATION_REQUEST',
      payload: {
        action: 'request_validation',
        data: {
          operation: {
            type: 'delete',
            resource: 'product',
            resourceId: product.id,
            description: `Exclusão do produto ${product.name}`
          },
          context: {
            resourceName: product.name,
            resourceDetails: {
              sku: product.sku,
              category: product.category,
              price: product.price,
              stock: product.stock,
              supplier: product.supplier || 'N/A',
              createdAt: product.createdAt,
              status: product.status
            },
            requestedBy: {
              id: this.currentUser?.id || 'unknown',
              name: this.currentUser?.name || 'Usuário Desconhecido',
              role: this.getUserRole(),
              department: this.currentUser?.department || 'N/A'
            },
            reason: 'Solicitação de exclusão via interface administrativa',
            impact: 'medium',
            reversible: false
          },
          urgency: 'medium'
        },
        status: 'pending'
      }
    };
    
    // Enviar evento para o Portal
    const event = new CustomEvent('mfe-data-output', {
      detail: validationRequest,
      bubbles: true
    });
    
    window.dispatchEvent(event);
    
    console.log('[ProductDashboard] Solicitação de validação enviada');
  }

  /**
   * Solicitar validação de alçada para alteração de preço
   */
  requestPriceUpdate(product: Product): void {
    console.log('[ProductDashboard] Solicitando validação para alteração de preço:', product);
    
    // Limpar resultado anterior
    this.validationResult = null;
    
    const newPrice = product.price * 1.1; // Simular aumento de 10%
    
    // Enviar solicitação de validação para o Portal
    const validationRequest = {
      type: 'VALIDATION_REQUEST',
      payload: {
        action: 'request_validation',
        data: {
          operation: {
            type: 'update',
            resource: 'product',
            resourceId: product.id,
            description: `Alteração de preço do produto ${product.name}`
          },
          context: {
            resourceName: product.name,
            resourceDetails: {
              sku: product.sku,
              category: product.category,
              currentPrice: product.price,
              newPrice: newPrice,
              priceIncrease: ((newPrice - product.price) / product.price * 100).toFixed(2) + '%',
              stock: product.stock,
              status: product.status
            },
            requestedBy: {
              id: this.currentUser?.id || 'unknown',
              name: this.currentUser?.name || 'Usuário Desconhecido',
              role: this.getUserRole(),
              department: this.currentUser?.department || 'N/A'
            },
            reason: 'Ajuste de preço conforme política comercial',
            impact: 'low',
            reversible: true
          },
          urgency: 'low'
        },
        status: 'pending'
      }
    };
    
    // Enviar evento para o Portal
    const event = new CustomEvent('mfe-data-output', {
      detail: validationRequest,
      bubbles: true
    });
    
    window.dispatchEvent(event);
    
    console.log('[ProductDashboard] Solicitação de validação de preço enviada');
  }

  getLowStockProducts(): Product[] {
    return this.products.filter(product => product.stock < 10);
  }

  getUserRole(): string {
    if (!this.currentUser || !this.currentUser.permissions) {
      return 'Usuário';
    }

    const permissions = this.currentUser.permissions;
    
    if (permissions.includes('admin')) {
      return 'Administrador';
    } else if (permissions.includes('write')) {
      return 'Gerente';
    } else if (permissions.includes('read')) {
      return 'Usuário';
    }
    
    return 'Usuário';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return '#28a745';
      case 'inactive': return '#ffc107';
      case 'discontinued': return '#dc3545';
      default: return '#6c757d';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      case 'discontinued': return 'Descontinuado';
      default: return 'Desconhecido';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  hasScope(scope: string): boolean {
    return this.authService.hasScope(scope);
  }

  getAuthInfo(): any {
    return {
      user: this.currentUser,
      isAuthenticated: this.authService.isAuthenticated(),
      hasProductScope: this.hasScope('sc_produto'),
      debugInfo: this.authService.getDebugInfo(),
      loadingStatus: this.loadingStatus
    };
  }

  clearValidationResult(): void {
    this.validationResult = null;
  }
}