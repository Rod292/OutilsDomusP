'use client';

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useUserAuth } from "../contexts/UserAuthContext";
import { registerTokenForConsultantDirect } from "../services/notificationService";
import { Bell } from "lucide-react";

export interface FixNotificationTokensButtonProps {
  consultant?: string;
}

export default function FixNotificationTokensButton({ consultant }: FixNotificationTokensButtonProps) {
  const { user } = useUserAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleFixTokens = async () => {
    if (!user?.email || !consultant) {
      console.error("Email de l'utilisateur ou consultant non disponible");
      return;
    }

    setIsLoading(true);
    try {
      // Utiliser la fonction d'enregistrement direct
      const success = await registerTokenForConsultantDirect(
        user.email,
        consultant
      );

      if (success) {
        console.log(`Tokens enregistrés avec succès pour ${consultant}`);
      } else {
        console.error(`Échec de l'enregistrement des tokens pour ${consultant}`);
      }
    } catch (error) {
      console.error("Erreur lors de la tentative de correction des tokens:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleFixTokens}
      disabled={isLoading || !user?.email || !consultant}
      className="flex items-center gap-1"
    >
      <Bell className="h-4 w-4" />
      <span>{isLoading ? "Activation..." : "Activer les notifications"}</span>
    </Button>
  );
} 