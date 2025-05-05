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

    // Récupération des variables d'environnement Supabase
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');
    
    // Vérification des variables d'environnement
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variables d\'environnement Supabase manquantes', { 
        supabaseUrl: !!supabaseUrl, 
        supabaseKey: !!supabaseKey 
      });
      throw new Error('Configuration Supabase manquante');
    }

    // Initialisation de Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Géocodage de l'adresse
    const geocodeUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(propertyData.address)}&limit=1`;
    console.log('URL de géocodage:', geocodeUrl);
    
    const geocodeResponse = await fetch(geocodeUrl);
    
    if (!geocodeResponse.ok) {
      console.error('Erreur API géocodage:', geocodeResponse.status, await geocodeResponse.text());
      throw new Error('Erreur lors de la géolocalisation');
    }

    const geocodeData = await geocodeResponse.json();
    console.log('Données de géocodage complètes:', JSON.stringify(geocodeData));
    
    if (!geocodeData.features?.[0]) {
      throw new Error('Adresse non trouvée');
    }

    const [longitude, latitude] = geocodeData.features[0].geometry.coordinates;
    console.log('Coordonnées obtenues:', { latitude, longitude });

    // Conversion du type de bien pour correspondre à la base de données
    const dbPropertyType = propertyData.type === 'house' ? 'Maison' : 'Appartement';
    console.log('Type de bien pour la recherche:', dbPropertyType);

    // Élargissement du rayon de recherche pour plus de résultats
    const searchRadius = 0.01; // Environ 1km
    const minSurface = propertyData.livingArea * 0.5;
    const maxSurface = propertyData.livingArea * 1.5;

    console.log('Critères de recherche:', {
      type: dbPropertyType,
      minSurface,
      maxSurface,
      minLat: latitude - searchRadius,
      maxLat: latitude + searchRadius,
      minLng: longitude - searchRadius,
      maxLng: longitude + searchRadius
    });

    // Construction de la requête Supabase
    const query = supabase
      .from('dvf_idf')
      .select('*')
      .eq('Type local', dbPropertyType)
      .gte('Surface reelle bati', minSurface)
      .lte('Surface reelle bati', maxSurface)
      .gte('Latitude', latitude - searchRadius)
      .lte('Latitude', latitude + searchRadius)
      .gte('Longitude', longitude - searchRadius)
      .lte('Longitude', longitude + searchRadius)
      .not('Latitude', 'is', null)
      .not('Longitude', 'is', null)
      .order('Date mutation', { ascending: false });

    // Afficher la requête SQL générée
    const sqlQuery = query.toSQL();
    console.log('Requête SQL générée:', sqlQuery);

    // Exécution de la requête
    const { data: comparableSales, error: dbError } = await query;

    if (dbError) {
      console.error('Erreur Supabase:', dbError);
      throw new Error(`Erreur base de données: ${dbError.message}`);
    }

    console.log('Nombre de biens comparables trouvés:', comparableSales?.length || 0);
    
    // Afficher les détails des biens trouvés (si disponibles)
    if (comparableSales && comparableSales.length > 0) {
      console.log('Détails des biens comparables:', comparableSales.map(sale => ({
        adresse: sale.Adresse,
        type: sale['Type local'],
        surface: sale['Surface reelle bati'],
        prix: sale['Valeur fonciere'],
        latitude: sale.Latitude,
        longitude: sale.Longitude,
        date: sale['Date mutation'],
        distance: calculateDistance(latitude, longitude, sale.Latitude, sale.Longitude)
      })));
    } else {
      // Si aucun bien comparable n'est trouvé, essayons une recherche plus large
      console.log('Aucun bien comparable trouvé, tentative avec un rayon plus large...');
      
      const largeSearchRadius = 0.02; // Environ 2km
      const { data: widerSearch, error: widerError } = await supabase
        .from('dvf_idf')
        .select('*')
        .eq('Type local', dbPropertyType)
        .gte('Surface reelle bati', minSurface)
        .lte('Surface reelle bati', maxSurface)
        .gte('Latitude', latitude - largeSearchRadius)
        .lte('Latitude', latitude + largeSearchRadius)
        .gte('Longitude', longitude - largeSearchRadius)
        .lte('Longitude', longitude + largeSearchRadius)
        .not('Latitude', 'is', null)
        .not('Longitude', 'is', null)
        .order('Date mutation', { ascending: false });
      
      if (!widerError && widerSearch && widerSearch.length > 0) {
        console.log(`Trouvé ${widerSearch.length} biens avec un rayon élargi`);
        comparableSales = widerSearch;
      }
    }

    // Calcul du prix
    const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
    let estimatedPrice = defaultPricePerM2 * propertyData.livingArea;

    if (comparableSales && comparableSales.length > 0) {
      // Calcul basé sur la distance et la date
      const weightedPrices = comparableSales.map(sale => {
        const distance = calculateDistance(latitude, longitude, sale.Latitude, sale.Longitude);
        const distanceWeight = Math.max(0.5, 1 - distance / 2); // Moins de poids pour les propriétés plus éloignées
        
        const saleDate = new Date(sale['Date mutation']);
        const now = new Date();
        const ageInMonths = (now.getFullYear() - saleDate.getFullYear()) * 12 + now.getMonth() - saleDate.getMonth();
        const timeWeight = Math.max(0.7, 1 - ageInMonths / 36); // Moins de poids pour les ventes plus anciennes
        
        const totalWeight = distanceWeight * timeWeight;
        const pricePerM2 = sale['Valeur fonciere'] / sale['Surface reelle bati'];
        
        return {
          pricePerM2,
          weight: totalWeight
        };
      });
      
      const totalWeight = weightedPrices.reduce((sum, item) => sum + item.weight, 0);
      const weightedAvgPricePerM2 = weightedPrices.reduce(
        (sum, item) => sum + (item.pricePerM2 * item.weight), 0
      ) / (totalWeight || 1);
      
      estimatedPrice = weightedAvgPricePerM2 * propertyData.livingArea;
      console.log('Prix moyen pondéré au m²:', weightedAvgPricePerM2);
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

// Fonction pour calculer la distance entre deux points GPS (en km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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