# 📚 Guia Passo a Passo: Configuração e Integração de MFEs

## 🎯 **Público-Alvo**
Este guia é destinado a **desenvolvedores** que precisam entender como funciona a integração entre os microfrontends (MFEs) e como configurar novos módulos dinamicamente.

---

## 📋 **Índice**
1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Como Funciona a Comunicação](#2-como-funciona-a-comunicação)
3. [Configuração Dinâmica](#3-configuração-dinâmica)
4. [Passo a Passo: Adicionando um Novo MFE](#4-passo-a-passo-adicionando-um-novo-mfe)
5. [Troubleshooting](#5-troubleshooting)
6. [Boas Práticas](#6-boas-práticas)

---

## 1. **Visão Geral da Arquitetura**

### 🏗️ **Como os MFEs se Conectam**

Nossa arquitetura possui **4 microfrontends**:

```
┌─────────────────────────────────────────────────────────┐
│                    MFE-PORTAL (Host)                    │
│                   Porta: 4200                           │
│  ┌─────────────┐  ┌─────────────────────────────────┐   │
│  │ MFE-MENU    │  │         ÁREA PRINCIPAL          │   │
│  │ Porta: 4202 │  │                                 │   │
│  │             │  │  ┌─────────────────────────────┐ │   │
│  │ • Dashboard │  │  │        MFE-LOGIN            │ │   │
│  │ • Produtos  │  │  │       Porta: 4201           │ │   │
│  │ • Relatórios│  │  │                             │ │   │
│  │ • Config    │  │  │    OU                       │ │   │
│  │ • Usuários  │  │  │                             │ │   │
│  └─────────────┘  │  │      MFE-PRODUTO            │ │   │
│                   │  │      Porta: 4203            │ │   │
│                   │  │                             │ │   │
│                   │  └─────────────────────────────┘ │   │
│                   └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 🔗 **Tecnologias Utilizadas**

| Componente | Tecnologia | Versão | Função |
|------------|------------|--------|--------|
| **Framework** | Angular | 21 | Base dos MFEs |
| **Federation** | Native Federation | 21.1.1 | Integração entre MFEs |
| **Comunicação** | Custom Events | Nativo | Troca de dados |
| **Configuração** | JSON Estático | - | Configuração dinâmica |
| **Estilo** | SCSS | - | Estilos elegantes |

---

## 2. **Como Funciona a Comunicação**

### 📡 **Sistema de Eventos Customizados**

Os MFEs se comunicam através de **Custom Events** do JavaScript nativo. É como um sistema de rádio onde cada MFE pode "transmitir" e "escutar" mensagens.

#### **🔄 Fluxo de Comunicação:**

```javascript
// 1. MFE FILHO envia dados para o PORTAL
window.dispatchEvent(new CustomEvent('mfe-mfe-login-output', {
  detail: { type: 'AUTH_SUCCESS', payload: userData }
}));

// 2. PORTAL escuta e processa
window.addEventListener('mfe-mfe-login-output', (event) => {
  console.log('Dados recebidos:', event.detail);
  // Processar dados...
});
```

### 📨 **Padrão de Nomenclatura dos Eventos**

| Direção | Padrão | Exemplo |
|---------|--------|---------|
| **Portal → MFE** | `mfe-{nome-mfe}-input` | `mfe-mfe-login-input` |
| **MFE → Portal** | `mfe-{nome-mfe}-output` | `mfe-mfe-login-output` |

### 🎯 **Exemplo Prático: Login**

#### **Passo 1: Usuário faz login no MFE-Login**
```typescript
// mfe-login/src/app/components/login-form/login-form.component.ts
onSubmit(): void {
  this.authService.login(credentials).subscribe({
    next: (response) => {
      if (response.success) {
        // Enviar sucesso para o Portal
        this.mfeCommunicationService.sendDataToPortal({
          type: 'AUTH_SUCCESS',
          payload: response
        });
      }
    }
  });
}
```

#### **Passo 2: MFE-Login envia evento**
```typescript
// mfe-login/src/app/services/mfe-communication.service.ts
sendDataToPortal(data: MfeOutputData): void {
  const event = new CustomEvent('mfe-mfe-login-output', {
    detail: data
  });
  window.dispatchEvent(event);
  console.log('MFE mfe-login enviou dados:', data);
}
```

#### **Passo 3: Portal recebe e processa**
```typescript
// mfe-portal/src/app/app.component.ts
ngOnInit(): void {
  // Escutar dados do MFE de login
  const loginSub = this.mfeCommunicationService
    .receiveDataFromMfe('mfe-login')
    .subscribe((data: any) => {
      if (data.type === 'AUTH_SUCCESS') {
        this.handleLoginSuccess(data.payload);
      }
    });
}

private handleLoginSuccess(authResponse: AuthResponse): void {
  // Salvar usuário
  this.mfeCommunicationService.setCurrentUser(authResponse.user);
  // Atualizar interface
  this.isAuthenticated = true;
  this.currentUser = authResponse.user;
}
```

---

## 3. **Configuração Dinâmica**

### 📄 **Arquivos de Configuração JSON**

A **grande inovação** do nosso sistema é que **não precisamos alterar código** para adicionar novos MFEs. Tudo é configurado via arquivos JSON!

#### **📍 Localização dos Arquivos:**
```
mfe-portal/
└── public/
    └── assets/
        └── config/
            ├── mfes.json          ← Configuração dos MFEs
            └── menu-items.json    ← Itens do menu
```

#### **🔧 Estrutura do mfes.json:**
```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-01-15T10:30:00Z",
  "mfes": [
    {
      "name": "mfe-login",                    // Nome único do MFE
      "displayName": "Sistema de Login",      // Nome para exibição
      "url": "http://localhost:4201",        // URL onde o MFE roda
      "remoteEntry": "/remoteEntry.json",     // Arquivo de entrada
      "exposedModule": "./Component",         // Componente exposto
      "version": "1.2.0",                    // Versão do MFE
      "status": "active",                     // Status: active/inactive
      "permissions": [],                      // Permissões necessárias
      "healthCheck": "/health",               // Endpoint de saúde
      "metadata": {
        "description": "Módulo de autenticação",
        "team": "Security Team",
        "contact": "security@empresa.com"
      }
    }
  ]
}
```

#### **🍔 Estrutura do menu-items.json:**
```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-01-15T10:30:00Z",
  "menuItems": [
    {
      "id": "produto",                        // ID único do item
      "label": "Produtos",                    // Texto do menu
      "icon": "📦",                          // Ícone (emoji ou classe CSS)
      "description": "Gestão de produtos",   // Descrição
      "mfeName": "mfe-produto",              // MFE que será carregado
      "route": "/produto",                   // Rota (para futuro uso)
      "order": 1,                           // Ordem de exibição
      "permissions": ["read"],              // Permissões necessárias
      "active": true,                       // Se está ativo
      "category": "business",               // Categoria do item
      "params": {                           // Parâmetros extras
        "defaultView": "dashboard",
        "theme": "default"
      }
    }
  ]
}
```

### 🔄 **Como o Portal Carrega as Configurações**

#### **Passo 1: ConfigService carrega os JSONs**
```typescript
// mfe-portal/src/app/services/config.service.ts
async getMfeConfig(): Promise<MfeConfig[]> {
  try {
    // Carregar do arquivo JSON
    const response = await this.http
      .get<MfeConfigResponse>('/assets/config/mfes.json')
      .toPromise();
    
    // Filtrar apenas MFEs ativos
    this.mfeConfigCache = response!.mfes.filter(mfe => mfe.status === 'active');
    return this.mfeConfigCache;
  } catch (error) {
    console.error('Erro ao carregar configuração:', error);
    return this.getFallbackMfeConfig(); // Configuração de emergência
  }
}
```

#### **Passo 2: DynamicMfeLoaderService carrega MFEs**
```typescript
// mfe-portal/src/app/services/dynamic-mfe-loader.service.ts
async loadMfeComponent(mfeName: string): Promise<any> {
  // 1. Buscar configuração do MFE
  const config = await this.configService.getMfeByName(mfeName);
  
  // 2. Carregar componente remotamente
  const module = await loadRemoteModule({
    remoteEntry: `${config.url}${config.remoteEntry}`,
    exposedModule: config.exposedModule
  });

  // 3. Retornar componente para uso
  return module.default || module[Object.keys(module)[0]];
}
```

#### **Passo 3: MfeLoaderComponent injeta dinamicamente**
```typescript
// mfe-portal/src/app/components/mfe-loader/mfe-loader.component.ts
private async loadMfe(): Promise<void> {
  try {
    // 1. Carregar configuração
    this.mfeConfig = await this.configService.getMfeByName(this.mfeName);
    
    // 2. Carregar componente
    const component = await this.dynamicLoader.loadMfeComponent(this.mfeName);
    
    // 3. Criar instância e injetar no DOM
    this.componentRef = this.container.createComponent(component);
    
    // 4. Passar dados de entrada
    this.passInputData();
  } catch (error) {
    this.hasError = true;
    console.error('Erro ao carregar MFE:', error);
  }
}
```

---

## 4. **Passo a Passo: Adicionando um Novo MFE**

### 🎯 **Cenário: Adicionando MFE-Relatórios**

Vamos adicionar um novo MFE de relatórios **sem alterar nenhum código**, apenas configurações!

#### **📋 Pré-requisitos:**
- Node.js 24+ instalado
- Angular CLI 21+ instalado
- Conhecimento básico de Angular

---

### **Passo 1: Criar o Novo MFE** ⏱️ *~10 minutos*

```bash
# 1. Criar projeto Angular
ng new mfe-relatorios --routing --style=scss --standalone

# 2. Entrar no diretório
cd mfe-relatorios

# 3. Instalar Native Federation
npm install @angular-architects/native-federation@^21.1.1

# 4. Configurar como remote
npx ng add @angular-architects/native-federation --project mfe-relatorios --port 4204 --type remote
```

#### **🔧 Configurar Federation:**
```javascript
// mfe-relatorios/federation.config.js
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'mfe-relatorios',
  
  exposes: {
    './Component': './src/app/app.component.ts',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  }
});
```

#### **🎨 Criar Componente Básico:**
```typescript
// mfe-relatorios/src/app/app.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relatorios-container">
      <h2>📊 Sistema de Relatórios</h2>
      <div class="relatorios-grid">
        <div class="relatorio-card">
          <h3>📈 Vendas Mensais</h3>
          <p>Relatório de vendas do mês atual</p>
          <button>Gerar Relatório</button>
        </div>
        <div class="relatorio-card">
          <h3>📋 Produtos Mais Vendidos</h3>
          <p>Top 10 produtos mais vendidos</p>
          <button>Gerar Relatório</button>
        </div>
        <div class="relatorio-card">
          <h3>👥 Relatório de Usuários</h3>
          <p>Atividade dos usuários do sistema</p>
          <button>Gerar Relatório</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .relatorios-container {
      padding: 2rem;
      height: 100%;
    }
    
    h2 {
      color: #333;
      margin-bottom: 2rem;
      font-size: 1.5rem;
    }
    
    .relatorios-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    
    .relatorio-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      border: 1px solid #e0e0e0;
    }
    
    .relatorio-card h3 {
      color: #333;
      margin-bottom: 0.5rem;
    }
    
    .relatorio-card p {
      color: #666;
      margin-bottom: 1rem;
    }
    
    .relatorio-card button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 25px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .relatorio-card button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }
  `]
})
export class AppComponent {
  title = 'mfe-relatorios';
}
```

