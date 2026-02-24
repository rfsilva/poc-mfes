import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class JwtMockService {
  private readonly SECRET_KEY = 'mock-secret-key-for-development';

  constructor() {}

  /**
   * Gera um token JWT mock com estrutura válida
   * @param payload Dados do usuário e scopes
   * @returns Token JWT válido
   */
  generateToken(payload: any): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + (8 * 60 * 60), // 8 horas
      iss: 'mfe-portal-mock',
      aud: 'mfe-portal'
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(tokenPayload));
    
    // Para um mock, vamos usar uma assinatura simples
    const signature = this.createMockSignature(encodedHeader + '.' + encodedPayload);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Decodifica um token JWT mock
   * @param token Token JWT
   * @returns Payload decodificado ou null se inválido
   */
  decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      
      // Verificar se o token não expirou
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        console.warn('Token expirado');
        return null;
      }

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
        return false;
      }

      // Verificar assinatura mock
      const expectedSignature = this.createMockSignature(parts[0] + '.' + parts[1]);
      if (parts[2] !== expectedSignature) {
        return false;
      }

      // Verificar payload
      const payload = this.decodeToken(token);
      return payload !== null;
    } catch (error) {
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
      return false;
    }

    return payload.scopes.includes(requiredScope);
  }

  private base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
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
}