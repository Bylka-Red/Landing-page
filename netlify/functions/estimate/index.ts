import { createClient } from '@supabase/supabase-js';

interface PropertyData {
  type: 'house' | 'apartment';
  address: string;
  livingArea: number;
  rooms: number;
  constructionYear?: number;
  floor?: number;
  hasElevator?: boolean;
  condition: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const handler = async (req: Request) => {
  // Gestion des requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validation du body de la requête
    if (!req.body) {
      throw new Error('Données manquantes');
    }

    const propertyData: PropertyData = await req.json();

    // Validation des champs requis
    if (!propertyData.address) throw new Error('Adresse manquante');
    if (!propertyData.type) throw new Error('Type de bien manquant');
    if (!propertyData.livingArea) throw new Error('Surface habitable manquante');
    if (!propertyData.rooms) throw new Error('Nombre de pièces manquant');
    if (!propertyData.condition) throw new Error('État du bien manquant');

    // Initialisation de Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.VITE_SUPABASE_ANON_KEY || ''
    );

    // Géocodage de l'adresse
    const geocodeResponse = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(propertyData.address)}&limit=1`
    );
    
    if (!geocodeResponse.ok) {
      throw new Error('Erreur lors de la géolocalisation');
    }

    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.features?.[0]) {
      throw new Error('Adresse non trouvée');
    }

    const [longitude, latitude] = geocodeData.features[0].geometry.coordinates;

    // Recherche de biens comparables
    const { data: comparableSales, error: dbError } = await supabase
      .from('property_sales')
      .select('*')
      .eq('type', propertyData.type)
      .gte('surface', propertyData.livingArea * 0.8)
      .lte('surface', propertyData.livingArea * 1.2)
      .gte('latitude', latitude - 0.015)
      .lte('latitude', latitude + 0.015)
      .gte('longitude', longitude - 0.015)
      .lte('longitude', longitude + 0.015)
      .order('date', { ascending: false });

    if (dbError) {
      console.error('Erreur Supabase:', dbError);
      throw new Error('Erreur lors de la récupération des données');
    }

    // Log pour debugging
    console.log({
      address: propertyData.address,
      coordinates: { latitude, longitude },
      comparableSalesCount: comparableSales?.length,
      searchCriteria: {
        type: propertyData.type,
        surfaceMin: propertyData.livingArea * 0.8,
        surfaceMax: propertyData.livingArea * 1.2,
        latitudeRange: [latitude - 0.015, latitude + 0.015],
        longitudeRange: [longitude - 0.015, longitude + 0.015]
      }
    });

    // Calcul du prix
    const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
    let estimatedPrice = defaultPricePerM2 * propertyData.livingArea;

    if (comparableSales && comparableSales.length > 0) {
      // Calcul de la moyenne pondérée par la date
      const totalWeight = comparableSales.reduce((sum, sale) => sum + 1, 0);
      const weightedSum = comparableSales.reduce((sum, sale, index) => {
        const weight = (comparableSales.length - index) / totalWeight;
        return sum + (sale.price / sale.surface) * weight;
      }, 0);

      estimatedPrice = weightedSum * propertyData.livingArea;
    }

    // Ajustements selon l'état
    const conditionMultipliers = {
      'À rénover': 0.8,
      'Travaux à prévoir': 0.9,
      'Bon état': 1,
      'Très bon état': 1.1,
      'Refait à neuf': 1.15,
      'Neuf': 1.2
    };

    const multiplier = conditionMultipliers[propertyData.condition] || 1;
    const adjustedPrice = estimatedPrice * multiplier;

    // Calcul de la marge d'erreur
    const margin = comparableSales?.length >= 5 ? 0.05 : 
                  comparableSales?.length >= 3 ? 0.07 : 0.1;

    const estimate = {
      average_price_per_sqm: Math.round(adjustedPrice / propertyData.livingArea),
      estimated_price: Math.round(adjustedPrice),
      price_range: {
        min: Math.round(adjustedPrice * (1 - margin)),
        max: Math.round(adjustedPrice * (1 + margin))
      },
      comparable_sales: comparableSales?.length || 0,
      confidence_score: calculateConfidenceScore(comparableSales?.length || 0)
    };

    return new Response(
      JSON.stringify(estimate),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('Erreur détaillée:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Une erreur est survenue'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
};

function calculateConfidenceScore(numComparables: number): number {
  if (numComparables >= 5) return 0.9;
  if (numComparables >= 3) return 0.7;
  if (numComparables >= 1) return 0.5;
  return 0.3;
}

export { handler };