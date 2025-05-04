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

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const handler: Handler = async (req) => {
  if (req.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  try {
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
      throw new Error('Configuration Supabase manquante');
    }

    const { address, ...propertyData } = JSON.parse(req.body || '{}');

    if (!address) {
      throw new Error('Adresse manquante');
    }

    // Récupération des coordonnées de l'adresse
    const geocodeResponse = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`
    );
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.features?.[0]) {
      throw new Error('Adresse non trouvée');
    }

    const [longitude, latitude] = geocodeData.features[0].geometry.coordinates;

    // Recherche des ventes comparables dans un rayon de 1km
    const { data: comparableSales, error } = await supabase
      .rpc('find_comparable_sales', {
        p_latitude: latitude,
        p_longitude: longitude,
        p_radius: 1000, // 1km
        p_type: propertyData.type === 'house' ? 'Maison' : 'Appartement',
        p_surface_min: propertyData.livingArea * 0.8,
        p_surface_max: propertyData.livingArea * 1.2,
        p_rooms_min: propertyData.rooms - 1,
        p_rooms_max: propertyData.rooms + 1,
        p_years_back: 5
      });

    if (error) {
      throw error;
    }

    // Calcul de l'estimation
    const estimate = calculateEstimate(propertyData, comparableSales || []);

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
      body: JSON.stringify({ error: error.message })
    };
  }
};

function calculateEstimate(propertyData: PropertyData, comparableSales: any[]) {
  if (comparableSales.length === 0) {
    // Prix moyens par défaut pour Lagny-sur-Marne si pas de comparables
    const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
    const estimatedPrice = defaultPricePerM2 * propertyData.livingArea;
    
    return {
      average_price_per_sqm: defaultPricePerM2,
      estimated_price: Math.round(estimatedPrice),
      price_range: {
        min: Math.round(estimatedPrice * 0.85),
        max: Math.round(estimatedPrice * 1.15)
      },
      comparable_sales: 0,
      confidence_score: 0.3
    };
  }

  // Calcul des prix pondérés
  let totalWeight = 0;
  let weightedSum = 0;

  comparableSales.forEach(sale => {
    // Calcul du poids basé sur plusieurs facteurs
    let weight = 1.0;

    // Pondération par date (plus récent = plus important)
    const saleDate = new Date(sale.date_mutation);
    const monthsAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    weight *= Math.exp(-monthsAgo / 12); // Décroissance exponentielle

    // Pondération par similarité de surface
    const surfaceDiff = Math.abs(sale.surface_reelle_bati - propertyData.livingArea);
    weight *= Math.exp(-surfaceDiff / 20);

    // Calcul du prix au m²
    const pricePerM2 = sale.valeur_fonciere / sale.surface_reelle_bati;
    weightedSum += pricePerM2 * weight;
    totalWeight += weight;
  });

  const averagePrice = weightedSum / totalWeight;

  // Ajustement selon l'état du bien
  const conditionMultipliers = {
    'À rénover': 0.8,
    'Travaux à prévoir': 0.9,
    'Bon état': 1,
    'Très bon état': 1.1,
    'Refait à neuf': 1.15,
    'Neuf': 1.2
  };

  const adjustedPrice = averagePrice * (conditionMultipliers[propertyData.condition] || 1);
  const estimatedPrice = adjustedPrice * propertyData.livingArea;

  // Calcul de la confiance basé sur le nombre de comparables
  const confidenceScore = calculateConfidenceScore(comparableSales.length);

  // Marge d'erreur variable selon le score de confiance
  const margin = 0.1 + (1 - confidenceScore) * 0.1;

  return {
    average_price_per_sqm: Math.round(adjustedPrice),
    estimated_price: Math.round(estimatedPrice),
    price_range: {
      min: Math.round(estimatedPrice * (1 - margin)),
      max: Math.round(estimatedPrice * (1 + margin))
    },
    comparable_sales: comparableSales.length,
    confidence_score: confidenceScore
  };
}

function calculateConfidenceScore(numComparables: number): number {
  if (numComparables >= 10) return 0.9;
  if (numComparables >= 5) return 0.7;
  if (numComparables >= 3) return 0.5;
  return 0.3;
}

export { handler };