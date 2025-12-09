import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// OpenAI integration has been disabled for rebuild
// const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Static fallback suggestions - these remain available as placeholder data
const fallbackSuggestions = [
  {
    id: "natural_idle_motion",
    label: "Natural idle motion",
    description: "Gentle, realistic breathing and tiny facial movements.",
    prompt:
      "Create a subtle, emotionally warm animation from this photo. The camera stays locked to the original framing. Add only natural idle motion: soft breathing, tiny head and shoulder shifts, small eye and facial changes, and a very light sense of life. No big gestures, no pose changes, no zooms or camera moves.",
  },
  {
    id: "soft_eye_blink",
    label: "Soft eye blink and gaze",
    description: "Occasional soft blinks and a gentle shift in gaze.",
    prompt:
      "Animate the subject(s) with soft, realistic eye blinks and a gentle shift in gaze. Keep the camera locked to the original framing. Motion should be subtle to medium only: small eye movements, tiny head adjustments, and a warm, calm emotional tone. No large gestures, no pose changes, no camera motion.",
  },
  {
    id: "warmer_smile",
    label: "Slightly warmer smile",
    description: "A quiet transition into a warmer, softer smile.",
    prompt:
      "Gradually ease the visible expressions into a slightly warmer, softer smile while keeping everything grounded and realistic. The camera remains locked to the original composition. Motion is subtle: tiny changes in cheeks, eyes, and lips, plus minimal head movement. Avoid any dramatic or exaggerated changes.",
  },
  {
    id: "gentle_head_movement",
    label: "Gentle head and shoulder movement",
    description: "Tiny head and shoulder adjustments as if settling in.",
    prompt:
      "Add gentle, natural head and shoulder movement, as if the subject(s) are quietly settling into a comfortable pose. The camera stays locked to the original framing. Use subtle to medium motion only, with no big gestures or new poses. Preserve the emotional tone of the original photo.",
  },
  {
    id: "breeze_in_scene",
    label: "Soft breeze in the scene",
    description: "Subtle motion in hair, clothing, or background foliage.",
    prompt:
      "If hair, clothing, or foliage is visible, animate them with a very soft breeze effect: tiny, slow motion in fabric, leaves, or hair tips. The camera must remain locked on the original frame. Keep motion subtle to medium and emotionally gentle—no stormy or dramatic effects, just a quiet sense of life.",
  },
  {
    id: "light_flicker",
    label: "Soft light flicker",
    description: "A gentle shift or flicker in ambient light.",
    prompt:
      "Introduce a very subtle shift or flicker in the ambient light, as if clouds are softly moving or indoor light is gently breathing. The camera remains locked. Faces and bodies move only minimally (if at all). Motion stays subtle and cinematic, supporting the emotional feel of the original moment.",
  },
  {
    id: "moment_of_connection",
    label: "Quiet moment of connection",
    description: "Small shared movement between people in the photo.",
    prompt:
      "If multiple people are present, add a quiet sense of connection: a tiny lean toward each other, a shared glance, or a synchronized soft smile. Keep the camera locked and motion subtle to medium only, with no big pose changes. Focus on emotional warmth and realism.",
  },
];

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
    const { photoUrl, category, peopleCount, hasAnimal, hasBaby } = await req.json();

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

    console.log('suggest-animations called (OpenAI disabled):', photoUrl);
    console.log('Classification data received:', { category, peopleCount, hasAnimal, hasBaby });

    // Return placeholder response - OpenAI integration disabled for rebuild
    return new Response(
      JSON.stringify({ 
        status: "openai_disabled",
        suggestions: fallbackSuggestions 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Error in suggest-animations function:', err);
    return new Response(
      JSON.stringify({ 
        status: "openai_disabled",
        suggestions: fallbackSuggestions 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
