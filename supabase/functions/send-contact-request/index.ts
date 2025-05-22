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
    const { contactInfo, estimationData } = await req.json();

    if (!contactInfo.firstName || !contactInfo.lastName || !contactInfo.phone) {
      throw new Error('Informations de contact incomplètes');
    }

    const formatPrice = (price: number) => 
      new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
        .format(price);

    const emailText = `Bonjour La Team,

Une nouvelle demande de contact a été faite sur la Landing Page :

Coordonnées du client :
- Prénom : ${contactInfo.firstName}
- Nom : ${contactInfo.lastName}
- Téléphone : ${contactInfo.phone}

Le client souhaite être recontacté pour une estimation plus précise de son bien.

Détails de l'estimation :
- Type : ${estimationData.propertyData.type === 'house' ? 'Maison' : 'Appartement'}
- Adresse : ${estimationData.propertyData.address}
- Surface : ${estimationData.propertyData.livingArea} m²
- Pièces : ${estimationData.propertyData.rooms}
- État : ${estimationData.propertyData.condition}

Estimation :
- Prix estimé : ${formatPrice(estimationData.estimation.estimated_price)}
- Fourchette : ${formatPrice(estimationData.estimation.price_range.min)} - ${formatPrice(estimationData.estimation.price_range.max)}
- Prix/m² : ${formatPrice(estimationData.estimation.average_price_per_sqm)}
- Ventes comparables : ${estimationData.estimation.comparable_sales}
- Indice de confiance : ${Math.round(estimationData.estimation.confidence_score * 100)}%`;

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'r.kabache@gmail.com',
      subject: `Landing Page - Nouvelle demande de contact - ${contactInfo.firstName} ${contactInfo.lastName}`,
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