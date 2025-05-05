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
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Variables d\'environnement Supabase manquantes');
      throw new Error('Configuration Supabase manquante');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Géocodage de l'adresse
    const geocodeUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(propertyData.address)}&limit=1`;
    console.log('URL de géocodage:', geocodeUrl);

    const geocodeResponse = await fetch(geocodeUrl);
    
    if (!geocodeResponse.ok) {
      console.error('Erreur API géocodage:', geocodeResponse.status);
      throw new Error('Erreur lors de la géolocalisation');
    }

    const geocodeData = await geocodeResponse.json();
    console.log('Réponse géocodage complète:', JSON.stringify(geocodeData, null, 2));
    
    if (!geocodeData.features?.[0]) {
      throw new Error('Adresse non trouvée');
    }

    const [longitude, latitude] = geocodeData.features[0].geometry.coordinates;
    console.log('Coordonnées obtenues:', { latitude, longitude });

    // Vérification préliminaire des données dans la base
    const { data: sampleData, error: sampleError } = await supabase
      .from('dvf_idf')
      .select('*')
      .limit(1);

    console.log('Échantillon de données:', sampleData);
    if (sampleError) {
      console.error('Erreur lors de la vérification des données:', sampleError);
    }

    // Paramètres de recherche
    const searchRadius = 0.005; // environ 500m
    const minSurface = propertyData.livingArea * 0.6;
    const maxSurface = propertyData.livingArea * 1.4;

    // Test de requête simple
    const { data: simpleTest, error: simpleError } = await supabase
      .from('dvf_idf')
      .select('*')
      .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
      .limit(5);

    console.log('Test de requête simple:', {
      resultats: simpleTest?.length || 0,
      erreur: simpleError,
      premierResultat: simpleTest?.[0]
    });

    // Construction de la requête principale
    const query = supabase
      .from('dvf_idf')
      .select('*')
      .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
      .gte('Surface reelle bati', minSurface)
      .lte('Surface reelle bati', maxSurface)
      .gte('Latitude', latitude - searchRadius)
      .lte('Latitude', latitude + searchRadius)
      .gte('Longitude', longitude - searchRadius)
      .lte('Longitude', longitude + searchRadius);

    // Log de la requête SQL
    const { data: comparableSales, error: dbError } = await query;

    if (dbError) {
      console.error('Erreur Supabase:', dbError);
      throw new Error('Erreur lors de la récupération des données');
    }

    console.log('Résultats de la recherche:', {
      criteres: {
        type: propertyData.type === 'house' ? 'Maison' : 'Appartement',
        surfaceMin: minSurface,
        surfaceMax: maxSurface,
        latitudeMin: latitude - searchRadius,
        latitudeMax: latitude + searchRadius,
        longitudeMin: longitude - searchRadius,
        longitudeMax: longitude + searchRadius
      },
      nombreResultats: comparableSales?.length || 0,
      resultats: comparableSales?.map(sale => ({
        adresse: sale.Adresse,
        type: sale['Type local'],
        surface: sale['Surface reelle bati'],
        prix: sale['Valeur fonciere'],
        latitude: sale.Latitude,
        longitude: sale.Longitude,
        distance: calculateDistance(latitude, longitude, sale.Latitude, sale.Longitude)
      }))
    });

    // Calcul du prix
    const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
    let estimatedPrice = defaultPricePerM2 * propertyData.livingArea;

    if (comparableSales && comparableSales.length > 0) {
      const weightedPrices = comparableSales.map(sale => {
        const distance = calculateDistance(latitude, longitude, sale.Latitude, sale.Longitude);
        const weight = Math.max(0.5, 1 - distance / 0.5);
        return {
          price: sale['Valeur fonciere'] / sale['Surface reelle bati'],
          weight
        };
      });

      const totalWeight = weightedPrices.reduce((sum, item) => sum + item.weight, 0);
      const weightedAvgPrice = weightedPrices.reduce(
        (sum, item) => sum + (item.price * item.weight), 0
      ) / (totalWeight || 1);

      estimatedPrice = weightedAvgPrice * propertyData.livingArea;
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

    console.log('Estimation finale:', estimate);

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

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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