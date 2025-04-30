import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

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

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  try {
    const { address, ...propertyData } = JSON.parse(event.body || '{}');

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
    const dvfUrl = `https://api.dvf.etalab.gouv.fr/mutations/${lat}/${lon}/1000`;
    const dvfResponse = await fetch(dvfUrl);
    const dvfData = await dvfResponse.json();

    const sales = dvfData.mutations || [];

    // Calcul de l'estimation
    const estimate = calculateEstimate(propertyData, sales);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(estimate)
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};

function calculateEstimate(propertyData: PropertyData, historicalSales: any[]) {
  const comparableSales = historicalSales.filter(sale => {
    return (
      sale.type_local?.toLowerCase() === propertyData.type &&
      Math.abs(sale.surface_reelle_bati - propertyData.livingArea) <= 20
    );
  });

  if (comparableSales.length === 0) {
    throw new Error('Pas assez de données comparables');
  }

  const averagePrice = comparableSales.reduce((acc, sale) => {
    return acc + (sale.valeur_fonciere / sale.surface_reelle_bati);
  }, 0) / comparableSales.length;

  let adjustedPrice = averagePrice;

  const conditionMultipliers = {
    'À rénover': 0.8,
    'Travaux à prévoir': 0.9,
    'Bon état': 1,
    'Très bon état': 1.1,
    'Refait à neuf': 1.15,
    'Neuf': 1.2
  };
  adjustedPrice *= conditionMultipliers[propertyData.condition] || 1;

  const estimatedPrice = adjustedPrice * propertyData.livingArea;
  const margin = 0.1;

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

export { handler };