/**
 * Stub pour firebase-admin côté client
 * 
 * Ce fichier est utilisé pour remplacer les imports de firebase-admin côté client,
 * car firebase-admin ne peut être utilisé que côté serveur.
 * 
 * Il fournit des implémentations vides des méthodes couramment utilisées pour éviter les erreurs.
 */

console.log('💡 Module firebase-admin remplacé par un stub côté client.');

// Créer des stubs pour les fonctionnalités courantes de firebase-admin
const noopFunction = () => {};
const noopAsyncFunction = async () => {};
const noopAsyncReturnEmptyArray = async () => [];
const noopAsyncReturnEmptyObject = async () => ({});

// Stub pour Firestore
const firestoreStub = {
  collection: () => ({
    doc: () => ({
      get: noopAsyncReturnEmptyObject,
      set: noopAsyncFunction,
      update: noopAsyncFunction,
      delete: noopAsyncFunction,
      onSnapshot: noopFunction,
      where: () => firestoreStub.collection(),
      orderBy: () => firestoreStub.collection(),
      limit: () => firestoreStub.collection(),
    }),
    get: noopAsyncReturnEmptyArray,
    add: noopAsyncReturnEmptyObject,
    where: () => firestoreStub.collection(),
    orderBy: () => firestoreStub.collection(),
    limit: () => firestoreStub.collection(),
  }),
  batch: () => ({
    set: noopFunction,
    update: noopFunction,
    delete: noopFunction,
    commit: noopAsyncFunction,
  }),
  runTransaction: noopAsyncFunction,
};

// Stub pour Auth
const authStub = {
  verifyIdToken: noopAsyncReturnEmptyObject,
  getUser: noopAsyncReturnEmptyObject,
  listUsers: noopAsyncReturnEmptyObject,
  createUser: noopAsyncReturnEmptyObject,
  updateUser: noopAsyncReturnEmptyObject,
  deleteUser: noopAsyncFunction,
};

// Stub pour Messaging
const messagingStub = {
  send: noopAsyncReturnEmptyObject,
  sendMulticast: noopAsyncReturnEmptyObject,
  sendToDevice: noopAsyncReturnEmptyObject,
  sendToTopic: noopAsyncReturnEmptyObject,
};

// Stub pour Storage
const storageStub = {
  bucket: () => ({
    file: () => ({
      getSignedUrl: noopAsyncReturnEmptyArray,
      delete: noopAsyncFunction,
      save: noopAsyncFunction,
      download: noopAsyncReturnEmptyArray,
    }),
    upload: noopAsyncReturnEmptyObject,
    getFiles: noopAsyncReturnEmptyArray,
  }),
};

// Exporter les stubs
module.exports = {
  apps: [],
  app: () => ({
    firestore: () => firestoreStub,
    auth: () => authStub,
    messaging: () => messagingStub,
    storage: () => storageStub,
  }),
  firestore: () => firestoreStub,
  auth: () => authStub,
  messaging: () => messagingStub,
  storage: () => storageStub,
  credential: {
    cert: () => ({}),
    applicationDefault: () => ({}),
  },
  initializeApp: () => ({
    firestore: () => firestoreStub,
    auth: () => authStub,
    messaging: () => messagingStub,
    storage: () => storageStub,
  }),
};

// Ajouter un avertissement global
if (typeof window !== 'undefined') {
  console.log('💡 firebase-admin remplacé par un stub côté client. Utilisez firebase/app à la place pour le client.');
} 