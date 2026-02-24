
## 📘 Contexto do Projeto

### 🛠️ Geral:
- Quando houver necessidade de atualizar um arquivo existente, sempre realize as alterações no próprio arquivo! Nunca crie arquivos _Extended, _Draft, _Fixed, _Updated, _V2, _V3, _Corrigido ou similares

### 🛠️ Backend:
- Java 21 + Spring Boot 3 + API REST + DTO + Validation + Lombok + JPA + MySQL + Flyway
- Entidade JPA completa (com Lombok, constraints e relacionamentos)
- Usar String para campos UUID quando as colunas do banco são VARCHAR(36)
- DTOs (request/response), validadores e mappers
- Repository
- Service com regras de negócio - NUNCA deve haver regra de negócio em controller
- Controller REST com todos os endpoints CRUD + filtros se aplicável
- Migrations (somente se necessário; primeiro valide se existe na V1)
- Regras de validação (negócio e campos)
- Mensagens de erro claras	
- Mapper: Não usar @Component e não usar mapstruct na implementação
- Não utilizar ResponseEntity nos endpoints de Controller - ApiResponse já realiza esse papel
- I18N estruturado para Português, Inglês, Espanhol e Italiano - Manter equalizado e atualizado em todos os idiomas

### 🎨 Frontend: 
- Angular 18 (standalone) + HttpClient com fetch + Reactive Forms + rotas
- Model (interface ou classe)
- Service TS com chamadas REST usando `HttpClient` (withFetch)
- Component de listagem + filtros
- Component de formulário (create/update)
- Component de detalhe (se fizer sentido)
- Component sem HTML e SCSS inline - criar arquivos separados
- Reactive Forms com validações
- Mensagens de erro (negócio no topo, campos em cada campo)
- Rotas completas do módulo	

### 🔗 Integrações:
- Geração da collection Postman dos endpoints criados/alterados
- Garantir consistência do contrato REST gerado no backend para uso no frontend  

### 🛢️ Banco de Dados:
- Migrations versionadas (V1 = legado), prefixo "tb_" e nome singular
- Evitar ao máximo queries nativas e named queries
- Não criar estruturas específicas do banco de dados (TYPE, TRIGGER, PROCEDURE, FUNCTION, etc.) no migrations
- Para entities novas, validar no migrations se tabela já implementada. Se não, criar, se sim e precisar atualizar, atualize em versão nova.

### ⚠️ Importante:
- Manter padrões de nomenclatura e pastas
- NÃO inventar regra que não esteja no documento funcional.
- Analise a história. SE a história tiver regra incompleta, liste os "pontos pendentes" no bloco ANOTAÇÕES.
- Mantenha código limpo e dentro dos padrões fornecidos.
- Comece lendo o material, identifique entidades e regras, e só então gere tudo.
- NUNCA realize commits no GIT! Essa etapa será feita por um humano
