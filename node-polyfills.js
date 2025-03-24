// Fichier pour fournir des polyfills Node.js pour le navigateur
// Ceci permet de résoudre les problèmes d'importation avec le préfixe node:

// Importation des polyfills
import 'events/';
import 'stream-browserify';
import 'util/';
import 'buffer/';
import 'process/browser';
import 'path-browserify';
import 'os-browserify/browser';
import 'crypto-browserify';
import 'stream-http';
import 'https-browserify';
import 'browserify-zlib';

// Exporter les modules pour qu'ils puissent être utilisés
export const events = require('events/');
export const stream = require('stream-browserify');
export const util = require('util/');
export const buffer = require('buffer/');
export const process = require('process/browser');
export const path = require('path-browserify');
export const os = require('os-browserify/browser');
export const crypto = require('crypto-browserify');
export const http = require('stream-http');
export const https = require('https-browserify');
export const zlib = require('browserify-zlib');

// Assigner au global pour compatibilité
if (typeof window !== 'undefined') {
  window.Buffer = buffer.Buffer;
  window.process = process;
  
  // Ajouter des propriétés manquantes à process
  if (!window.process.stdout) {
    window.process.stdout = {
      isTTY: false,
      write: function() {},
      end: function() {},
      on: function() {},
      once: function() {},
      emit: function() {},
      removeListener: function() {}
    };
  }
  
  if (!window.process.stderr) {
    window.process.stderr = {
      isTTY: false,
      write: function() {},
      end: function() {},
      on: function() {},
      once: function() {},
      emit: function() {},
      removeListener: function() {}
    };
  }
  
  if (!window.process.stdin) {
    window.process.stdin = {
      isTTY: false,
      on: function() {},
      once: function() {},
      emit: function() {},
      removeListener: function() {}
    };
  }
}

// Ajouter des hooks pour capturer les erreurs liées aux modules natifs
console.log('🛠️ Polyfills Node.js chargés pour environnement navigateur'); 