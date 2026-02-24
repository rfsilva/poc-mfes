import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { MfeInputData, MfeOutputData } from '../models/auth.model';
import { IMfeCommunication } from '../interfaces/mfe-communication.interface';

@Injectable({
  providedIn: 'root'
})
export class MfeCommunicationService implements IMfeCommunication {
  private mfeName = 'mfe-login'; // Corrigido para usar nome completo
  private dataSubject = new Subject<any>();

  constructor() {
    this.setupInputListener();
  }

  // Escutar dados de entrada do portal
  private setupInputListener(): void {
    window.addEventListener(`mfe-${this.mfeName}-input`, (event: any) => {
      console.log(`MFE ${this.mfeName} recebeu dados:`, event.detail);
      this.dataSubject.next(event.detail);
    });
  }

  // Implementação da interface IMfeCommunication
  sendData(data: any): void {
    this.sendDataToPortal(data);
  }

  receiveData(): Observable<any> {
    return this.dataSubject.asObservable();
  }

  getVersion(): string {
    return '1.2.0';
  }

  getHealthStatus(): any {
    return {
      status: 'healthy',
      mfe: 'mfe-login',
      timestamp: new Date().toISOString(),
      version: this.getVersion()
    };
  }

  // Enviar dados para o portal
  sendDataToPortal(data: MfeOutputData): void {
    const event = new CustomEvent(`mfe-${this.mfeName}-output`, {
      detail: data
    });
    window.dispatchEvent(event);
    console.log(`MFE ${this.mfeName} enviou dados:`, data);
  }

  // Método legado para compatibilidade
  emitDataFromMfe(mfeName: string, data: MfeOutputData): void {
    this.sendDataToPortal(data);
  }
}