---

### **Passo 2: Configurar no Portal** ⏱️ *~2 minutos*

#### **🔧 Atualizar mfes.json:**
```json
// mfe-portal/public/assets/config/mfes.json
{
  "version": "1.1.0",
  "lastUpdated": "2024-01-15T14:30:00Z",
  "mfes": [
    // ... MFEs existentes ...
    {
      "name": "mfe-relatorios",
      "displayName": "Sistema de Relatórios",
      "url": "http://localhost:4204",
      "remoteEntry": "/remoteEntry.json",
      "exposedModule": "./Component",
      "version": "1.0.0",
      "status": "active",
      "permissions": ["read", "reports"],
      "healthCheck": "/health",
      "metadata": {
        "description": "Módulo de geração de relatórios",
        "team": "Analytics Team",
        "contact": "analytics@empresa.com"
      }
    }
  ]
}
```

#### **🍔 Atualizar menu-items.json:**
```json
// mfe-portal/public/assets/config/menu-items.json
{
  "version": "1.1.0",
  "lastUpdated": "2024-01-15T14:30:00Z",
  "menuItems": [
    // ... itens existentes ...
    {
      "id": "relatorios",
      "label": "Relatórios",
      "icon": "📊",
      "description": "Gere relatórios detalhados do sistema",
      "mfeName": "mfe-relatorios",
      "route": "/relatorios",
      "order": 2,
      "permissions": ["read", "reports"],
      "active": true,
      "category": "analytics",
      "params": {
        "defaultView": "dashboard",
        "theme": "analytics"
      }
    }
  ]
}
```

