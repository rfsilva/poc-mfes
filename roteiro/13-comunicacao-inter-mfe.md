# 🔄 Roteiro Documental - Parte 13: Comunicação Inter-MFE

## 🎯 Objetivo da Sessão

Compreender os padrões de **comunicação inter-MFE** implementados na PoC, explorando como diferentes microfrontends se comunicam através do Portal, com foco no exemplo prático da comunicação entre MFE Produto e MFE Alçada.

## 🌐 Visão Geral da Comunicação Inter-MFE

### Arquitetura de Comunicação

A comunicação entre MFEs na nossa PoC segue o padrão **Mediator**, onde o **Portal** atua como intermediário central para todas as comunicações:

```
┌─────────────────┐                    ┌─────────────────┐
│   MFE Produto   │                    │   MFE Alçada    │
│                 │                    │                 │
│ 📤 Solicita     │                    │ 📥 Recebe       │
│    Validação    │                    │    Solicitação  │
│                 │                    │                 │
│ 📥 Recebe       │                    │ 📤 Envia        │
│    Resposta     │                    │    Resposta     │
└─────────┬───────┘                    └─────────┬───────┘
          │                                      │
          │              ┌─────────────────┐     │
          └──────────────▶│   MFE Portal    │◀────┘
                         │                 │
                         │ 🔄 Mediador     │
                         │ 📡 Orquestrador │
                         │ 🛡️ Validador    │
                         └─────────────────┘
```

### Princípios da Comunicação

#### 1. **Mediação Centralizada**
- **Todas as comunicações** passam pelo Portal
- **Nenhuma comunicação direta** entre MFEs
- **Controle centralizado** de fluxo de dados

#### 2. **Contratos Bem Definidos**
- **Interfaces tipadas** para todas as mensagens
- **Versionamento** de contratos
- **Validação** de estrutura de dados

#### 3. **Comunicação Assíncrona**
- **Baseada em eventos** (Custom Events)
- **Não bloqueante** para o usuário
- **Timeout** para operações críticas

## 📋 Contratos de Comunicação

### Interface Base de Mensagem

```typescript
// mfe-communication.interface.ts
export interface MfeMessage {
  type: string;
  source?: string;
  target?: string;
  payload: any;
  timestamp?: string;
  correlationId?: string;
}

export interface MfeInputData {
  token?: string;
  config?: any;
  payload?: any;
  metadata?: {
    source: string;
    timestamp: string;
    correlationId?: string;
  };
}

export interface MfeOutputData {
  type: string;
  payload: {
    action: string;
    data: any;
    status?: 'success' | 'error' | 'pending';
  };
  metadata?: {
    timestamp: string;
    correlationId?: string;
  };
}
```

### Contratos Específicos para Validação

```typescript
// Mensagem de Solicitação de Validação
export interface ValidationRequestMessage extends MfeMessage {
  type: 'REQUEST_VALIDATION';
  target: 'mfe-alcada';
  payload: {
    action: 'request_validation';
    data: ValidationRequest;
    requester: {
      mfe: string;
      component: string;
      user: string;
    };
  };
}

// Mensagem de Resposta de Validação
export interface ValidationResponseMessage extends MfeMessage {
  type: 'VALIDATION_RESPONSE';
  target: 'mfe-produto';
  payload: {
    action: 'validation_complete';
    data: ValidationResponse;
    status: 'success' | 'error';
  };
}

// Mensagem de Status de Carregamento
export interface MfeLoadingMessage extends MfeMessage {
  type: 'MFE_LOADING_STATUS';
  payload: {
    mfeName: string;
    status: 'loading' | 'loaded' | 'error';
    error?: string;
  };
}
```

## 🔧 Implementação no Portal

### Serviço de Comunicação

