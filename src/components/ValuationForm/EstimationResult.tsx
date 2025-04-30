import React from 'react';
import { Loader2, Euro, Phone, Building2, MapPin, BarChart as ChartBar } from 'lucide-react';

interface EstimationResultProps {
  onComplete: () => void;
  propertyData: {
    type: 'house' | 'apartment';
    address: string;
    livingArea: number;
    rooms: number;
    constructionYear?: number;
    floor?: number;
    hasElevator?: boolean;
    condition: string;
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
  const [isLoading, setIsLoading] = React.useState(true);
  const [estimation, setEstimation] = React.useState<EstimationData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchEstimation = async () => {
      try {
        console.log('Sending estimation request with data:', propertyData);
        
        // Vérification que l'adresse est présente
        if (!propertyData.address) {
          throw new Error('Adresse manquante');
        }

        const response = await fetch('/.netlify/functions/estimate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: propertyData.address,
            type: propertyData.type,
            livingArea: propertyData.livingArea,
            rooms: propertyData.rooms,
            constructionYear: propertyData.constructionYear,
            floor: propertyData.floor,
            hasElevator: propertyData.hasElevator,
            condition: propertyData.condition
          }),
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de l\'estimation');
        }
        
        setEstimation(data);
      } catch (err) {
        console.error('Detailed error:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEstimation();
  }, [propertyData]);

  if (isLoading) {
    return (
      <div className="text-center py-6 space-y-4">
        <Loader2 className="w-10 h-10 text-[#0b8043] animate-spin mx-auto" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Calcul de l'estimation en cours...
          </h3>
          <div className="space-y-1.5 text-sm text-gray-600">
            <p>Analyse des données du marché immobilier local</p>
            <p>Comparaison avec les biens similaires</p>
            <p>Évaluation des caractéristiques spécifiques</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={onComplete}
          className="px-4 py-2 text-sm bg-[#0b8043] text-white rounded-md hover:bg-[#096a36] transition-colors font-medium"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!estimation) return null;

  const confidenceLabel = estimation.confidence_score >= 0.7 ? 'Élevée' : 
                         estimation.confidence_score >= 0.5 ? 'Moyenne' : 'Faible';

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 text-center">
        Estimation de votre bien
      </h3>

      <div className="p-4 bg-gray-50 rounded-md border-2 border-[#0b8043]">
        <div className="flex items-center space-x-2 mb-3">
          <Euro className="w-4 h-4 text-[#0b8043]" />
          <h4 className="text-base font-medium text-gray-900">
            Fourchette de prix estimée
          </h4>
        </div>
        <div className="text-2xl font-bold text-[#0b8043] text-center">
          {estimation.price_range.min.toLocaleString()}€ - {estimation.price_range.max.toLocaleString()}€
        </div>
        <div className="mt-2 text-sm text-gray-600 text-center">
          Prix moyen au m² : {estimation.average_price_per_sqm.toLocaleString()}€
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex items-center space-x-2 mb-2">
            <ChartBar className="w-4 h-4 text-[#0b8043]" />
            <span className="font-medium">Précision de l'estimation</span>
          </div>
          <div className="text-sm text-gray-600">
            <p>Fiabilité : {confidenceLabel}</p>
            <p>{estimation.comparable_sales} ventes comparables analysées</p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="w-4 h-4 text-[#0b8043]" />
            <span className="font-medium">Localisation</span>
          </div>
          <p className="text-sm text-gray-600">{propertyData.address}</p>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md border-2 border-gray-200">
        <div className="flex items-start space-x-2">
          <Phone className="w-4 h-4 text-[#0b8043] mt-1" />
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-1.5">
              Affinez votre estimation gratuitement
            </h4>
            <p className="text-sm text-gray-600">
              Un expert local peut affiner cette estimation en tenant compte des spécificités de votre bien
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onComplete}
          className="px-4 py-2 text-sm bg-[#0b8043] text-white rounded-md hover:bg-[#096a36] transition-colors font-medium"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
