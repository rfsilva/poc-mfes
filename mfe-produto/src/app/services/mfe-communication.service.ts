import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MfeInputData, MfeOutputData } from '../models/product.model';
import { IMfeCommunication } from '../interfaces/mfe-communication.interface';

@Injectable({
  providedIn: 'root'
})
export class MfeCommunicationService implements IMfeCommunication {
  private mfeName = 'mfe-produto'; // Corrigido para usar nome completo
  private inputDataSubject = new BehaviorSubject<MfeInputData>({});
  public inputData$ = this.inputDataSubject.asObservable();

  constructor() {
    this.setupInputListener();
  }

  // Escutar dados de entrada do portal
  private setupInputListener(): void {
    window.addEventListener(`mfe-${this.mfeName}-input`, (event: any) => {
      console.log(`MFE ${this.mfeName} recebeu dados:`, event.detail);
      this.inputDataSubject.next(event.detail);
    });
  }

  // Implementação da interface IMfeCommunication
  sendData(data: any): void {
    this.sendDataToPortal(data);
  }

  receiveData(): Observable<any> {
    return this.inputData$;
  }

  getVersion(): string {
    return '2.0.0';
  }

  getHealthStatus(): any {
    return {
      status: 'healthy',
      mfe: 'mfe-produto',
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

  // Obter dados de entrada atuais
  getCurrentInputData(): MfeInputData {
    return this.inputDataSubject.value;
  }
}