---

### **Passo 3: Testar o Novo MFE** ⏱️ *~1 minuto*

#### **🚀 Iniciar todos os MFEs:**
```bash
# Terminal 1 - Login
cd mfe-login && npm start

# Terminal 2 - Menu
cd mfe-menu && npm start

# Terminal 3 - Produto
cd mfe-produto && npm start

# Terminal 4 - Relatórios (NOVO!)
cd mfe-relatorios && npm start

# Terminal 5 - Portal
cd mfe-portal && npm start
```

#### **✅ Verificar Funcionamento:**
1. **Abrir:** http://localhost:4200
2. **Login:** admin / 123456
3. **Verificar:** Menu deve mostrar "📊 Relatórios"
4. **Clicar:** No item "Relatórios"
5. **Resultado:** MFE de relatórios carrega na área principal

---

### **Passo 4: Validar Integração** ⏱️ *~2 minutos*

#### **🔍 Logs Esperados no Console:**
```
MenuService: Carregando itens do menu para usuário: {id: '1', username: 'admin', ...}
MenuService: Itens filtrados: [6 itens incluindo relatórios]
Item do menu clicado: {id: 'relatorios', mfeName: 'mfe-relatorios', ...}
Portal recebeu dados do MFE menu: {type: 'MENU_ITEM_SELECTED', ...}
Carregando MFE de relatórios...
MFE mfe-relatorios carregado com sucesso
```

