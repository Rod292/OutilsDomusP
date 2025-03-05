"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Copy, Mail, Send } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function EmailProfessionnel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consultant = searchParams.get('consultant');
  const { user, loading } = useAuth();
  const [transitionOpacity, setTransitionOpacity] = useState('opacity-0');
  
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [emailType, setEmailType] = useState('commercial');
  const [recipient, setRecipient] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
    if (!loading && !user) {
      router.push('/email-signin');
      return;
    }

    // Rediriger vers la page d'accueil si aucun consultant n'est sélectionné
    if (!loading && !consultant) {
      router.push('/');
      return;
    }

    // Animation d'entrée
    const timer = setTimeout(() => {
      setTransitionOpacity('opacity-100');
    }, 100);

    return () => clearTimeout(timer);
  }, [user, loading, router, consultant]);

  const handleGenerateEmail = async () => {
    if (!emailType || !recipient) {
      toast({
        title: "Information manquante",
        description: "Veuillez sélectionner un type d'email et indiquer un destinataire.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simuler la génération d'un email (à remplacer par un appel API réel)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Exemples d'emails selon le type
      if (emailType === 'commercial') {
        setEmailSubject('Proposition commerciale - Arthur Loyd');
        setEmailContent(`Bonjour,

Je me permets de vous contacter suite à notre échange concernant vos besoins immobiliers.

Chez Arthur Loyd, nous proposons des solutions adaptées à vos exigences spécifiques. Après analyse de votre situation, je souhaiterais vous présenter plusieurs options qui pourraient répondre à vos attentes.

Seriez-vous disponible pour un rendez-vous la semaine prochaine afin d'échanger plus en détail sur ces opportunités ?

Cordialement,
${user?.displayName || consultant}
Arthur Loyd`);
      } else if (emailType === 'suivi') {
        setEmailSubject('Suivi de notre rendez-vous - Arthur Loyd');
        setEmailContent(`Bonjour,

Je tenais à vous remercier pour notre rendez-vous de la semaine dernière concernant votre projet immobilier.

Suite à nos échanges, j'ai identifié plusieurs biens qui correspondent aux critères que nous avons définis ensemble. Je vous propose de les découvrir lors d'une visite que nous pourrions organiser selon vos disponibilités.

N'hésitez pas à me faire part de vos questions ou remarques.

Cordialement,
${user?.displayName || consultant}
Arthur Loyd`);
      } else if (emailType === 'relance') {
        setEmailSubject('Suivi de votre recherche immobilière - Arthur Loyd');
        setEmailContent(`Bonjour,

Je me permets de revenir vers vous concernant votre recherche immobilière.

Depuis notre dernier échange, de nouvelles opportunités correspondant à vos critères sont apparues sur le marché. Je serais ravi de vous les présenter si vous êtes toujours en recherche active.

Pourriez-vous me confirmer si vous souhaitez que nous poursuivions ensemble cette recherche ?

Cordialement,
${user?.displayName || consultant}
Arthur Loyd`);
      }
      
      toast({
        title: "Email généré avec succès",
        description: "Vous pouvez maintenant personnaliser votre email.",
      });
    } catch (error) {
      console.error("Erreur lors de la génération de l'email", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la génération de l'email.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    const fullEmail = `Objet: ${emailSubject}\n\n${emailContent}`;
    navigator.clipboard.writeText(fullEmail);
    toast({
      title: "Copié !",
      description: "L'email a été copié dans le presse-papier.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 transition-opacity duration-300 ${transitionOpacity}`}>
      <Header />
      <Toaster />
      
      <div className="py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#2D2D2D]">Éditeur d'Emails Professionnels</h1>
            {consultant && <span className="mt-2 text-[#DC0032] font-medium text-sm bg-red-50 px-3 py-1 rounded-md">Consultant: {consultant}</span>}
            <p className="text-lg text-gray-600 mt-2">Créez et personnalisez des emails professionnels</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-xl text-[#2D2D2D]">Paramètres</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-type">Type d'email</Label>
                    <Select value={emailType} onValueChange={setEmailType}>
                      <SelectTrigger id="email-type">
                        <SelectValue placeholder="Sélectionnez un type d'email" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commercial">Email commercial</SelectItem>
                        <SelectItem value="suivi">Email de suivi</SelectItem>
                        <SelectItem value="relance">Email de relance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="recipient">Destinataire</Label>
                    <Input 
                      id="recipient" 
                      placeholder="Nom du destinataire" 
                      value={recipient} 
                      onChange={(e) => setRecipient(e.target.value)} 
                    />
                  </div>
                  
                  <Button 
                    className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white"
                    onClick={handleGenerateEmail}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Génération...
                      </>
                    ) : (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        Générer un email
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-xl text-[#2D2D2D]">Éditeur d'email</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-subject">Objet</Label>
                    <Input 
                      id="email-subject" 
                      placeholder="Objet de l'email" 
                      value={emailSubject} 
                      onChange={(e) => setEmailSubject(e.target.value)} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email-content">Contenu</Label>
                    <Textarea 
                      id="email-content" 
                      placeholder="Contenu de l'email" 
                      className="min-h-[300px]" 
                      value={emailContent} 
                      onChange={(e) => setEmailContent(e.target.value)} 
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleCopyToClipboard}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copier
                    </Button>
                    <Button 
                      className="flex-1 bg-[#DC0032] hover:bg-[#DC0032]/90 text-white"
                      onClick={() => {
                        toast({
                          title: "Fonctionnalité à venir",
                          description: "L'envoi direct d'emails sera disponible prochainement.",
                        });
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 