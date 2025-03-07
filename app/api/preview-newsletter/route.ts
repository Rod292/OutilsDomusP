import { NextRequest, NextResponse } from 'next/server';
import { replaceFirebaseUrlsWithProxy } from '@/app/utils/firebase-proxy';
import { convertToProxyUrl } from '@/app/utils/firebase-proxy';

export async function GET(request: NextRequest) {
  try {
    const consultant = request.nextUrl.searchParams.get('consultant') || 'nathalie';
    
    // Obtenir le domaine de base (localhost en développement, URL réelle en production)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Utiliser le proxy pour les URLs Firebase avec des URLs complètes (pas de chemins relatifs)
    const logoUrl = `${baseUrl}/api/firebase-proxy?path=newsletter-images%2Flogo-arthur-loyd.png&bucket=etat-des-lieux-arthur-loyd.firebasestorage.app`;
    console.log('Logo URL:', logoUrl);
    
    const logoFooterUrl = `${baseUrl}/api/firebase-proxy?path=newsletter-images%2FLogoFooterEmail.png&bucket=etat-des-lieux-arthur-loyd.firebasestorage.app`;
    console.log('Logo Footer URL:', logoFooterUrl);
    
    // Remplacer tous les autres URLs Firebase dans le texte du template
    let html = getHTMLTemplate(consultant, logoUrl, logoFooterUrl);
    html = replaceFirebaseUrlsWithProxy(html);
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Erreur lors de la prévisualisation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la prévisualisation' },
      { status: 500 }
    );
  }
}

// Fonction qui génère le template HTML pour la prévisualisation
function getHTMLTemplate(consultant: string, logoUrl: string, logoFooterUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Newsletter Arthur Loyd</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f0f0f0;
      color: #333333;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    .newsletter-container {
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      text-align: center;
      padding: 20px;
      background-color: #ffffff;
    }
    .logo {
      max-width: 180px;
      width: 180px;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    .headline {
      background-color: #e50019;
      color: #ffffff;
      text-align: center;
      padding: 30px 20px;
      font-family: 'Arial', sans-serif;
      font-weight: 700;
      font-size: 22px;
      line-height: 1.4;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .footer {
      background-color: #464254;
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    
    /* Styles spécifiques pour mobile */
    @media only screen and (max-width: 600px) {
      .photo-container {
        width: 100% !important;
        height: auto !important;
        line-height: normal !important;
        margin-bottom: 25px;
      }
      .photo-container img {
        height: auto !important;
        max-height: 250px !important;
        max-width: 100% !important;
      }
      .footer img {
        max-width: 90%;
      }
      .logo {
        max-width: 160px !important;
        width: 160px !important;
        margin: 0 auto !important;
        display: block !important;
      }
      table[class="secondary-photos"] td {
        padding: 0 10px !important;
      }
      table[class="secondary-photos"] div {
        width: 240px !important;
        height: 180px !important;
      }
    }
  </style>
</head>
<body>
  <div class="newsletter-container">
    <!-- En-tête avec logo -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
      <tr>
        <td align="center" style="padding: 20px; text-align: center;">
          <img src="${logoUrl}" alt="Arthur Loyd Logo" class="logo" width="180" height="auto" style="display: block; margin: 0 auto;">
        </td>
      </tr>
    </table>
    <div class="content">
      <h1>Bonjour ${consultant},</h1>
      <p>Voici un aperçu de votre newsletter.</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc quis nisl.</p>
      <p>Vous pouvez modifier ce contenu dans l'éditeur visuel.</p>
      <div style="margin: 20px 0; text-align: center;">
        <img src="https://firebasestorage.googleapis.com/v0/b/etat-des-lieux-arthur-loyd.firebasestorage.app/o/newsletter-templates%2Fdefault%2Fproject-photo-1.png?alt=media" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      </div>
      <h2>Des bureaux modernes au cœur de Saint-Brieuc</h2>
      <ul>
        <li>Surface de 400 m²</li>
        <li>4 bureaux indépendants</li>
        <li>Espace de réunion</li>
        <li>Kitchenette équipée</li>
      </ul>
    </div>
    <div class="footer">
      <img src="${logoFooterUrl}" alt="Arthur Loyd - Créateur de possibilités" style="max-width: 400px; height: auto;">
      <div>© 2025 Arthur Loyd. Tous droits réservés.</div>
      <div>Pour vous désinscrire, <a href="#" style="color: white;">cliquez ici</a>.</div>
      <div class="social-links">
        <a href="#">LinkedIn</a>
        <a href="#">Instagram</a>
        <a href="#">Site Web</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const { consultant, logoUrl, logoFooterUrl, mainPhoto, additionalPhotos } = await req.json();

    if (!consultant || !logoUrl || !logoFooterUrl || !mainPhoto) {
      return NextResponse.json({ error: 'Tous les paramètres sont requis' }, { status: 400 });
    }

    // Générer le HTML de base
    let html = getHTMLTemplate(consultant, logoUrl, logoFooterUrl);
    
    // Remplacer l'image principale
    html = html.replace(
      /<div style="margin: 20px 0; text-align: center;">\s*<img[^>]*>\s*<\/div>/,
      `<div style="margin: 30px 0; text-align: center;">
        <div style="height: 350px; line-height: 350px; text-align: center; margin-bottom: 20px;">
          <img src="${mainPhoto.url}" alt="${mainPhoto.caption || ''}" style="max-width: 600px; max-height: 350px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); display: inline-block; vertical-align: middle; object-fit: contain;" width="600">
        </div>
        <div style="background-color: #2c3e50; color: white; padding: 10px; border-radius: 5px; display: inline-block; margin-bottom: 30px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 600;">${mainPhoto.caption || 'Vue d\'ensemble'}</div>
      </div>`
    );
    
    // Ajouter les images additionnelles si elles existent
    if (additionalPhotos && additionalPhotos.length > 0) {
      // Créer une table pour les images additionnelles
      let additionalImagesHtml = `
      <div style="margin: 30px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>`;
      
      // Ajouter chaque image dans une cellule
      additionalPhotos.forEach((photo: any, index: number) => {
        additionalImagesHtml += `
            <td style="width: ${100 / additionalPhotos.length}%; padding: 10px; height: 200px; vertical-align: middle; text-align: center;">
              <div style="height: 200px; line-height: 200px; text-align: center;">
                <img src="${photo.url}" alt="${photo.caption || ''}" style="max-width: 100%; max-height: 200px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); display: inline-block; vertical-align: middle; object-fit: contain;">
              </div>
              <div style="text-align: center; margin-top: 10px; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #666;">${photo.caption || `Photo ${index + 1}`}</div>
            </td>`;
      });
      
      additionalImagesHtml += `
          </tr>
        </table>
      </div>`;
      
      // Insérer les images additionnelles avant le footer
      html = html.replace(
        /<div class="footer"/,
        `${additionalImagesHtml}\n<div class="footer"`
      );
    }
    
    // Remplacer les URLs Firebase par des URLs de proxy
    html = replaceFirebaseUrlsWithProxy(html);

    return new NextResponse(html, {
    headers: {
        'Content-Type': 'text/html',
    },
  });
  } catch (error) {
    console.error('Erreur lors de la prévisualisation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la prévisualisation' },
      { status: 500 }
    );
  }
}