#### **🎯 Checklist de Validação:**
- [ ] MFE-Relatórios inicia na porta 4204
- [ ] Item "📊 Relatórios" aparece no menu
- [ ] Clique no item carrega o MFE na área principal
- [ ] Layout permanece estável (sem deslocamentos)
- [ ] Console não mostra erros críticos

---

## 5. **Troubleshooting**

### 🚨 **Problemas Comuns e Soluções**

#### **Problema 1: MFE não aparece no menu**
```
❌ Sintoma: Item não aparece na lista do menu
```

**🔍 Verificações:**
1. **Arquivo JSON válido?**
   ```bash
   # Validar JSON
   cat mfe-portal/public/assets/config/menu-items.json | jq .
   ```

2. **Permissões corretas?**
   ```json
   // Verificar se usuário tem as permissões necessárias
   {
     "permissions": ["read"], // Usuário admin tem "read"?
     "active": true           // Item está ativo?
   }
   ```

3. **Cache do browser?**
   ```bash
   # Limpar cache
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (Mac)
   ```

#### **Problema 2: Erro 404 ao carregar MFE**
```
❌ Sintoma: Failed to load resource: net::ERR_CONNECTION_REFUSED
```

**🔍 Verificações:**
1. **MFE está rodando?**
   ```bash
   # Verificar se porta está ocupada
   netstat -an | grep 4204
   ```

2. **URL correta no JSON?**
   ```json
   {
     "url": "http://localhost:4204", // Porta correta?
     "remoteEntry": "/remoteEntry.json" // Caminho correto?
   }
   ```

3. **Federation configurado?**
   ```javascript
   // mfe-relatorios/federation.config.js deve existir
   module.exports = withNativeFederation({
     name: 'mfe-relatorios', // Nome correto?
     exposes: {
       './Component': './src/app/app.component.ts' // Caminho correto?
     }
   });
   ```

#### **Problema 3: Comunicação não funciona**
```
❌ Sintoma: Eventos não são recebidos entre MFEs
```

**🔍 Verificações:**
1. **Nomes de eventos corretos?**
   ```typescript
   // Padrão: mfe-{nome-mfe}-output
   'mfe-mfe-relatorios-output' // ✅ Correto
   'mfe-relatorios-output'     // ❌ Incorreto
   ```

2. **MfeCommunicationService configurado?**
   ```typescript
   // Verificar se mfeName está correto
   private mfeName = 'mfe-relatorios'; // Nome completo!
   ```

#### **Problema 4: Layout quebrado**
```
❌ Sintoma: MFE causa deslocamento ou overflow
```

**🔍 Verificações:**
1. **CSS do container:**
   ```scss
   .mfe-container {
     height: 100%;
     overflow: hidden; // Importante!
   }
   ```

2. **Componente principal:**
   ```scss
   .component-container {
     height: 100%;
     display: flex;
     flex-direction: column;
   }
   ```

---

## 6. **Boas Práticas**

### 📋 **Checklist de Desenvolvimento**