```typescript
// mfe-communication.service.ts (Portal)
@Injectable({
  providedIn: 'root'
})
export class MfeCommunicationService {
  private inputDataSubject = new BehaviorSubject<MfeInputData | null>(null);
  private outputDataSubject = new BehaviorSubject<MfeOutputData | null>(null);
  
  // Observables públicos
  public inputData$ = this.inputDataSubject.asObservable();
  public dataFromPortal$ = this.outputDataSubject.asObservable();
  
  // Mapa de correlação para rastrear mensagens
  private correlationMap = new Map<string, {
    requester: string;
    timestamp: number;
    timeout: number;
  }>();
  
  constructor() {
    this.setupGlobalEventListeners();
  }
  
  /**
   * Configurar listeners globais para comunicação inter-MFE
   */
  private setupGlobalEventListeners(): void {
    // Escutar solicitações de validação
    window.addEventListener('mfe-request-validation', (event: any) => {
      console.log('[Portal] 📥 Solicitação de validação recebida:', event.detail);
      this.handleValidationRequest(event.detail);
    });
    
    // Escutar respostas de validação
    window.addEventListener('mfe-validation-response', (event: any) => {
      console.log('[Portal] 📤 Resposta de validação recebida:', event.detail);
      this.handleValidationResponse(event.detail);
    });
    
    // Escutar status de carregamento de MFEs
    window.addEventListener('mfe-loaded', (event: any) => {
      console.log('[Portal] ✅ MFE carregado:', event.detail);
      this.handleMfeLoaded(event.detail);
    });
  }
  
  /**
   * Processar solicitação de validação
   */
  private async handleValidationRequest(request: ValidationRequestMessage): Promise<void> {
    const correlationId = this.generateCorrelationId();
    
    console.log('[Portal] 🔄 Processando solicitação de validação:', {
      correlationId,
      requester: request.source,
      target: request.target
    });
    
    // Registrar correlação
    this.correlationMap.set(correlationId, {
      requester: request.source || 'unknown',
      timestamp: Date.now(),
      timeout: 5 * 60 * 1000 // 5 minutos
    });
    
    try {
      // Verificar se MFE Alçada está carregado
      const alcadaLoaded = await this.ensureMfeLoaded('mfe-alcada');
      
      if (!alcadaLoaded) {
        throw new Error('MFE Alçada não pôde ser carregado');
      }
      
      // Enviar dados para MFE Alçada
      const inputData: MfeInputData = {
        config: {
          validation: request.payload.data
        },
        metadata: {
          source: request.source || 'portal',
          timestamp: new Date().toISOString(),
          correlationId
        }
      };
      
      console.log('[Portal] 📤 Enviando dados para MFE Alçada:', inputData);
      this.inputDataSubject.next(inputData);
      
      // Configurar timeout
      setTimeout(() => {
        if (this.correlationMap.has(correlationId)) {
          console.warn('[Portal] ⏰ Timeout na validação:', correlationId);
          this.handleValidationTimeout(correlationId);
        }
      }, 5 * 60 * 1000);
      
    } catch (error: any) {
      console.error('[Portal] ❌ Erro ao processar solicitação de validação:', error);
      
      // Enviar erro de volta para o solicitante
      this.sendErrorToRequester(request.source || 'unknown', {
        type: 'VALIDATION_ERROR',
        error: error.message,
        correlationId
      });
    }
  }
  
  /**
   * Processar resposta de validação
   */
  private handleValidationResponse(response: ValidationResponseMessage): void {
    const validationId = response.payload.data.validationId;
    
    console.log('[Portal] 📨 Processando resposta de validação:', {
      validationId,
      validated: response.payload.data.validated,
      status: response.payload.status
    });
    
    // Encontrar correlação
    let correlationId: string | undefined;
    for (const [id, correlation] of this.correlationMap.entries()) {
      // Aqui você poderia ter uma lógica mais sofisticada para encontrar a correlação
      // Por simplicidade, vamos usar o primeiro encontrado
      correlationId = id;
      break;
    }
    
    if (correlationId) {
      const correlation = this.correlationMap.get(correlationId);
      if (correlation) {
        console.log('[Portal] 🎯 Enviando resposta para:', correlation.requester);
        
        // Enviar resposta para o MFE solicitante
        this.sendDataToMfe(correlation.requester, {
          type: 'VALIDATION_RESPONSE',
          payload: response.payload,
          metadata: {
            timestamp: new Date().toISOString(),
            correlationId
          }
        });
        
        // Limpar correlação
        this.correlationMap.delete(correlationId);
      }
    }
  }
  
  /**
   * Garantir que um MFE está carregado
   */
  private async ensureMfeLoaded(mfeName: string): Promise<boolean> {
    console.log('[Portal] 🔍 Verificando se MFE está carregado:', mfeName);
    
    // Verificar se já está carregado
    const loadingInfo = (window as any).mfeLoadingInfo?.[mfeName];
    if (loadingInfo) {
      console.log('[Portal] ✅ MFE já está carregado:', mfeName);
      return true;
    }
    
    try {
      // Tentar carregar dinamicamente
      const dynamicLoader = this.getDynamicLoader();
      if (dynamicLoader) {
        console.log('[Portal] 🔄 Carregando MFE dinamicamente:', mfeName);
        await dynamicLoader.loadMfeComponent(mfeName);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('[Portal] ❌ Erro ao carregar MFE:', mfeName, error);
      return false;
    }
  }
  
  /**
   * Enviar dados para um MFE específico
   */
  private sendDataToMfe(mfeName: string, data: any): void {
    console.log('[Portal] 📤 Enviando dados para MFE:', mfeName, data);
    
    // Disparar evento específico para o MFE
    const event = new CustomEvent(`mfe-data-${mfeName}`, {
      detail: data,
      bubbles: true
    });
    
    window.dispatchEvent(event);
    
    // Também atualizar o subject para MFEs que escutam o observable
    this.outputDataSubject.next(data);
  }
  
  /**
   * Tratar timeout de validação
   */
  private handleValidationTimeout(correlationId: string): void {
    const correlation = this.correlationMap.get(correlationId);
    if (correlation) {
      console.warn('[Portal] ⏰ Validação expirou:', {
        correlationId,
        requester: correlation.requester,
        elapsed: Date.now() - correlation.timestamp
      });
      
      // Enviar timeout para o solicitante
      this.sendDataToMfe(correlation.requester, {
        type: 'VALIDATION_TIMEOUT',
        payload: {
          action: 'validation_timeout',
          data: {
            correlationId,
            reason: 'Validação expirou por timeout'
          },
          status: 'error'
        }
      });
      
      // Limpar correlação
      this.correlationMap.delete(correlationId);
    }
  }
  
  /**
   * Gerar ID de correlação único
   */
  private generateCorrelationId(): string {
    return 'corr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Obter referência do dynamic loader (injeção de dependência)
   */
  private getDynamicLoader(): any {
    // Em uma implementação real, isso seria injetado
    return (window as any).dynamicMfeLoader;
  }
  
  /**
   * Métodos públicos para MFEs
   */
  
  /**
   * Enviar dados do MFE para o Portal
   */
  sendDataToPortal(data: MfeOutputData): void {
    console.log('[MfeCommunication] 📤 Enviando dados para Portal:', data);
    
    const event = new CustomEvent('mfe-data-to-portal', {
      detail: {
        ...data,
        timestamp: new Date().toISOString()
      },
      bubbles: true
    });
    
    window.dispatchEvent(event);
  }
  
  /**
   * Solicitar validação de alçada
   */
  requestValidation(validationRequest: ValidationRequest): Promise<ValidationResponse> {
    return new Promise((resolve, reject) => {
      const correlationId = this.generateCorrelationId();
      
      console.log('[MfeCommunication] 🛡️ Solicitando validação:', {
        correlationId,
        operation: validationRequest.operation
      });
      
      // Configurar listener para resposta
      const responseListener = (event: any) => {
        const data = event.detail;
        if (data.type === 'VALIDATION_RESPONSE' && 
            data.metadata?.correlationId === correlationId) {
          
          window.removeEventListener(`mfe-data-${this.getCurrentMfeName()}`, responseListener);
          
          if (data.payload.status === 'success') {
            resolve(data.payload.data);
          } else {
            reject(new Error(data.payload.data.reason || 'Validação falhou'));
          }
        }
      };
      
      window.addEventListener(`mfe-data-${this.getCurrentMfeName()}`, responseListener);
      
      // Enviar solicitação
      const requestEvent = new CustomEvent('mfe-request-validation', {
        detail: {
          type: 'REQUEST_VALIDATION',
          source: this.getCurrentMfeName(),
          target: 'mfe-alcada',
          payload: {
            action: 'request_validation',
            data: validationRequest
          },
          correlationId
        },
        bubbles: true
      });
      
      window.dispatchEvent(requestEvent);
      
      // Timeout
      setTimeout(() => {
        window.removeEventListener(`mfe-data-${this.getCurrentMfeName()}`, responseListener);
        reject(new Error('Timeout na solicitação de validação'));
      }, 5 * 60 * 1000);
    });
  }
  
  /**
   * Obter nome do MFE atual
   */
  private getCurrentMfeName(): string {
    // Lógica para determinar o MFE atual
    // Pode ser baseado na URL, configuração, etc.
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    const mfeMap: Record<string, string> = {
      '4201': 'mfe-login',
      '4202': 'mfe-menu', 
      '4203': 'mfe-produto',
      '4204': 'mfe-alcada'
    };
    
    return mfeMap[port] || 'mfe-portal';
  }
}
```

