import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ValidationModalComponent } from './components/validation-modal/validation-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ValidationModalComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'mfe-alcada';
}