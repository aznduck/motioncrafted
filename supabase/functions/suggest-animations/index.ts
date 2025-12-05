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
    let contextHints = '';
    if (category) contextHints += `Photo category: ${category}. `;
    if (peopleCount !== undefined) contextHints += `Number of people: ${peopleCount}. `;
    if (hasAnimal) contextHints += `Contains an animal. `;
    if (hasBaby) contextHints += `Contains a baby. `;

    const systemPrompt = `You are an animation director for Motion Crafted, a premium service that transforms still photos into cinematic animated videos using Kling 2.5 Turbo AI video generation.

Your job is to suggest the BEST animation style for each photo that will create an emotional, lifelike, and beautiful result.

AVAILABLE ANIMATION STYLES (you must choose from these exactly):
1. "Soft smile & subtle movement" - Best for: portraits where adding warmth and life is desired
2. "Blink & gentle eye movement" - Best for: close-up portraits, creates realistic presence
3. "Look at camera" - Best for: portraits where the subject should connect with the viewer
4. "Look at other person in photo" - Best for: couples, groups, family photos with multiple people
5. "Gentle head tilt" - Best for: adding personality and charm to portraits
6. "Warm, emotional expression" - Best for: sentimental photos, memorial tributes, heartfelt moments
7. "Natural idle motion" - Best for: full body shots, landscapes with people, scenes where subtle ambient movement works best

GUIDELINES FOR KLING 2.5 TURBO:
- Subtle movements work best - avoid suggesting dramatic motion
- Emotional authenticity is key - the animation should feel like capturing a real moment
- Consider the photo composition and lighting
- For pets/animals: "Natural idle motion" usually works best
- For babies: "Soft smile & subtle movement" or "Warm, emotional expression" are safest
- For couples: "Look at other person in photo" creates beautiful intimate moments
- For memorial/tribute photos: "Warm, emotional expression" honors the subject

Return your response as JSON with this exact structure:
{
  "primaryRecommendation": "exact animation name from the list",
  "confidence": "high" | "medium" | "low",
  "reasoning": "brief explanation (1-2 sentences)",
  "alternativeOptions": ["second best option", "third best option"]
}`;

    const userPrompt = `Analyze this photo and recommend the best animation style.
${contextHints ? `\nContext from classification: ${contextHints}` : ''}

Choose the animation that will create the most emotional, lifelike, and beautiful result for a premium keepsake video gift.`;

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
        max_tokens: 500,
        temperature: 0.3,
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
    let suggestion;
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      suggestion = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      // Return a default suggestion if parsing fails
      suggestion = {
        primaryRecommendation: "Natural idle motion",
        confidence: "low",
        reasoning: "Could not analyze photo properly, using safe default.",
        alternativeOptions: ["Soft smile & subtle movement", "Warm, emotional expression"]
      };
    }

    console.log('Animation suggestion:', suggestion);

    return new Response(
      JSON.stringify(suggestion),
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
