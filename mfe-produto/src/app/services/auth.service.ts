import { Injectable } from '@angular/core';
import { JwtMockService } from './jwt-mock.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly REQUIRED_SCOPE = 'sc_produto';
  private currentToken: string | null = null;
  private currentUser: any = null;

  constructor(private jwtMockService: JwtMockService) {
    // Escutar atualizações globais de token
    this.setupGlobalTokenListener();
  }

  /**
   * Configura listener para atualizações globais de token
   */
  private setupGlobalTokenListener(): void {
    window.addEventListener('token-updated', (event: any) => {
      console.log('=== MFE-PRODUTO: TOKEN ATUALIZADO GLOBALMENTE ===');
      console.log('Novo token recebido:', event.detail);
      
      const tokenData = event.detail;
      if (tokenData.token) {
        this.handleTokenUpdate(tokenData.token, tokenData.user);
      }
    });
  }

  /**
   * Processa atualização de token
   * @param newToken Novo token JWT
   * @param newUser Dados atualizados do usuário
   */
  private handleTokenUpdate(newToken: string, newUser: any): void {
    console.log('Processando atualização de token no MFE-Produto...');
    
    // Validar novo token
    if (this.validateAndAuthorize(newToken)) {
      console.log('Token atualizado com sucesso no MFE-Produto');
      
      // Emitir evento interno se necessário
      const updateEvent = new CustomEvent('mfe-produto-token-updated', {
        detail: {
          token: newToken,
          user: newUser,
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(updateEvent);
    } else {
      console.error('Falha ao validar token atualizado no MFE-Produto');
      this.clearSession();
    }
  }

  /**
   * Valida o token recebido do portal
   * @param token Token JWT
   * @returns true se válido e autorizado, false caso contrário
   */
  validateAndAuthorize(token: string): boolean {
    console.log('=== VALIDAÇÃO DE TOKEN NO MFE-PRODUTO ===');
    console.log('Token recebido:', token);

    // Validar estrutura e assinatura do token
    if (!this.jwtMockService.validateToken(token)) {
      console.error('Token inválido ou malformado');
      return false;
    }

    // Verificar se possui o scope necessário
    if (!this.jwtMockService.hasScope(token, this.REQUIRED_SCOPE)) {
      console.error(`Acesso negado: scope '${this.REQUIRED_SCOPE}' necessário`);
      return false;
    }

    // Extrair informações do usuário
    const userInfo = this.jwtMockService.getUserInfo(token);
    if (!userInfo) {
      console.error('Não foi possível extrair informações do usuário do token');
      return false;
    }

    // Armazenar token e usuário válidos
    this.currentToken = token;
    this.currentUser = userInfo;

    console.log('=== AUTORIZAÇÃO CONCEDIDA ===');
    console.log('Usuário autorizado:', userInfo);
    console.log('Scopes disponíveis:', userInfo.scopes);
    
    return true;
  }

  /**
   * Atualiza o token atual (usado quando recebe atualização do portal)
   * @param token Novo token JWT
   * @returns true se atualização foi bem-sucedida
   */
  updateToken(token: string): boolean {
    console.log('=== ATUALIZANDO TOKEN NO MFE-PRODUTO ===');
    
    if (token === this.currentToken) {
      console.log('Token é o mesmo, nenhuma atualização necessária');
      return true;
    }
    
    return this.validateAndAuthorize(token);
  }

  /**
   * Verifica se o usuário atual está autenticado e autorizado
   * @returns true se autenticado e autorizado
   */
  isAuthenticated(): boolean {
    return this.currentToken !== null && this.currentUser !== null;
  }

  /**
   * Obtém o usuário atual
   * @returns Informações do usuário ou null
   */
  getCurrentUser(): any {
    return this.currentUser;
  }

  /**
   * Obtém o token atual
   * @returns Token JWT ou null
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Verifica se o usuário possui uma permissão específica
   * @param permission Permissão necessária
   * @returns true se possui a permissão
   */
  hasPermission(permission: string): boolean {
    if (!this.currentUser || !this.currentUser.permissions) {
      return false;
    }
    return this.currentUser.permissions.includes(permission);
  }

  /**
   * Verifica se o usuário possui um scope específico
   * @param scope Scope necessário
   * @returns true se possui o scope
   */
  hasScope(scope: string): boolean {
    if (!this.currentToken) {
      return false;
    }
    return this.jwtMockService.hasScope(this.currentToken, scope);
  }

  /**
   * Verifica se o token atual ainda é válido (não expirou)
   * @returns true se válido, false se expirado
   */
  isTokenValid(): boolean {
    if (!this.currentToken) {
      return false;
    }
    
    const payload = this.jwtMockService.decodeToken(this.currentToken);
    if (!payload) {
      return false;
    }
    
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  }

  /**
   * Obtém informações sobre a expiração do token
   * @returns Objeto com informações de expiração
   */
  getTokenExpirationInfo(): any {
    if (!this.currentToken) {
      return null;
    }
    
    const payload = this.jwtMockService.decodeToken(this.currentToken);
    if (!payload) {
      return null;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = payload.exp - now;
    
    return {
      expiresAt: payload.exp,
      expiresIn: expiresIn,
      isValid: expiresIn > 0,
      expiresInMinutes: Math.floor(expiresIn / 60),
      expiresInHours: Math.floor(expiresIn / 3600)
    };
  }

  /**
   * Limpa a sessão atual
   */
  clearSession(): void {
    console.log('Limpando sessão do MFE-Produto');
    this.currentToken = null;
    this.currentUser = null;
  }

  /**
   * Obtém informações de debug sobre a autenticação
   * @returns Objeto com informações de debug
   */
  getDebugInfo(): any {
    const expirationInfo = this.getTokenExpirationInfo();
    
    return {
      isAuthenticated: this.isAuthenticated(),
      hasRequiredScope: this.hasScope(this.REQUIRED_SCOPE),
      user: this.currentUser,
      tokenPresent: !!this.currentToken,
      tokenValid: this.isTokenValid(),
      requiredScope: this.REQUIRED_SCOPE,
      expirationInfo: expirationInfo
    };
  }
}