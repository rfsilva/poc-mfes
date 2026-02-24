import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-default-product',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fallback-container">
      <div class="fallback-content">
        <div class="fallback-icon">📦</div>
        <h2>Módulo de Produtos Indisponível</h2>
        <p>O módulo de produtos não pôde ser carregado. Tente novamente em alguns instantes.</p>
        <button class="retry-button" (click)="reload()">Recarregar Página</button>
      </div>
    </div>
  `,
  styles: [`
    .fallback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
      padding: 20px;
    }

    .fallback-content {
      text-align: center;
      max-width: 400px;
      padding: 30px;
      border: 2px dashed #ddd;
      border-radius: 8px;
      background-color: #f9f9f9;
    }

    .fallback-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    h2 {
      color: #666;
      margin-bottom: 12px;
    }

    p {
      color: #888;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    .retry-button {
      background-color: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .retry-button:hover {
      background-color: #0056b3;
    }
  `]
})
export class DefaultProductComponent {
  reload(): void {
    window.location.reload();
  }
}