#### **🔧 Ao Criar um Novo MFE:**
- [ ] **Nome consistente:** Use padrão `mfe-{funcionalidade}`
- [ ] **Porta única:** Evite conflitos de porta
- [ ] **Federation configurado:** Expor componente principal
- [ ] **Comunicação padronizada:** Implementar MfeCommunicationService
- [ ] **CSS responsivo:** Testar em diferentes tamanhos
- [ ] **Tratamento de erros:** Implementar fallbacks
- [ ] **Health check:** Endpoint para monitoramento

#### **📄 Ao Atualizar Configurações:**
- [ ] **JSON válido:** Validar sintaxe antes de salvar
- [ ] **Versionamento:** Incrementar version nos JSONs
- [ ] **Backup:** Manter cópia das configurações anteriores
- [ ] **Teste local:** Validar antes de deploy
- [ ] **Documentação:** Atualizar docs se necessário

#### **🚀 Ao Fazer Deploy:**
- [ ] **Build sem erros:** Todos os MFEs fazem build
- [ ] **Testes de integração:** Comunicação funcionando
- [ ] **URLs de produção:** Atualizar nos JSONs
- [ ] **Monitoramento:** Health checks ativos
- [ ] **Rollback plan:** Plano de volta se der problema

### 🎯 **Padrões de Nomenclatura**

| Elemento | Padrão | Exemplo |
|----------|--------|---------|
| **Nome do MFE** | `mfe-{funcionalidade}` | `mfe-relatorios` |
| **Porta** | `420{n}` | `4204` |
| **Evento Output** | `mfe-{nome-mfe}-output` | `mfe-mfe-relatorios-output` |
| **Evento Input** | `mfe-{nome-mfe}-input` | `mfe-mfe-relatorios-input` |
| **ID do Menu** | `{funcionalidade}` | `relatorios` |
| **Rota** | `/{funcionalidade}` | `/relatorios` |

### 🔒 **Segurança e Permissões**

#### **Sistema de Permissões:**
```json
{
  "permissions": [
    "read",      // Leitura básica
    "write",     // Escrita/edição
    "delete",    // Exclusão
    "admin",     // Administração
    "reports",   // Relatórios específicos
    "config"     // Configurações do sistema
  ]
}
```

#### **Validação de Permissões:**
```typescript
// No menu service
private filterByPermissions(items: MenuItem[], userPermissions: string[]): MenuItem[] {
  return items.filter(item => {
    if (!item.permissions || item.permissions.length === 0) return true;
    return item.permissions.some(permission => userPermissions.includes(permission));
  });
}
```

### 📊 **Monitoramento e Logs**

#### **Logs Estruturados:**
```typescript
// Padrão de log
console.log(`[${this.mfeName}] Ação executada:`, {
  action: 'load_component',
  timestamp: new Date().toISOString(),
  user: this.currentUser?.username,
  success: true
});
```

#### **Health Checks:**
```typescript
// Implementar em todos os MFEs
@Injectable({ providedIn: 'root' })
export class HealthService {
  getHealthStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mfe: 'mfe-relatorios'
    };
  }
}
```

---

## 🎉 **Conclusão**

Parabéns! 🎊 Agora você entende como funciona nossa arquitetura de microfrontends e como adicionar novos módulos **sem alterar código**, apenas configurações JSON!

### 📚 **O que você aprendeu:**
- ✅ **Arquitetura:** Como os 4 MFEs se integram
- ✅ **Comunicação:** Sistema de eventos customizados
- ✅ **Configuração dinâmica:** Arquivos JSON para tudo
- ✅ **Processo:** Passo a passo para novos MFEs
- ✅ **Troubleshooting:** Como resolver problemas comuns
- ✅ **Boas práticas:** Padrões e segurança

### 🚀 **Próximos Passos:**
1. **Pratique:** Crie seu próprio MFE de teste
2. **Explore:** Veja outros MFEs do projeto
3. **Contribua:** Melhore a documentação
4. **Compartilhe:** Ensine outros desenvolvedores

### 📞 **Precisa de Ajuda?**
- 📖 **Documentação:** Consulte outros arquivos em `/docs`
- 🐛 **Problemas:** Verifique a seção de troubleshooting
- 💬 **Dúvidas:** Pergunte para desenvolvedores sênior da equipe

**Lembre-se:** A arquitetura de microfrontends pode parecer complexa no início, mas com prática você dominará! 💪

---

*Documentação criada em: 18/02/2026*  
*Versão: 1.0*  
*Autor: Equipe de Arquitetura*  
*Público: Desenvolvedores Júnior*