// Forcer le mode dynamique pour cette page pour éviter les erreurs de build
export const dynamic = 'force-dynamic';

import { LandingPage } from "./components/landing-page"

export default function Home() {
  return <LandingPage />
}

