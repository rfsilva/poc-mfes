export interface ValidationRequest {
  id: string;
  requestingMfe: string;
  operation: {
    type: string;           // 'delete', 'update', 'approve', 'transfer'
    resource: string;       // 'product', 'user', 'order', 'payment'
    resourceId: string;     // ID específico do recurso
    description: string;    // Descrição amigável da operação
  };
  requiredLevel: 'manager' | 'admin' | 'supervisor' | 'director';
  context: ValidationContext;
  metadata: {
    timestamp: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    expiresAt?: string;
  };
}

export interface ValidationContext {
  // Dados genéricos do recurso
  resourceName: string;
  resourceDetails: Record<string, any>;
  
  // Dados do solicitante
  requestedBy: {
    id: string;
    name: string;
    role: string;
    department?: string;
  };
  
  // Contexto da operação
  reason?: string;
  impact?: 'low' | 'medium' | 'high';
  reversible: boolean;
  
  // Dados específicos por domínio (flexível)
  domainData?: Record<string, any>;
}

export interface ValidationResponse {
  validationId: string;
  validated: boolean;
  validatedBy?: {
    id: string;
    name: string;
    role: string;
  };
  justification?: string;
  reason?: string;
  timestamp: string;
}

export interface ValidationRule {
  resource: string;
  operation: string;
  requiredLevel: 'manager' | 'admin' | 'supervisor' | 'director';
  timeoutMinutes: number;
  autoApprove: boolean;
  description: string;
}