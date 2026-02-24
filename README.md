# 🏗️ Arquitetura MicroFrontEnd - Referência

Uma arquitetura de referência para MicroFrontEnds (MFEs) implementada com Angular 21, estabelecendo padrões para desenvolvimento, comunicação e orquestração entre componentes distribuídos.

## 🎯 Visão Geral

Esta solução demonstra as melhores práticas para implementação de MicroFrontEnds, incluindo:

- **Comunicação padronizada** entre MFEs via Custom Events
- **Orquestração centralizada** através do Shell Container (Portal)
- **Controle de permissões** granular por funcionalidade
- **Isolamento de responsabilidades** por domínio de negócio
- **Padrões de desenvolvimento** consistentes e escaláveis

## 🏛️ Componentes da Arquitetura

### 🌐 MFE Portal (Shell Container) - Porta 4200
- **Responsabilidade**: Orquestrador principal da aplicação
- **Funcionalidades**: Gerenciamento de autenticação, navegação e estado global
- **Tecnologia**: Angular 21 Standalone Components

### 🔐 MFE Login (Autenticação) - Porta 4201
- **Responsabilidade**: Sistema de autenticação
- **Funcionalidades**: Login com validação, múltiplos perfis de usuário
- **Usuários Demo**: admin/123456, user/password

### 📋 MFE Menu (Navegação) - Porta 4202
- **Responsabilidade**: Sistema de navegação dinâmica
- **Funcionalidades**: Menu baseado em permissões, filtragem por perfil
- **Itens**: Dashboard, Relatórios, Configurações, Usuários, Produto Principal

### 📦 MFE Produto (Funcionalidade) - Porta 4203
- **Responsabilidade**: Módulo de gestão de produtos
- **Funcionalidades**: Dashboard com métricas, CRUD de produtos, controle de estoque
- **Views**: Dashboard executivo e listagem detalhada

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 24+
- Angular CLI 21
- npm

### ⚠️ IMPORTANTE: Aplicar Correções Primeiro

**Antes de executar os MFEs, aplique as correções de compatibilidade:**

#### Windows:
```bash
fix-mfes.bat
```

#### Linux/Mac:
```bash
chmod +x fix-mfes.sh
./fix-mfes.sh
```

### Execução dos MFEs

Após aplicar as correções, execute:

#### Windows:
```bash
start-all-mfes.bat
```

#### Linux/Mac:
```bash
chmod +x start-all-mfes.sh
./start-all-mfes.sh
```

### Acesso à Aplicação
Após iniciar todos os MFEs, acesse: **http://localhost:4200**

## 👥 Usuários de Demonstração

| Usuário | Senha | Perfil | Permissões |
|---------|-------|--------|------------|
| admin | 123456 | Administrador | read, write, delete, admin |
| user | password | Usuário | read |

## 🔄 Fluxo de Uso

