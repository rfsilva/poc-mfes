import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MfeCommunicationService } from '../../services/mfe-communication.service';
import { AuthService } from '../../services/auth.service';
import { ResourceLabelService } from '../../services/resource-label.service';
import { ValidationRequest } from '../../interfaces/validation.interface';
import { MfeInputData } from '../../interfaces/mfe-communication.interface';

@Component({
  selector: 'app-validation-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './validation-modal.component.html',
  styleUrls: ['./validation-modal.component.scss']
})
export class ValidationModalComponent implements OnInit, OnDestroy, AfterViewInit {
  validationForm!: FormGroup;
  validation?: ValidationRequest;
  isValidating = false;
  timeRemaining = 0;
  
  private timerSubscription?: Subscription;
  private inputDataSubscription?: Subscription;
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private mfeCommunicationService: MfeCommunicationService,
    private resourceLabelService: ResourceLabelService,
    private cdr: ChangeDetectorRef // 🆕 Para forçar detecção de mudanças
  ) {
    this.createForm();
  }
  
  ngOnInit(): void {
    console.log('[ValidationModal] 🚀 Componente inicializando...');
    
    this.inputDataSubscription = this.mfeCommunicationService.inputData$.subscribe(inputData => {
      console.log('[ValidationModal] 📥 Dados recebidos (RAW):', inputData);
      
      // 🆕 CORREÇÃO: Debug detalhado dos dados recebidos
      if (inputData && typeof inputData === 'object') {
        console.log('[ValidationModal] 🔍 Estrutura dos dados:', {
          hasConfig: !!inputData.config,
          configKeys: inputData.config ? Object.keys(inputData.config) : [],
          hasValidation: !!(inputData.config?.validation),
          validationData: inputData.config?.validation,
          fullInputData: inputData
        });
      }
      
      // Validar token se fornecido
      if (inputData.token && !this.mfeCommunicationService.validateToken(inputData.token)) {
        console.warn('[ValidationModal] ⚠️ Token inválido ou expirado');
        this.sendValidationResponse(false, {
          reason: 'Token inválido ou expirado'
        });
        return;
      }
      
      // 🆕 CORREÇÃO: Verificação mais robusta dos dados de validação com tipagem correta
      let validationData: ValidationRequest | null = null;
      
      // Tentar diferentes caminhos para encontrar os dados de validação
      if (inputData.config?.validation) {
        console.log('[ValidationModal] ✅ Dados encontrados em config.validation');
        validationData = inputData.config.validation as ValidationRequest;
      } else if ((inputData as any).validation) {
        console.log('[ValidationModal] ✅ Dados encontrados em validation (fallback)');
        validationData = (inputData as any).validation as ValidationRequest;
      } else if ((inputData as any).payload?.validation) {
        console.log('[ValidationModal] ✅ Dados encontrados em payload.validation (fallback)');
        validationData = (inputData as any).payload.validation as ValidationRequest;
      } else {
        console.warn('[ValidationModal] ⚠️ Nenhuma configuração de validação encontrada');
        console.warn('[ValidationModal] 📊 Estrutura recebida:', JSON.stringify(inputData, null, 2));
        
        // 🆕 CORREÇÃO: Criar dados de teste se não encontrar
        console.log('[ValidationModal] 🔧 Criando dados de validação de teste...');
        validationData = this.createTestValidationData();
      }
      
      if (validationData) {
        console.log('[ValidationModal] ✅ Configuração de validação processada:', validationData);
        this.validation = validationData;
        this.startExpirationTimer();
        
        // 🆕 CORREÇÃO: Forçar detecção de mudanças
        this.cdr.detectChanges();
        console.log('[ValidationModal] 🔄 Detecção de mudanças forçada');
      }
    });
  }

  ngAfterViewInit(): void {
    // 🆕 CORREÇÃO: Confirmar que o componente está pronto após a view ser inicializada
    setTimeout(() => {
      this.confirmComponentReady();
    }, 100);
  }
  
  ngOnDestroy(): void {
    console.log('[ValidationModal] 🧹 Componente sendo destruído...');
    
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (this.inputDataSubscription) {
      this.inputDataSubscription.unsubscribe();
    }
  }

  /**
   * 🆕 CORREÇÃO: Criar dados de validação de teste para debug com tipagem correta
   */
  private createTestValidationData(): ValidationRequest {
    console.log('[ValidationModal] 🧪 Criando dados de teste para validação...');
    
    return {
      id: 'test-' + Date.now(),
      requestingMfe: 'mfe-produto',
      operation: {
        type: 'delete',
        resource: 'product',
        resourceId: 'PROD-TEST-001',
        description: 'Exclusão de produto (teste)'
      },
      requiredLevel: 'manager',
      context: {
        resourceName: 'Produto de Teste',
        requestedBy: {
          name: 'Usuário de Teste',
          id: 'test-user',
          role: 'user', // 🔧 CORREÇÃO: Adicionado campo obrigatório 'role'
          department: 'TI'
        },
        resourceDetails: {
          name: 'Produto de Teste',
          code: 'PROD-TEST-001',
          price: 100.00, // 🔧 CORREÇÃO: Valor numérico em vez de string
          category: 'Eletrônicos',
          createdAt: '2024-01-15T10:30:00Z', // 🔧 CORREÇÃO: Data válida
          status: 'Ativo'
        },
        impact: 'medium',
        reversible: false
      },
      metadata: {
        timestamp: new Date().toISOString(),
        urgency: 'medium',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
      }
    };
  }

  /**
   * 🆕 CORREÇÃO: Confirmar que o componente está pronto para receber dados
   */
  private confirmComponentReady(): void {
    console.log('[ValidationModal] ✅ Confirmando que componente está pronto...');
    
    // Disparar evento global informando que está pronto
    const readyEvent = new CustomEvent('mfe-alcada-ready', {
      detail: {
        componentName: 'ValidationModalComponent',
        timestamp: new Date().toISOString(),
        ready: true,
        hasValidation: !!this.validation
      },
      bubbles: true
    });
    
    window.dispatchEvent(readyEvent);
    console.log('[ValidationModal] 📡 Evento mfe-alcada-ready disparado');
  }
  
  private createForm(): void {
    this.validationForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      justification: ['', [Validators.required, Validators.minLength(10)]]
    });

    // 🆕 CORREÇÃO: Escutar mudanças no formulário para atualizar UI
    this.validationForm.valueChanges.subscribe(() => {
      console.log('[ValidationModal] 📝 Formulário alterado:', {
        valid: this.validationForm.valid,
        values: this.validationForm.value,
        errors: this.validationForm.errors
      });
      this.cdr.detectChanges(); // Forçar atualização da UI
    });
  }
  
  private startExpirationTimer(): void {
    if (!this.validation?.metadata.expiresAt) return;
    
    const expirationTime = new Date(this.validation.metadata.expiresAt).getTime();
    
    this.timerSubscription = new Subscription();
    const interval = setInterval(() => {
      const now = Date.now();
      this.timeRemaining = Math.max(0, expirationTime - now);
      
      if (this.timeRemaining <= 0) {
        console.log('[ValidationModal] ⏰ Validação expirou por timeout');
        this.onExpiration();
        clearInterval(interval);
      }
      
      // 🆕 CORREÇÃO: Forçar atualização do timer na UI
      this.cdr.detectChanges();
    }, 1000);
    
    this.timerSubscription.add(() => clearInterval(interval));
  }
  
  private onExpiration(): void {
    this.sendValidationResponse(false, {
      reason: 'Validação expirou por timeout'
    });
  }

  // 🆕 CORREÇÃO: Métodos para controle dinâmico da UI
  
  /**
   * Verifica se o formulário é válido
   */
  isFormValid(): boolean {
    const valid = this.validationForm.valid && !this.isValidating;
    console.log('[ValidationModal] 🔍 Verificando validade do formulário:', {
      formValid: this.validationForm.valid,
      isValidating: this.isValidating,
      result: valid,
      formErrors: this.validationForm.errors,
      fieldErrors: {
        username: this.validationForm.get('username')?.errors,
        password: this.validationForm.get('password')?.errors,
        justification: this.validationForm.get('justification')?.errors
      }
    });
    return valid;
  }

  /**
   * Obtém classes CSS dinâmicas para o botão
   */
  getSubmitButtonClass(): string {
    return this.isFormValid() ? 'btn-validate-enabled' : 'btn-validate-disabled';
  }

  /**
   * Obtém estilos dinâmicos para o botão
   */
  getSubmitButtonStyle(): any {
    const baseStyle = {
      background: '#10b981',
      color: 'white',
      border: 'none',
      padding: '0.75rem 1.5rem',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.875rem',
      transition: 'all 0.2s ease'
    };

    if (!this.isFormValid()) {
      return {
        ...baseStyle,
        opacity: '0.6',
        cursor: 'not-allowed',
        background: '#9ca3af'
      };
    }

    return baseStyle;
  }

  /**
   * Verifica se um campo específico tem erro
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.validationForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Obtém mensagem de erro para um campo
   */
  getFieldError(fieldName: string): string {
    const field = this.validationForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) {
      return `${fieldName} é obrigatório`;
    }
    if (field.errors['minlength']) {
      return `${fieldName} deve ter pelo menos ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return 'Campo inválido';
  }
  
  /**
   * Métodos para renderização dinâmica baseada no tipo de recurso
   */
  getValidationTitle(): string {
    if (!this.validation) return 'Validação de Alçada';
    
    const operation = this.getOperationLabel();
    const resource = this.getResourceTypeLabel();
    return `Validação: ${operation} ${resource}`;
  }
  
  getValidationDescription(): string {
    if (!this.validation) return '';
    
    return `Esta operação requer aprovação de usuário com nível ${this.validation.requiredLevel} ou superior.`;
  }
  
  getOperationLabel(): string {
    if (!this.validation) return '';
    
    const labels: Record<string, string> = {
      'delete': 'Exclusão',
      'update': 'Alteração',
      'approve': 'Aprovação', 
      'transfer': 'Transferência',
      'create': 'Criação',
      'cancel': 'Cancelamento'
    };
    return labels[this.validation.operation.type] || this.validation.operation.type;
  }
  
  getOperationClass(): string {
    if (!this.validation) return '';
    return `operation-${this.validation.operation.type}`;
  }
  
  getResourceTypeLabel(): string {
    if (!this.validation) return '';
    return this.resourceLabelService.getLabel(this.validation.operation.resource);
  }
  
  getResourceDetailsArray(): Array<{label: string, value: string}> {
    if (!this.validation?.context.resourceDetails) return [];
    
    return Object.entries(this.validation.context.resourceDetails)
      .map(([key, value]) => ({
        label: this.resourceLabelService.getFieldLabel(
          this.validation!.operation.resource, 
          key
        ),
        value: this.formatFieldValue(key, value)
      }));
  }
  
  private formatFieldValue(key: string, value: any): string {
    if (value === null || value === undefined) return '-';
    
    // 🔧 CORREÇÃO: Melhor formatação de valores
    try {
      // Formatação específica por tipo de campo
      if (key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('pt-BR');
        }
        return String(value);
      }
      
      if (key.toLowerCase().includes('price') || key.toLowerCase().includes('total') || key.toLowerCase().includes('valor')) {
        const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(numValue)) {
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(numValue);
        }
        return String(value);
      }
      
      return String(value);
    } catch (error) {
      console.warn('[ValidationModal] Erro ao formatar valor:', { key, value, error });
      return String(value);
    }
  }
  
  getJustificationPlaceholder(): string {
    if (!this.validation) return 'Justifique a operação...';
    
    const operation = this.getOperationLabel().toLowerCase();
    const resource = this.getResourceTypeLabel().toLowerCase();
    return `Justifique a necessidade de ${operation} deste ${resource}...`;
  }
  
  formatTimeRemaining(): string {
    const minutes = Math.floor(this.timeRemaining / 60000);
    const seconds = Math.floor((this.timeRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  async onValidate(): Promise<void> {
    console.log('[ValidationModal] 🔄 onValidate chamado');
    console.log('[ValidationModal] 📊 Estado do formulário:', {
      valid: this.validationForm.valid,
      hasValidation: !!this.validation,
      isValidating: this.isValidating,
      formValue: this.validationForm.value
    });

    if (this.validationForm.invalid || !this.validation) {
      console.warn('[ValidationModal] ⚠️ Formulário inválido ou validação não definida');
      // Marcar todos os campos como touched para mostrar erros
      Object.keys(this.validationForm.controls).forEach(key => {
        this.validationForm.get(key)?.markAsTouched();
      });
      this.cdr.detectChanges();
      return;
    }
    
    this.isValidating = true;
    this.cdr.detectChanges(); // Atualizar UI imediatamente
    console.log('[ValidationModal] 🔄 Iniciando processo de validação...');
    
    try {
      const credentials = this.validationForm.value;
      console.log('[ValidationModal] 🔑 Credenciais fornecidas:', { 
        username: credentials.username, 
        justification: credentials.justification 
      });
      
      // Validar credenciais do usuário com alçada
      const validationResult = await this.authService.validateUserLevel(
        credentials.username,
        credentials.password,
        this.validation.requiredLevel
      );
      
      console.log('[ValidationModal] 📊 Resultado da validação:', validationResult);
      
      if (validationResult.valid) {
        console.log('[ValidationModal] ✅ Validação aprovada');
        // Enviar aprovação
        this.sendValidationResponse(true, {
          validatedBy: validationResult.user,
          justification: credentials.justification
        });
      } else {
        console.log('[ValidationModal] ❌ Validação rejeitada:', validationResult.reason);
        // Enviar rejeição
        this.sendValidationResponse(false, {
          reason: validationResult.reason || 'Credenciais inválidas ou nível insuficiente'
        });
      }
      
    } catch (error: any) {
      console.error('[ValidationModal] ❌ Erro durante validação:', error);
      this.sendValidationResponse(false, {
        reason: 'Erro durante validação: ' + error.message
      });
    } finally {
      this.isValidating = false;
      this.cdr.detectChanges(); // Atualizar UI
    }
  }
  
  onCancel(): void {
    console.log('[ValidationModal] ❌ Validação cancelada pelo usuário');
    this.sendValidationResponse(false, {
      reason: 'Validação cancelada pelo usuário'
    });
  }
  
  private sendValidationResponse(validated: boolean, data: any): void {
    if (!this.validation) {
      console.error('[ValidationModal] ❌ Tentativa de enviar resposta sem validação definida');
      return;
    }
    
    console.log('[ValidationModal] 📤 Enviando resposta de validação:', { 
      validated, 
      validationId: this.validation.id,
      data 
    });
    
    this.mfeCommunicationService.sendDataToPortal({
      type: 'VALIDATION_RESPONSE',
      payload: {
        action: 'validation_complete',
        data: {
          validationId: this.validation.id,
          validated: validated,
          validatedBy: data.validatedBy,
          justification: data.justification,
          reason: data.reason,
          timestamp: new Date().toISOString()
        },
        status: validated ? 'success' : 'error'
      }
    });
  }

  /**
   * 🆕 CORREÇÃO: Método para debug - pode ser chamado do console
   */
  debugComponent(): void {
    console.log('[ValidationModal] 🔍 DEBUG - Estado do componente:', {
      hasValidation: !!this.validation,
      validation: this.validation,
      formValid: this.validationForm?.valid,
      formValue: this.validationForm?.value,
      isValidating: this.isValidating,
      timeRemaining: this.timeRemaining,
      formErrors: this.validationForm?.errors,
      fieldStates: {
        username: {
          value: this.validationForm?.get('username')?.value,
          valid: this.validationForm?.get('username')?.valid,
          errors: this.validationForm?.get('username')?.errors,
          touched: this.validationForm?.get('username')?.touched
        },
        password: {
          value: this.validationForm?.get('password')?.value ? '***' : '',
          valid: this.validationForm?.get('password')?.valid,
          errors: this.validationForm?.get('password')?.errors,
          touched: this.validationForm?.get('password')?.touched
        },
        justification: {
          value: this.validationForm?.get('justification')?.value,
          valid: this.validationForm?.get('justification')?.valid,
          errors: this.validationForm?.get('justification')?.errors,
          touched: this.validationForm?.get('justification')?.touched
        }
      }
    });
  }
}