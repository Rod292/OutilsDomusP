import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Lire le fichier HTML
    const filePath = path.join(process.cwd(), 'newsletter_code.html');
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    
    // Retourner le contenu
    return NextResponse.json({
      htmlContent
    }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération du template par défaut:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du template par défaut' },
      { status: 500 }
    );
  }
} 