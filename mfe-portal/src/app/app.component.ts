import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MfeCommunicationService } from './services/mfe-communication.service';
import { MfeLoaderComponent } from './components/mfe-loader/mfe-loader.component';
import { AuthResponse, MfeInputData } from './models/auth.model';
import { JwtMockService } from './services/jwt-mock.service';
import { TokenManagerService, TokenStatus } from './services/token-manager.service';
import { ValidationOrchestratorService } from './services/validation-orchestrator.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MfeLoaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'mfe-portal';
  isAuthenticated = false;
  currentUser: any = null;
  currentToken: string | null = null;
  selectedProduct: string | null = null;
  tokenStatus: TokenStatus | null = null;
  showValidation = false;
  
  private subscriptions: Subscription[] = [];

  // Dados de entrada para os MFEs
  loginInputData: MfeInputData = {
    title: 'Login do Portal',
    allowRememberMe: true
  };

  menuInputData: MfeInputData = {};
  productInputData: MfeInputData = {};

  constructor(
    private mfeCommunicationService: MfeCommunicationService,
    private jwtMockService: JwtMockService,
    private tokenManagerService: TokenManagerService,
    private validationOrchestrator: ValidationOrchestratorService
  ) {}

  ngOnInit(): void {
    console.log('Portal inicializando...');
    
    // Verificar se já existe usuário autenticado
    this.currentUser = this.mfeCommunicationService.getCurrentUser();
    this.currentToken = this.mfeCommunicationService.getCurrentToken();
    this.isAuthenticated = this.mfeCommunicationService.isAuthenticated();
    
    console.log('Estado inicial - Autenticado:', this.isAuthenticated, 'Usuário:', this.currentUser);

    // Se já há um token válido, iniciar gerenciamento
    if (this.currentToken && this.currentUser) {
      this.tokenManagerService.startManaging(this.currentToken, this.currentUser);
    }

    // Configurar dados do menu baseado no usuário
    if (this.currentUser) {
      this.menuInputData = {
        user: this.currentUser,
        permissions: this.currentUser.permissions || [],
        scopes: this.currentUser.scopes || []
      };
    }

    // Escutar mudanças no usuário atual
    const userSub = this.mfeCommunicationService.currentUser$.subscribe(user => {
      console.log('Mudança de usuário detectada:', user);
      this.currentUser = user;
      this.currentToken = this.mfeCommunicationService.getCurrentToken();
      this.isAuthenticated = !!user;
      
      if (user) {
        this.menuInputData = {
          user: user,
          permissions: user.permissions || [],
          scopes: user.scopes || []
        };
      }
    });
    this.subscriptions.push(userSub);

    // Escutar status do token
    const tokenStatusSub = this.tokenManagerService.tokenStatus$.subscribe(status => {
      console.log('Status do token atualizado:', status);
      this.tokenStatus = status;
      
      if (status && status.user) {
        // Atualizar dados do usuário se necessário
        this.updateUserFromTokenStatus(status);
      }
    });
    this.subscriptions.push(tokenStatusSub);

    // Escutar status de validação
    const validationSub = this.validationOrchestrator.showValidation$.subscribe(show => {
      this.showValidation = show;
    });
    this.subscriptions.push(validationSub);

    // Escutar eventos globais de token
    this.setupGlobalTokenListeners();

    // Escutar dados do MFE de login
    console.log('Configurando listener para mfe-login...');
    const loginSub = this.mfeCommunicationService.receiveDataFromMfe('mfe-login').subscribe(
      (data: any) => {
        console.log('Portal recebeu dados do MFE login:', data);
        if (data.type === 'AUTH_SUCCESS') {
          console.log('Processando AUTH_SUCCESS...');
          this.handleLoginSuccess(data.payload);
        } else if (data.type === 'AUTH_ERROR') {
          console.log('Processando AUTH_ERROR...');
          this.handleLoginError(data.payload);
        }
      }
    );
    this.subscriptions.push(loginSub);

    // Escutar dados do MFE de menu
    console.log('Configurando listener para mfe-menu...');
    const menuSub = this.mfeCommunicationService.receiveDataFromMfe('mfe-menu').subscribe(
      (data: any) => {
        console.log('Portal recebeu dados do MFE menu:', data);
        if (data.type === 'MENU_ITEM_SELECTED') {
          console.log('Processando MENU_ITEM_SELECTED...');
          this.handleMenuSelection(data.payload);
        } else if (data.type === 'MENU_FAKE_ACTION') {
          console.log('Processando MENU_FAKE_ACTION...');
          this.handleFakeAction(data.payload);
        }
      }
    );
    this.subscriptions.push(menuSub);

    // Escutar dados do MFE de produto
    const productSub = this.mfeCommunicationService.receiveDataFromMfe('mfe-produto').subscribe(
      (data: any) => {
        console.log('Portal recebeu dados do MFE produto:', data);
        if (data.type === 'PRODUCT_ACTION') {
          this.handleProductAction(data.payload);
        }
      }
    );
    this.subscriptions.push(productSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.tokenManagerService.stopManaging();
  }

  private setupGlobalTokenListeners(): void {
    // Escutar atualizações de token
    window.addEventListener('token-updated', (event: any) => {
      console.log('Token atualizado globalmente:', event.detail);
      this.handleTokenUpdate(event.detail);
    });

    // Escutar erros de token
    window.addEventListener('token-error', (event: any) => {
      console.error('Erro de token detectado:', event.detail);
      this.handleTokenError(event.detail);
    });
  }

  private handleTokenUpdate(tokenData: any): void {
    console.log('=== PROCESSANDO ATUALIZAÇÃO DE TOKEN ===');
    
    this.currentToken = tokenData.token;
    this.currentUser = tokenData.user;
    
    // Atualizar armazenamento
    this.mfeCommunicationService.setCurrentToken(tokenData.token);
    this.mfeCommunicationService.setCurrentUser(tokenData.user);
    
    // Atualizar dados do menu
    this.menuInputData = {
      user: tokenData.user,
      permissions: tokenData.user.permissions || [],
      scopes: tokenData.user.scopes || []
    };
    
    // Atualizar MFE produto se estiver ativo
    if (this.selectedProduct === 'produto') {
      this.productInputData = {
        ...this.productInputData,
        token: tokenData.token,
        user: tokenData.user
      };
      
      console.log('MFE produto atualizado com novo token');
    }
    
    console.log('Atualização de token processada com sucesso');
  }

  private handleTokenError(errorData: any): void {
    console.error('=== ERRO DE TOKEN DETECTADO ===');
    console.error('Erro:', errorData.error);
    
    // Forçar logout
    this.logout();
    
    // Aqui você pode mostrar uma mensagem para o usuário
    // Por exemplo: this.showNotification('Sessão expirada. Faça login novamente.');
  }

  private updateUserFromTokenStatus(status: TokenStatus): void {
    if (status.user && JSON.stringify(status.user) !== JSON.stringify(this.currentUser)) {
      console.log('Atualizando dados do usuário a partir do token');
      this.currentUser = status.user;
      this.mfeCommunicationService.setCurrentUser(status.user);
    }
  }

  private handleLoginSuccess(authResponse: AuthResponse): void {
    console.log('handleLoginSuccess chamado com:', authResponse);
    
    if (authResponse.success && authResponse.user && authResponse.token) {
      console.log('Definindo usuário atual:', authResponse.user);
      
      // Armazenar token e usuário
      this.mfeCommunicationService.setCurrentUser(authResponse.user);
      this.mfeCommunicationService.setCurrentToken(authResponse.token);
      
      // Iniciar gerenciamento do token
      this.tokenManagerService.startManaging(authResponse.token, authResponse.user);
      
      // Forçar atualização do estado
      this.currentUser = authResponse.user;
      this.currentToken = authResponse.token;
      this.isAuthenticated = true;
      
      // Configurar dados do menu
      this.menuInputData = {
        user: authResponse.user,
        permissions: authResponse.user.permissions || [],
        scopes: authResponse.user.scopes || []
      };
      
      console.log('Login processado com sucesso. Estado atual:', {
        isAuthenticated: this.isAuthenticated,
        currentUser: this.currentUser,
        menuInputData: this.menuInputData,
        token: this.currentToken
      });
    } else {
      console.error('Resposta de login inválida:', authResponse);
    }
  }

  private handleLoginError(error: any): void {
    console.error('Erro no login:', error);
    // Aqui você pode mostrar uma mensagem de erro para o usuário
  }

  private handleMenuSelection(menuItem: any): void {
    console.log('Item do menu selecionado no Portal:', menuItem);
    
    // Verificar se é um item que deve carregar um MFE
    if (menuItem.mfeName === 'mfe-produto') {
      // Verificar se o usuário tem o scope necessário para acessar produtos
      if (this.hasRequiredScope('sc_produto')) {
        console.log('Usuário tem permissão para acessar produtos. Carregando MFE...');
        this.selectedProduct = 'produto';
        this.productInputData = {
          user: this.currentUser,
          token: this.currentToken || undefined,
          productId: menuItem.productId || 'default',
          permissions: this.currentUser?.permissions || [],
          scopes: this.currentUser?.scopes || [],
          params: menuItem.params || {}
        };
        console.log('Dados do produto configurados:', this.productInputData);
      } else {
        console.warn('Usuário não tem permissão para acessar produtos (scope sc_produto necessário)');
        this.selectedProduct = null;
      }
    } else if (menuItem.id === 'produto') {
      // Compatibilidade com versão anterior
      if (this.hasRequiredScope('sc_produto')) {
        console.log('Carregando produto (compatibilidade)...');
        this.selectedProduct = 'produto';
        this.productInputData = {
          user: this.currentUser,
          token: this.currentToken || undefined,
          productId: menuItem.productId || 'default',
          permissions: this.currentUser?.permissions || [],
          scopes: this.currentUser?.scopes || []
        };
      } else {
        console.warn('Usuário não tem permissão para acessar produtos');
        this.selectedProduct = null;
      }
    } else {
      console.log('Item de menu não é um MFE:', menuItem);
      this.selectedProduct = null;
    }
  }

  private hasRequiredScope(requiredScope: string): boolean {
    if (!this.currentToken) {
      return false;
    }

    return this.jwtMockService.hasScope(this.currentToken, requiredScope);
  }

  private handleFakeAction(action: any): void {
    console.log('Ação fake recebida:', action);
    // Aqui você pode mostrar uma notificação ou modal
  }

  private handleProductAction(action: any): void {
    console.log('Ação do produto:', action);
    // Aqui você pode lidar com ações específicas do produto
  }

  logout(): void {
    console.log('Fazendo logout...');
    
    // Parar gerenciamento do token
    this.tokenManagerService.stopManaging();
    
    // Limpar dados
    this.mfeCommunicationService.clearCurrentUser();
    this.mfeCommunicationService.clearCurrentToken();
    this.selectedProduct = null;
    this.isAuthenticated = false;
    this.currentUser = null;
    this.currentToken = null;
    this.tokenStatus = null;
  }

  // Método para forçar refresh (para debug/teste)
  forceTokenRefresh(): void {
    console.log('Forçando refresh do token...');
    this.tokenManagerService.forceRefresh();
  }

  // Métodos auxiliares para o template
  getTokenStatusText(): string {
    if (!this.tokenStatus) return '';
    
    if (!this.tokenStatus.isValid) {
      return 'Token expirado';
    }
    
    if (this.tokenStatus.needsRefresh) {
      return 'Renovando token...';
    }
    
    const minutes = Math.floor(this.tokenStatus.expiresIn / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `Expira em ${hours}h ${minutes % 60}m`;
    } else {
      return `Expira em ${minutes}m`;
    }
  }

  getTokenExpirationText(): string {
    if (!this.tokenStatus) return 'N/A';
    
    const minutes = Math.floor(this.tokenStatus.expiresIn / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} dias, ${hours % 24} horas`;
    } else if (hours > 0) {
      return `${hours} horas, ${minutes % 60} minutos`;
    } else {
      return `${minutes} minutos`;
    }
  }

  // Método para obter informações de debug
  getTokenDebugInfo(): any {
    return {
      portal: {
        isAuthenticated: this.isAuthenticated,
        currentUser: this.currentUser,
        currentToken: !!this.currentToken,
        tokenStatus: this.tokenStatus
      },
      tokenManager: this.tokenManagerService.getDebugInfo()
    };
  }
}