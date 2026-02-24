import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HealthService } from '../../services/health.service';

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule],
  template: `{{ healthStatus | json }}`
})
export class HealthComponent {
  healthStatus = this.healthService.getHealthStatus();
  
  constructor(private healthService: HealthService) {}
}