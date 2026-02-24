import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuListComponent } from './components/menu-list/menu-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MenuListComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'mfe-menu';
}