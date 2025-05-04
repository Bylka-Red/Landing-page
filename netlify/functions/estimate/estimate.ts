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
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    if (!event.body) {
      throw new Error('Données manquantes');
    }

    const propertyData: PropertyData = JSON.parse(event.body);

    // Validation des données requises
    if (!propertyData.address) throw new Error('Adresse manquante');
    if (!propertyData.type) throw new Error('Type de bien manquant');
    if (!propertyData.livingArea) throw new Error('Surface habitable manquante');
    if (!propertyData.rooms) throw new Error('Nombre de pièces manquant');
    if (!propertyData.condition) throw new Error('État du bien manquant');

    // Initialisation du client Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.VITE_SUPABASE_ANON_KEY || ''
    );

    // Récupération des coordonnées de l'adresse
    const geocodeResponse = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(propertyData.address)}&limit=1`
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
    const { data: comparableSales, error: dbError } = await supabase
      .from('property_sales')
      .select('*')
      .eq('type', propertyData.type)
      .gte('surface', propertyData.livingArea * 0.8)
      .lte('surface', propertyData.livingArea * 1.2)
      .gte('latitude', latitude - 0.01)
      .lte('latitude', latitude + 0.01)
      .gte('longitude', longitude - 0.01)
      .lte('longitude', longitude + 0.01)
      .order('date', { ascending: false });

    if (dbError) {
      console.error('Erreur base de données:', dbError);
      throw new Error('Erreur lors de la récupération des données');
    }

    // Prix moyens par défaut pour Lagny-sur-Marne
    const defaultPricePerM2 = propertyData.type === 'house' ? 3800 : 4200;
    let estimatedPrice = defaultPricePerM2 * propertyData.livingArea;

    // Calcul basé sur les ventes comparables si disponibles
    if (comparableSales && comparableSales.length > 0) {
      const averagePrice = comparableSales.reduce((acc, sale) => {
        return acc + (sale.price / sale.surface);
      }, 0) / comparableSales.length;
      
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
    const margin = comparableSales?.length > 0 ? 0.05 : 0.08;

    const estimate = {
      average_price_per_sqm: Math.round(adjustedPrice / propertyData.livingArea),
      estimated_price: Math.round(adjustedPrice),
      price_range: {
        min: Math.round(adjustedPrice * (1 - margin)),
        max: Math.round(adjustedPrice * (1 + margin))
      },
      comparable_sales: comparableSales?.length || 0,
      confidence_score: calculateConfidenceScore(comparableSales?.length || 0)
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

export { handler };