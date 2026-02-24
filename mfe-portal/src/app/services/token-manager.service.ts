import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { JwtMockService } from './jwt-mock.service';
import { MfeCommunicationService } from './mfe-communication.service';

export interface TokenStatus {
  isValid: boolean;
  expiresAt: number;
  expiresIn: number; // segundos até expirar
  needsRefresh: boolean;
  user: any;
}

@Injectable({
  providedIn: 'root'
})
export class TokenManagerService implements OnDestroy {
  private readonly REFRESH_THRESHOLD = 5 * 60; // 5 minutos antes da expiração
  private readonly CHECK_INTERVAL = 60 * 1000; // Verificar a cada 1 minuto
  
  private currentToken: string | null = null;
  private currentUser: any = null;
  private monitoringSubscription: Subscription | null = null;
  
  private tokenStatusSubject = new BehaviorSubject<TokenStatus | null>(null);
  public tokenStatus$ = this.tokenStatusSubject.asObservable();

  constructor(
    private jwtMockService: JwtMockService,
    private mfeCommunicationService: MfeCommunicationService
  ) {
    console.log('TokenManagerService inicializado');
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
  }

  /**
   * Inicia o gerenciamento de um token
   * @param token Token JWT
   * @param user Dados do usuário
   */
  startManaging(token: string, user: any): void {
    console.log('=== INICIANDO GERENCIAMENTO DE TOKEN ===');
    console.log('Token:', token);
    console.log('Usuário:', user);

    this.currentToken = token;
    this.currentUser = user;
    
    // Validar token inicial
    if (!this.jwtMockService.validateToken(token)) {
      console.error('Token inválido fornecido para gerenciamento');
      this.handleInvalidToken();
      return;
    }

    // Iniciar monitoramento
    this.startMonitoring();
    
    // Emitir status inicial
    this.updateTokenStatus();
    
    console.log('Gerenciamento de token iniciado com sucesso');
  }

  /**
   * Para o gerenciamento do token
   */
  stopManaging(): void {
    console.log('=== PARANDO GERENCIAMENTO DE TOKEN ===');
    
    this.stopMonitoring();
    this.currentToken = null;
    this.currentUser = null;
    this.tokenStatusSubject.next(null);
    
    console.log('Gerenciamento de token parado');
  }

  /**
   * Obtém o token atual
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Obtém o status atual do token
   */
  getCurrentTokenStatus(): TokenStatus | null {
    if (!this.currentToken) {
      return null;
    }

    return this.calculateTokenStatus(this.currentToken);
  }

  /**
   * Força um refresh do token
   */
  async forceRefresh(): Promise<boolean> {
    console.log('=== REFRESH FORÇADO DO TOKEN ===');
    
    if (!this.currentToken || !this.currentUser) {
      console.error('Não há token ou usuário para refresh');
      return false;
    }

    return await this.performRefresh();
  }

  /**
   * Inicia o monitoramento automático do token
   */
  private startMonitoring(): void {
    console.log('Iniciando monitoramento automático do token');
    
    this.stopMonitoring(); // Garantir que não há monitoramento duplicado
    
    this.monitoringSubscription = interval(this.CHECK_INTERVAL).subscribe(() => {
      this.checkTokenStatus();
    });
  }

  /**
   * Para o monitoramento automático
   */
  private stopMonitoring(): void {
    if (this.monitoringSubscription) {
      this.monitoringSubscription.unsubscribe();
      this.monitoringSubscription = null;
      console.log('Monitoramento automático parado');
    }
  }

  /**
   * Verifica o status do token e executa refresh se necessário
   */
  private checkTokenStatus(): void {
    if (!this.currentToken) {
      return;
    }

    const status = this.calculateTokenStatus(this.currentToken);
    
    console.log('Verificação de token:', {
      expiresIn: Math.floor(status.expiresIn / 60) + ' minutos',
      needsRefresh: status.needsRefresh,
      isValid: status.isValid
    });

    // Atualizar status
    this.tokenStatusSubject.next(status);

    // Executar refresh se necessário
    if (status.needsRefresh && status.isValid) {
      console.log('Token precisa ser renovado. Executando refresh...');
      this.performRefresh();
    } else if (!status.isValid) {
      console.error('Token expirado detectado');
      this.handleExpiredToken();
    }
  }