## 🔄 Implementação nos MFEs

### MFE Produto - Solicitação de Validação

```typescript
// product-dashboard.component.ts
export class ProductDashboardComponent {
  
  constructor(
    private mfeCommunicationService: MfeCommunicationService,
    private productService: ProductService
  ) {}
  
  /**
   * Excluir produto com validação de alçada
   */
  async deleteProductWithValidation(product: Product): Promise<void> {
    console.log('[ProductDashboard] 🗑️ Iniciando exclusão com validação:', product.name);
    
    try {
      // Criar solicitação de validação
      const validationRequest: ValidationRequest = {
        id: 'val-' + Date.now(),
        requestingMfe: 'mfe-produto',
        operation: {
          type: 'delete',
          resource: 'product',
          resourceId: product.id,
          description: `Exclusão do produto ${product.name}`
        },
        requiredLevel: 'manager',
        context: {
          resourceName: product.name,
          requestedBy: {
            name: 'João Silva', // Em uma implementação real, viria do contexto de auth
            id: 'joao.silva',
            role: 'user',
            department: 'Vendas'
          },
          resourceDetails: {
            name: product.name,
            code: product.code,
            price: product.price,
            category: product.category,
            createdAt: product.createdAt,
            status: product.status
          },
          impact: this.calculateImpact(product),
          reversible: false
        },
        metadata: {
          timestamp: new Date().toISOString(),
          urgency: 'medium',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min
        }
      };
      
      console.log('[ProductDashboard] 📤 Enviando solicitação de validação...');
      
      // Solicitar validação via serviço de comunicação
      const validationResponse = await this.mfeCommunicationService.requestValidation(validationRequest);
      
      console.log('[ProductDashboard] 📥 Resposta de validação recebida:', validationResponse);
      
      if (validationResponse.validated) {
        console.log('[ProductDashboard] ✅ Validação aprovada, executando exclusão');
        
        // Executar exclusão
        await this.productService.deleteProduct(product.id);
        
        // Atualizar lista
        await this.loadProducts();
        
        // Mostrar sucesso
        this.showSuccessMessage(
          `Produto ${product.name} excluído com sucesso. ` +
          `Validado por: ${validationResponse.validatedBy?.name}`
        );
        
      } else {
        console.log('[ProductDashboard] ❌ Validação rejeitada:', validationResponse.reason);
        
        // Mostrar erro
        this.showErrorMessage(
          `Exclusão cancelada: ${validationResponse.reason}`
        );
      }
      
    } catch (error: any) {
      console.error('[ProductDashboard] ❌ Erro durante validação:', error);
      
      this.showErrorMessage(
        `Erro durante validação: ${error.message}`
      );
    }
  }
  
  /**
   * Calcular impacto da operação
   */
  private calculateImpact(product: Product): 'low' | 'medium' | 'high' | 'critical' {
    // Lógica para calcular impacto baseado no produto
    if (product.price > 5000) return 'high';
    if (product.price > 1000) return 'medium';
    return 'low';
  }
  
  /**
   * Verificar se operação requer validação
   */
  private requiresValidation(operation: string, product: Product): boolean {
    // Regras de negócio para determinar quando validação é necessária
    const rules = {
      delete: product.price > 500, // Produtos acima de R$ 500
      update: product.price > 2000, // Alterações em produtos caros
      transfer: true // Transferências sempre requerem validação
    };
    
    return rules[operation as keyof typeof rules] || false;
  }
}
```

