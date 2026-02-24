import { Observable } from 'rxjs';

export interface IMfeCommunication {
  sendData(data: any): void;
  receiveData(): Observable<any>;
  getVersion(): string;
  getHealthStatus(): any;
}