  /**
   * Calcula o status atual do token
   */
  private calculateTokenStatus(token: string): TokenStatus {
    const payload = this.jwtMockService.decodeToken(token);
    
    if (!payload) {
      return {
        isValid: false,
        expiresAt: 0,
        expiresIn: 0,
        needsRefresh: false,
        user: null
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = payload.exp;
    const expiresIn = expiresAt - now;
    const needsRefresh = expiresIn <= this.REFRESH_THRESHOLD && expiresIn > 0;

    return {
      isValid: expiresIn > 0,
      expiresAt: expiresAt,
      expiresIn: expiresIn,
      needsRefresh: needsRefresh,
      user: {
        id: payload.sub,
        username: payload.username,
        name: payload.name,
        email: payload.email,
        permissions: payload.permissions || [],
        scopes: payload.scopes || []
      }
    };
  }

  /**
   * Executa o refresh do token
   */
  private async performRefresh(): Promise<boolean> {
    console.log('=== EXECUTANDO REFRESH DO TOKEN ===');
    
    try {
      // Simular chamada de refresh (no futuro será Keycloak)
      const newToken = await this.simulateTokenRefresh();
      
      if (newToken) {
        console.log('Token renovado com sucesso');
        
        // Atualizar token atual
        this.currentToken = newToken;
        
        // Atualizar armazenamento
        this.mfeCommunicationService.setCurrentToken(newToken);
        
        // Distribuir para todos os MFEs
        this.distributeTokenToMfes(newToken);
        
        // Atualizar status
        this.updateTokenStatus();
        
        return true;
      } else {
        console.error('Falha ao renovar token');
        this.handleRefreshFailure();
        return false;
      }
    } catch (error) {
      console.error('Erro durante refresh do token:', error);
      this.handleRefreshFailure();
      return false;
    }
  }

  /**
   * Simula o refresh do token (mock para desenvolvimento)
   */
  private async simulateTokenRefresh(): Promise<string | null> {
    console.log('Simulando refresh do token...');
    
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!this.currentUser) {
      return null;
    }

    // Gerar novo token com mesmos dados do usuário
    const tokenPayload = {
      sub: this.currentUser.id,
      username: this.currentUser.username,
      name: this.currentUser.name,
      email: this.currentUser.email,
      permissions: this.currentUser.permissions,
      scopes: this.currentUser.scopes,
      preferred_username: this.currentUser.username
    };

    return this.jwtMockService.generateToken(tokenPayload);
  }

  /**
   * Distribui o token atualizado para todos os MFEs
   */
  private distributeTokenToMfes(newToken: string): void {
    console.log('=== DISTRIBUINDO TOKEN ATUALIZADO PARA MFEs ===');
    
    // Enviar evento global de token atualizado
    const tokenUpdateEvent = new CustomEvent('token-updated', {
      detail: {
        token: newToken,
        timestamp: new Date().toISOString(),
        user: this.currentUser
      }
    });
    
    window.dispatchEvent(tokenUpdateEvent);
    
    console.log('Token distribuído para todos os MFEs');
  }

  /**
   * Atualiza o status do token atual
   */
  private updateTokenStatus(): void {
    if (this.currentToken) {
      const status = this.calculateTokenStatus(this.currentToken);
      this.tokenStatusSubject.next(status);
    }
  }

  /**
   * Trata token inválido
   */
  private handleInvalidToken(): void {
    console.error('=== TOKEN INVÁLIDO DETECTADO ===');
    this.stopManaging();
    this.notifyTokenError('Token inválido');
  }

  /**
   * Trata token expirado
   */
  private handleExpiredToken(): void {
    console.error('=== TOKEN EXPIRADO DETECTADO ===');
    this.stopManaging();
    this.notifyTokenError('Token expirado');
  }

  /**
   * Trata falha no refresh
   */
  private handleRefreshFailure(): void {
    console.error('=== FALHA NO REFRESH DO TOKEN ===');
    this.stopManaging();
    this.notifyTokenError('Falha ao renovar token');
  }

  /**
   * Notifica erro de token para o sistema
   */
  private notifyTokenError(error: string): void {
    const errorEvent = new CustomEvent('token-error', {
      detail: {
        error: error,
        timestamp: new Date().toISOString()
      }
    });
    
    window.dispatchEvent(errorEvent);
    
    console.log('Erro de token notificado:', error);
  }

  /**
   * Obtém informações de debug
   */
  getDebugInfo(): any {
    const status = this.getCurrentTokenStatus();
    
    return {
      hasToken: !!this.currentToken,
      isMonitoring: !!this.monitoringSubscription,
      tokenStatus: status,
      refreshThreshold: this.REFRESH_THRESHOLD,
      checkInterval: this.CHECK_INTERVAL,
      currentUser: this.currentUser
    };
  }
}