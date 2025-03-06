import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';

export async function GET() {
  try {
    // Lire le fichier HTML
    const filePath = path.join(process.cwd(), 'newsletter_code.html');
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    
    // Vérifier si le template par défaut existe dans Firestore
    const templatesRef = collection(db, 'newsletterTemplates');
    const q = query(templatesRef, where('name', '==', 'PEM SUD - Template par défaut'));
    const querySnapshot = await getDocs(q);
    
    // Si le template par défaut n'existe pas, le créer
    if (querySnapshot.empty) {
      const defaultTemplateRef = doc(collection(db, 'newsletterTemplates'));
      await setDoc(defaultTemplateRef, {
        name: 'PEM SUD - Template par défaut',
        htmlContent,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isDefault: true
      });
      console.log('Template par défaut créé dans Firestore');
    } else {
      // Si le template par défaut existe, mettre à jour son contenu
      const defaultTemplateDoc = querySnapshot.docs[0];
      await setDoc(doc(db, 'newsletterTemplates', defaultTemplateDoc.id), {
        name: 'PEM SUD - Template par défaut',
        htmlContent,
        createdAt: defaultTemplateDoc.data().createdAt || Timestamp.now(),
        updatedAt: Timestamp.now(),
        isDefault: true
      }, { merge: true });
      console.log('Template par défaut mis à jour dans Firestore');
    }
    
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