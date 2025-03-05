import { redirect } from "next/navigation"

export default function ConsultantRootPage() {
  // Par défaut, rediriger vers un consultant spécifique
  // Vous pouvez modifier cette valeur selon votre choix
  redirect('/consultant/default/new-report')
} 