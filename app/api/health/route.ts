import { NextResponse } from 'next/server';

// Route API simple pour vérifier que le serveur est en ligne
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}

// Support pour les requêtes HEAD (utilisées par le health check)
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
} 