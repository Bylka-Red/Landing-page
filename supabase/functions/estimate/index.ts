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

  const debugLogs: any[] = [];
  const log = (message: string, data?: any) => {
    const logEntry = { message, data, timestamp: new Date().toISOString() };
    debugLogs.push(logEntry);
    console.log(`[DEBUG] ${message}`, data);
  };

  try {
    const propertyData: PropertyData = await req.json();
    log('Données reçues:', propertyData);

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
    log('Connexion Supabase établie');

    // Géocodage de l'adresse
    const geocodeUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(propertyData.address)}&limit=1`;
    log('URL de géocodage:', geocodeUrl);

    try {
      const geocodeResponse = await fetch(geocodeUrl);
      
      if (!geocodeResponse.ok) {
        const errorText = await geocodeResponse.text();
        log('Erreur de géocodage:', {
          status: geocodeResponse.status,
          statusText: geocodeResponse.statusText,
          error: errorText
        });
        throw new Error(`Erreur de géocodage: ${geocodeResponse.status} ${geocodeResponse.statusText}`);
      }

      const geocodeData = await geocodeResponse.json();
      log('Réponse de géocodage:', geocodeData);
      
      if (!geocodeData.features?.length) {
        throw new Error('Adresse non trouvée dans la base de données');
      }

      const [longitude, latitude] = geocodeData.features[0].geometry.coordinates;
      log('Coordonnées extraites:', { latitude, longitude });

      // Recherche des ventes comparables
      const { data: comparableSales, error: dbError } = await supabase
        .from('dvf_idf')
        .select('*')
        .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
        .gte('Surface reelle bati', propertyData.livingArea * 0.7)
        .lte('Surface reelle bati', propertyData.livingArea * 1.3)
        .gte('Latitude', latitude - 0.002)
        .lte('Latitude', latitude + 0.002)
        .gte('Longitude', longitude - 0.002)
        .lte('Longitude', longitude + 0.002);

      if (dbError) {
        log('Erreur base de données:', dbError);
        throw new Error('Erreur lors de la recherche des biens comparables');
      }

      log('Ventes comparables trouvées:', {
        count: comparableSales?.length || 0,
        sales: comparableSales
      });

      // Calcul du prix
      const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
      let estimatedPrice = defaultPricePerM2 * propertyData.livingArea;

      if (comparableSales && comparableSales.length > 0) {
        const weights = comparableSales.map(sale => ({
          weight: 1 / Math.pow(calculateDistance(latitude, longitude, sale.Latitude, sale.Longitude) + 0.1, 2),
          pricePerM2: sale['Valeur fonciere'] / sale['Surface reelle bati']
        }));

        const totalWeight = weights.reduce((sum, { weight }) => sum + weight, 0);
        const weightedPrice = weights.reduce((sum, { weight, pricePerM2 }) => 
          sum + (pricePerM2 * weight), 0) / totalWeight;

        estimatedPrice = weightedPrice * propertyData.livingArea;
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

    } catch (geocodeError) {
      log('Erreur lors du géocodage:', geocodeError);
      throw new Error('Erreur lors de la géolocalisation: ' + (geocodeError.message || 'Adresse non trouvée'));
    }

  } catch (error) {
    log('Erreur générale:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
        debug_logs: debugLogs
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

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateConfidenceScore(numComparables: number): number {
  if (numComparables >= 5) return 0.9;
  if (numComparables >= 3) return 0.7;
  if (numComparables >= 1) return 0.5;
  return 0.3;
}