### MFE Alçada - Processamento de Validação

```typescript
// validation-modal.component.ts
export class ValidationModalComponent implements OnInit, OnDestroy {
  
  constructor(
    private mfeCommunicationService: MfeCommunicationService,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    // Escutar dados de entrada do Portal
    this.mfeCommunicationService.inputData$.subscribe(inputData => {
      if (inputData?.config?.validation) {
        console.log('[ValidationModal] 📥 Dados de validação recebidos:', inputData);
        
        this.validation = inputData.config.validation;
        this.correlationId = inputData.metadata?.correlationId;
        
        this.startExpirationTimer();
        this.cdr.detectChanges();
      }
    });
  }
  
  /**
   * Processar validação e enviar resposta
   */
  private async processValidation(credentials: any): Promise<void> {
    try {
      console.log('[ValidationModal] 🔐 Processando validação...');
      
      // Validar credenciais
      const validationResult = await this.authService.validateUserLevel(
        credentials.username,
        credentials.password,
        this.validation!.requiredLevel
      );
      
      // Criar resposta
      const response: ValidationResponse = {
        validationId: this.validation!.id,
        validated: validationResult.valid,
        validatedBy: validationResult.valid ? validationResult.user : undefined,
        justification: validationResult.valid ? credentials.justification : undefined,
        reason: validationResult.valid ? undefined : validationResult.reason,
        timestamp: new Date().toISOString()
      };
      
      console.log('[ValidationModal] 📤 Enviando resposta de validação:', response);
      
      // Enviar resposta via evento
      const responseEvent = new CustomEvent('mfe-validation-response', {
        detail: {
          type: 'VALIDATION_RESPONSE',
          source: 'mfe-alcada',
          payload: {
            action: 'validation_complete',
            data: response,
            status: validationResult.valid ? 'success' : 'error'
          },
          correlationId: this.correlationId
        },
        bubbles: true
      });
      
      window.dispatchEvent(responseEvent);
      
    } catch (error: any) {
      console.error('[ValidationModal] ❌ Erro durante validação:', error);
      
      // Enviar erro
      const errorResponse: ValidationResponse = {
        validationId: this.validation!.id,
        validated: false,
        reason: `Erro durante validação: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      
      const errorEvent = new CustomEvent('mfe-validation-response', {
        detail: {
          type: 'VALIDATION_RESPONSE',
          source: 'mfe-alcada',
          payload: {
            action: 'validation_complete',
            data: errorResponse,
            status: 'error'
          },
          correlationId: this.correlationId
        },
        bubbles: true
      });
      
      window.dispatchEvent(errorEvent);
    }
  }
}
```

## 📊 Monitoramento e Debug

### Ferramentas de Debug

```typescript
// debug-communication.service.ts
@Injectable({
  providedIn: 'root'
})
export class DebugCommunicationService {
  private messageLog: Array<{
    timestamp: string;
    type: string;
    source: string;
    target: string;
    payload: any;
    correlationId?: string;
  }> = [];
  