// Interface pour les paramètres du template PEM SUD
interface PemSudTemplateParams {
  title: string;
  headline: string;
  introduction: string;
  propertyTitle: string;
  propertyLocation: string;
  propertySize: string;
  propertyPrice: string;
  propertyDescription: string;
  highlightsList: string;
  ctaText: string;
  ctaUrl: string;
  imageUrl1?: string | null;
  imageUrl2?: string | null;
  imageUrl3?: string | null;
  imageUrl4?: string | null;
  processedImageUrl1?: string | null;
  processedImageUrl2?: string | null;
  processedImageUrl3?: string | null;
  processedImageUrl4?: string | null;
  unsubscribeEmail: string;
  logoUrl?: string;
  processedLogoUrl?: string;
  footerLogoUrl?: string;
  processedFooterLogoUrl?: string;
  clientName?: string;
  clientCompany?: string;
}

// Fonction pour générer le template PEM SUD
function generatePemSudTemplate(params: PemSudTemplateParams): string {
  const {
    title,
    headline,
    introduction,
    propertyTitle,
    propertyLocation,
    propertySize,
    propertyPrice,
    propertyDescription,
    highlightsList,
    ctaText,
    ctaUrl,
    processedImageUrl1,
    processedImageUrl2,
    processedImageUrl3,
    processedImageUrl4,
    unsubscribeEmail,
    processedLogoUrl,
    processedFooterLogoUrl,
    clientName,
    clientCompany
  } = params;
  
  // Image principale par défaut si aucune n'est fournie
  const mainImageUrl = processedImageUrl1 || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/newsletter-pemsud/project-photo-1.png`;
  
  // Conversion de la liste de points forts en tableau
  const highlights = highlightsList.split('\n').filter(item => item.trim() !== '');
  
  // Génération des éléments pour les points forts
  const highlightsHtml = highlights.map(highlight => {
    const parts = highlight.split('-');
    const title = parts[0]?.trim() || '';
    const description = parts[1]?.trim() || '';
    
    return `
    <tr>
      <td style="padding: 16px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #DC0032;">
              ${title}
            </td>
          </tr>
          <tr>
            <td style="font-family: Arial, sans-serif; font-size: 14px; line-height: 20px; color: #333333; padding-top: 5px;">
              ${description}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    `;
  }).join('');
  
  // Personnalisation de la phrase d'accroche
  let greetingHtml = '';
  if (clientName || clientCompany) {
    let greeting = 'Bonjour';
    if (clientName) {
      greeting += ` ${clientName}`;
    }
    if (clientCompany) {
      greeting += ` de ${clientCompany}`;
    }
    greeting += ',';
    
    greetingHtml = `
    <tr>
      <td style="padding: 20px 20px 10px 20px;">
        <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333; margin: 0;">
          ${greeting}
        </p>
      </td>
    </tr>
    `;
  }
  
  // Génération des images additionnelles
  let additionalImagesHtml = '';
  
  const images = [processedImageUrl2, processedImageUrl3, processedImageUrl4].filter(img => img !== null);
  
  if (images.length > 0) {
    additionalImagesHtml = `
    <tr>
      <td style="padding: 0 20px 30px 20px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
          <tr>
            ${images.map((img, index) => `
              <td width="50%" style="padding: 0 20px; text-align: center;">
                <div style="width: 260px; height: 190px; margin: 0 auto 15px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                  <img src="${img}" alt="Image du bien" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="background-color: #2c3e50; color: white; padding: 8px; border-radius: 5px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 600; font-size: 14px; display: inline-block; min-width: 200px; max-width: 260px; margin: 0 auto;">Vue ${index + 2}</div>
              </td>
              ${(index + 1) % 2 === 0 && index < images.length - 1 ? '</tr><tr>' : ''}
            `).join('')}
          </tr>
        </table>
      </td>
    </tr>
    `;
  }
  
  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; margin: 20px auto; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      <!-- HEADER -->
      <tr>
        <td style="padding: 20px; text-align: center; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
          <img src="${processedLogoUrl}" alt="Arthur Loyd" style="max-width: 200px; height: auto;">
        </td>
      </tr>
      
      <!-- HEADLINE BANNER -->
      <tr>
        <td style="background-color: #DC0032; padding: 15px 30px; text-align: center; color: white; font-family: Arial, sans-serif; font-size: 22px; font-weight: bold;">
          ${headline}
        </td>
      </tr>
      
      <!-- GREETING (PERSONNALISATION) -->
      ${greetingHtml}
      
      <!-- INTRODUCTION -->
      <tr>
        <td style="padding: ${greetingHtml ? '0' : '30px'} 20px 20px 20px; text-align: center;">
          <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333; margin: 0;">
            ${introduction}
          </p>
        </td>
      </tr>
      
      <!-- MAIN IMAGE -->
      <tr>
        <td style="padding: 0 20px 20px 20px;">
          <img src="${mainImageUrl}" alt="Image principale" style="display: block; width: 100%; max-width: 100%; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
        </td>
      </tr>
      
      <!-- PROPERTY INFO -->
      <tr>
        <td style="padding: 0 20px 20px 20px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f8f8; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 20px; border-bottom: 1px solid #eeeeee;">
                <h2 style="font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #333333; margin: 0;">
                  ${propertyTitle}
                </h2>
              </td>
            </tr>
            <tr>
              <td>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="33.33%" style="padding: 15px; text-align: center; border-right: 1px solid #eeeeee;">
                      <p style="font-family: Arial, sans-serif; font-size: 12px; color: #666666; margin: 0 0 5px 0;">LOCALISATION</p>
                      <p style="font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #333333; margin: 0;">
                        ${propertyLocation}
                      </p>
                    </td>
                    <td width="33.33%" style="padding: 15px; text-align: center; border-right: 1px solid #eeeeee;">
                      <p style="font-family: Arial, sans-serif; font-size: 12px; color: #666666; margin: 0 0 5px 0;">SURFACE</p>
                      <p style="font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #333333; margin: 0;">
                        ${propertySize}
                      </p>
                    </td>
                    <td width="33.33%" style="padding: 15px; text-align: center;">
                      <p style="font-family: Arial, sans-serif; font-size: 12px; color: #666666; margin: 0 0 5px 0;">PRIX</p>
                      <p style="font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #333333; margin: 0;">
                        ${propertyPrice}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      
      <!-- PROPERTY DESCRIPTION -->
      <tr>
        <td style="padding: 0 20px 30px 20px;">
          <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">
            ${propertyDescription}
          </p>
        </td>
      </tr>
      
      <!-- ADDITIONAL IMAGES -->
      ${additionalImagesHtml}
      
      <!-- FEATURES GRID -->
      <tr>
        <td style="padding: 0 20px 30px 20px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f8f8; border-radius: 8px;">
            <tr>
              <td style="padding: 20px 20px 5px 20px; border-bottom: 1px solid #eeeeee;">
                <h3 style="font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #333333; margin: 0;">
                  Points forts
                </h3>
              </td>
            </tr>
            ${highlightsHtml}
          </table>
        </td>
      </tr>
      
      <!-- CTA BUTTON -->
      <tr>
        <td style="padding: 0 20px 40px 20px; text-align: center;">
          <table border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td bgcolor="#DC0032" style="padding: 12px 30px; border-radius: 4px;" align="center">
                <a href="${ctaUrl}" style="font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block;">
            ${ctaText}
          </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      
      <!-- CONTACT SECTION -->
      <tr>
        <td style="padding: 30px 20px; background-color: #f0f0f0; border-bottom: 1px solid #dddddd;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="text-align: center; padding-bottom: 20px;">
                <h3 style="font-family: Arial, sans-serif; font-size: 18px; color: #333333; margin: 0 0 10px 0;">Contactez-nous</h3>
                <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666666; margin: 0;">
                  Nous sommes à votre disposition pour toute information complémentaire
                </p>
              </td>
            </tr>
            <tr>
              <td>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="33.33%" style="text-align: center; padding: 10px;">
                      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; margin: 0; font-weight: bold;">
                        02 98 46 28 14
                      </p>
                      <p style="font-family: Arial, sans-serif; font-size: 12px; color: #666666; margin: 5px 0 0 0;">
                        Appelez-nous
                      </p>
                    </td>
                    <td width="33.33%" style="text-align: center; padding: 10px;">
                      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; margin: 0; font-weight: bold;">
                        contact@arthurloydbretagne.fr
                      </p>
                      <p style="font-family: Arial, sans-serif; font-size: 12px; color: #666666; margin: 5px 0 0 0;">
                        Envoyez-nous un email
                      </p>
                    </td>
                    <td width="33.33%" style="text-align: center; padding: 10px;">
                      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; margin: 0; font-weight: bold;">
                        21 rue de Lyon
                      </p>
                      <p style="font-family: Arial, sans-serif; font-size: 12px; color: #666666; margin: 5px 0 0 0;">
                        29200 Brest
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      
      <!-- FOOTER -->
      <tr>
        <td style="padding: 20px; text-align: center; background-color: #464254; color: #ffffff; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom: 15px;">
                <img src="${processedFooterLogoUrl}" alt="Arthur Loyd - Créateur de possibilités" style="max-width: 400px; height: auto;">
              </td>
            </tr>
            <tr>
              <td style="font-family: Arial, sans-serif; font-size: 14px; color: #ffffff; padding-bottom: 20px; line-height: 1.6;">
                Nous espérons que ce projet retiendra votre attention et nous serions ravis de vous accompagner dans vos futurs investissements immobiliers.
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 20px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 300px; margin: 0 auto; background-color: #363143; border-radius: 4px;">
                  <tr>
                    <td width="33.33%" style="text-align: center; padding: 8px;">
                      <a href="https://www.linkedin.com/company/arthur-loyd-bretagne/" style="color: #ffffff; text-decoration: none; font-size: 14px;">LinkedIn</a>
                    </td>
                    <td width="33.33%" style="text-align: center; padding: 8px;">
                      <a href="https://www.instagram.com/arthurloydbretagne/" style="color: #ffffff; text-decoration: none; font-size: 14px;">Instagram</a>
                    </td>
                    <td width="33.33%" style="text-align: center; padding: 8px;">
                      <a href="https://www.arthur-loyd.com/brest" style="color: #ffffff; text-decoration: none; font-size: 14px;">Site Web</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="font-family: Arial, sans-serif; font-size: 12px; color: #dddddd; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                © ${new Date().getFullYear()} Arthur Loyd Bretagne. Tous droits réservés.
                <br><br>
                <a href="https://www.arthur-loyd.com/brest/politique-confidentialite/" style="color: #ffffff; text-decoration: underline;">Politique de confidentialité</a>
                &nbsp;|&nbsp;
                <a href="{{UNSUBSCRIBE_URL}}" style="color: #ffffff; text-decoration: underline;">Se désabonner</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
} 