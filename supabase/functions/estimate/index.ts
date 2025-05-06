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

    // Extraire des informations de l'adresse
    const postalCode = propertyData.address.match(/\d{5}/)?.[0];
    const city = postalCode ? propertyData.address.split(postalCode)[1]?.trim() : null;
    
    log('Informations d\'adresse extraites:', { postalCode, city });

    if (!postalCode) {
      log('ATTENTION: Pas de code postal trouvé dans l\'adresse');
    }

    // Géocodage de l'adresse pour obtenir les coordonnées précises
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

    // Extraire le nom de la rue pour une recherche plus précise
    const streetName = extractStreetName(propertyData.address);
    log('Nom de rue extrait:', streetName);

    // Récupérer tous les biens du même type dans la même ville/code postal
    const { data: allSalesInArea, error: dbError } = await supabase
      .from('dvf_idf')
      .select('*')
      .eq('Type local', propertyData.type === 'house' ? 'Maison' : 'Appartement');

    if (dbError) {
      log('Erreur Supabase:', dbError);
      throw new Error('Erreur lors de la récupération des données');
    }

    log('Nombre total de ventes récupérées:', allSalesInArea?.length || 0);

    // Afficher les premières ventes pour déboguer
    if (allSalesInArea && allSalesInArea.length > 0) {
      log('Échantillon de ventes:', allSalesInArea.slice(0, 5));
    }

    // Filtrer les ventes par code postal d'abord
    let salesByPostalCode = allSalesInArea?.filter(sale => {
      // Extraire le code postal de l'adresse de vente
      const salePostalCode = sale.Adresse?.match(/\d{5}/)?.[0];
      return salePostalCode === postalCode;
    }) || [];

    log('Ventes dans le même code postal:', salesByPostalCode.length);

    // Si on a peu de résultats, on peut essayer une recherche par le nom de la ville
    if (salesByPostalCode.length < 5 && city) {
      const cityMatches = allSalesInArea?.filter(sale => 
        sale.Adresse?.toLowerCase().includes(city.toLowerCase())
      ) || [];
      
      log(`Ventes trouvées dans la ville "${city}":`, cityMatches.length);
      
      // Ajouter les correspondances de ville qui ne sont pas déjà incluses
      cityMatches.forEach(sale => {
        if (!salesByPostalCode.some(s => s.id === sale.id)) {
          salesByPostalCode.push(sale);
        }
      });
      
      log('Ventes combinées après recherche par ville:', salesByPostalCode.length);
    }

    // Si on a un nom de rue, on peut aussi essayer une recherche par rue
    let salesByStreet = [];
    if (streetName) {
      salesByStreet = allSalesInArea?.filter(sale => 
        sale.Adresse?.toLowerCase().includes(streetName.toLowerCase())
      ) || [];
      
      log(`Ventes trouvées dans la rue "${streetName}":`, salesByStreet.length);
    }

    // Afficher des échantillons pour déboguer
    if (salesByPostalCode.length > 0) {
      log('Exemple de ventes par code postal:', salesByPostalCode.slice(0, 3));
    }
    
    if (salesByStreet.length > 0) {
      log('Exemple de ventes par rue:', salesByStreet.slice(0, 3));
    }

    // Calculer les distances et filtrer les biens comparables
    const comparablesByDistance = [];
    const rejectedSales = [];

    // Fonction pour filtrer et classer les ventes comparables
    const processSales = (sales) => {
      sales.forEach(sale => {
        // Vérifier si les coordonnées sont disponibles
        if (!sale.Latitude || !sale.Longitude) {
          rejectedSales.push({
            address: sale.Adresse,
            reason: "Coordonnées manquantes"
          });
          return;
        }
        
        // Calculer la distance
        const distance = calculateDistance(latitude, longitude, sale.Latitude, sale.Longitude);
        
        // Vérifier la distance
        if (distance > 5) { // Distance maximum augmentée à 5 km
          rejectedSales.push({
            address: sale.Adresse,
            distance: distance.toFixed(2) + " km",
            reason: "Distance trop grande"
          });
          return;
        }
        
        // Calculer le ratio de surface
        const surfaceRatio = sale['Surface reelle bati'] / propertyData.livingArea;
        
        // Vérifier le ratio de surface avec des conditions plus souples
        if (surfaceRatio < 0.3 || surfaceRatio > 2.0) {
          rejectedSales.push({
            address: sale.Adresse,
            surface: sale['Surface reelle bati'] + " m²",
            ratio: surfaceRatio.toFixed(2),
            reason: "Surface trop différente"
          });
          return;
        }
        
        // Ajouter aux comparables avec la distance pour le tri
        comparablesByDistance.push({
          ...sale,
          distance,
          surfaceRatio
        });
      });
    };

    // Traiter d'abord les ventes de la même rue (priorité élevée)
    processSales(salesByStreet);
    
    // Ensuite traiter les ventes du même code postal
    processSales(salesByPostalCode.filter(sale => 
      !comparablesByDistance.some(comp => comp.id === sale.id)
    ));
    
    // Enfin, si nécessaire, traiter les autres ventes
    if (comparablesByDistance.length < 3) {
      processSales(allSalesInArea?.filter(sale => 
        !comparablesByDistance.some(comp => comp.id === sale.id)
      ) || []);
    }

    // Trier par distance
    comparablesByDistance.sort((a, b) => a.distance - b.distance);
    
    // Limiter aux 10 plus proches
    const comparableSales = comparablesByDistance.slice(0, 10);

    log('Nombre de ventes comparables trouvées:', comparableSales.length);
    log('Ventes comparables:', comparableSales.map(sale => ({
      adresse: sale.Adresse,
      distance: sale.distance.toFixed(2) + ' km',
      surface: sale['Surface reelle bati'] + ' m²',
      prix: sale['Valeur fonciere'] + ' €',
      date: sale['Date mutation']
    })));
    
    log('Exemples de ventes rejetées:', rejectedSales.slice(0, 5));

    // Calcul du prix
    const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
    let estimatedPrice = defaultPricePerM2 * propertyData.livingArea;

    if (comparableSales.length > 0) {
      const weightedPrices = comparableSales.map(sale => {
        // Poids inversement proportionnel à la distance et au ratio de différence de surface
        const distanceWeight = Math.max(0.1, 1 - (sale.distance / 5));
        const surfaceWeight = Math.max(0.1, 1 - Math.abs(1 - sale.surfaceRatio));
        const weight = (distanceWeight + surfaceWeight) / 2;
        
        return {
          price: sale['Valeur fonciere'] / sale['Surface reelle bati'],
          weight,
          originalPrice: sale['Valeur fonciere'],
          surface: sale['Surface reelle bati']
        };
      });

      log('Prix/m² pondérés:', weightedPrices);

      const totalWeight = weightedPrices.reduce((sum, item) => sum + item.weight, 0);
      const weightedAvgPrice = weightedPrices.reduce(
        (sum, item) => sum + (item.price * item.weight), 0
      ) / (totalWeight || 1);

      estimatedPrice = weightedAvgPrice * propertyData.livingArea;
      log('Prix moyen calculé:', weightedAvgPrice + ' €/m²');
      log('Prix estimé avant ajustement:', estimatedPrice);
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
    log('Prix après ajustement selon l\'état:', adjustedPrice);

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

function extractStreetName(address: string): string {
  // Enlever le code postal et tout ce qui suit
  let streetPart = address.split(/\d{5}/).shift() || '';
  
  // Traiter le cas où il y a un numéro au début
  const match = streetPart.match(/^\d+\s+(.+)/);
  if (match) {
    return match[1].trim();
  }
  
  return streetPart.trim();
}