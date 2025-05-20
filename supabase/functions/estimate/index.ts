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

    // Géocodage de l'adresse pour obtenir les coordonnées précises
    const geocodeResponse = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(propertyData.address)}&limit=1`
    );
    
    if (!geocodeResponse.ok) {
      throw new Error('Erreur lors de la géolocalisation');
    }

    const geocodeData = await geocodeResponse.json();
    log('Données de géocodage:', geocodeData);
    
    if (!geocodeData.features?.[0]) {
      throw new Error('Adresse non trouvée');
    }

    const [longitude, latitude] = geocodeData.features[0].geometry.coordinates;
    log('Coordonnées de référence:', { latitude, longitude });

    // Extraction du nom de la rue et de la ville pour une recherche textuelle
    const addressComponents = propertyData.address.split(',');
    const streetName = addressComponents[0]?.trim() || '';
    const cityName = addressComponents[addressComponents.length - 1]?.trim() || '';
    
    log('Composants d\'adresse extraits:', { streetName, cityName });

    // Récupération des ventes comparables en deux étapes
    // Étape 1: Recherche par proximité géographique (large)
    const { data: geoSales, error: geoError } = await supabase
      .from('dvf_idf')
      .select('*')
      .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
      .gte('Surface reelle bati', propertyData.livingArea * 0.7)
      .lte('Surface reelle bati', propertyData.livingArea * 1.3)
      .gte('Latitude', latitude - 0.05)
      .lte('Latitude', latitude + 0.05)
      .gte('Longitude', longitude - 0.05)
      .lte('Longitude', longitude + 0.05);

    if (geoError) {
      log('Erreur Supabase (recherche géographique):', geoError);
      throw new Error('Erreur lors de la récupération des données');
    }

    // Étape 2: Recherche par similarité d'adresse
    const { data: addressSales, error: addressError } = await supabase
      .from('dvf_idf')
      .select('*')
      .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
      .gte('Surface reelle bati', propertyData.livingArea * 0.7)
      .lte('Surface reelle bati', propertyData.livingArea * 1.3)
      .ilike('Adresse', `%${streetName}%`);

    if (addressError) {
      log('Erreur Supabase (recherche par adresse):', addressError);
      // On continue même si cette partie échoue
    }

    // Fusion des résultats (éviter les doublons)
    const allSalesMap = new Map();
    
    // Ajout des ventes par géolocalisation
    (geoSales || []).forEach(sale => {
      allSalesMap.set(sale.id, sale);
    });
    
    // Ajout des ventes par adresse
    (addressSales || []).forEach(sale => {
      if (!allSalesMap.has(sale.id)) {
        allSalesMap.set(sale.id, sale);
      }
    });
    
    const allSales = Array.from(allSalesMap.values());
    
    log('Ventes comparables brutes (combinées):', {
      total: allSales.length,
      criteres: {
        type: propertyData.type === 'house' ? 'Maison' : 'Appartement',
        surfaceMin: propertyData.livingArea * 0.7,
        surfaceMax: propertyData.livingArea * 1.3,
      },
      recherche_geo: geoSales?.length || 0,
      recherche_adresse: addressSales?.length || 0
    });

    // Filtrer et trier les ventes par distance
    const salesWithDistance = allSales.map(sale => {
      const distance = calculateDistance(
        latitude,
        longitude,
        sale.Latitude,
        sale.Longitude
      );
      return { ...sale, distance };
    });

    // Trier par distance et prendre les 10 plus proches
    const nearestSales = salesWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    log('Ventes les plus proches:', {
      total: nearestSales.length,
      ventes: nearestSales.map(sale => ({
        adresse: sale.Adresse,
        distance: `${sale.distance.toFixed(2)} km`,
        prix: sale['Valeur fonciere'],
        surface: sale['Surface reelle bati'],
        date: sale['Date mutation']
      }))
    });

    // Calcul du prix
    let estimatedPrice;
    if (nearestSales.length > 0) {
      // Calcul de la moyenne pondérée par la distance
      const weights = nearestSales.map(sale => ({
        weight: 1 / Math.pow(sale.distance + 0.1, 2),
        pricePerM2: sale['Valeur fonciere'] / sale['Surface reelle bati']
      }));

      const totalWeight = weights.reduce((sum, { weight }) => sum + weight, 0);
      const weightedPrice = weights.reduce((sum, { weight, pricePerM2 }) => 
        sum + (pricePerM2 * weight), 0) / totalWeight;

      estimatedPrice = weightedPrice * propertyData.livingArea;
      
      log('Calcul du prix:', {
        prixMoyen: weightedPrice,
        prixTotal: estimatedPrice,
        poids: weights
      });
    } else {
      // Prix par défaut si aucun comparable trouvé
      const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
      estimatedPrice = defaultPricePerM2 * propertyData.livingArea;
      log('Utilisation du prix par défaut:', defaultPricePerM2);
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

    const multiplier = conditionMultipliers[propertyData.condition as keyof typeof conditionMultipliers] || 1;
    const adjustedPrice = estimatedPrice * multiplier;

    // Calcul de la marge d'erreur
    const margin = nearestSales.length >= 5 ? 0.05 : 
                  nearestSales.length >= 3 ? 0.07 : 0.1;

    const estimate = {
      average_price_per_sqm: Math.round(adjustedPrice / propertyData.livingArea),
      estimated_price: Math.round(adjustedPrice),
      price_range: {
        min: Math.round(adjustedPrice * (1 - margin)),
        max: Math.round(adjustedPrice * (1 + margin))
      },
      comparable_sales: nearestSales.length,
      confidence_score: calculateConfidenceScore(nearestSales.length),
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