rules_version = "2"
service
cloud.firestore
{
  match / databases / { database } / documents
  {
    function isAllowedDomain(email) {
      return (
        email.matches(".*@arthur-loyd[.]fr") ||
        email.matches(".*@arthurloydbretagne[.]fr") ||
        email in ["photos.pers@gmail.com", "rodrigue.pers29@gmail.com"]
      )
    }

    // Règles spécifiques pour les templates de newsletter
    match /newsletter_templates/{templateId} {
      allow read: if true;
      allow write: if request.auth != null && isAllowedDomain(request.auth.token.email);
    }

    // Règle temporaire pour le débogage
    match / { document=** }
    allow
    read: if true;
    write: if request.auth != null && isAllowedDomain(request.auth.token.email);
  }
}

