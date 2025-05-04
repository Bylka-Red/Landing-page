import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

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
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    );

    const { address, ...propertyData } = JSON.parse(event.body || '{}');

    if (!address) {
      throw new Error('Adresse manquante');
    }

    // Récupération des coordonnées de l'adresse
    const geocodeResponse = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`
    );
    
    if (!geocodeResponse.ok) {
      throw new Error('Erreur lors de la géolocalisation');
    }

    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.features?.[0]) {
      throw new Error('Adresse non trouvée');
    }

    const [longitude, latitude] = geocodeData.features[0].geometry.coordinates;

    // Récupération des ventes comparables depuis Supabase
    const { data: comparableSales, error } = await supabase
      .from('property_sales')
      .select('*')
      .eq('type', propertyData.type)
      .gte('surface', propertyData.livingArea * 0.8)
      .lte('surface', propertyData.livingArea * 1.2);

    if (error) {
      throw error;
    }

    // Filtrage des ventes par distance (500m)
    const filteredSales = comparableSales?.filter(sale => {
      const distance = calculateDistance(
        latitude,
        longitude,
        sale.latitude,
        sale.longitude
      );
      return distance <= 0.5; // 500m en kilomètres
    }) || [];

    // Prix moyens par défaut pour Lagny-sur-Marne
    const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
    let estimatedPrice = defaultPricePerM2 * propertyData.livingArea;
    
    // Si on a des ventes comparables, on utilise leur prix moyen
    if (filteredSales.length > 0) {
      const averagePrice = filteredSales.reduce((acc, sale) => {
        return acc + (sale.price / sale.surface);
      }, 0) / filteredSales.length;
      
      estimatedPrice = averagePrice * propertyData.livingArea;
    }
    
    // Ajustement selon l'état du bien
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

    // Réduction de la marge pour la fourchette de prix
    const margin = filteredSales.length > 0 ? 0.05 : 0.08; // 5% si ventes comparables, 8% sinon

    const estimate = {
      average_price_per_sqm: Math.round(adjustedPrice / propertyData.livingArea),
      estimated_price: Math.round(adjustedPrice),
      price_range: {
        min: Math.round(adjustedPrice * (1 - margin)),
        max: Math.round(adjustedPrice * (1 + margin))
      },
      comparable_sales: filteredSales.length,
      confidence_score: calculateConfidenceScore(filteredSales.length)
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify(estimate)
    };
  } catch (error) {
    console.error('Erreur:', error);
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Une erreur est survenue'
      })
    };
  }
};

function calculateConfidenceScore(numComparables: number): number {
  if (numComparables >= 5) return 0.9;
  if (numComparables >= 3) return 0.7;
  if (numComparables >= 1) return 0.5;
  return 0.3;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en kilomètres
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export { handler };