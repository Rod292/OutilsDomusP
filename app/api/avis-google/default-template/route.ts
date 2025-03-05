import { NextResponse } from 'next/server';

const templates = {
  nouveau: {
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: Poppins, Arial, sans-serif; 
            line-height: 1.6; 
            color: #1A1A1A;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
            background-color: #FFFFFF;
          }
          .footer {
            background-color: #464254;
            padding: 20px;
            color: #ffffff;
            text-align: center;
            border-radius: 0 0 8px 8px;
          }
          .logo { 
            max-width: 200px; 
            margin-bottom: 20px; 
          }
          .content {
            margin: 20px 0;
          }
          .signature { 
            margin-top: 30px; 
            color: #666666;
            font-style: italic;
          }
          .social-links { 
            margin-top: 20px;
            display: flex;
            gap: 10px;
          }
          .social-link { 
            color: #DC0032;
            text-decoration: none;
            padding: 5px 10px;
            border-radius: 4px;
            background-color: #464254;
          }
          .social-link:hover {
            background-color: #3a3746;
          }
          p {
            margin: 10px 0;
          }
          .cta-button {
            display: inline-block;
            background-color: #DC0032;
            color: white !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: bold;
          }
          .cta-button:hover {
            background-color: #B00028;
          }
          .emoji {
            font-size: 1.2em;
            margin: 0 2px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="https://storage.googleapis.com/etat-des-lieux-arthur-loyd.firebasestorage.app/newsletter-images/logo-arthur-loyd-createur.png?GoogleAccessId=firebase-adminsdk-fbsvc%40etat-des-lieux-arthur-loyd.iam.gserviceaccount.com&Expires=16730319600&Signature=qDBmGNnxw1kEnw13zWY76rQyOGcgIhqSEga63Y7BfLMTcD0%2Fym%2FiLKiidUsfSrVNvvECtJVrp9I1SCrSzYaIZA2ESUNoLAtsHDXM9qS32zx4bTRArToAcqzXHOFOUQLtS2aAJObLdFE6T7PafKOA2t4OK3WunCt1ZpLH0JrxbT9rRE%2BkYiIuTdEwcaspOQ8VKSQ%2BxQuZwaHGJi3eFMDFDPK%2BGHNAWbAUTzhiTS6IT9mlrfADYy084I8Ic3PL0TIMP3cOgm1zHr%2BO070g3Xj4Mk%2FbHxY8QiKT7y6WoiobWXzq0c3xEKxnBE9DaZnOBKC8sbJImmPQmrfv19gIR9Howw%3D%3D" alt="Arthur Loyd - Créateur de possibilités" class="logo" style="filter: brightness(1.1);">
          <div class="content">
            <p>Bonjour [NOM_CLIENT],</p>
            <p>Nous espérons que vous vous sentez déjà chez vous dans vos nouveaux locaux ! <span class="emoji">😊</span> Toute l'équipe d'Arthur Loyd Bretagne tient à vous féliciter pour cette nouvelle étape et vous remercie pour la confiance que vous nous avez accordée. <span class="emoji">🤝</span></p>
            <p>Votre projet a été une belle aventure et nous sommes ravis d'avoir pu contribuer à sa réalisation. <span class="emoji">🚀</span> Nous serions très reconnaissants que vous partagiez votre expérience en laissant un avis sur notre fiche Google. <span class="emoji">🌟</span></p>
            <p style="text-align: center;">
              <a href="https://g.page/r/CcAY0_52x3pCEBM/review" class="cta-button">Laisser un avis ici</a>
            </p>
            <p>Vos retours sont précieux pour nous permettre de continuer à offrir un service de qualité et d'accompagner d'autres entreprises comme la vôtre. <span class="emoji">🌟</span></p>
            <p>Encore une fois, merci pour votre confiance, et nous restons à votre disposition si vous avez besoin de quoi que ce soit. <span class="emoji">🤝</span> Très belle continuation dans vos nouveaux espaces.</p>
          </div>
          <div class="footer">
            <img src="https://storage.googleapis.com/etat-des-lieux-arthur-loyd.firebasestorage.app/newsletter-images/logo-arthur-loyd-createur.png?GoogleAccessId=firebase-adminsdk-fbsvc%40etat-des-lieux-arthur-loyd.iam.gserviceaccount.com&Expires=16730319600&Signature=qDBmGNnxw1kEnw13zWY76rQyOGcgIhqSEga63Y7BfLMTcD0%2Fym%2FiLKiidUsfSrVNvvECtJVrp9I1SCrSzYaIZA2ESUNoLAtsHDXM9qS32zx4bTRArToAcqzXHOFOUQLtS2aAJObLdFE6T7PafKOA2t4OK3WunCt1ZpLH0JrxbT9rRE%2BkYiIuTdEwcaspOQ8VKSQ%2BxQuZwaHGJi3eFMDFDPK%2BGHNAWbAUTzhiTS6IT9mlrfADYy084I8Ic3PL0TIMP3cOgm1zHr%2BO070g3Xj4Mk%2FbHxY8QiKT7y6WoiobWXzq0c3xEKxnBE9DaZnOBKC8sbJImmPQmrfv19gIR9Howw%3D%3D" alt="Arthur Loyd - Créateur de possibilités" class="logo" style="filter: brightness(1.1);">
            <div class="signature">
              <p style="color: #ffffff;">Arthur Loyd Bretagne</p>
            </div>
            <div class="social-links">
              <a href="https://www.linkedin.com/company/arthur-loyd-bretagne" class="social-link">LinkedIn</a>
              <a href="https://www.facebook.com/ArthurLoydBretagne" class="social-link">Facebook</a>
            </div>
            <div style="margin-top: 20px; padding: 10px; border-top: 1px solid rgba(255,255,255,0.2);">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?email={{EMAIL}}" style="color: #ffffff !important; text-decoration: underline; font-size: 13px; opacity: 0.7;">Se désinscrire de cette liste de diffusion</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  relance: {
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: Poppins, Arial, sans-serif; 
            line-height: 1.6; 
            color: #1A1A1A;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
            background-color: #FFFFFF;
          }
          .footer {
            background-color: #464254;
            padding: 20px;
            color: #ffffff;
            text-align: center;
            border-radius: 0 0 8px 8px;
          }
          .logo { 
            max-width: 200px; 
            margin-bottom: 20px; 
          }
          .content {
            margin: 20px 0;
          }
          .signature { 
            margin-top: 30px; 
            color: #666666;
            font-style: italic;
          }
          .social-links { 
            margin-top: 20px;
            display: flex;
            gap: 10px;
          }
          .social-link { 
            color: #DC0032;
            text-decoration: none;
            padding: 5px 10px;
            border-radius: 4px;
            background-color: #464254;
          }
          .social-link:hover {
            background-color: #3a3746;
          }
          p {
            margin: 10px 0;
          }
          .cta-button {
            display: inline-block;
            background-color: #DC0032;
            color: white !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: bold;
          }
          .cta-button:hover {
            background-color: #B00028;
          }
          .emoji {
            font-size: 1.2em;
            margin: 0 2px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="https://storage.googleapis.com/etat-des-lieux-arthur-loyd.firebasestorage.app/newsletter-images/logo-arthur-loyd-createur.png?GoogleAccessId=firebase-adminsdk-fbsvc%40etat-des-lieux-arthur-loyd.iam.gserviceaccount.com&Expires=16730319600&Signature=qDBmGNnxw1kEnw13zWY76rQyOGcgIhqSEga63Y7BfLMTcD0%2Fym%2FiLKiidUsfSrVNvvECtJVrp9I1SCrSzYaIZA2ESUNoLAtsHDXM9qS32zx4bTRArToAcqzXHOFOUQLtS2aAJObLdFE6T7PafKOA2t4OK3WunCt1ZpLH0JrxbT9rRE%2BkYiIuTdEwcaspOQ8VKSQ%2BxQuZwaHGJi3eFMDFDPK%2BGHNAWbAUTzhiTS6IT9mlrfADYy084I8Ic3PL0TIMP3cOgm1zHr%2BO070g3Xj4Mk%2FbHxY8QiKT7y6WoiobWXzq0c3xEKxnBE9DaZnOBKC8sbJImmPQmrfv19gIR9Howw%3D%3D" alt="Arthur Loyd - Créateur de possibilités" class="logo" style="filter: brightness(1.1);">
          <div class="content">
            <p>Bonjour [NOM_CLIENT],</p>
            <p>Il est difficile de croire que cela fait déjà un an que vous avez investi vos nouveaux locaux ! Toute l'équipe d'Arthur Loyd Bretagne espère que vous vous sentez toujours aussi bien et que cette première année a été une belle réussite pour vous. <span class="emoji">🌟</span></p>
            <p>Nous gardons un excellent souvenir de votre projet et sommes ravis d'avoir pu contribuer à sa réalisation. Pourriez-vous partager votre expérience en nous laissant un avis sur notre fiche Google ? Votre retour est précieux et nous aidera à continuer d'offrir un service de qualité à d'autres entreprises comme la vôtre. <span class="emoji">🌟</span></p>
            <p style="text-align: center;">
              <a href="https://g.page/r/CcAY0_52x3pCEBM/review" class="cta-button">Laisser un avis ici</a>
            </p>
            <p>Un grand merci pour la confiance que vous nous avez témoignée. N'hésitez pas à nous solliciter si vous avez besoin d'aide ou de conseils, nous sommes à votre entière disposition.</p>
            <p>Nous vous souhaitons encore beaucoup de succès dans vos locaux,</p>
          </div>
          <div class="footer">
            <img src="https://storage.googleapis.com/etat-des-lieux-arthur-loyd.firebasestorage.app/newsletter-images/logo-arthur-loyd-createur.png?GoogleAccessId=firebase-adminsdk-fbsvc%40etat-des-lieux-arthur-loyd.iam.gserviceaccount.com&Expires=16730319600&Signature=qDBmGNnxw1kEnw13zWY76rQyOGcgIhqSEga63Y7BfLMTcD0%2Fym%2FiLKiidUsfSrVNvvECtJVrp9I1SCrSzYaIZA2ESUNoLAtsHDXM9qS32zx4bTRArToAcqzXHOFOUQLtS2aAJObLdFE6T7PafKOA2t4OK3WunCt1ZpLH0JrxbT9rRE%2BkYiIuTdEwcaspOQ8VKSQ%2BxQuZwaHGJi3eFMDFDPK%2BGHNAWbAUTzhiTS6IT9mlrfADYy084I8Ic3PL0TIMP3cOgm1zHr%2BO070g3Xj4Mk%2FbHxY8QiKT7y6WoiobWXzq0c3xEKxnBE9DaZnOBKC8sbJImmPQmrfv19gIR9Howw%3D%3D" alt="Arthur Loyd - Créateur de possibilités" class="logo" style="filter: brightness(1.1);">
            <div class="signature">
              <p style="color: #ffffff;">Arthur Loyd Bretagne</p>
            </div>
            <div class="social-links">
              <a href="https://www.linkedin.com/company/arthur-loyd-bretagne" class="social-link">LinkedIn</a>
              <a href="https://www.facebook.com/ArthurLoydBretagne" class="social-link">Facebook</a>
            </div>
            <div style="margin-top: 20px; padding: 10px; border-top: 1px solid rgba(255,255,255,0.2);">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?email={{EMAIL}}" style="color: #ffffff !important; text-decoration: underline; font-size: 13px; opacity: 0.7;">Se désinscrire de cette liste de diffusion</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'nouveau';

  if (!(type in templates)) {
    return NextResponse.json({ error: 'Type de template invalide' }, { status: 400 });
  }

  return NextResponse.json(templates[type as keyof typeof templates]);
} 