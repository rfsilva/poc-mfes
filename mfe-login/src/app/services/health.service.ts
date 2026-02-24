import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  getHealthStatus(): { status: string; timestamp: string; version: string; mfe: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.2.0',
      mfe: 'mfe-login'
    };
  }

  isHealthy(): boolean {
    return true;
  }
}