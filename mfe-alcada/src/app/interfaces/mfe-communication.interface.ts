export interface MfeInputData {
  user?: any;
  context?: {
    source?: string;
    validationId?: string;
    action?: string;
    [key: string]: any;
  };
  config?: {
    validation?: any;
    ui?: {
      mode?: string;
      theme?: string;
      showResourceDetails?: boolean;
      allowJustificationEdit?: boolean;
    };
    [key: string]: any;
  };
  token?: string;
  // 🆕 CORREÇÃO: Adicionar propriedades opcionais para flexibilidade
  validation?: any;
  payload?: {
    validation?: any;
    [key: string]: any;
  };
  // Permitir qualquer propriedade adicional
  [key: string]: any;
}

export interface MfeOutputData {
  type: string;
  payload: {
    action: string;
    data: any;
    status: 'success' | 'error' | 'pending';
  };
}