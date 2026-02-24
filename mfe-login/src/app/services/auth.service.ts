import { Injectable } from '@angular/core';
import { Observable, of, delay, switchMap } from 'rxjs';
import { LoginCredentials, AuthResponse } from '../models/auth.model';
import { JwtMockService } from './jwt-mock.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  // Usuários fake para demonstração com scopes específicos
  private fakeUsers = [
    {
      id: '1',
      username: 'admin',
      password: '123456',
      name: 'Administrador',
      email: 'admin@portal.com',
      permissions: ['read', 'write', 'delete', 'admin'],
      scopes: ['sc_produto', 'sc_usuario', 'sc_admin'] // Admin tem acesso a tudo
    },
    {
      id: '2',
      username: 'usuario',
      password: '123456',
      name: 'Usuário Comum',
      email: 'usuario@portal.com',
      permissions: ['read'],
      scopes: ['sc_usuario'] // Usuário comum só tem acesso a funcionalidades de usuário
    }
  ];

  constructor(private jwtMockService: JwtMockService) {}

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    // Simular delay de rede
    return of(null).pipe(
      delay(1000),
      switchMap(() => {
        const user = this.fakeUsers.find(u => 
          u.username === credentials.username && 
          u.password === credentials.password
        );

        if (user) {
          // Gerar token JWT real com scopes
          const tokenPayload = {
            sub: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            permissions: user.permissions,
            scopes: user.scopes,
            preferred_username: user.username
          };

          const token = this.jwtMockService.generateToken(tokenPayload);

          const response: AuthResponse = {
            success: true,
            token: token,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              email: user.email,
              permissions: user.permissions,
              scopes: user.scopes
            }
          };
          return of(response);
        } else {
          const errorResponse: AuthResponse = {
            success: false,
            error: 'Credenciais inválidas. Tente: admin/123456 ou usuario/123456'
          };
          return of(errorResponse);
        }
      })
    );
  }
}