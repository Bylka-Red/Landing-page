import { Resend } from 'npm:resend@3.2.0';

const resend = new Resend('re_DVBVGqXv_BYr9Air9iwkdQiUBgM73KA8G');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const body = await req.json();

    const { propertyData, estimationResult } = body;

    if (!propertyData || !estimationResult) {
      throw new Error('Données invalides');
    }

    const formatPrice = (price: number) => 
      new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
        .format(price);

    const emailText = `Bonjour La Team,
Une nouvelle estimation vient d'être faite sur la Landing Page, voici les infos :

Détails du bien :
- Type : ${propertyData.type === 'house' ? 'Maison' : 'Appartement'}
- Adresse : ${propertyData.address}
- Surface : ${propertyData.livingArea} m²
- Pièces : ${propertyData.rooms}
- Salles de bains : ${propertyData.details.bathrooms}
- Douches : ${propertyData.details.showers}
${propertyData.type === 'apartment' ? `- Étage : ${propertyData.details.floor === -1 ? 'Rez-de-chaussée' : propertyData.details.floor}
- Nombre total d'étages : ${propertyData.details.totalFloors}
- Ascenseur : ${propertyData.features.hasElevator ? 'Oui' : 'Non'}
- Places de parking : ${propertyData.features.parkingSpaces}` : ''}
- Année de construction : ${propertyData.features.constructionYear}
- DPE : ${propertyData.features.energyRating}
- État : ${propertyData.features.condition}
- Niveau de qualité : ${propertyData.features.quality}

Estimation :
- Prix estimé : ${formatPrice(estimationResult.estimated_price)}
- Fourchette : ${formatPrice(estimationResult.price_range.min)} - ${formatPrice(estimationResult.price_range.max)}
- Prix/m² : ${formatPrice(estimationResult.average_price_per_sqm)}
- Ventes comparables : ${estimationResult.comparable_sales}
- Indice de confiance : ${Math.round(estimationResult.confidence_score * 100)}%

Projet :
- Propriétaire : ${propertyData.ownership.isOwner ? 'Oui' : 'Non'}
- Échéance : ${propertyData.ownership.sellingTimeline}
- Souhaite être contacté : ${propertyData.ownership.wantsContact ? 'Oui' : 'Non'}
${propertyData.ownership.wantsContact ? `
Coordonnées :
- Nom : ${propertyData.ownership.lastName}
- Prénom : ${propertyData.ownership.firstName}
- Téléphone : ${propertyData.ownership.phone}
` : ''}`;

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'r.kabache@gmail.com',
      subject: `Landing Page - Nouvelle estimation - ${propertyData.address}`,
      text: emailText,
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Une erreur est survenue'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});