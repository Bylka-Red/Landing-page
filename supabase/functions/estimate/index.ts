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

// Hardcoded values since they're already public in the repository
const supabaseUrl = 'https://gvqioxquncotpliivnlg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cWlveHF1bmNvdHBsaWl2bmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMzU4NzYsImV4cCI6MjA2MTYxMTg3Nn0.3LbJWJunMkEwzBDKvEfoqrwJeDutxG-PeLaY99C58kU';

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
    const supabase = createClient(supabaseUrl, supabaseKey);
    log('Connexion Supabase établie');

    // Normalisation de l'adresse
    const normalizeAddress = (address: string) => {
      return address
        .toUpperCase()
        .replace(/[^\w\s-]/g, '') // Supprime la ponctuation
        .replace(/\s+/g, ' ')     // Normalise les espaces
        .trim();
    };

    // Extraire le numéro de rue et le nom de la rue
    const extractStreetInfo = (address: string) => {
      const match = address.match(/(\d+)\s+(.+?)(?=\s+\d{5}|\s*$)/i);
      return match ? {
        number: parseInt(match[1]),
        street: match[2].trim()
      } : null;
    };

    const inputAddress = normalizeAddress(propertyData.address);
    const streetInfo = extractStreetInfo(inputAddress);
    
    log('Adresse normalisée:', {
      original: propertyData.address,
      normalized: inputAddress,
      streetInfo
    });

    // Géocodage de l'adresse
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
    log('Coordonnées:', { latitude, longitude });

    // Recherche par adresse exacte et similaire
    let comparableSales = [];
    
    if (streetInfo) {
      // Recherche des adresses dans la même rue
      const { data: streetSales, error: streetError } = await supabase
        .from('dvf_idf')
        .select('*')
        .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
        .ilike('Adresse', `%${streetInfo.street}%`)
        .gte('Surface reelle bati', propertyData.livingArea * 0.7)
        .lte('Surface reelle bati', propertyData.livingArea * 1.3);

      if (streetError) {
        log('Erreur recherche rue:', streetError);
      } else {
        log('Résultats recherche rue:', {
          count: streetSales?.length || 0,
          sales: streetSales
        });
        comparableSales = streetSales || [];
      }
    }

    // Si pas assez de résultats, recherche par coordonnées
    if (comparableSales.length < 3) {
      const { data: geoSales, error: geoError } = await supabase
        .from('dvf_idf')
        .select('*')
        .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
        .gte('Surface reelle bati', propertyData.livingArea * 0.7)
        .lte('Surface reelle bati', propertyData.livingArea * 1.3)
        .gte('Latitude', latitude - 0.002)
        .lte('Latitude', latitude + 0.002)
        .gte('Longitude', longitude - 0.002)
        .lte('Longitude', longitude + 0.002);

      if (geoError) {
        log('Erreur recherche géographique:', geoError);
      } else {
        log('Résultats recherche géographique:', {
          count: geoSales?.length || 0,
          sales: geoSales
        });
        
        // Fusion des résultats sans doublons
        const existingIds = new Set(comparableSales.map(sale => sale.id));
        const newSales = (geoSales || []).filter(sale => !existingIds.has(sale.id));
        comparableSales = [...comparableSales, ...newSales];
      }
    }

    // Calcul des distances et tri
    comparableSales = comparableSales.map(sale => ({
      ...sale,
      distance: calculateDistance(latitude, longitude, sale.Latitude, sale.Longitude)
    })).sort((a, b) => a.distance - b.distance);

    log('Ventes comparables trouvées:', {
      count: comparableSales.length,
      sales: comparableSales.map(sale => ({
        adresse: sale.Adresse,
        distance: `${sale.distance.toFixed(2)} km`,
        prix: sale['Valeur fonciere'],
        surface: sale['Surface reelle bati']
      }))
    });

    // Calcul du prix
    let estimatedPrice;
    if (comparableSales.length > 0) {
      const weights = comparableSales.map(sale => ({
        weight: 1 / Math.pow(sale.distance + 0.1, 2),
        pricePerM2: sale['Valeur fonciere'] / sale['Surface reelle bati']
      }));

      const totalWeight = weights.reduce((sum, { weight }) => sum + weight, 0);
      const weightedPrice = weights.reduce((sum, { weight, pricePerM2 }) => 
        sum + (pricePerM2 * weight), 0) / totalWeight;

      estimatedPrice = weightedPrice * propertyData.livingArea;
    } else {
      const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
      estimatedPrice = defaultPricePerM2 * propertyData.livingArea;
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
    const margin = comparableSales.length >= 5 ? 0.05 : 
                  comparableSales.length >= 3 ? 0.07 : 0.1;

    const estimate = {
      average_price_per_sqm: Math.round(adjustedPrice / propertyData.livingArea),
      estimated_price: Math.round(adjustedPrice),
      price_range: {
        min: Math.round(adjustedPrice * (1 - margin)),
        max: Math.round(adjustedPrice * (1 + margin))
      },
      comparable_sales: comparableSales.length,
      confidence_score: calculateConfidenceScore(comparableSales.length),
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