// Shims pour résoudre les problèmes d'importation dans Firefox et autres navigateurs
// Ceci est importé dans _app.js

// Définir les shims pour les modules Node.js
if (typeof window !== 'undefined') {
  // Gérer les imports node: en remplacement global
  window.nodeImports = {
    'node:events': require('events'),
    'node:stream': require('stream-browserify'),
    'node:util': require('util'),
    'node:buffer': require('buffer'),
    'node:process': require('process/browser'),
    'node:path': require('path-browserify'),
    'node:os': require('os-browserify/browser'),
    'node:crypto': require('crypto-browserify'),
    'node:http': require('stream-http'),
    'node:https': require('https-browserify'),
    'node:zlib': require('browserify-zlib')
  };

  // Vérifier si nous sommes sur Firefox qui peut avoir des problèmes spécifiques
  const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.indexOf('Firefox') > -1;
  
  if (isFirefox) {
    console.log('Navigateur Firefox détecté, application de shims supplémentaires');
    
    // Firefox peut avoir des problèmes avec Buffer
    if (!window.Buffer) {
      window.Buffer = require('buffer').Buffer;
    }
    
    // Firefox peut avoir des problèmes avec process
    if (!window.process) {
      window.process = require('process/browser');
    }
  }
  
  console.log('📦 Shims pour navigateur chargés');
} 