  constructor() {
    this.setupDebugListeners();
  }
  
  private setupDebugListeners(): void {
    // Interceptar todas as mensagens
    const originalDispatchEvent = window.dispatchEvent;
    
    window.dispatchEvent = (event: Event) => {
      if (event.type.startsWith('mfe-')) {
        this.logMessage(event);
      }
      return originalDispatchEvent.call(window, event);
    };
  }
  
  private logMessage(event: Event): void {
    const customEvent = event as CustomEvent;
    const detail = customEvent.detail;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: event.type,
      source: detail.source || 'unknown',
      target: detail.target || 'unknown',
      payload: detail.payload,
      correlationId: detail.correlationId
    };
    
    this.messageLog.push(logEntry);
    
    // Manter apenas últimas 100 mensagens
    if (this.messageLog.length > 100) {
      this.messageLog.shift();
    }
    
    console.log('[DebugCommunication] 📨 Mensagem interceptada:', logEntry);
  }
  
  /**
   * Obter log de mensagens
   */
  getMessageLog(): any[] {
    return [...this.messageLog];
  }
  
  /**
   * Filtrar mensagens por tipo
   */
  getMessagesByType(type: string): any[] {
    return this.messageLog.filter(msg => msg.type === type);
  }
  
  /**
   * Rastrear correlação
   */
  traceCorrelation(correlationId: string): any[] {
    return this.messageLog.filter(msg => msg.correlationId === correlationId);
  }
  
  /**
   * Estatísticas de comunicação
   */
  getCommunicationStats(): any {
    const stats = {
      totalMessages: this.messageLog.length,
      messagesByType: {} as Record<string, number>,
      messagesBySource: {} as Record<string, number>,
      averageResponseTime: 0,
      errors: 0
    };
    
    this.messageLog.forEach(msg => {
      // Contar por tipo
      stats.messagesByType[msg.type] = (stats.messagesByType[msg.type] || 0) + 1;
      
      // Contar por fonte
      stats.messagesBySource[msg.source] = (stats.messagesBySource[msg.source] || 0) + 1;
      
      // Contar erros
      if (msg.payload?.status === 'error') {
        stats.errors++;
      }
    });
    
    return stats;
  }
}
```

### Console de Debug

```typescript
// Adicionar ao window para debug no console
(window as any).mfeDebug = {
  // Ver log de comunicação
  getLog: () => debugService.getMessageLog(),
  
  // Ver estatísticas
  getStats: () => debugService.getCommunicationStats(),
  
  // Rastrear correlação específica
  trace: (correlationId: string) => debugService.traceCorrelation(correlationId),
  
  // Simular solicitação de validação
  simulateValidation: () => {
    const event = new CustomEvent('mfe-request-validation', {
      detail: {
        type: 'REQUEST_VALIDATION',
        source: 'debug',
        target: 'mfe-alcada',
        payload: {
          action: 'request_validation',
          data: {
            id: 'debug-' + Date.now(),
            operation: { type: 'delete', resource: 'product' },
            requiredLevel: 'manager'
          }
        }
      },
      bubbles: true
    });
    window.dispatchEvent(event);
  }
};
```

## 🎯 Benefícios da Comunicação Inter-MFE

### 1. **Desacoplamento**
- ✅ **MFEs Independentes**: Não conhecem uns aos outros diretamente
- ✅ **Contratos Padronizados**: Interfaces bem definidas
- ✅ **Evolução Independente**: Mudanças isoladas por MFE

### 2. **Escalabilidade**
- ✅ **Adição de Novos MFEs**: Padrão estabelecido
- ✅ **Comunicação N:N**: Qualquer MFE pode se comunicar
- ✅ **Balanceamento**: Portal distribui carga

### 3. **Observabilidade**
- ✅ **Rastreamento**: Correlação de mensagens
- ✅ **Monitoramento**: Logs centralizados
- ✅ **Debug**: Ferramentas de diagnóstico

### 4. **Confiabilidade**
- ✅ **Timeout**: Controle de tempo limite
- ✅ **Retry**: Tentativas automáticas
- ✅ **Fallback**: Estratégias de recuperação

## 🎯 Próximos Passos

Na **próxima sessão**, exploraremos o **Dashboard de Produtos** atualizado, analisando como ele integra com o sistema de validação de alçada e apresenta métricas de operações críticas.

### Tópicos da Próxima Sessão
- Dashboard integrado com validação
- Métricas de operações críticas
- Visualizações de auditoria
- Relatórios de alçada
- Interface responsiva

---

**Duração Estimada**: 40-45 minutos  
**Nível**: Técnico Avançado  
**Próxima Parte**: [14 - Dashboard de Produtos](./14-dashboard-produtos.md)  
**🆕 Novidade v2.0**: Comunicação complexa entre MFEs via Portal