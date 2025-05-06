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

    // Géocodage de l'adresse
    const geocodeResponse = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(propertyData.address)}&limit=1`
    );
    
    if (!geocodeResponse.ok) {
      throw new Error('Erreur lors de la géolocalisation');
    }

    const geocodeData = await geocodeResponse.json();
    log('Données de géocodage complètes:', geocodeData);
    
    if (!geocodeData.features?.[0]) {
      throw new Error('Adresse non trouvée');
    }

    const [longitude, latitude] = geocodeData.features[0].geometry.coordinates;
    log('Coordonnées obtenues:', { latitude, longitude });

    // Extraction du code postal (plus robuste)
    const postalCodeMatch = propertyData.address.match(/(\d{5})/);
    const postalCode = postalCodeMatch ? postalCodeMatch[0] : null;
    
    if (!postalCode) {
      throw new Error('Impossible d\'extraire le code postal de l\'adresse');
    }
    
    log('Code postal extrait:', postalCode);

    // Recherche des biens dans la base de données
    // Nouvelle requête améliorée qui cherche:
    // 1. Les adresses contenant " CODE_POSTAL" (espace avant)
    // 2. Les adresses contenant "CODE_POSTAL " (espace après)
    // 3. Les adresses contenant le code postal seul
    const { data: allSalesInArea, error: dbError } = await supabase
      .from('dvf_idf')
      .select('*')
      .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
      .or(`Adresse.ilike.% ${postalCode}%,Adresse.ilike.%${postalCode} %,Adresse.ilike.%${postalCode}%`);
    
    if (dbError) {
      log('Erreur Supabase:', dbError);
      throw new Error('Erreur lors de la récupération des données');
    }

    log('Nombre total de ventes dans le secteur:', allSalesInArea?.length);
    log('Exemples de ventes trouvées:', allSalesInArea?.slice(0, 5).map(sale => ({
      adresse: sale.Adresse,
      type: sale['Type local'],
      surface: sale['Surface reelle bati']
    })));

    // Filtrage des résultats avec des critères plus souples
    const comparableSales = allSalesInArea?.filter(sale => {
      // Vérification que les coordonnées existent
      if (!sale.Latitude || !sale.Longitude) return false;
      
      const distance = calculateDistance(latitude, longitude, sale.Latitude, sale.Longitude);
      const surfaceRatio = sale['Surface reelle bati'] / propertyData.livingArea;
      
      // Critères plus souples pour trouver des biens comparables
      const isComparable = distance <= 2 && surfaceRatio >= 0.5 && surfaceRatio <= 1.5;
      
      if (isComparable) {
        log('Vente comparable trouvée:', {
          adresse: sale.Adresse,
          distance: distance.toFixed(2) + ' km',
          surface: sale['Surface reelle bati'] + ' m²',
          prix: sale['Valeur fonciere'] + ' €',
          date: sale['Date mutation'],
          coordonnees: { lat: sale.Latitude, lng: sale.Longitude }
        });
      }
      
      return isComparable;
    });

    log('Nombre de ventes comparables après filtrage:', comparableSales?.length);

    // Calcul du prix (reste inchangé)
    const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
    let estimatedPrice = defaultPricePerM2 * propertyData.livingArea;

    if (comparableSales && comparableSales.length > 0) {
      const weightedPrices = comparableSales.map(sale => {
        const distance = calculateDistance(latitude, longitude, sale.Latitude, sale.Longitude);
        const weight = Math.max(0.1, 1 - (distance / 2));
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
      log('Prix calculé basé sur les ventes comparables:', estimatedPrice);
    } else {
      log('Aucune vente comparable trouvée, utilisation du prix moyen par défaut');
    }

    // Ajustements selon l'état (reste inchangé)
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
      confidence_score: calculateConfidenceScore(comparableSales?.length || 0),
      debug_logs: debugLogs
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
    log('Erreur:', error instanceof Error ? error.message : 'Erreur inconnue');
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

// Les fonctions calculateDistance et calculateConfidenceScore restent identiques
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