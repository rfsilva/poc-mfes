import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-default-alcada',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fallback-container">
      <div class="fallback-content">
        <div class="fallback-header">
          <div class="fallback-icon">⚠️</div>
          <h2>Validação de Alçada - Modo Fallback</h2>
          <p class="fallback-subtitle">
            O módulo de validação não pôde ser carregado. Usando interface de backup.
          </p>
        </div>

        <div class="validation-form">
          <form [formGroup]="validationForm" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="username">👤 Usuário com Alçada</label>
              <input 
                type="text" 
                id="username"
                formControlName="username"
                placeholder="Digite o usuário autorizado"
                class="form-control"
              >
              <div class="error-message" *ngIf="validationForm.get('username')?.invalid && validationForm.get('username')?.touched">
                Usuário é obrigatório
              </div>
            </div>

            <div class="form-group">
              <label for="password">🔑 Senha</label>
              <input 
                type="password" 
                id="password"
                formControlName="password"
                placeholder="Digite a senha"
                class="form-control"
              >
              <div class="error-message" *ngIf="validationForm.get('password')?.invalid && validationForm.get('password')?.touched">
                Senha é obrigatória
              </div>
            </div>

            <div class="form-group">
              <label for="justification">📝 Justificativa</label>
              <textarea 
                id="justification"
                formControlName="justification"
                placeholder="Justifique a necessidade desta operação..."
                class="form-control textarea"
                rows="3"
              ></textarea>
              <div class="error-message" *ngIf="validationForm.get('justification')?.invalid && validationForm.get('justification')?.touched">
                Justificativa é obrigatória (mínimo 10 caracteres)
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="onReject()">
                ❌ Rejeitar
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="validationForm.invalid || isProcessing">
                <span *ngIf="isProcessing">⏳</span>
                <span *ngIf="!isProcessing">✅</span>
                {{ isProcessing ? 'Processando...' : 'Aprovar' }}
              </button>
            </div>
          </form>
        </div>

        <div class="fallback-footer">
          <p class="warning-text">
            ⚠️ Esta é uma interface de backup. Para funcionalidade completa, 
            <button class="link-button" (click)="reload()">recarregue a página</button>.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fallback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 500px;
      padding: 20px;
      background-color: rgba(0, 0, 0, 0.1);
    }

    .fallback-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      max-width: 500px;
      width: 100%;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    .fallback-header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 1.5rem;
      text-align: center;
    }

    .fallback-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .fallback-header h2 {
      margin: 0 0 8px 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .fallback-subtitle {
      margin: 0;
      opacity: 0.9;
      font-size: 0.875rem;
    }

    .validation-form {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #374151;
      font-size: 0.875rem;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      font-size: 0.875rem;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .textarea {
      resize: vertical;
      min-height: 80px;
    }

    .error-message {
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #10b981;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #059669;
    }

    .btn-secondary {
      background: #ef4444;
      color: white;
    }

    .btn-secondary:hover {
      background: #dc2626;
    }

    .fallback-footer {
      background: #f8fafc;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }

    .warning-text {
      margin: 0;
      font-size: 0.75rem;
      color: #6b7280;
    }

    .link-button {
      background: none;
      border: none;
      color: #3b82f6;
      cursor: pointer;
      text-decoration: underline;
      font-size: inherit;
    }

    .link-button:hover {
      color: #1d4ed8;
    }
  `]
})
export class DefaultAlcadaComponent {
  validationForm: FormGroup;
  isProcessing = false;

  constructor(private fb: FormBuilder) {
    this.validationForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      justification: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onSubmit(): void {
    if (this.validationForm.valid) {
      this.isProcessing = true;
      
      console.log('[DefaultAlcadaComponent] Aprovação via fallback:', {
        username: this.validationForm.value.username,
        justification: this.validationForm.value.justification
      });

      // Simular processamento
      setTimeout(() => {
        this.sendValidationResponse(true, {
          validatedBy: { 
            name: this.validationForm.value.username, 
            role: 'manager',
            id: 'fallback-user-' + Date.now()
          },
          reason: 'Aprovado via validação de alçada (fallback)',
          justification: this.validationForm.value.justification
        });
        this.isProcessing = false;
      }, 1500);
    } else {
      // Marcar todos os campos como touched para mostrar erros
      Object.keys(this.validationForm.controls).forEach(key => {
        this.validationForm.get(key)?.markAsTouched();
      });
    }
  }

  onReject(): void {
    console.log('[DefaultAlcadaComponent] Rejeição via fallback');
    
    this.sendValidationResponse(false, {
      reason: 'Operação rejeitada na validação de alçada (fallback)',
      justification: this.validationForm.value.justification || 'Operação rejeitada'
    });
  }

  private sendValidationResponse(validated: boolean, data: any): void {
    console.log('[DefaultAlcadaComponent] Enviando resposta de validação:', { validated, data });
    
    // Disparar evento para o ValidationOrchestratorService
    const responseEvent = new CustomEvent('mfe-validation-response', {
      detail: {
        context: {
          action: 'validation_response',
          validationId: 'fallback-' + Date.now(),
          validated: validated,
          validatedBy: data.validatedBy,
          reason: data.reason,
          justification: data.justification,
          timestamp: new Date().toISOString(),
          source: 'fallback-component'
        }
      },
      bubbles: true
    });
    
    window.dispatchEvent(responseEvent);
  }

  reload(): void {
    console.log('[DefaultAlcadaComponent] Recarregando página para tentar Native Federation novamente');
    window.location.reload();
  }
}