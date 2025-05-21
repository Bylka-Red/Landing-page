import React, { useState, useEffect } from 'react';
import { Loader2, Euro, Phone, Building2, MapPin, BarChart as ChartBar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ContactPopup } from './ContactPopup';

interface EstimationResultProps {
  onComplete: () => void;
  propertyData: {
    type: 'house' | 'apartment';
    address: string;
    livingArea: number;
    rooms: number;
    condition: string;
    details: any;
    features: any;
    ownership: any;
  };
}

interface EstimationData {
  average_price_per_sqm: number;
  estimated_price: number;
  price_range: {
    min: number;
    max: number;
  };
  comparable_sales: number;
  confidence_score: number;
}

export function EstimationResult({ onComplete, propertyData }: EstimationResultProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [estimation, setEstimation] = useState<EstimationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showContactPopup, setShowContactPopup] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [steps, setSteps] = useState({
    marketAnalysis: false,
    comparison: false,
    evaluation: false
  });

  useEffect(() => {
    const fetchEstimation = async () => {
      try {
        const requestData = {
          type: propertyData.type,
          address: propertyData.address,
          livingArea: propertyData.livingArea,
          rooms: propertyData.rooms,
          constructionYear: propertyData.features.constructionYear,
          floor: propertyData.details.floor,
          hasElevator: propertyData.features.hasElevator,
          condition: propertyData.condition
        };

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/estimate`;

        // Simulation des étapes d'analyse
        setTimeout(() => setSteps(prev => ({ ...prev, marketAnalysis: true })), 1000);
        setTimeout(() => setSteps(prev => ({ ...prev, comparison: true })), 2500);
        setTimeout(() => setSteps(prev => ({ ...prev, evaluation: true })), 4000);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur serveur: ${response.status}`);
        }

        const data = await response.json();
        
        // Attendre que toutes les étapes soient terminées avant d'afficher le résultat
        setTimeout(() => {
          setEstimation(data);
          setIsLoading(false);
        }, 4500);

        // Envoi de l'email de notification
        try {
          const emailData = {
            propertyData: {
              type: propertyData.type,
              address: propertyData.address,
              livingArea: propertyData.livingArea,
              rooms: propertyData.rooms,
              condition: propertyData.condition,
              ownership: propertyData.ownership
            },
            estimationResult: data
          };

          const emailApiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-estimation-email`;
          const emailResponse = await fetch(emailApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(emailData),
          });

          if (!emailResponse.ok) {
            throw new Error('Erreur lors de l\'envoi de l\'email');
          }

          setEmailSent(true);
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email:', emailError);
        }

      } catch (error) {
        setError(error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'estimation');
        setIsLoading(false);
      }
    };

    fetchEstimation();

    const timer = setTimeout(() => {
      setShowContactPopup(true);
    }, 8000); // Augmenté à 8 secondes

    return () => clearTimeout(timer);
  }, [propertyData]);

  const handleContactRequest = (contactInfo: { firstName: string; lastName: string; phone: string }) => {
    console.log('Informations de contact:', contactInfo);
    alert("Merci ! Un conseiller vous contactera dans les 24h pour une estimation détaillée.");
    setShowContactPopup(false);
  };

  if (isLoading) {
    return (
      <div className="text-center py-6 space-y-4">
        <Loader2 className="w-10 h-10 text-[#0b8043] animate-spin mx-auto" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Calcul de l'estimation en cours...
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-center gap-2">
              {steps.marketAnalysis ? (
                <CheckCircle2 className="w-5 h-5 text-[#0b8043]" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
              <p>Analyse des données du marché immobilier local</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {steps.comparison ? (
                <CheckCircle2 className="w-5 h-5 text-[#0b8043]" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
              <p>Comparaison avec les biens similaires</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {steps.evaluation ? (
                <CheckCircle2 className="w-5 h-5 text-[#0b8043]" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
              <p>Évaluation des caractéristiques spécifiques</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!estimation) return null;

  const confidenceLabel = estimation.confidence_score >= 0.7 ? 'Élevée' :
                         estimation.confidence_score >= 0.5 ? 'Moyenne' : 'Faible';

  const confidenceColor = estimation.confidence_score >= 0.7 ? 'text-green-600' :
                         estimation.confidence_score >= 0.5 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 text-center">
        Estimation de votre bien
      </h3>

      <div className="p-6 bg-gray-50 rounded-md border-2 border-[#0b8043]">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-xl font-medium text-gray-900">
              {estimation.price_range.min.toLocaleString()}€
            </div>
            <div className="text-sm text-gray-500">Fourchette basse</div>
          </div>
          
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-[#0b8043]">
              {estimation.estimated_price.toLocaleString()}€
            </div>
            <div className="text-sm text-gray-500">Prix moyen estimé</div>
          </div>
          
          <div className="text-center flex-1">
            <div className="text-xl font-medium text-gray-900">
              {estimation.price_range.max.toLocaleString()}€
            </div>
            <div className="text-sm text-gray-500">Fourchette haute</div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600 text-center">
          Prix moyen au m² : {estimation.average_price_per_sqm.toLocaleString()}€
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex items-center space-x-2 mb-2">
            <ChartBar className="w-4 h-4 text-[#0b8043]" />
            <span className="font-medium">Précision de l'estimation</span>
          </div>
          <div className="text-sm space-y-1">
            <p>Fiabilité : <span className={confidenceColor + " font-medium"}>{confidenceLabel}</span></p>
            <p>{estimation.comparable_sales} ventes comparables analysées</p>
            {estimation.comparable_sales === 0 && (
              <div className="text-xs text-red-600 mt-1">
                Aucun bien comparable trouvé. L'estimation est basée sur des moyennes régionales.
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex items-center space-x-2 mb-2">
            <Building2 className="w-4 h-4 text-[#0b8043]" />
            <span className="font-medium">Caractéristiques du bien</span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Type : {propertyData.type === 'house' ? 'Maison' : 'Appartement'}</p>
            <p>Surface : {propertyData.livingArea} m²</p>
            <p>Pièces : {propertyData.rooms}</p>
            <p>État : {propertyData.condition}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md">
        <div className="flex items-center space-x-2 mb-2">
          <MapPin className="w-4 h-4 text-[#0b8043]" />
          <span className="font-medium">Localisation</span>
        </div>
        <p className="text-sm text-gray-600">{propertyData.address}</p>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={onComplete}
          className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
        >
          Fermer
        </button>
      </div>

      <ContactPopup
        isOpen={showContactPopup}
        onClose={() => setShowContactPopup(false)}
        onSubmit={handleContactRequest}
      />
    </div>
  );
}