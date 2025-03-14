import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Récupérer les données du webhook
    const data = await request.json()
    
    // Enregistrer l'événement reçu pour le débogage
    console.log('Webhook DocuSeal reçu:', {
      event: data.event,
      timestamp: new Date().toISOString(),
      data: data
    })
    
    // Traiter l'événement en fonction de son type
    switch (data.event) {
      case 'form.viewed':
        console.log(`Formulaire consulté - ID: ${data.form.id}, par: ${data.submitter?.email || 'Anonyme'}`)
        // Vous pourriez mettre à jour votre BDD pour suivre les consultations
        break
        
      case 'form.started':
        console.log(`Formulaire commencé - ID: ${data.form.id}, par: ${data.submitter?.email || 'Anonyme'}`)
        // Vous pourriez envoyer une notification ou mettre à jour le statut
        break
        
      case 'form.completed':
        console.log(`Formulaire complété - ID: ${data.form.id}, par: ${data.submitter?.email || 'Anonyme'}`)
        // Action importante : mise à jour du statut, notification, etc.
        
        // Exemple : vous pourriez mettre à jour le statut dans Firebase
        /*
        const { db } = await import('@/app/firebase/config');
        await db.collection('etatsDeLieux').doc(data.form.external_id).update({
          status: 'signé',
          signedAt: new Date(),
          signataires: data.submitters || []
        });
        */
        break
        
      case 'form.declined':
        console.log(`Formulaire refusé - ID: ${data.form.id}, par: ${data.submitter?.email || 'Anonyme'}`)
        // Vous pourriez notifier l'administrateur d'un refus
        break
        
      default:
        console.log(`Événement non géré: ${data.event}`)
    }
    
    // Renvoyer une confirmation au webhook
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors du traitement du webhook DocuSeal:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
} 