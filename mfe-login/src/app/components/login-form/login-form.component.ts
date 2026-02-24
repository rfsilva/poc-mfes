import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MfeCommunicationService } from '../../services/mfe-communication.service';
import { LoginCredentials, AuthResponse } from '../../models/auth.model';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss']
})
export class LoginFormComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private mfeCommunicationService: MfeCommunicationService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const credentials: LoginCredentials = this.loginForm.value;

      this.authService.login(credentials).subscribe({
        next: (response: AuthResponse) => {
          this.isLoading = false;
          
          if (response.success) {
            // Enviar sucesso para o portal usando o método correto
            this.mfeCommunicationService.sendDataToPortal({
              type: 'AUTH_SUCCESS',
              payload: response
            });
            console.log('Login bem-sucedido, dados enviados para o portal:', response);
          } else {
            // Mostrar erro
            this.errorMessage = response.error || 'Erro desconhecido no login';
            this.mfeCommunicationService.sendDataToPortal({
              type: 'AUTH_ERROR',
              payload: { error: this.errorMessage }
            });
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Erro interno do servidor';
          this.mfeCommunicationService.sendDataToPortal({
            type: 'AUTH_ERROR',
            payload: { error: this.errorMessage }
          });
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  // Getters para facilitar o acesso aos controles no template
  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }
  get rememberMe() { return this.loginForm.get('rememberMe'); }

  // Método para verificar se um campo tem erro
  hasError(fieldName: string, errorType: string): boolean {
    const field = this.loginForm.get('fieldName');
    return !!(field?.hasError(errorType) && field?.touched);
  }
}