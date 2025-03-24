import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Formate une date au format complet français
 * @param date Date à formater
 * @returns String au format dd MMMM yyyy (ex: 01 janvier 2023)
 */
export const formatFullDate = (date: Date | null | undefined): string => {
  if (!date) {
    return '';
  }
  
  try {
    return format(date, 'dd MMMM yyyy', { locale: fr });
  } catch (error) {
    console.error('Erreur de formatage de date:', error);
    return date.toLocaleDateString('fr-FR');
  }
};

/**
 * Formate une date au format court français
 * @param date Date à formater
 * @returns String au format dd/MM/yyyy (ex: 01/01/2023)
 */
export const formatShortDate = (date: Date | null | undefined): string => {
  if (!date) {
    return '';
  }
  
  try {
    return format(date, 'dd/MM/yyyy', { locale: fr });
  } catch (error) {
    console.error('Erreur de formatage de date:', error);
    return date.toLocaleDateString('fr-FR');
  }
};

/**
 * Formate une date et heure au format français
 * @param date Date à formater
 * @returns String au format dd/MM/yyyy HH:mm (ex: 01/01/2023 14:30)
 */
export const formatDateTime = (date: Date | null | undefined): string => {
  if (!date) {
    return '';
  }
  
  try {
    return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
  } catch (error) {
    console.error('Erreur de formatage de date et heure:', error);
    return date.toLocaleString('fr-FR');
  }
}; 