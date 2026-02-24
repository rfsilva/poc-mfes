# MFE Alçada

Microfrontend responsável por validação de operações críticas através de alçada superior.

## Funcionalidades

- Modal de confirmação de alçada superior
- Validação de credenciais de usuário autorizado
- Interface dinâmica baseada no tipo de operação
- Integração via Native Federation
- Validação de token JWT

## Desenvolvimento

```bash
npm install
npm start
```

O MFE será executado na porta 4204.

## Arquitetura

Este MFE segue o padrão Hub-and-Spoke, sendo carregado dinamicamente pelo Portal quando necessário.

### Comunicação

- Recebe dados via Custom Events do Portal
- Valida token JWT recebido
- Retorna resultado da validação via Custom Events

### Estrutura

- `ValidationModalComponent`: Componente principal de validação
- `AuthService`: Serviço de autenticação e validação de alçada
- `MfeCommunicationService`: Serviço de comunicação com o Portal
- `ResourceLabelService`: Serviço de labels dinâmicos para recursos