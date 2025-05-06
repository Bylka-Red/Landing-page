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

    // Extraction du code postal et de la rue pour une meilleure recherche
    const postalCode = propertyData.address.match(/\d{5}/)?.[0] || '';
    log('Code postal extrait:', postalCode);
    
    // Extraction du numéro et du nom de rue (sans le code postal et la ville)
    const addressParts = propertyData.address.split(/\s+\d{5}\s+/);
    const streetAddress = addressParts[0] || '';
    log('Adresse de rue extraite:', streetAddress);

    // 1. Recherche par adresse exacte d'abord
    const { data: exactAddressMatches, error: exactAddressError } = await supabase
      .from('dvf_idf')
      .select('*')
      .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
      .ilike('Adresse', `%${propertyData.address}%`);
      
    if (exactAddressError) {
      log('Erreur lors de la recherche par adresse exacte:', exactAddressError);
    } else {
      log('Correspondances d\'adresse exacte trouvées:', exactAddressMatches?.length || 0);
    }

    // 2. Recherche des biens dans la base de données avec une requête plus large
    const { data: allSalesInArea, error: dbError } = await supabase
      .from('dvf_idf')
      .select('*')
      .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
      .ilike('Adresse', `%${postalCode}%`);

    if (dbError) {
      log('Erreur Supabase:', dbError);
      throw new Error('Erreur lors de la récupération des données');
    }

    // 3. Si on a le numéro et la rue, rechercher par numéro et rue
    let streetMatches = [];
    if (streetAddress) {
      // Tenter d'extraire le numéro de l'adresse
      const streetNumber = streetAddress.match(/^\d+/)?.[0];
      // Tenter d'extraire le nom de la rue (sans le numéro)
      const streetName = streetAddress.replace(/^\d+\s+/, '');
      
      if (streetNumber && streetName) {
        log('Recherche par numéro et rue:', { streetNumber, streetName });
        
        // Filtrer manuellement les résultats pour trouver des correspondances de rue
        streetMatches = allSalesInArea?.filter(sale => {
          const saleStreetAddress = sale.Adresse.split(/\s+\d{5}\s+/)[0] || '';
          return saleStreetAddress.includes(streetName);
        }) || [];
        
        log('Correspondances de rue trouvées:', streetMatches.length);
      }
    }

    log('Nombre total de ventes dans le secteur:', allSalesInArea?.length);
    if (allSalesInArea?.length > 0) {
      log('Premières ventes trouvées:', allSalesInArea?.slice(0, 5));
    }

    // Filtrage des résultats avec des critères plus souples
    const rejectedSales: Array<{sale: any, reason: string}> = [];
    
    // Vérifier d'abord les correspondances exactes d'adresse
    let comparableSales = exactAddressMatches || [];
    
    // Si aucune correspondance exacte, utiliser les filtres géographiques
    if (!comparableSales.length) {
      comparableSales = allSalesInArea?.filter(sale => {
        // Vérifier si les coordonnées sont disponibles
        if (!sale.Latitude || !sale.Longitude) {
          rejectedSales.push({sale, reason: "Coordonnées manquantes"});
          return false;
        }
        
        // Calculer la distance
        const distance = calculateDistance(latitude, longitude, sale.Latitude, sale.Longitude);
        
        // Si la distance est trop grande, rejeter
        if (distance > 3) { // Augmenté à 3 km au lieu de 2
          rejectedSales.push({
            sale, 
            reason: `Distance trop grande: ${distance.toFixed(2)} km`
          });
          return false;
        }
        
        // Calculer le ratio de surface
        const surfaceRatio = sale['Surface reelle bati'] / propertyData.livingArea;
        
        // Si le ratio de surface est hors limites, rejeter
        if (surfaceRatio < 0.4 || surfaceRatio > 1.6) { // Critères élargis
          rejectedSales.push({
            sale, 
            reason: `Ratio de surface inadéquat: ${surfaceRatio.toFixed(2)}`
          });
          return false;
        }
        
        // Critères plus souples pour trouver des biens comparables
        const isComparable = true;
        
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
      }) || [];
    }
    
    // Log des ventes rejetées pour le débogage
    log('Ventes rejetées:', rejectedSales.slice(0, 10));
    log('Nombre de ventes comparables après filtrage:', comparableSales?.length);

    // Calcul du prix
    const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
    let estimatedPrice = defaultPricePerM2 * propertyData.livingArea;

    if (comparableSales && comparableSales.length > 0) {
      const weightedPrices = comparableSales.map(sale => {
        const distance = calculateDistance(latitude, longitude, sale.Latitude, sale.Longitude);
        const weight = Math.max(0.1, 1 - (distance / 3)); // Ajusté pour la distance max de 3km
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

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return 999; // Valeur élevée si coordonnées manquantes
  }
  
  // Conversion des coordonnées de degrés à radians
  const radLat1 = lat1 * Math.PI / 180;
  const radLon1 = lon1 * Math.PI / 180;
  const radLat2 = lat2 * Math.PI / 180;
  const radLon2 = lon2 * Math.PI / 180;
  
  // Rayon de la Terre en km
  const R = 6371;
  
  // Formule de haversine pour une meilleure précision
  const dLat = radLat2 - radLat1;
  const dLon = radLon2 - radLon1;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(radLat1) * Math.cos(radLat2) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

function calculateConfidenceScore(numComparables: number): number {
  if (numComparables >= 5) return 0.9;
  if (numComparables >= 3) return 0.7;
  if (numComparables >= 1) return 0.5;
  return 0.3;
}