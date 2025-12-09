import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// OpenAI integration has been disabled for rebuild
// const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const { photoUrl } = await req.json();

    // Validate photoUrl
    if (!photoUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing photoUrl' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('classify-photo called (OpenAI disabled):', photoUrl);

    // Return placeholder mock data - OpenAI integration disabled for rebuild
    const mockClassification = {
      status: "openai_disabled",
      category: "other",
      peopleCount: 0,
      hasAnimal: false,
      hasBaby: false,
    };

    return new Response(
      JSON.stringify(mockClassification),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Error in classify-photo function:', err);
    return new Response(
      JSON.stringify({ 
        status: "openai_disabled",
        category: "other",
        peopleCount: 0,
        hasAnimal: false,
        hasBaby: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
