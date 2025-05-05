import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const propertyData: PropertyData = await req.json();
    console.log('Données reçues:', propertyData);

    // Validation des données requises
    if (!propertyData.address) throw new Error('Adresse manquante');
    if (!propertyData.type) throw new Error('Type de bien manquant');
    if (!propertyData.livingArea) throw new Error('Surface habitable manquante');
    if (!propertyData.rooms) throw new Error('Nombre de pièces manquant');
    if (!propertyData.condition) throw new Error('État du bien manquant');

    // Initialisation de Supabase
    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL') || '',
      Deno.env.get('VITE_SUPABASE_ANON_KEY') || ''
    );

    // Géocodage de l'adresse
    const geocodeResponse = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(propertyData.address)}&limit=1`
    );
    
    if (!geocodeResponse.ok) {
      throw new Error('Erreur lors de la géolocalisation');
    }

    const geocodeData = await geocodeResponse.json();
    console.log('Données de géocodage:', geocodeData);
    
    if (!geocodeData.features?.[0]) {
      throw new Error('Adresse non trouvée');
    }

    const [longitude, latitude] = geocodeData.features[0].geometry.coordinates;
    console.log('Coordonnées:', { latitude, longitude });

    // Recherche de biens comparables
    const query = supabase
      .from('dvf_idf')
      .select('*')
      .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
      .gte('Surface reelle bati', propertyData.livingArea * 0.7)
      .lte('Surface reelle bati', propertyData.livingArea * 1.3)
      .gte('Latitude', latitude - 0.002)
      .lte('Latitude', latitude + 0.002)
      .gte('Longitude', longitude - 0.002)
      .lte('Longitude', longitude + 0.002)
      .order('Date mutation', { ascending: false });

    console.log('Requête SQL générée:', query.toSQL());

    const { data: comparableSales, error: dbError } = await query;

    if (dbError) {
      console.error('Erreur Supabase:', dbError);
      throw new Error('Erreur lors de la récupération des données');
    }

    console.log('Résultats de la recherche:', {
      nombreBiensTrouves: comparableSales?.length || 0,
      biensTrouves: comparableSales?.map(sale => ({
        adresse: sale.Adresse,
        type: sale['Type local'],
        surface: sale['Surface reelle bati'],
        prix: sale['Valeur fonciere'],
        latitude: sale.Latitude,
        longitude: sale.Longitude,
        date: sale['Date mutation']
      }))
    });

    // Calcul du prix
    const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
    let estimatedPrice = defaultPricePerM2 * propertyData.livingArea;

    if (comparableSales && comparableSales.length > 0) {
      const totalWeight = comparableSales.reduce((sum, sale) => sum + 1, 0);
      const weightedSum = comparableSales.reduce((sum, sale, index) => {
        const weight = (comparableSales.length - index) / totalWeight;
        return sum + (sale['Valeur fonciere'] / sale['Surface reelle bati']) * weight;
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
});

function calculateConfidenceScore(numComparables: number): number {
  if (numComparables >= 5) return 0.9;
  if (numComparables >= 3) return 0.7;
  if (numComparables >= 1) return 0.5;
  return 0.3;
}