1. **Acesse o Portal** (http://localhost:4200)
2. **Faça login** com uma das credenciais acima
3. **Navegue pelo menu** lateral (itens variam por permissão)
4. **Acesse "Produto Principal"** para ver o dashboard completo
5. **Explore as funcionalidades** baseadas no seu perfil de usuário

## 🔧 Correções Aplicadas

### Problemas Resolvidos:
1. **Erro "Could not find angular-builders/custom-webpack"** - Dependências padronizadas
2. **Erro "TypeError: compilation argument"** - Versões compatíveis implementadas
3. **Incompatibilidades webpack/Module Federation** - Configurações otimizadas

### Versões Corrigidas:
- `@angular-architects/module-federation`: `^17.0.0`
- `webpack`: `^5.88.0`
- `@angular-builders/custom-webpack`: `^18.0.0`

Consulte [CORRECOES-APLICADAS.md](CORRECOES-APLICADAS.md) para detalhes completos.

## 📡 Padrões de Comunicação

### Estrutura sem iframe
A comunicação entre MFEs é implementada através de:
- **Module Federation**: Carregamento dinâmico
- **Componentes Proxy**: Encapsulamento de lógica
- **Serviços de Comunicação**: Troca de dados
- **Event Emitters**: Notificações entre componentes

### Custom Events
```typescript
// Portal → MFE (Input)
this.mfeCommunicationService.sendDataToMfe('login', inputData);

// MFE → Portal (Output)
this.mfeCommunicationService.emitDataFromMfe('login', {
  type: 'AUTH_SUCCESS',
  payload: authData
});
```

## 🛡️ Sistema de Permissões

- **read**: Visualização de dados
- **write**: Criação e edição
- **delete**: Exclusão de dados
- **admin**: Acesso administrativo completo

## 🏗️ Estrutura do Projeto

```
├── mfe-portal/          # Shell Container (Porta 4200)
├── mfe-login/           # Autenticação (Porta 4201)
├── mfe-menu/            # Navegação (Porta 4202)
├── mfe-produto/         # Produtos (Porta 4203)
├── docs/                # Documentação
├── fix-mfes.bat         # Script correção Windows
├── fix-mfes.sh          # Script correção Linux/Mac
├── start-all-mfes.bat   # Inicialização Windows
└── start-all-mfes.sh    # Inicialização Linux/Mac
```

## 📚 Documentação

### Documentos Principais
- [**Arquitetura MicroFrontEnd**](docs/arquitetura-microfrontend.md) - Visão geral da arquitetura
- [**Padrão de Comunicação**](docs/contratos-comunicacao/padrao-comunicacao-mfe.md) - Padrões e convenções
- [**Correções Aplicadas**](CORRECOES-APLICADAS.md) - Detalhes das correções

### Contratos de Comunicação
- [**Portal ↔ Login**](docs/contratos-comunicacao/contrato-portal-login.md)
- [**Portal ↔ Menu**](docs/contratos-comunicacao/contrato-portal-menu.md)
- [**Menu ↔ Produto**](docs/contratos-comunicacao/contrato-menu-produto.md)

## 🧪 Testes e Qualidade

### Build de Produção
```bash
# Testar build de todos os MFEs
cd mfe-portal && npm run build
cd mfe-login && npm run build
cd mfe-menu && npm run build
cd mfe-produto && npm run build
```

### Verificação de Segurança
```bash
# Verificar vulnerabilidades
npm audit
# Resultado: 0 vulnerabilidades críticas/altas
```

## 🔧 Tecnologias Utilizadas

- **Angular 21** - Framework principal
- **TypeScript 5.9+** - Linguagem de desenvolvimento
- **SCSS** - Estilização
- **RxJS** - Programação reativa
- **Module Federation** - Comunicação entre MFEs
- **Standalone Components** - Arquitetura moderna do Angular

## 📊 Características Técnicas

### Performance
- ✅ Bundle otimizado por MFE
- ✅ Lazy loading de componentes
- ✅ Compartilhamento de dependências
- ✅ Isolamento de estilos

### Segurança
- ✅ Zero vulnerabilidades críticas/altas
- ✅ Controle de permissões granular
- ✅ Validação de dados de entrada
- ✅ Sanitização de eventos

### Manutenibilidade
- ✅ Código TypeScript tipado
- ✅ Padrões de comunicação consistentes
- ✅ Documentação completa
- ✅ Estrutura modular

## 🎯 Casos de Uso

### Para Times de Desenvolvimento
- **Referência** para implementação de novos MFEs
- **Padrões** de comunicação e estruturação
- **Exemplos** de boas práticas

### Para Arquitetos
- **Modelo** de arquitetura distribuída
- **Estratégias** de orquestração
- **Padrões** de integração

### Para Product Owners
- **Demonstração** de funcionalidades
- **Fluxos** de usuário completos
- **Controle** de acesso por perfil

## 🚨 Troubleshooting

### Problemas Comuns:

1. **MFEs não iniciam**: Execute `fix-mfes.bat` primeiro
2. **Erro de dependências**: Limpe node_modules e reinstale
3. **Porta ocupada**: Verifique se as portas 4200-4203 estão livres
4. **Webpack errors**: Verifique se as versões estão corretas

### Comandos de Diagnóstico:
```bash
# Verificar versões
node --version  # Deve ser 24+
ng version      # Deve ser 21+

# Limpar cache
npm cache clean --force

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contribuição

Esta arquitetura serve como **referência para desenvolvimento** de MicroFrontEnds. Para manter a consistência:

1. Siga os **padrões estabelecidos** de comunicação
2. Mantenha a **documentação atualizada**
3. Implemente **testes adequados**
4. Respeite as **convenções de nomenclatura**

## 📞 Suporte

Para dúvidas sobre a arquitetura ou implementação:
- Consulte a [documentação técnica](docs/)
- Revise os [contratos de comunicação](docs/contratos-comunicacao/)
- Analise o código de referência nos MFEs
- Verifique [CORRECOES-APLICADAS.md](CORRECOES-APLICADAS.md) para problemas conhecidos

---

**Versão**: 1.1  
**Tecnologia**: Angular 21 + TypeScript 5.9  
**Compatibilidade**: Node.js 24+  
**Status**: ✅ Produção Ready (com correções aplicadas)