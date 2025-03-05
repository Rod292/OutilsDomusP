export function generatePDFContent(data: any) {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>État des Lieux</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1, h2 {
          color: #DC0032;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>État des Lieux</h1>
        
        <h2>Informations Générales</h2>
        <table>
          <tr>
            <th>Type de local</th>
            <td>${data.typeLocal}</td>
          </tr>
          <tr>
            <th>Adresse</th>
            <td>${data.adresse}</td>
          </tr>
          <tr>
            <th>Nombre de pièces</th>
            <td>${data.nombrePieces}</td>
          </tr>
          <tr>
            <th>Propriétaire</th>
            <td>${data.proprietaire.nom}<br>${data.proprietaire.adresse}</td>
          </tr>
          <tr>
            <th>Locataire(s)</th>
            <td>${data.locataire.nom}</td>
          </tr>
        </table>

        <h2>Compteurs</h2>
        <h3>Électricité</h3>
        <table>
          <tr>
            <th>Numéro</th>
            <td>${data.compteurs.electricite.numero}</td>
          </tr>
          <tr>
            <th>Relevé</th>
            <td>${data.compteurs.electricite.releve}</td>
          </tr>
          <tr>
            <th>Date</th>
            <td>${data.compteurs.electricite.date}</td>
          </tr>
          <tr>
            <th>Puissance</th>
            <td>${data.compteurs.electricite.puissance}</td>
          </tr>
          <tr>
            <th>Localisation</th>
            <td>${data.compteurs.electricite.localisation}</td>
          </tr>
        </table>

        <h3>Eau Froide</h3>
        <table>
          <tr>
            <th>Relevé</th>
            <td>${data.compteurs.eauFroide.releve}</td>
          </tr>
          <tr>
            <th>Date</th>
            <td>${data.compteurs.eauFroide.date}</td>
          </tr>
          <tr>
            <th>Localisation</th>
            <td>${data.compteurs.eauFroide.localisation}</td>
          </tr>
        </table>

        <h2>Chauffage</h2>
        <table>
          <tr>
            <th>Type</th>
            <td>${data.chauffage.type}</td>
          </tr>
          ${
            data.chauffage.type === "individuel"
              ? `
          <tr>
            <th>Chaudière - Localisation</th>
            <td>${data.chauffage.chaudiere.localisation}</td>
          </tr>
          <tr>
            <th>Chaudière - État</th>
            <td>${data.chauffage.chaudiere.etat}</td>
          </tr>
          `
              : ""
          }
          <tr>
            <th>Nombre de radiateurs eau</th>
            <td>${data.chauffage.radiateursEau}</td>
          </tr>
          <tr>
            <th>Nombre de convecteurs électriques</th>
            <td>${data.chauffage.convecteursElectriques}</td>
          </tr>
          <tr>
            <th>Ballon - Localisation</th>
            <td>${data.chauffage.ballon.localisation}</td>
          </tr>
          <tr>
            <th>Ballon - État</th>
            <td>${data.chauffage.ballon.etat}</td>
          </tr>
        </table>

        <h2>Remise de clés</h2>
        <table>
          <tr>
            <th>Nombre de clés</th>
            <td>${data.cles.nombre}</td>
          </tr>
          <tr>
            <th>Entrée immeuble</th>
            <td>${data.cles.entreeImmeuble}</td>
          </tr>
          <tr>
            <th>Boîte aux lettres</th>
            <td>${data.cles.boiteAuxLettres}</td>
          </tr>
        </table>

        <h2>État des lieux pièce par pièce</h2>
        ${data.pieces
          .map(
            (piece: any) => `
          <h3>${piece.nom}</h3>
          <table>
            <tr>
              <th>Murs</th>
              <td>${piece.etat.murs}</td>
            </tr>
            <tr>
              <th>Sols</th>
              <td>${piece.etat.sols}</td>
            </tr>
            <tr>
              <th>Plafond</th>
              <td>${piece.etat.plafond}</td>
            </tr>
            <tr>
              <th>Portes</th>
              <td>${piece.etat.portes}</td>
            </tr>
            <tr>
              <th>Fenêtres</th>
              <td>${piece.etat.fenetres}</td>
            </tr>
            <tr>
              <th>Rangement</th>
              <td>${piece.etat.rangement}</td>
            </tr>
            <tr>
              <th>Electricité</th>
              <td>${piece.etat.electricite}</td>
            </tr>
            <tr>
              <th>Chauffage</th>
              <td>${piece.etat.chauffage}</td>
            </tr>
            <tr>
              <th>Ventilation</th>
              <td>${piece.etat.ventilation}</td>
            </tr>
          </table>
          <p><strong>Commentaire:</strong> ${piece.commentaire}</p>
        `,
          )
          .join("")}
      </div>
    </body>
    </html>
  `
}

