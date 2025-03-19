export interface CommunicationDetail {
  type: 'newsletter' | 'panneau' | 'flyer' | 'carousel' | 'video' | 'post_site' | 'post_linkedin' | 'post_instagram' | 'idee' | 'plan_2d_3d' | 'autre';
  customType?: string; // Pour permettre de personnaliser le nom du type 'autre'
  deadline?: Date | null;
  details?: string;
  status?: string;
  platform?: 'site' | 'linkedin' | 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'autre' | null;
  mediaType?: 'photo' | 'video' | 'texte' | 'autre' | null;
  priority?: 'faible' | 'moyenne' | 'élevée' | 'urgente';
  assignedTo?: string[];
  originalIndex?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'faible' | 'moyenne' | 'élevée' | 'urgente';
  status: 'à faire' | 'en cours' | 'terminée' | 'todo' | 'in-progress' | 'done' | 'idée' | 'en développement' | 'à tourner' | 'à éditer' | 'écrire légende' | 'prêt à publier' | 'publié' | 'archivé';
  assignedTo: string[];
  assignedToName?: string | null;
  dueDate?: Date | null;
  reminder?: Date | null;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Nouveaux champs pour les actions commerciales immobilières
  propertyAddress?: string; // Adresse du local
  dossierNumber?: string;   // Numéro logi-pro
  actionType: 'newsletter' | 'panneau' | 'flyer' | 'carousel' | 'video' | 'post_site' | 'post_linkedin' | 'post_instagram' | 'idee' | 'plan_2d_3d' | 'autre';
  platform?: 'site' | 'linkedin' | 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'autre' | null;
  mediaType?: 'photo' | 'video' | 'texte' | 'autre' | null;
  
  // Nouveau champ pour les détails de communication multiples
  communicationDetails?: CommunicationDetail[];
  
  // Nouveau champ pour indiquer si le mandat est signé
  mandatSigne?: boolean;
}

export interface TeamMember {
  id?: string;
  name: string;
  email: string;
  photoURL?: string;
  role?: string;
}

export type CommunicationType = 
  'appel' | 
  'sms' | 
  'email' | 
  'rdv_physique' | 
  'rdv_tel' | 
  'courrier' | 
  'commentaire' | 
  'envoi_doc' | 
  'autre' | 
  'idee' | 
  'plan_2d_3d'; 