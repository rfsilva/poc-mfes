import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class JwtMockService {
  private readonly SECRET_KEY = 'mock-secret-key-for-development';

  constructor() {}

  /**
   * Decodifica um token JWT mock
   * @param token Token JWT
   * @returns Payload decodificado ou null se inválido
   */
  decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Token JWT inválido: formato incorreto');
        return null;
      }

      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      
      // Verificar se o token não expirou
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        console.warn('Token expirado');
        return null;
      }

      console.log('Token decodificado com sucesso:', payload);
      return payload;
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      return null;
    }
  }

  /**
   * Valida um token JWT mock
   * @param token Token JWT
   * @returns true se válido, false caso contrário
   */
  validateToken(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Token inválido: formato incorreto');
        return false;
      }

      // Verificar assinatura mock
      const expectedSignature = this.createMockSignature(parts[0] + '.' + parts[1]);
      if (parts[2] !== expectedSignature) {
        console.error('Token inválido: assinatura incorreta');
        return false;
      }

      // Verificar payload
      const payload = this.decodeToken(token);
      const isValid = payload !== null;
      
      console.log('Validação do token:', isValid ? 'SUCESSO' : 'FALHA');
      return isValid;
    } catch (error) {
      console.error('Erro na validação do token:', error);
      return false;
    }
  }

  /**
   * Verifica se o token possui um scope específico
   * @param token Token JWT
   * @param requiredScope Scope necessário
   * @returns true se possui o scope, false caso contrário
   */
  hasScope(token: string, requiredScope: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.scopes) {
      console.warn('Token não possui scopes ou é inválido');
      return false;
    }

    const hasScope = payload.scopes.includes(requiredScope);
    console.log(`Verificação de scope '${requiredScope}':`, hasScope ? 'AUTORIZADO' : 'NEGADO');
    console.log('Scopes disponíveis:', payload.scopes);
    
    return hasScope;
  }

  /**
   * Extrai informações do usuário do token
   * @param token Token JWT
   * @returns Informações do usuário ou null se inválido
   */
  getUserInfo(token: string): any {
    const payload = this.decodeToken(token);
    if (!payload) {
      return null;
    }

    return {
      id: payload.sub,
      username: payload.username || payload.preferred_username,
      name: payload.name,
      email: payload.email,
      permissions: payload.permissions || [],
      scopes: payload.scopes || []
    };
  }

  private base64UrlDecode(str: string): string {
    // Adicionar padding se necessário
    str += '='.repeat((4 - str.length % 4) % 4);
    
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  }

  private createMockSignature(data: string): string {
    // Para um mock, vamos criar uma assinatura simples baseada no hash do conteúdo
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return this.base64UrlEncode(Math.abs(hash).toString(16));
  }

  private base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}