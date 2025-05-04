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
  // Gestion des requêtes OPTIONS pour CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  try {
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

    // Prix moyens par défaut pour Lagny-sur-Marne
    const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
    const estimatedPrice = defaultPricePerM2 * propertyData.livingArea;
    
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

    const estimate = {
      average_price_per_sqm: Math.round(defaultPricePerM2 * multiplier),
      estimated_price: Math.round(adjustedPrice),
      price_range: {
        min: Math.round(adjustedPrice * 0.85),
        max: Math.round(adjustedPrice * 1.15)
      },
      comparable_sales: 0,
      confidence_score: 0.3
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

export { handler };