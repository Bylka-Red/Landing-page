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
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('VITE_SUPABASE_ANON_KEY') || '';
    
    log('Configuration Supabase:', { 
      url: supabaseUrl ? 'définie' : 'non définie', 
      key: supabaseKey ? 'définie' : 'non définie'
    });
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extraire ville et code postal de l'adresse
    const addressParts = propertyData.address.split(/,| - /);
    let city = '';
    let postalCode = '';
    
    // Recherche du code postal dans l'adresse
    for (const part of addressParts) {
      const trimmedPart = part.trim();
      const postalMatch = trimmedPart.match(/\d{5}/);
      if (postalMatch) {
        postalCode = postalMatch[0];
        // Si le code postal est trouvé, la ville est probablement dans la même partie
        const cityParts = trimmedPart.split(postalCode);
        if (cityParts.length > 1) {
          city = cityParts[1].trim();
        } else if (cityParts.length === 1) {
          city = cityParts[0].trim();
        }
        break;
      }
    }
    
    // Si la ville n'est pas trouvée avec le code postal, chercher dans la dernière partie
    if (!city && addressParts.length > 0) {
      const lastPart = addressParts[addressParts.length - 1].trim();
      if (!lastPart.match(/^\d{5}$/)) {
        city = lastPart;
      }
    }
    
    // On extrait aussi le nom de la rue (première partie de l'adresse généralement)
    const streetAddress = addressParts[0]?.trim() || '';
    
    log('Extraction d\'adresse:', { streetAddress, city, postalCode });

    // Géocodage de l'adresse pour obtenir les coordonnées précises
    const geocodeURL = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(propertyData.address)}&limit=1`;
    log('URL de géocodage:', geocodeURL);
    
    const geocodeResponse = await fetch(geocodeURL);
    
    if (!geocodeResponse.ok) {
      throw new Error(`Erreur lors de la géolocalisation: ${geocodeResponse.status} ${geocodeResponse.statusText}`);
    }

    const geocodeData = await geocodeResponse.json();
    log('Données de géocodage brutes:', geocodeData);
    
    if (!geocodeData.features?.[0]) {
      throw new Error('Adresse non trouvée par le service de géocodage');
    }

    const [longitude, latitude] = geocodeData.features[0].geometry.coordinates;
    log('Coordonnées de référence:', { latitude, longitude });

    // Tentative directe de recherche du 29 Rue des Bleuets (pour vérifier s'il existe)
    const similarAddress = streetAddress.replace(/\d+/, '29');
    log('Recherche directe d\'adresse similaire:', similarAddress);
    
    const { data: directMatch, error: directError } = await supabase
      .from('dvf_idf')
      .select('*')
      .ilike('Adresse', `%${similarAddress}%`);
      
    if (directError) {
      log('Erreur lors de la recherche directe:', directError);
    } else {
      log('Résultats de la recherche directe:', {
        found: directMatch?.length || 0,
        results: directMatch
      });
    }

    // Approche 1: Recherche par coordonnées géographiques (rayon élargi)
    log('Recherche par coordonnées avec rayon de 0.1°');
    const { data: geoSales, error: geoError } = await supabase
      .from('dvf_idf')
      .select('*')
      .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
      .gte('Surface reelle bati', propertyData.livingArea * 0.7)
      .lte('Surface reelle bati', propertyData.livingArea * 1.3)
      .gte('Latitude', latitude - 0.1)
      .lte('Latitude', latitude + 0.1)
      .gte('Longitude', longitude - 0.1)
      .lte('Longitude', longitude + 0.1);

    if (geoError) {
      log('Erreur Supabase (recherche géographique):', geoError);
    } else {
      log('Résultats de recherche géographique:', {
        found: geoSales?.length || 0,
        criteria: {
          type: propertyData.type === 'house' ? 'Maison' : 'Appartement',
          surfaceMin: propertyData.livingArea * 0.7,
          surfaceMax: propertyData.livingArea * 1.3,
          latitudeMin: latitude - 0.1,
          latitudeMax: latitude + 0.1,
          longitudeMin: longitude - 0.1,
          longitudeMax: longitude + 0.1
        }
      });
    }

    // Approche 2: Recherche par nom de rue
    // On extrait le nom de la rue sans le numéro
    const streetNameMatch = streetAddress.match(/\d+\s+(.+)/);
    const streetName = streetNameMatch ? streetNameMatch[1].trim() : streetAddress;
    
    log('Recherche par nom de rue:', streetName);
    const { data: streetSales, error: streetError } = await supabase
      .from('dvf_idf')
      .select('*')
      .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
      .gte('Surface reelle bati', propertyData.livingArea * 0.7)
      .lte('Surface reelle bati', propertyData.livingArea * 1.3)
      .ilike('Adresse', `%${streetName}%`);

    if (streetError) {
      log('Erreur Supabase (recherche par rue):', streetError);
    } else {
      log('Résultats de recherche par rue:', {
        found: streetSales?.length || 0,
        streetName
      });
    }

    // Approche 3: Recherche par ville/code postal
    log('Recherche par ville/code postal:', { city, postalCode });
    
    let cityPostalQuery = supabase
      .from('dvf_idf')
      .select('*')
      .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement')
      .gte('Surface reelle bati', propertyData.livingArea * 0.7)
      .lte('Surface reelle bati', propertyData.livingArea * 1.3);
      
    if (city) {
      cityPostalQuery = cityPostalQuery.ilike('Adresse', `%${city}%`);
    }
    if (postalCode) {
      cityPostalQuery = cityPostalQuery.ilike('Adresse', `%${postalCode}%`);
    }
    
    const { data: citySales, error: cityError } = await cityPostalQuery;

    if (cityError) {
      log('Erreur Supabase (recherche par ville/code postal):', cityError);
    } else {
      log('Résultats de recherche par ville/code postal:', {
        found: citySales?.length || 0,
        city,
        postalCode
      });
    }

    // Fusion de tous les résultats
    const allSalesMap = new Map();
    
    // Ajouter les résultats de chaque recherche
    (geoSales || []).forEach(sale => {
      // On utilise l'ID comme clé pour éviter les doublons
      // Si la sale n'a pas d'ID, on crée une clé composite
      const key = sale.id || `${sale.Adresse}-${sale['Date mutation']}-${sale['Valeur fonciere']}`;
      allSalesMap.set(key, sale);
    });
    
    (streetSales || []).forEach(sale => {
      const key = sale.id || `${sale.Adresse}-${sale['Date mutation']}-${sale['Valeur fonciere']}`;
      allSalesMap.set(key, sale);
    });
    
    (citySales || []).forEach(sale => {
      const key = sale.id || `${sale.Adresse}-${sale['Date mutation']}-${sale['Valeur fonciere']}`;
      allSalesMap.set(key, sale);
    });
    
    const allSales = Array.from(allSalesMap.values());
    
    log('Résultats combinés:', {
      total: allSales.length,
      geo: geoSales?.length || 0,
      street: streetSales?.length || 0,
      city: citySales?.length || 0
    });

    // Calculer la distance pour chaque vente
    const salesWithDistance = allSales.map(sale => {
      if (!sale.Latitude || !sale.Longitude) {
        // Si pas de coordonnées, on met une distance arbitraire élevée
        return { ...sale, distance: 999 };
      }
      
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
        distance: `${(sale.distance || 0).toFixed(2)} km`,
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
        weight: 1 / Math.pow((sale.distance || 999) + 0.1, 2),
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
    const conditionMultipliers: Record<string, number> = {
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
  // Vérifier les valeurs nulles ou invalides
  if (!lat1 || !lon1 || !lat2 || !lon2 || 
      isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return 999; // Valeur par défaut élevée
  }
  
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