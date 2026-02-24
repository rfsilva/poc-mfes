import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ResourceLabelService {

  private resourceLabels: Record<string, string> = {
    'product': 'Produto',
    'user': 'Usuário',
    'order': 'Pedido',
    'payment': 'Pagamento',
    'inventory': 'Estoque',
    'customer': 'Cliente',
    'supplier': 'Fornecedor'
  };

  private fieldLabels: Record<string, Record<string, string>> = {
    'product': {
      'id': 'ID',
      'name': 'Nome',
      'sku': 'SKU',
      'category': 'Categoria',
      'price': 'Preço',
      'stock': 'Estoque',
      'supplier': 'Fornecedor',
      'createdAt': 'Criado em',
      'updatedAt': 'Atualizado em',
      'description': 'Descrição',
      'status': 'Status'
    },
    'user': {
      'id': 'ID',
      'name': 'Nome',
      'email': 'E-mail',
      'role': 'Função',
      'department': 'Departamento',
      'lastLogin': 'Último Login',
      'createdAt': 'Criado em',
      'activeProjects': 'Projetos Ativos',
      'status': 'Status'
    },
    'order': {
      'id': 'ID',
      'number': 'Número',
      'customer': 'Cliente',
      'total': 'Total',
      'status': 'Status',
      'items': 'Itens',
      'paymentMethod': 'Método de Pagamento',
      'createdAt': 'Criado em',
      'deliveryDate': 'Data de Entrega'
    },
    'payment': {
      'id': 'ID',
      'amount': 'Valor',
      'method': 'Método',
      'status': 'Status',
      'transactionId': 'ID da Transação',
      'createdAt': 'Criado em',
      'processedAt': 'Processado em'
    }
  };

  constructor() { }

  /**
   * Obter label do tipo de recurso
   */
  getLabel(resource: string): string {
    return this.resourceLabels[resource] || resource;
  }

  /**
   * Obter label de um campo específico do recurso
   */
  getFieldLabel(resource: string, field: string): string {
    const resourceFields = this.fieldLabels[resource];
    if (!resourceFields) {
      return this.formatFieldName(field);
    }
    
    return resourceFields[field] || this.formatFieldName(field);
  }

  /**
   * Formatar nome do campo quando não há label específico
   */
  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Obter todos os labels de um recurso
   */
  getResourceFieldLabels(resource: string): Record<string, string> {
    return this.fieldLabels[resource] || {};
  }
}