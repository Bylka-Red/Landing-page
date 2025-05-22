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
    const contactInfo = await req.json();

    if (!contactInfo.firstName || !contactInfo.lastName || !contactInfo.phone) {
      throw new Error('Informations de contact incomplètes');
    }

    const emailText = `Bonjour La Team,

Une nouvelle demande de contact a été faite sur la Landing Page :

Coordonnées du client :
- Prénom : ${contactInfo.firstName}
- Nom : ${contactInfo.lastName}
- Téléphone : ${contactInfo.phone}

Le client souhaite être recontacté pour une estimation plus précise de son bien.`;

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