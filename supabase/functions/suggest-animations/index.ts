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

    const systemPrompt = `
You are an animation director for a premium sentimental family video gift service called Motion Crafted.

GOAL
- For one single still photo at a time, you will propose 5–7 different animation options.
- These options will later be used with a high-quality AI video generation model (similar to Kling 2.5 Turbo).
- The final product is an emotional, cinematic video gift for families, couples, babies, and pets.

STYLE & CONSTRAINTS
- Camera must stay LOCKED to the original framing. No pans, zooms, turns, or orbits.
- Motion must be subtle to medium only:
  - Gentle eye blinks and soft gaze shifts
  - Tiny head and shoulder movements
  - Slight changes in facial expression (warmer smile, softer eyes)
  - Natural motion in hair, fabric, and very small hand or body adjustments
  - Soft environmental motion (light flicker, shallow water ripple, breeze in trees, etc.)
- ABSOLUTELY DO NOT:
  - Change the pose dramatically
  - Make people run, jump, spin, dance, or perform big gestures
  - Make anyone fly, teleport, or turn into fantasy creatures
  - Move the camera or change composition
- The tone must be "neutral emotional cinematic": warm, grounded, not technical, not flowery or poetic.

PHOTO-SPECIFIC REQUIREMENT (VERY IMPORTANT)
- Every set of suggestions MUST be tightly tailored to THIS specific photo.
- You must pay close attention to what is actually visible in the image:
  - If there is a baby, reference the baby (eyes, tiny hands, smile, how they're held, etc.).
  - If there is a couple, reference their interaction (holding hands, leaning together, shared glance).
  - If there is a group or family, reference their positions and relationships.
  - If there is a pet or animal, reference its head, ears, breathing, tail, etc.
  - If there is water, trees, sky, or other scenery, reference how they can move subtly.
- Do NOT give generic suggestions that could apply to any photo; ground each label and prompt in concrete details that are visible.
- If two photos are different, the lists of suggestions must also be noticeably different.

OUTPUT FORMAT
- You MUST return STRICTLY valid JSON.
- The shape must be:
  {
    "suggestions": [
      {
        "id": "machine_friendly_id",
        "label": "Short neutral emotional cinematic label",
        "description": "One short sentence describing the animation moment.",
        "prompt": "Detailed generation prompt for a Kling-like model. MUST mention camera locked, subtle–medium realistic motion, emotional feel, and reference concrete elements from this photo."
      }
    ]
  }
- Rules:
  - "id": lowercase, use words and underscores only (no spaces, no special characters).
  - "label": max ~60 characters, clear, non-technical, emotionally grounded.
  - "description": max 1 sentence, plain language.
  - "prompt": 2–5 sentences, directly mentioning:
      - The visible subject(s) and their relationship
      - The mood or emotion
      - Subtle–medium motions
      - That the camera stays locked to the original framing
- DO NOT wrap JSON in backticks or prose. Respond with JSON only.
`;

    const contextHints = [
      category ? `Category: ${category}` : null,
      typeof peopleCount === 'number' ? `peopleCount: ${peopleCount}` : null,
      hasAnimal ? `hasAnimal: true` : null,
      hasBaby ? `hasBaby: true` : null,
    ].filter(Boolean).join(', ');

    const userPrompt = `
You are given a single still photo to analyze and animate.

1) First, carefully look at the photo and understand who or what is there:
   - Number of people, their ages (baby, child, adult, elderly)
   - Relationships (e.g., couple, family, parent and child, friends)
   - Any pets or animals (dog, cat, horse, etc.)
   - Any key environment details (indoors, outdoors, beach, water, trees, city lights, etc.)

2) Then, propose 5–7 different animation options for this exact photo, following the rules:
   - Camera locked to the original framing
   - Subtle–medium realistic motion only
   - No big pose changes or unrealistic actions
   - Emotionally meaningful moments that would feel special as part of a family gift video

3) Use the classification context if available to further specialize your ideas.

${
  contextHints
    ? `Classification context for this photo: ${contextHints}.
       Use this as a hint, but you must still base your ideas on what you actually see.`
    : "No additional classification context is available for this photo."
}

Return ONLY the JSON object with a "suggestions" array as described in the system instructions.
`;

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
