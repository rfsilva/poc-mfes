import { Routes } from '@angular/router';
import { HealthComponent } from './components/health/health.component';

export const routes: Routes = [
  {
    path: 'health',
    component: HealthComponent
  },
  {
    path: '',
    redirectTo: '/health',
    pathMatch: 'full'
  }
];