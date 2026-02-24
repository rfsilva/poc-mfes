import { Injectable, ComponentRef, createComponent, EnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { DynamicMfeLoaderService } from './dynamic-mfe-loader.service';
import { MfeCommunicationService } from './mfe-communication.service';
import { TokenManagerService } from './token-manager.service';

interface ValidationRequest {
  id: string;
  requestingMfe: string;
  operation: {
    type: string;
    resource: string;
    resourceId: string;
    description: string;
  };
  requiredLevel: 'manager' | 'admin' | 'supervisor' | 'director';
  context: any;
  metadata: {
    timestamp: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    expiresAt?: string;
  };
}

interface ValidationRule {
  resource: string;
  operation: string;
  requiredLevel: 'manager' | 'admin' | 'supervisor' | 'director';
  timeoutMinutes: number;
  autoApprove: boolean;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ValidationOrchestratorService {
  
  private pendingValidations = new Map<string, ValidationRequest>();
  private validationRules = new Map<string, ValidationRule>();
  private showValidationSubject = new BehaviorSubject<boolean>(false);
  private loadedComponentRef: ComponentRef<any> | null = null;
  
  public showValidation$ = this.showValidationSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private dynamicMfeLoader: DynamicMfeLoaderService,
    private mfeCommunicationService: MfeCommunicationService,
    private tokenManager: TokenManagerService,
    private environmentInjector: EnvironmentInjector
  ) {
    this.loadValidationRules();
    this.setupGenericValidationListener();
  }
  
  /**
   * Carrega regras de validação de configuração externa
   */
  private async loadValidationRules(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<{rules: ValidationRule[]}>('/assets/config/validation-rules.json')
      );
      
      response.rules.forEach(rule => {
        this.validationRules.set(`${rule.resource}.${rule.operation}`, rule);
      });
      
      console.log('[ValidationOrchestrator] Regras de validação carregadas:', this.validationRules.size);
    } catch (error) {
      console.error('[ValidationOrchestrator] Erro ao carregar regras de validação:', error);
      // Criar regras padrão se não conseguir carregar
      this.createDefaultRules();
    }
  }
  
  /**
   * Criar regras padrão caso não consiga carregar do arquivo
   */
  private createDefaultRules(): void {
    const defaultRules: ValidationRule[] = [
      {
        resource: 'product',
        operation: 'delete',
        requiredLevel: 'manager',
        timeoutMinutes: 30,
        autoApprove: false,
        description: 'Exclusão de produtos requer aprovação gerencial'
      },
      {
        resource: 'product',
        operation: 'update',
        requiredLevel: 'supervisor',
        timeoutMinutes: 15,
        autoApprove: false,
        description: 'Alteração de produtos requer supervisão'
      }
    ];
    
    defaultRules.forEach(rule => {
      this.validationRules.set(`${rule.resource}.${rule.operation}`, rule);
    });
    
    console.log('[ValidationOrchestrator] Regras padrão criadas');
  }
  
  /**
   * Escuta solicitações de QUALQUER MFE
   */
  private setupGenericValidationListener(): void {
    // Escutar solicitações de validação
    window.addEventListener('mfe-data-output', (event: any) => {
      const outputData = event.detail;
      
      if (outputData['type'] === 'VALIDATION_REQUEST') {
        console.log('[ValidationOrchestrator] Solicitação de validação recebida:', outputData);
        this.handleGenericValidationRequest(outputData);
      }
    });
    
    // Escutar respostas do MFE Alçada usando o padrão correto
    this.mfeCommunicationService.receiveDataFromMfe('alcada').subscribe(
      outputData => {
        if (outputData['type'] === 'VALIDATION_RESPONSE') {
          console.log('[ValidationOrchestrator] Resposta de validação recebida:', outputData);
          this.handleValidationResponse(outputData);
        }
      }
    );

    // 🆕 CORREÇÃO: Escutar confirmação de que o MFE Alçada está pronto
    window.addEventListener('mfe-alcada-ready', (event: any) => {
      console.log('[ValidationOrchestrator] ✅ MFE Alçada confirmou que está pronto:', event.detail);
      this.handleMfeAlcadaReady(event.detail);
    });
  }
  
  /**
   * Processa solicitação de validação de qualquer MFE
   */
  private async handleGenericValidationRequest(request: any): Promise<void> {
    console.log('[ValidationOrchestrator] Processando solicitação de validação:', request);
    
    const validationData = request.payload.data;
    const ruleKey = `${validationData.operation.resource}.${validationData.operation.type}`;
    
    // Verificar se operação requer validação
    let rule = this.validationRules.get(ruleKey);
    if (!rule) {
      console.warn(`[ValidationOrchestrator] Nenhuma regra encontrada para ${ruleKey}, criando regra padrão`);
      // Criar regra padrão dinamicamente
      rule = {
        resource: validationData.operation.resource,
        operation: validationData.operation.type,
        requiredLevel: 'manager',
        timeoutMinutes: 30,
        autoApprove: false,
        description: `Operação ${validationData.operation.type} em ${validationData.operation.resource} requer validação`
      };
      this.validationRules.set(ruleKey, rule);
    }
    
    // Verificar se usuário atual tem nível suficiente
    const currentUser = this.getCurrentUser();
    if (this.hasRequiredLevel(currentUser, rule.requiredLevel)) {
      console.log('[ValidationOrchestrator] Usuário tem nível suficiente, aprovando automaticamente');
      this.sendAutoApproval(validationData);
      return;
    }
    
    const validationId = this.generateValidationId();
    
    // Criar solicitação padronizada
    const validationRequest: ValidationRequest = {
      id: validationId,
      requestingMfe: this.identifyRequestingMfe(request),
      operation: validationData.operation,
      requiredLevel: rule.requiredLevel,
      context: validationData.context,
      metadata: {
        timestamp: new Date().toISOString(),
        urgency: validationData.urgency || 'medium',
        expiresAt: this.calculateExpiration(rule.timeoutMinutes)
      }
    };
    
    // Armazenar e processar
    this.pendingValidations.set(validationId, validationRequest);
    console.log('[ValidationOrchestrator] Validação armazenada, carregando MFE Alçada...');
    await this.loadValidationMfe(validationRequest);
  }
  
  /**
   * 🆕 CORREÇÃO: Aguardar que o MFE Alçada esteja pronto para receber dados
   */
  private async waitForMfeAlcadaReady(timeout: number = 15000): Promise<void> {
    console.log('[ValidationOrchestrator] 🔍 Aguardando MFE Alçada ficar pronto...');
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        window.removeEventListener('mfe-alcada-ready', readyHandler);
        reject(new Error('Timeout aguardando MFE Alçada ficar pronto'));
      }, timeout);
      
      const readyHandler = (event: any) => {
        console.log('[ValidationOrchestrator] ✅ MFE Alçada está pronto!');
        clearTimeout(timeoutId);
        window.removeEventListener('mfe-alcada-ready', readyHandler);
        resolve();
      };
      
      window.addEventListener('mfe-alcada-ready', readyHandler, { once: true });
    });
  }

  /**
   * 🆕 CORREÇÃO: Aguardar inicialização completa do componente
   */
  private async waitForComponentInitialization(): Promise<void> {
    console.log('[ValidationOrchestrator] 🔍 Aguardando inicialização completa do componente...');
    
    // Aguardar próximo tick para garantir que o componente foi anexado ao DOM
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Aguardar que o Angular complete o ciclo de detecção de mudanças
    if (this.loadedComponentRef) {
      this.loadedComponentRef.changeDetectorRef.detectChanges();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('[ValidationOrchestrator] ✅ Componente inicializado completamente');
  }

  /**
   * 🆕 CORREÇÃO: Handler para quando MFE Alçada confirma que está pronto
   */
  private handleMfeAlcadaReady(readyData: any): void {
    console.log('[ValidationOrchestrator] 🎯 MFE Alçada confirmou inicialização:', readyData);
    // Este método é chamado automaticamente quando o evento é disparado
    // A lógica principal está no waitForMfeAlcadaReady
  }
  
  /**
   * 🔧 CORRIGIDO: Carrega MFE Alçada com aguardo de inicialização
   */
  private async loadValidationMfe(request: ValidationRequest): Promise<void> {
    try {
      console.log('[ValidationOrchestrator] 🚀 Carregando MFE Alçada via Native Federation...');
      
      this.showValidationSubject.next(true);
      
      const container = document.getElementById('validation-container');
      if (!container) {
        throw new Error('Container de validação não encontrado no DOM');
      }
      
      console.log('[ValidationOrchestrator] ✅ Container encontrado:', container);
      
      // 🆕 CORREÇÃO: Timeout ajustado para desenvolvimento
      const isDevelopment = !!(window as any)['ng'] || location.hostname === 'localhost';
      const loadTimeout = isDevelopment ? 30000 : 15000; // 30s dev, 15s prod
      
      console.log('[ValidationOrchestrator] 📦 Carregando componente (timeout: ' + loadTimeout + 'ms)...');
      
      // Carregar componente com timeout ajustado
      const loadPromise = this.dynamicMfeLoader.loadMfeComponent('mfe-alcada');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout ao carregar MFE Alçada (${loadTimeout}ms)`)), loadTimeout);
      });
      
      const AlcadaComponent = await Promise.race([loadPromise, timeoutPromise]);
      
      console.log('[ValidationOrchestrator] ✅ Componente carregado com sucesso:', AlcadaComponent);
      
      // Criar instância do componente
      console.log('[ValidationOrchestrator] 🏗️ Criando instância do componente...');
      this.loadedComponentRef = createComponent(AlcadaComponent, {
        environmentInjector: this.environmentInjector
      });
      
      console.log('[ValidationOrchestrator] ✅ Instância criada:', this.loadedComponentRef);
      
      // Anexar ao DOM
      console.log('[ValidationOrchestrator] 🔗 Anexando componente ao DOM...');
      container.appendChild(this.loadedComponentRef.location.nativeElement);
      console.log('[ValidationOrchestrator] ✅ Componente anexado ao DOM');
      
      // 🆕 CORREÇÃO: Aguardar inicialização completa
      console.log('[ValidationOrchestrator] ⏳ Aguardando inicialização completa...');
      await this.waitForComponentInitialization();
      
      // 🆕 CORREÇÃO: Aguardar confirmação do MFE que está pronto
      console.log('[ValidationOrchestrator] ⏳ Aguardando confirmação do MFE Alçada...');
      try {
        await this.waitForMfeAlcadaReady(5000); // 5s para confirmar que está pronto
        console.log('[ValidationOrchestrator] ✅ MFE Alçada confirmou que está pronto');
      } catch (readyError) {
        console.warn('[ValidationOrchestrator] ⚠️ MFE não confirmou que está pronto, prosseguindo mesmo assim:', readyError);
        // Continuar mesmo se não receber confirmação (compatibilidade)
      }
      
      // Preparar dados para enviar ao componente
      const token = this.tokenManager.getCurrentToken();
      const inputData = {
        user: this.getCurrentUser(),
        context: {
          source: 'validation-orchestrator',
          validationId: request.id,
          action: 'validate_operation'
        },
        config: {
          validation: request,
          ui: {
            mode: 'modal',
            theme: 'default',
            showResourceDetails: true,
            allowJustificationEdit: true
          }
        },
        token: token || undefined
      };
      
      console.log('[ValidationOrchestrator] 📤 Enviando dados para MFE Alçada:', inputData);
      
      // 🆕 CORREÇÃO: Aguardar um pouco mais antes de enviar dados
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Enviar dados para o componente
      this.mfeCommunicationService.sendDataToMfe('alcada', inputData);
      
      console.log('[ValidationOrchestrator] ✅ MFE Alçada carregado via Native Federation com sucesso!');
      
    } catch (error: any) {
      console.error('[ValidationOrchestrator] ❌ Falha ao carregar MFE Alçada via Native Federation:', error);
      console.error('[ValidationOrchestrator] 📊 Detalhes completos do erro:', {
        name: error?.name || 'Unknown',
        message: error?.message || 'Erro desconhecido',
        stack: error?.stack || 'Stack não disponível',
        cause: error?.cause || 'Causa não disponível',
        request: request
      });
      
      // DEBUG: Verificar se é um erro específico
      if (error?.message?.includes('timeout')) {
        console.error('[ValidationOrchestrator] ⏰ Erro de timeout - MFE pode estar lento ou não responsivo');
      } else if (error?.message?.includes('network')) {
        console.error('[ValidationOrchestrator] 🌐 Erro de rede - verificar conectividade');
      } else if (error?.message?.includes('not found')) {
        console.error('[ValidationOrchestrator] 🔍 MFE não encontrado - verificar configuração');
      }
      
      // Limpar estado em caso de erro
      this.showValidationSubject.next(false);
      
      // SÓ usar fallback se realmente falhar
      console.log('[ValidationOrchestrator] 🔄 Tentando fallback...');
      this.showFallbackValidation(request);
    }
  }
  
  /**
   * Modal de fallback (usado APENAS quando Native Federation falha)
   */
  private showFallbackValidation(request: ValidationRequest): void {
    console.log('[ValidationOrchestrator] ⚠️ Usando modal de fallback - Native Federation falhou');
    
    const container = document.getElementById('validation-container');
    if (!container) {
      console.error('[ValidationOrchestrator] Container não encontrado para fallback');
      return;
    }
    
    this.showValidationSubject.next(true);
    
    container.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 0;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        max-width: 600px;
        width: 90%;
        z-index: 10000;
        border: 1px solid #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <!-- Header -->
        <div style="
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 12px 12px 0 0;
          text-align: center;
        ">
          <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600;">
            ⚠️ Validação de Alçada (Modo Fallback)
          </h3>
          <p style="margin: 0.5rem 0 0 0; opacity: 0.9; font-size: 0.875rem;">
            MFE Alçada não disponível - usando interface de backup
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 1.5rem;">
          <!-- Operation Details -->
          <div style="
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1.5rem;
          ">
            <h4 style="margin: 0 0 0.75rem 0; color: #92400e; font-size: 1rem;">
              📋 Detalhes da Operação
            </h4>
            <div style="display: grid; gap: 0.5rem; font-size: 0.875rem; color: #92400e;">
              <div><strong>Operação:</strong> ${request.operation.description}</div>
              <div><strong>Recurso:</strong> ${request.operation.resourceId}</div>
              <div><strong>Nível Requerido:</strong> ${request.requiredLevel}</div>
              <div><strong>Urgência:</strong> ${request.metadata.urgency}</div>
            </div>
          </div>
          
          <!-- Validation Form -->
          <div style="display: grid; gap: 1rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                👤 Usuário com Alçada
              </label>
              <input type="text" id="fallback-username" placeholder="Digite o usuário autorizado" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e2e8f0;
                border-radius: 6px;
                font-size: 0.875rem;
              ">
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                🔑 Senha
              </label>
              <input type="password" id="fallback-password" placeholder="Digite a senha" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e2e8f0;
                border-radius: 6px;
                font-size: 0.875rem;
              ">
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                📝 Justificativa
              </label>
              <textarea id="fallback-justification" placeholder="Justifique a necessidade desta operação..." style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e2e8f0;
                border-radius: 6px;
                font-size: 0.875rem;
                min-height: 80px;
                resize: vertical;
              "></textarea>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 0 0 12px 12px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div style="font-size: 0.875rem; color: #6b7280;">
            ⏱️ Tempo restante: <span id="timer-display" style="font-weight: 600; color: #374151;">30:00</span>
          </div>
          
          <div style="display: flex; gap: 1rem;">
            <button id="fallback-reject" style="
              background: #ef4444;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              font-size: 0.875rem;
            ">
              ❌ Rejeitar
            </button>
            
            <button id="fallback-approve" style="
              background: #10b981;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              font-size: 0.875rem;
            ">
              ✅ Aprovar
            </button>
          </div>
        </div>
      </div>
    `;
    
    this.setupFallbackEventListeners(request, container);
    this.startValidationTimer(container, request);
    
    console.log('[ValidationOrchestrator] Modal de fallback configurado');
  }
  
  /**
   * Configurar event listeners do modal de fallback
   */
  private setupFallbackEventListeners(request: ValidationRequest, container: HTMLElement): void {
    const approveBtn = container.querySelector('#fallback-approve') as HTMLButtonElement;
    const rejectBtn = container.querySelector('#fallback-reject') as HTMLButtonElement;
    const usernameInput = container.querySelector('#fallback-username') as HTMLInputElement;
    const passwordInput = container.querySelector('#fallback-password') as HTMLInputElement;
    const justificationInput = container.querySelector('#fallback-justification') as HTMLTextAreaElement;
    
    approveBtn?.addEventListener('click', () => {
      const username = usernameInput?.value?.trim() || '';
      const password = passwordInput?.value?.trim() || '';
      const justification = justificationInput?.value?.trim() || '';
      
      if (!username || !password || !justification) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
      }
      
      console.log('[ValidationOrchestrator] Aprovando via fallback:', { username, justification });
      
      this.sendValidationResponse(request.id, true, {
        validatedBy: { 
          name: username, 
          role: request.requiredLevel,
          id: 'fallback-user-' + Date.now()
        },
        reason: 'Aprovado via validação de alçada (fallback)',
        justification: justification
      });
    });
    
    rejectBtn?.addEventListener('click', () => {
      const justification = justificationInput?.value?.trim() || 'Operação rejeitada na validação de alçada';
      
      console.log('[ValidationOrchestrator] Rejeitando via fallback');
      
      this.sendValidationResponse(request.id, false, {
        reason: 'Operação rejeitada na validação de alçada (fallback)',
        justification: justification
      });
    });
  }
  
  /**
   * Iniciar timer de expiração
   */
  private startValidationTimer(container: HTMLElement, request: ValidationRequest): void {
    const expirationTime = new Date(request.metadata.expiresAt || Date.now() + 30 * 60 * 1000);
    const timerDisplay = container.querySelector('#timer-display') as HTMLElement;
    
    const updateTimer = () => {
      const now = new Date();
      const timeLeft = Math.max(0, expirationTime.getTime() - now.getTime());
      
      if (timeLeft <= 0) {
        console.log('[ValidationOrchestrator] Timeout da validação');
        this.sendValidationResponse(request.id, false, {
          reason: 'Validação expirou por timeout'
        });
        return;
      }
      
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      
      if (timerDisplay) {
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Mudar cor quando restam menos de 5 minutos
        if (timeLeft < 5 * 60 * 1000) {
          timerDisplay.style.color = '#ef4444';
        }
      }
      
      setTimeout(updateTimer, 1000);
    };
    
    updateTimer();
  }
  
  /**
   * Responde para o MFE solicitante (genérico)
   */
  private handleValidationResponse(response: any): void {
    const validationId = response.payload.data.validationId;
    const validation = this.pendingValidations.get(validationId);
    
    if (!validation) {
      console.error('[ValidationOrchestrator] Validação não encontrada:', validationId);
      return;
    }
    
    this.sendValidationResponse(
      validationId,
      response.payload.data.validated,
      {
        validatedBy: response.payload.data.validatedBy,
        reason: response.payload.data.reason,
        justification: response.payload.data.justification
      }
    );
  }
  
  /**
   * Envia resposta de validação para o MFE solicitante
   */
  private sendValidationResponse(validationId: string, validated: boolean, data: any): void {
    console.log('[ValidationOrchestrator] 📤 Enviando resposta de validação:', { validationId, validated, data });
    
    const validation = this.pendingValidations.get(validationId);
    if (!validation) {
      console.error('[ValidationOrchestrator] Validação não encontrada para resposta:', validationId);
      return;
    }
    
    // Resposta padronizada para qualquer MFE
    const responseEvent = new CustomEvent('mfe-validation-response', {
      detail: {
        context: {
          action: 'validation_response',
          validationId: validationId,
          resourceId: validation.operation.resourceId,
          validated: validated,
          validatedBy: data.validatedBy,
          reason: data.reason,
          justification: data.justification,
          timestamp: new Date().toISOString()
        }
      },
      bubbles: true
    });
    
    window.dispatchEvent(responseEvent);
    console.log('[ValidationOrchestrator] ✅ Evento de resposta disparado');
    
    // Limpar e descarregar
    this.pendingValidations.delete(validationId);
    this.unloadValidationMfe();
  }
  
  /**
   * Descarrega o MFE Alçada
   */
  private unloadValidationMfe(): void {
    console.log('[ValidationOrchestrator] 🧹 Descarregando modal de validação');
    
    // Limpar componente Native Federation se existir
    if (this.loadedComponentRef) {
      this.loadedComponentRef.destroy();
      this.loadedComponentRef = null;
      console.log('[ValidationOrchestrator] Componente Native Federation destruído');
    }
    
    // Limpar container
    const container = document.getElementById('validation-container');
    if (container) {
      container.innerHTML = '';
    }
    
    this.showValidationSubject.next(false);
  }
  
  /**
   * Enviar aprovação automática
   */
  private sendAutoApproval(validationData: any): void {
    console.log('[ValidationOrchestrator] ✅ Enviando aprovação automática');
    
    const responseEvent = new CustomEvent('mfe-validation-response', {
      detail: {
        context: {
          action: 'validation_response',
          validationId: 'auto-' + Date.now(),
          resourceId: validationData.operation.resourceId,
          validated: true,
          validatedBy: this.getCurrentUser(),
          reason: 'Aprovação automática - usuário possui nível suficiente',
          timestamp: new Date().toISOString()
        }
      },
      bubbles: true
    });
    
    window.dispatchEvent(responseEvent);
  }
  
  /**
   * Verificar se o usuário tem nível necessário
   */
  private hasRequiredLevel(user: any, requiredLevel: string): boolean {
    if (!user || !user.level) {
      console.log('[ValidationOrchestrator] Usuário sem nível definido');
      return false;
    }
    
    const levels = ['user', 'supervisor', 'manager', 'admin', 'director'];
    const userLevelIndex = levels.indexOf(user.level);
    const requiredLevelIndex = levels.indexOf(requiredLevel);
    
    console.log('[ValidationOrchestrator] Verificando nível:', { 
      userLevel: user.level, 
      requiredLevel, 
      userIndex: userLevelIndex, 
      requiredIndex: requiredLevelIndex 
    });
    
    return userLevelIndex >= requiredLevelIndex;
  }
  
  /**
   * Obter usuário atual
   */
  private getCurrentUser(): any {
    const token = this.tokenManager.getCurrentToken();
    if (!token) {
      console.log('[ValidationOrchestrator] Nenhum token disponível');
      return null;
    }
    
    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      const user = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        level: payload.level || 'user'
      };
      
      console.log('[ValidationOrchestrator] Usuário atual:', user);
      return user;
    } catch (error) {
      console.error('[ValidationOrchestrator] Erro ao extrair usuário do token:', error);
      return null;
    }
  }
  
  /**
   * Identificar MFE solicitante
   */
  private identifyRequestingMfe(request: any): string {
    // Tentar identificar pelo evento ou contexto
    return 'mfe-produto'; // Por enquanto, assumir que é o mfe-produto
  }
  
  /**
   * Gerar ID único para validação
   */
  private generateValidationId(): string {
    return 'val_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Calcular tempo de expiração
   */
  private calculateExpiration(timeoutMinutes: number): string {
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + timeoutMinutes);
    return expiration.toISOString();
  }
}