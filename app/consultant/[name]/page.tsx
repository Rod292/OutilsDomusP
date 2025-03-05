import { redirect } from "next/navigation"

export default function ConsultantPage({ params }: { params: { name: string } }) {
  // Redirect to the new-report page
  redirect(`/consultant/${params.name}/new-report`)
}

