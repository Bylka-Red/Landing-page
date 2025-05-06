import React from 'react';
import { Loader2, Euro, Phone, Building2, MapPin, BarChart as ChartBar, AlertCircle } from 'lucide-react';

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
  debug_logs?: Array<{
    message: string;
    data?: any;
    timestamp: string;
  }>;
}

export function EstimationResult({ onComplete, propertyData }: EstimationResultProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [estimation, setEstimation] = React.useState<EstimationData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [debugInfo, setDebugInfo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchEstimation = async () => {
      try {
        const requestData = {
          type: propertyData.type,
          address: propertyData.address,
          livingArea: propertyData.livingArea,
          rooms: propertyData.rooms,
          constructionYear: propertyData.constructionYear,
          floor: propertyData.floor,
          hasElevator: propertyData.hasElevator,
          condition: propertyData.condition
        };

        console.log('Envoi de la requête avec les données:', requestData);
        
        const response = await fetch('/.netlify/functions/estimate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        console.log('Statut de la réponse:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Réponse d\'erreur du serveur:', errorData);
          
          if (errorData.debug_logs) {
            console.log('Logs de débogage:', errorData.debug_logs);
          }
          
          throw new Error(errorData.error || `Erreur serveur: ${response.status}`);
        }

        const data = await response.json();
        console.log('Données reçues de l\'API:', data);
        
        if (data.debug_logs) {
          console.log('Logs de débogage:', data.debug_logs);
          setDebugInfo(JSON.stringify(data.debug_logs, null, 2));
        }
        
        setEstimation(data);
      } catch (err) {
        console.error('Erreur détaillée:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de l\'estimation');
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
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4 font-medium">{error}</p>
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <details className="mb-4 text-left bg-gray-100 p-3 rounded-md">
            <summary className="cursor-pointer text-sm text-gray-700 font-medium">Détails techniques</summary>
            <pre className="mt-2 text-xs overflow-auto max-h-40">{debugInfo}</pre>
          </details>
        )}
        <div className="flex space-x-3 justify-center">
          <button
            onClick={onComplete}
            className="px-4 py-2 text-sm bg-[#0b8043] text-white rounded-md hover:bg-[#096a36] transition-colors font-medium"
          >
            Retour
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Réessayer
          </button>
        </div>
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

      {process.env.NODE_ENV === 'development' && estimation.debug_logs && (
        <details className="bg-gray-50 p-4 rounded-md">
          <summary className="cursor-pointer font-medium text-gray-700">Logs de débogage</summary>
          <pre className="mt-4 text-xs overflow-auto max-h-96 bg-gray-100 p-4 rounded">
            {JSON.stringify(estimation.debug_logs, null, 2)}
          </pre>
        </details>
      )}

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