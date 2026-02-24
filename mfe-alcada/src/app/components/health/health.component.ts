import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="health-status">
      <h2>🟢 MFE Alçada - Status: Operacional</h2>
      <div class="health-details">
        <p><strong>Serviço:</strong> Validação de Alçada</p>
        <p><strong>Versão:</strong> 1.0.0</p>
        <p><strong>Status:</strong> Ativo</p>
        <p><strong>Última verificação:</strong> {{ currentTime }}</p>
        <p><strong>Native Federation:</strong> ✅ Disponível</p>
        <p><strong>Componentes expostos:</strong></p>
        <ul>
          <li>./Component (AppComponent)</li>
          <li>./ValidationModal (ValidationModalComponent)</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .health-status {
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    
    .health-details {
      margin-top: 15px;
      padding: 15px;
      background-color: #f0f8ff;
      border-radius: 5px;
      border-left: 4px solid #28a745;
    }
    
    .health-details p {
      margin: 8px 0;
    }
    
    .health-details ul {
      margin: 8px 0;
      padding-left: 20px;
    }
    
    h2 {
      color: #28a745;
      margin: 0;
    }
  `]
})
export class HealthComponent {
  currentTime = new Date().toLocaleString('pt-BR');
}