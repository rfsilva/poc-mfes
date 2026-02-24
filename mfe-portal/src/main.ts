import { initFederation } from '@angular-architects/native-federation';

console.log('[Portal] 🚀 Iniciando Native Federation...');

// Inicializar apenas com MFEs estruturais (login e menu)
// Os demais MFEs (produto, alçada) devem ser carregados dinamicamente
initFederation({
  'mfe-login': 'http://localhost:4201/remoteEntry.json',
  'mfe-menu': 'http://localhost:4202/remoteEntry.json'
})
  .then(() => {
    console.log('[Portal] ✅ Native Federation inicializado com MFEs estruturais');
    console.log('[Portal] 📦 MFEs estruturais registrados:', {
      'mfe-login': 'http://localhost:4201/remoteEntry.json',
      'mfe-menu': 'http://localhost:4202/remoteEntry.json'
    });
    console.log('[Portal] 🔄 MFEs dinâmicos serão carregados sob demanda');
    return import('./bootstrap');
  })
  .then(() => {
    console.log('[Portal] ✅ Bootstrap concluído');
  })
  .catch(err => {
    console.error('[Portal] ❌ Erro na inicialização do Native Federation:', err);
    console.error('[Portal] 📊 Detalhes do erro:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack
    });
    // Tentar carregar mesmo com erro
    import('./bootstrap').catch(bootstrapErr => {
      console.error('[Portal] ❌ Erro no bootstrap também:', bootstrapErr);
    });
  });