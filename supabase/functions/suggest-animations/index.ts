import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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

    // Build context from classification data
    let contextDescription = '';
    
    if (category === 'portrait_single') {
      contextDescription = 'This is a single-person portrait.';
    } else if (category === 'portrait_couple') {
      contextDescription = 'This is a photo of a couple (two people together).';
    } else if (category === 'group') {
      contextDescription = `This is a group photo with ${peopleCount || 'multiple'} people.`;
    } else if (category === 'animal_pet') {
      contextDescription = 'This photo features a pet animal (dog, cat, etc.).';
    } else if (category === 'animal_horse') {
      contextDescription = 'This photo features a horse.';
    } else if (category === 'water') {
      contextDescription = 'This is a water/beach/lake scene.';
    } else if (category === 'landscape') {
      contextDescription = 'This is a landscape or scenic photo.';
    } else if (category === 'baby') {
      contextDescription = 'This photo features a baby or young child.';
    } else if (category === 'vehicle') {
      contextDescription = 'This photo features a vehicle.';
    } else {
      contextDescription = 'Photo type is unspecified.';
    }

    if (hasAnimal && category !== 'animal_pet' && category !== 'animal_horse') {
      contextDescription += ' An animal is present in the photo.';
    }
    if (hasBaby && category !== 'baby') {
      contextDescription += ' A baby or young child is present.';
    }
    if (peopleCount && peopleCount > 0 && category !== 'portrait_single' && category !== 'portrait_couple' && category !== 'group') {
      contextDescription += ` There are ${peopleCount} people visible.`;
    }

    const systemPrompt = `You are an animation director for Motion Crafted, a premium service that transforms still photos into cinematic animated keepsake videos using Kling 2.5 Turbo AI.

Your job is to generate 5–7 PERSONALIZED animation options for this specific photo. Each option should feel warm, emotional, and cinematic—like describing a scene in a heartfelt short film.

CRITICAL CONSTRAINTS FOR KLING 2.5 TURBO:
- Subtle to medium motion ONLY (no running, jumping, dancing, walking, or large pose changes)
- NO camera movement (no pan, zoom, dolly, or tracking shots)
- Focus on: facial expressions, eye movements, gentle gestures, ambient motion, hair/clothing sway
- The subject should stay in roughly the same position throughout

LABEL STYLE:
- Use neutral, emotionally cinematic language (warm but not overly sentimental)
- Keep labels concise (3-8 words)
- Avoid technical jargon or AI terminology
- Examples of good labels: "A gentle smile emerges", "Eyes that tell a story", "Peaceful moment in time"

PROMPT STYLE:
- Write as a brief scene direction (1-2 sentences)
- Describe the subtle motion and emotional quality
- Be specific to what you see in the actual photo
- Safe for Kling 2.5: emphasize stillness with life-like subtle motion

Return your response as JSON with this exact structure:
{
  "animations": [
    {
      "label": "concise emotional label",
      "prompt": "Brief scene direction describing the subtle animation"
    }
  ]
}

Generate exactly 5-7 options tailored to this specific photo content.`;

    const userPrompt = `Analyze this photo and generate 5-7 personalized animation options.

${contextDescription}

Create animation options that:
1. Are specifically tailored to what you see in this photo
2. Use warm, cinematic language for the labels
3. Have prompts safe for Kling 2.5 Turbo (subtle-medium motion only, no camera movement)
4. Would create an emotional, lifelike result suitable for a premium keepsake video gift

Consider the subjects, their expressions, the setting, lighting, and mood when crafting each option.`;

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
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: photoUrl } }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze photo' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response:', data);
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('OpenAI raw response:', content);

    // Parse JSON from response (handle potential markdown wrapping)
    let result;
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      // Return fallback options if parsing fails
      result = {
        animations: [
          { label: "A gentle smile emerges", prompt: "The subject's face softens into a warm, natural smile while their eyes brighten with subtle emotion." },
          { label: "Eyes that tell a story", prompt: "Gentle eye movement and a slow blink bring life to the portrait, as if lost in a cherished memory." },
          { label: "Peaceful moment in time", prompt: "Subtle breathing motion and a serene expression create a living portrait full of quiet emotion." },
          { label: "Warmth in stillness", prompt: "A soft head tilt and tender gaze convey deep affection in this intimate moment." },
          { label: "Natural presence", prompt: "Lifelike idle motion—gentle swaying, hair movement, and ambient breathing create an authentic living memory." }
        ]
      };
    }

    // Validate the response structure
    if (!result.animations || !Array.isArray(result.animations) || result.animations.length < 5) {
      console.warn('Invalid or insufficient animations in response, using fallback');
      result = {
        animations: [
          { label: "A gentle smile emerges", prompt: "The subject's face softens into a warm, natural smile while their eyes brighten with subtle emotion." },
          { label: "Eyes that tell a story", prompt: "Gentle eye movement and a slow blink bring life to the portrait, as if lost in a cherished memory." },
          { label: "Peaceful moment in time", prompt: "Subtle breathing motion and a serene expression create a living portrait full of quiet emotion." },
          { label: "Warmth in stillness", prompt: "A soft head tilt and tender gaze convey deep affection in this intimate moment." },
          { label: "Natural presence", prompt: "Lifelike idle motion—gentle swaying, hair movement, and ambient breathing create an authentic living memory." }
        ]
      };
    }

    console.log('Animation suggestions:', result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Error in suggest-animations function:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to suggest animations' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
