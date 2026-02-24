import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ProductDashboardComponent } from './components/product-dashboard/product-dashboard.component';
import { MfeCommunicationService } from './services/mfe-communication.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ProductDashboardComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'mfe-produto';
  isAuthorized = false;
  authError: string | null = null;
  currentUser: any = null;
  debugInfo: any = null;
  tokenUpdateCount = 0;
  lastTokenUpdate: string | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private mfeCommunicationService: MfeCommunicationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('=== MFE-PRODUTO INICIALIZANDO ===');
    
    // Escutar atualizações internas de token
    this.setupTokenUpdateListener();
    
    // Escutar dados de entrada do portal
    const inputSub = this.mfeCommunicationService.inputData$.subscribe(data => {
      console.log('MFE-Produto recebeu dados do portal:', data);
      this.handleInputData(data);
    });
    this.subscriptions.push(inputSub);

    // Verificar dados iniciais
    const currentData = this.mfeCommunicationService.getCurrentInputData();
    if (currentData && Object.keys(currentData).length > 0) {
      console.log('Dados iniciais disponíveis:', currentData);
      this.handleInputData(currentData);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.authService.clearSession();
  }

  private setupTokenUpdateListener(): void {
    // Escutar atualizações de token específicas do MFE-Produto
    window.addEventListener('mfe-produto-token-updated', (event: any) => {
      console.log('=== TOKEN ATUALIZADO NO MFE-PRODUTO ===');
      console.log('Detalhes da atualização:', event.detail);
      
      this.tokenUpdateCount++;
      this.lastTokenUpdate = event.detail.timestamp;
      
      // Atualizar estado do componente
      this.currentUser = this.authService.getCurrentUser();
      this.isAuthorized = this.authService.isAuthenticated();
      this.authError = null;
      
      // Atualizar debug info
      this.debugInfo = this.authService.getDebugInfo();
      
      console.log('Estado atualizado após refresh do token:', {
        isAuthorized: this.isAuthorized,
        user: this.currentUser,
        updateCount: this.tokenUpdateCount
      });
    });
  }

  private handleInputData(data: any): void {
    console.log('=== PROCESSANDO DADOS DE ENTRADA ===');
    console.log('Dados recebidos:', data);

    // Resetar estado
    this.isAuthorized = false;
    this.authError = null;
    this.currentUser = null;

    // Verificar se o token foi fornecido
    if (!data.token) {
      this.authError = 'Token de autenticação não fornecido';
      console.error('ERRO: Token não fornecido pelo portal');
      return;
    }

    // Verificar se é uma atualização de token
    const currentToken = this.authService.getCurrentToken();
    if (currentToken && currentToken !== data.token) {
      console.log('=== DETECTADA ATUALIZAÇÃO DE TOKEN VIA INPUT DATA ===');
      console.log('Token anterior:', currentToken);
      console.log('Novo token:', data.token);
      
      // Usar método de atualização específico
      if (this.authService.updateToken(data.token)) {
        this.tokenUpdateCount++;
        this.lastTokenUpdate = new Date().toISOString();
        console.log('Token atualizado via input data com sucesso');
      }
    } else {
      // Validação inicial do token
      if (!this.authService.validateAndAuthorize(data.token)) {
        this.authError = 'Acesso negado: token inválido ou sem permissão para acessar produtos';
        console.error('=== ACESSO NEGADO ===');
        this.updateDebugInfo();
        return;
      }
    }

    // Se chegou até aqui, está autorizado
    this.isAuthorized = true;
    this.currentUser = this.authService.getCurrentUser();
    console.log('=== ACESSO AUTORIZADO ===');
    console.log('Usuário:', this.currentUser);
    
    // Enviar confirmação para o portal (opcional)
    this.mfeCommunicationService.sendDataToPortal({
      type: 'PRODUCT_READY',
      payload: {
        status: 'authorized',
        user: this.currentUser,
        tokenUpdateCount: this.tokenUpdateCount
      }
    });

    // Atualizar informações de debug
    this.updateDebugInfo();
  }

  private updateDebugInfo(): void {
    this.debugInfo = {
      ...this.authService.getDebugInfo(),
      tokenUpdateCount: this.tokenUpdateCount,
      lastTokenUpdate: this.lastTokenUpdate,
      componentState: {
        isAuthorized: this.isAuthorized,
        authError: this.authError,
        hasCurrentUser: !!this.currentUser
      }
    };
    console.log('Debug Info atualizado:', this.debugInfo);
  }

  getAuthStatusClass(): string {
    if (this.isAuthorized) {
      return 'auth-success';
    } else if (this.authError) {
      return 'auth-error';
    }
    return 'auth-pending';
  }

  getTokenUpdateInfo(): string {
    if (this.tokenUpdateCount === 0) {
      return 'Nenhuma atualização de token';
    }
    
    if (this.tokenUpdateCount === 1) {
      return `1 atualização de token`;
    }
    
    return `${this.tokenUpdateCount} atualizações de token`;
  }

  getLastUpdateTime(): string {
    if (!this.lastTokenUpdate) {
      return 'N/A';
    }
    
    const updateTime = new Date(this.lastTokenUpdate);
    return updateTime.toLocaleTimeString('pt-BR');
  }
}