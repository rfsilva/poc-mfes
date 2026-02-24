import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MfeInputData, MfeOutputData } from '../interfaces/mfe-communication.interface';

@Injectable({
  providedIn: 'root'
})
export class MfeCommunicationService {
  private inputDataSubject = new BehaviorSubject<MfeInputData>({});
  public inputData$ = this.inputDataSubject.asObservable();

  private outputDataSubject = new BehaviorSubject<MfeOutputData | null>(null);
  public outputData$ = this.outputDataSubject.asObservable();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Escutar dados vindos do Portal usando o padrão correto
    window.addEventListener('mfe-alcada-input', (event: any) => {
      console.log('[MFE Alçada] Dados recebidos do Portal:', event.detail);
      this.inputDataSubject.next(event.detail);
    });

    // Escutar solicitações de dados do Portal
    window.addEventListener('mfe-alcada-request', (event: any) => {
      console.log('[MFE Alçada] Solicitação de dados do Portal:', event.detail);
      // Responder com dados atuais se necessário
      if (this.outputDataSubject.value) {
        this.sendDataToPortal(this.outputDataSubject.value);
      }
    });
  }

  /**
   * Enviar dados para o Portal usando o padrão correto
   */
  sendDataToPortal(data: MfeOutputData): void {
    console.log('[MFE Alçada] Enviando dados para Portal:', data);
    
    this.outputDataSubject.next(data);
    
    const event = new CustomEvent('mfe-alcada-output', {
      detail: data,
      bubbles: true
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Receber dados do Portal
   */
  receiveDataFromPortal(): Observable<MfeInputData> {
    return this.inputData$;
  }

  /**
   * Validar token recebido
   */
  validateToken(token?: string): boolean {
    if (!token) {
      console.warn('[MFE Alçada] Token não fornecido');
      return false;
    }

    try {
      // Validação básica do token JWT
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('[MFE Alçada] Token JWT inválido - formato incorreto');
        return false;
      }

      // Decodificar payload para verificar expiração
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < now) {
        console.warn('[MFE Alçada] Token JWT expirado');
        return false;
      }

      console.log('[MFE Alçada] Token validado com sucesso');
      return true;
    } catch (error) {
      console.error('[MFE Alçada] Erro ao validar token:', error);
      return false;
    }
  }

  /**
   * Extrair dados do usuário do token
   */
  getUserFromToken(token?: string): any {
    if (!token || !this.validateToken(token)) {
      return null;
    }

    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      return {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        level: payload.level
      };
    } catch (error) {
      console.error('[MFE Alçada] Erro ao extrair usuário do token:', error);
      return null;
    }
  }
}