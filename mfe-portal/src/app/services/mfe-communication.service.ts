import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MfeInputData, MfeOutputData } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class MfeCommunicationService {
  private mfeDataSubject = new BehaviorSubject<MfeOutputData>({});
  public mfeData$ = this.mfeDataSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {}

  // Método para enviar dados para um MFE usando o padrão correto
  sendDataToMfe(mfeName: string, data: MfeInputData): void {
    console.log(`[Portal] Enviando dados para ${mfeName}:`, data);
    
    const event = new CustomEvent(`mfe-${mfeName}-input`, {
      detail: data
    });
    window.dispatchEvent(event);
  }

  // Método para receber dados de um MFE usando o padrão correto
  receiveDataFromMfe(mfeName: string): Observable<MfeOutputData> {
    return new Observable(observer => {
      const handler = (event: any) => {
        console.log(`[Portal] Dados recebidos de ${mfeName}:`, event.detail);
        observer.next(event.detail);
      };
      
      window.addEventListener(`mfe-${mfeName}-output`, handler);
      
      return () => {
        window.removeEventListener(`mfe-${mfeName}-output`, handler);
      };
    });
  }

  // Método para emitir dados de um MFE (usado pelos MFEs filhos)
  emitDataFromMfe(mfeName: string, data: MfeOutputData): void {
    const event = new CustomEvent(`mfe-${mfeName}-output`, {
      detail: data
    });
    window.dispatchEvent(event);
  }

  // Gerenciamento de usuário autenticado
  setCurrentUser(user: any): void {
    this.currentUserSubject.next(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  getCurrentUser(): any {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  clearCurrentUser(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  // Gerenciamento de token JWT
  setCurrentToken(token: string): void {
    localStorage.setItem('currentToken', token);
  }

  getCurrentToken(): string | null {
    return localStorage.getItem('currentToken');
  }

  clearCurrentToken(): void {
    localStorage.removeItem('currentToken');
  }
}