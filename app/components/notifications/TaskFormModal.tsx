// Si le modal contient du code similaire à ceci pour envoyer des notifications lors de l'assignation de tâches:
// Envoyer des notifications aux assignés
const sendNotifications = async (taskData: any, taskId: string) => {
  if (!taskData.assignedTo || !taskData.assignedTo.length || !user?.email) return;
  
  console.log("Envoi de notifications aux assignés pour la nouvelle tâche:", taskData.assignedTo);
  
  for (const assignee of taskData.assignedTo) {
    try {
      // Extraire le nom du consultant à partir de l'email
      const consultantName = assignee.split('@')[0] || assignee;
      
      // Construire l'ID de notification (email de l'utilisateur connecté + consultant assigné)
      const notificationId = `${user.email}_${consultantName}`;
      
      // Préparer les données de la notification
      const notificationData = {
        userId: notificationId,
        title: '📋 Nouvelle tâche assignée',
        body: `${consultantName}, une nouvelle tâche "${taskData.title}" vous a été assignée.`,
        type: 'task_assigned',
        taskId
      };
      
      console.log(`Envoi d'une notification à ${user.email} concernant ${consultantName} pour la tâche assignée.`);
      
      // Envoyer la notification
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });
    } catch (error) {
      console.error(`Erreur lors de l'envoi de notification à ${assignee}:`, error);
    }
  }
}; 