import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

async function fetchDVFData(address: string, radius: number = 1000) {
  try {
    // Récupération des coordonnées de l'adresse
    const geocodeResponse = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`
    );
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.features?.[0]) {
      throw new Error('Adresse non trouvée');
    }

    const [lon, lat] = geocodeData.features[0].geometry.coordinates;

    // Récupération des ventes DVF
    const dvfUrl = `https://files.data.gouv.fr/geo-dvf/latest/mutations/${lat}/${lon}/${radius}`;
    const dvfResponse = await fetch(dvfUrl);
    
    if (!dvfResponse.ok) {
      throw new Error(`Erreur lors de la récupération des données DVF: ${dvfResponse.status}`);
    }
    
    const dvfData = await dvfResponse.json();

    return {
      coordinates: { lat, lon },
      sales: dvfData.mutations || []
    };
  } catch (error) {
    console.error('Erreur détaillée:', error);
    throw error;
  }
}

async function fetchCurrentListings(lat: number, lon: number) {
  // Ici, vous devriez intégrer une API d'annonces immobilières
  // Par exemple SeLoger, LeBonCoin, etc.
  // Pour l'exemple, nous retournons des données fictives
  return [];
}

function calculateEstimate(
  propertyData: PropertyData,
  historicalSales: any[],
  currentListings: any[]
) {
  // Si pas de ventes comparables, on utilise une estimation basée sur des moyennes locales
  if (!historicalSales.length) {
    // Prix moyens au m² pour Lagny-sur-Marne (données 2024)
    const averagePrice = propertyData.type === 'house' ? 3800 : 4200;
    const estimatedPrice = averagePrice * propertyData.livingArea;
    const margin = 0.15; // 15% de marge

    return {
      average_price_per_sqm: averagePrice,
      estimated_price: Math.round(estimatedPrice),
      price_range: {
        min: Math.round(estimatedPrice * (1 - margin)),
        max: Math.round(estimatedPrice * (1 + margin))
      },
      comparable_sales: 0,
      confidence_score: 0.3
    };
  }

  // Filtrage des ventes comparables
  const comparableSales = historicalSales.filter(sale => {
    return (
      sale.type_local?.toLowerCase() === propertyData.type &&
      Math.abs(sale.surface_reelle_bati - propertyData.livingArea) <= 20
    );
  });

  // Calcul du prix moyen au m²
  const averagePrice = comparableSales.reduce((acc, sale) => {
    return acc + (sale.valeur_fonciere / sale.surface_reelle_bati);
  }, 0) / comparableSales.length;

  // Ajustements selon les caractéristiques
  let adjustedPrice = averagePrice;

  // Ajustement selon l'état
  const conditionMultipliers = {
    'À rénover': 0.8,
    'Travaux à prévoir': 0.9,
    'Bon état': 1,
    'Très bon état': 1.1,
    'Refait à neuf': 1.15,
    'Neuf': 1.2
  };
  adjustedPrice *= conditionMultipliers[propertyData.condition] || 1;

  // Calcul de la fourchette de prix
  const estimatedPrice = adjustedPrice * propertyData.livingArea;
  const margin = 0.1; // 10% de marge

  return {
    average_price_per_sqm: Math.round(adjustedPrice),
    estimated_price: Math.round(estimatedPrice),
    price_range: {
      min: Math.round(estimatedPrice * (1 - margin)),
      max: Math.round(estimatedPrice * (1 + margin))
    },
    comparable_sales: comparableSales.length,
    confidence_score: calculateConfidenceScore(comparableSales.length)
  };
}

function calculateConfidenceScore(numComparables: number): number {
  if (numComparables >= 10) return 0.9;
  if (numComparables >= 5) return 0.7;
  if (numComparables >= 3) return 0.5;
  return 0.3;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, ...propertyData } = await req.json();

    if (!address) {
      throw new Error('Adresse manquante');
    }

    // Récupération des données DVF
    const { coordinates, sales } = await fetchDVFData(address);
    
    // Récupération des annonces actuelles
    const currentListings = await fetchCurrentListings(
      coordinates.lat,
      coordinates.lon
    );

    // Calcul de l'estimation
    const estimate = calculateEstimate(
      propertyData,
      sales,
      currentListings
    );

    return new Response(
      JSON.stringify(estimate),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Erreur complète:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});