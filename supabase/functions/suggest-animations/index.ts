import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const fallbackSuggestions = [
  {
    id: "natural_idle_motion",
    label: "Natural idle motion",
    description: "Adds gentle, lifelike movement while preserving the original moment.",
    prompt: "Keep the camera locked to the original framing. Apply subtle, realistic idle motion—small breathing, tiny shifts in posture, and gentle environmental motion if appropriate. No large pose changes, no walking, running, or jumping."
  }
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

    console.log('Suggesting animations for photo:', photoUrl);
    console.log('Classification data:', { category, peopleCount, hasAnimal, hasBaby });

    // Build classification summary for user prompt
    const classificationParts = [];
    if (category) classificationParts.push(`Category: ${category}`);
    if (peopleCount !== undefined) classificationParts.push(`peopleCount: ${peopleCount}`);
    if (hasAnimal !== undefined) classificationParts.push(`hasAnimal: ${hasAnimal}`);
    if (hasBaby !== undefined) classificationParts.push(`hasBaby: ${hasBaby}`);
    
    const classificationSummary = classificationParts.length > 0 
      ? classificationParts.join(', ') + '.'
      : 'No classification data provided.';

    const systemPrompt = `You are an animation director for a sentimental family video service. Users upload real photos and we turn them into short animated clips using a model similar to Kling 2.5 Turbo.

Your job is to propose 5–7 different animation options for THIS specific photo. Each option must:
- Be emotionally meaningful and visually tasteful.
- Use subtle-to-medium motion only (no large pose changes).
- Keep the camera completely locked to the original framing (no pan, zoom, or orbit).
- Use realistic facial and body micro-movement: soft smiles, gentle head tilts, small shifts in gaze, slight shoulder movement, breathing, subtle hair or fabric movement, and gentle environmental details (light shimmer, water ripple, breeze).
- Never suggest running, jumping, spinning, dancing, backflips, flying, or any big action.
- Be appropriate for the content: babies, couples, families, pets, animals, water scenes, landscapes, etc.

The tone should be neutral but emotionally cinematic: clear, warm, and not technical. Think in terms of 'moments' rather than 'effects'.

Output MUST be STRICTLY valid JSON in this form:
{
  "suggestions": [
    {
      "id": "machine_friendly_id",
      "label": "Short neutral emotional cinematic label for UI",
      "description": "One short sentence describing what happens emotionally/visually.",
      "prompt": "A detailed generation prompt describing the animation. Mention that the camera stays locked, motion is realistic and subtle-to-medium, and the result should feel heartfelt and tasteful."
    }
  ]
}`;

    const userTextContent = `${classificationSummary} Please suggest 5–7 animation ideas that would feel special and emotionally moving for this specific photo.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userTextContent },
              { type: 'image_url', image_url: { url: photoUrl } }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ suggestions: fallbackSuggestions }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response:', data);
      return new Response(
        JSON.stringify({ suggestions: fallbackSuggestions }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('OpenAI raw response:', content);

    // Parse JSON from response (strip any markdown code fences)
    let result;
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      return new Response(
        JSON.stringify({ suggestions: fallbackSuggestions }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate the response structure
    if (!result.suggestions || !Array.isArray(result.suggestions) || result.suggestions.length === 0) {
      console.warn('Invalid or missing suggestions in response, using fallback');
      return new Response(
        JSON.stringify({ suggestions: fallbackSuggestions }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Animation suggestions:', result.suggestions);

    return new Response(
      JSON.stringify({ suggestions: result.suggestions }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Error in suggest-animations function:', err);
    return new Response(
      JSON.stringify({ suggestions: fallbackSuggestions }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
