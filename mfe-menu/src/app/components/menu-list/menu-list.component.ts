import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MenuService } from '../../services/menu.service';
import { MfeCommunicationService } from '../../services/mfe-communication.service';
import { MenuItem, User } from '../../models/menu.model';

@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-list.component.html',
  styleUrls: ['./menu-list.component.scss']
})
export class MenuListComponent implements OnInit, OnDestroy {
  menuItems: MenuItem[] = [];
  currentUser: User | null = null;
  activeItemId: string | null = null;
  isLoading = true;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private menuService: MenuService,
    private mfeCommunicationService: MfeCommunicationService
  ) {}

  ngOnInit(): void {
    console.log('MenuListComponent inicializando...');
    
    // Escutar dados de entrada do portal
    const inputSub = this.mfeCommunicationService.inputData$.subscribe(data => {
      console.log('Menu recebeu dados do portal:', data);
      if (data.user) {
        // Garantir que os scopes sejam incluídos no usuário
        this.currentUser = {
          ...data.user,
          scopes: data.scopes || data.user.scopes || []
        };
        console.log('Usuário atualizado no menu com scopes:', this.currentUser);
        this.loadMenuItems();
      }
    });
    this.subscriptions.push(inputSub);

    // Carregar dados iniciais se já disponíveis
    const currentData = this.mfeCommunicationService.getCurrentInputData();
    console.log('Dados iniciais do menu:', currentData);
    if (currentData.user) {
      this.currentUser = {
        ...currentData.user,
        scopes: currentData.scopes || currentData.user.scopes || []
      };
      console.log('Usuário inicial no menu com scopes:', this.currentUser);
      this.loadMenuItems();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadMenuItems(): void {
    if (!this.currentUser) {
      console.log('Nenhum usuário disponível para carregar menu');
      this.isLoading = false;
      return;
    }

    console.log('Carregando itens do menu para usuário:', this.currentUser);
    console.log('Scopes do usuário:', this.currentUser.scopes);
    console.log('Permissões do usuário:', this.currentUser.permissions);
    
    this.menuService.getMenuItems(this.currentUser).subscribe({
      next: (items) => {
        console.log('Itens do menu carregados:', items);
        this.menuItems = items;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar itens do menu:', error);
        this.isLoading = false;
      }
    });
  }

  onMenuItemClick(item: MenuItem): void {
    console.log('Item do menu clicado:', item);
    
    // Marcar item como ativo
    this.activeItemId = item.id;

    // Verificar se é um item que deve carregar um MFE
    if (item.mfeName) {
      console.log('Enviando seleção de MFE para o portal:', item.mfeName);
      // Enviar seleção para o portal
      this.mfeCommunicationService.sendDataToPortal({
        type: 'MENU_ITEM_SELECTED',
        payload: {
          id: item.id,
          label: item.label,
          mfeName: item.mfeName,
          route: item.route,
          params: item.params || {},
          productId: item.params?.['productId'] || 'default'
        }
      });
    } else if (item.action === 'fake') {
      // Para itens fake, apenas mostrar uma mensagem
      console.log('Item fake clicado:', item.label);
      this.showFakeItemMessage(item);
    } else {
      // Para outros itens, enviar seleção genérica
      console.log('Item genérico clicado:', item.label);
      this.mfeCommunicationService.sendDataToPortal({
        type: 'MENU_ITEM_SELECTED',
        payload: {
          id: item.id,
          label: item.label,
          route: item.route,
          action: 'navigate'
        }
      });
    }
  }

  private showFakeItemMessage(item: MenuItem): void {
    // Simular ação para itens fake
    console.log(`Ação simulada para: ${item.label}`);
    
    // Enviar notificação para o portal (opcional)
    this.mfeCommunicationService.sendDataToPortal({
      type: 'MENU_FAKE_ACTION',
      payload: {
        id: item.id,
        label: item.label,
        message: `Funcionalidade "${item.label}" em desenvolvimento`
      }
    });

    // Remover seleção após um tempo
    setTimeout(() => {
      if (this.activeItemId === item.id) {
        this.activeItemId = null;
      }
    }, 2000);
  }

  isItemActive(itemId: string): boolean {
    return this.activeItemId === itemId;
  }

  hasPermission(item: MenuItem): boolean {
    if (!item.permissions || item.permissions.length === 0) {
      return true;
    }

    const userPermissions = this.currentUser?.permissions || [];
    const hasPermission = item.permissions.some(permission => 
      userPermissions.includes(permission)
    );
    
    console.log(`Verificando permissão para ${item.label}:`, {
      itemPermissions: item.permissions,
      userPermissions: userPermissions,
      hasPermission: hasPermission
    });
    
    return hasPermission;
  }

  hasScope(item: MenuItem): boolean {
    if (!item.scopes || item.scopes.length === 0) {
      return true;
    }

    const userScopes = this.currentUser?.scopes || [];
    const hasScope = item.scopes.some(scope => 
      userScopes.includes(scope)
    );
    
    console.log(`Verificando scope para ${item.label}:`, {
      itemScopes: item.scopes,
      userScopes: userScopes,
      hasScope: hasScope
    });
    
    return hasScope;
  }

  getUserRole(): string {
    if (!this.currentUser || !this.currentUser.permissions) {
      return 'Usuário';
    }

    const permissions = this.currentUser.permissions;
    
    if (permissions.includes('admin')) {
      return 'Administrador';
    } else if (permissions.includes('write')) {
      return 'Gerente';
    } else if (permissions.includes('read')) {
      return 'Usuário';
    }
    
    return 'Usuário';
  }

  // Método para debug - mostra informações do usuário atual
  getDebugInfo(): any {
    return {
      currentUser: this.currentUser,
      menuItemsCount: this.menuItems.length,
      menuItems: this.menuItems.map(item => ({
        id: item.id,
        label: item.label,
        scopes: item.scopes,
        permissions: item.permissions
      }))
    };
  }
}