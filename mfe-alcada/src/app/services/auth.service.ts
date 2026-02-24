import { Injectable } from '@angular/core';
import { User, ValidationResult } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  // Mock de usuários com diferentes níveis de alçada
  private mockUsers: User[] = [
    {
      id: '1',
      name: 'João Silva',
      email: 'joao.silva@empresa.com',
      role: 'Supervisor',
      department: 'Vendas',
      level: 'supervisor'
    },
    {
      id: '2',
      name: 'Maria Santos',
      email: 'maria.santos@empresa.com',
      role: 'Gerente',
      department: 'Produtos',
      level: 'manager'
    },
    {
      id: '3',
      name: 'Carlos Admin',
      email: 'carlos.admin@empresa.com',
      role: 'Administrador',
      department: 'TI',
      level: 'admin'
    },
    {
      id: '4',
      name: 'Ana Diretora',
      email: 'ana.diretora@empresa.com',
      role: 'Diretora',
      department: 'Executivo',
      level: 'director'
    }
  ];

  constructor() { }

  /**
   * Validar credenciais e nível de alçada do usuário
   */
  async validateUserLevel(
    username: string, 
    password: string, 
    requiredLevel: string
  ): Promise<ValidationResult> {
    
    // Simular delay de validação
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Para esta implementação, aceitar qualquer digitação conforme solicitado
    // Buscar usuário por email ou nome
    const user = this.mockUsers.find(u => 
      u.email.toLowerCase() === username.toLowerCase() || 
      u.name.toLowerCase().includes(username.toLowerCase())
    );

    if (!user) {
      // Se não encontrar usuário específico, criar um usuário mock com o nível necessário
      const mockUser: User = {
        id: Date.now().toString(),
        name: username,
        email: `${username}@empresa.com`,
        role: this.getRoleByLevel(requiredLevel),
        level: requiredLevel as any
      };

      return {
        valid: true,
        user: mockUser
      };
    }

    // Verificar se o usuário tem o nível necessário
    if (this.hasRequiredLevel(user.level, requiredLevel)) {
      return {
        valid: true,
        user: user
      };
    }

    return {
      valid: false,
      reason: `Usuário ${user.name} não possui nível de alçada suficiente. Necessário: ${requiredLevel}, Atual: ${user.level}`
    };
  }

  /**
   * Verificar se o nível do usuário é suficiente
   */
  private hasRequiredLevel(userLevel: string, requiredLevel: string): boolean {
    const levels = ['user', 'supervisor', 'manager', 'admin', 'director'];
    const userLevelIndex = levels.indexOf(userLevel);
    const requiredLevelIndex = levels.indexOf(requiredLevel);
    
    return userLevelIndex >= requiredLevelIndex;
  }

  /**
   * Obter role baseado no nível
   */
  private getRoleByLevel(level: string): string {
    const roleMap: Record<string, string> = {
      'supervisor': 'Supervisor',
      'manager': 'Gerente',
      'admin': 'Administrador',
      'director': 'Diretor'
    };
    
    return roleMap[level] || 'Usuário';
  }

  /**
   * Obter usuários disponíveis (para debug/desenvolvimento)
   */
  getAvailableUsers(): User[] {
    return this.mockUsers;
  }
}