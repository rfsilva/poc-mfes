import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-default-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fallback-container">
      <div class="fallback-content">
        <div class="fallback-icon">🍔</div>
        <h2>Menu Indisponível</h2>
        <p>O módulo de menu não pôde ser carregado. Usando navegação básica.</p>
        <div class="basic-menu">
          <a href="/" class="menu-item">🏠 Início</a>
          <a href="/produto" class="menu-item">📦 Produtos</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fallback-container {
      padding: 20px;
    }

    .fallback-content {
      text-align: center;
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
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

    .basic-menu {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .menu-item {
      display: block;
      padding: 10px 15px;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      transition: background-color 0.3s;
    }

    .menu-item:hover {
      background-color: #0056b3;
    }
  `]
})
export class DefaultMenuComponent {}