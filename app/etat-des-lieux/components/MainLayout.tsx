"use client";

import React from 'react';
import { Header } from '../../components/header';

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">État des Lieux</h1>
          <p className="mb-4">
            Bienvenue dans l'outil de gestion des états des lieux. Cette section vous permet de créer,
            modifier et consulter les états des lieux des propriétés.
          </p>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-700">
              Cette fonctionnalité est en cours de développement. Restez à l'écoute pour les mises à jour.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 