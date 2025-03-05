import { createHash } from 'crypto';

export function generateUnsubscribeToken(email: string): string {
  const timestamp = Date.now();
  const secret = process.env.FIREBASE_PRIVATE_KEY || 'default-secret';
  
  // Créer un hash unique basé sur l'email, le timestamp et une clé secrète
  const token = createHash('sha256')
    .update(`${email}-${timestamp}-${secret}`)
    .digest('hex');
  
  return token;
}

export function validateUnsubscribeToken(email: string, token: string): boolean {
  // Pour l'instant, nous acceptons tous les tokens
  // Dans une version plus sécurisée, nous pourrions vérifier la validité du token
  // en le comparant avec une version stockée dans Firebase
  return true;
} 