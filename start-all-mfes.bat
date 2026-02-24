@echo off
echo ========================================
echo  Iniciando Arquitetura MicroFrontEnd
echo  (Abordagem Dinamica com JSON + Alcada)
echo ========================================
echo.

echo Verificando arquivos de configuracao...

if not exist "mfe-portal\src\assets\config\mfes.json" (
    echo ❌ Arquivo mfes.json nao encontrado!
    echo 📋 Criando estrutura de configuracao...
    mkdir mfe-portal\src\assets\config 2>nul
    echo ✅ Estrutura criada. Arquivos de configuracao ja devem estar presentes.
)

if not exist "mfe-portal\src\assets\config\menu-items.json" (
    echo ❌ Arquivo menu-items.json nao encontrado!
    echo 📋 Verifique se os arquivos de configuracao foram criados corretamente.
)

if not exist "mfe-portal\public\assets\config\validation-rules.json" (
    echo ❌ Arquivo validation-rules.json nao encontrado!
    echo 📋 Verifique se os arquivos de configuracao foram criados corretamente.
)

echo ✅ Verificacao de configuracao concluida.
echo.

echo 🔐 Iniciando MFE Login (Autenticacao) - Porta 4201...
start "MFE Login" cmd /k "cd mfe-login && npm start"

timeout /t 3 /nobreak >nul

echo 🍔 Iniciando MFE Menu (Navegacao) - Porta 4202...
start "MFE Menu" cmd /k "cd mfe-menu && npm start"

timeout /t 3 /nobreak >nul

echo 📦 Iniciando MFE Produto (Funcionalidade) - Porta 4203...
start "MFE Produto" cmd /k "cd mfe-produto && npm start"

timeout /t 3 /nobreak >nul

echo 🔐 Iniciando MFE Alcada (Validacao) - Porta 4204...
start "MFE Alcada" cmd /k "cd mfe-alcada && npm start"

timeout /t 3 /nobreak >nul

echo 🌐 Iniciando MFE Portal (Shell Container) - Porta 4200...
start "MFE Portal" cmd /k "cd mfe-portal && npm start"

echo.
echo ========================================
echo  Todos os MFEs foram iniciados!
echo ========================================
echo.
echo URLs de acesso:
echo - Portal:  http://localhost:4200
echo - Login:   http://localhost:4201
echo - Menu:    http://localhost:4202
echo - Produto: http://localhost:4203
echo - Alcada:  http://localhost:4204
echo.
echo Health Checks:
echo - Login:   http://localhost:4201/health
echo - Menu:    http://localhost:4202/health
echo - Produto: http://localhost:4203/health
echo - Alcada:  http://localhost:4204/health
echo.
echo ✅ Configuracao dinamica ativa!
echo 🔐 Sistema de validacao de alcada implementado!
echo 📝 Para adicionar novos MFEs, edite os arquivos JSON em mfe-portal\src\assets\config\
echo.
echo Aguarde alguns segundos para que todos os servicos iniciem completamente.
echo Acesse http://localhost:4200 para usar a aplicacao.
echo.
echo 🧪 TESTE DE VALIDACAO DE ALCADA:
echo 1. Faca login no portal
echo 2. Acesse o dashboard de produtos
echo 3. Clique na aba "Teste Alcada"
echo 4. Use os botoes de teste para diferentes cenarios
echo 5. Credenciais de teste (aceita qualquer digitacao):
echo    - supervisor/123456 (nivel: supervisor)
echo    - manager/123456 (nivel: manager)  
echo    - admin/123456 (nivel: admin)
echo    - director/123456 (nivel: director)
echo.
echo 📋 REGRAS DE VALIDACAO CONFIGURADAS:
echo - Exclusao de produto: requer nivel manager
echo - Alteracao de preco: requer nivel supervisor
echo - Ajuste de estoque: requer nivel supervisor
echo.
echo 🔄 FLUXO DE VALIDACAO:
echo 1. MFE Produto solicita validacao ao Portal
echo 2. Portal carrega MFE Alcada dinamicamente
echo 3. Usuario insere credenciais de alcada superior
echo 4. MFE Alcada valida e retorna resultado
echo 5. Portal repassa resultado para MFE Produto
echo 6. MFE Produto executa ou rejeita a operacao
echo.
pause