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

    const systemPrompt = `You are an animation director for a premium sentimental family video gift service.

Your job is to propose 5–7 distinct animation options for one photo at a time.

STYLE RULES:
- Camera must stay locked to the original framing (no zoom, no pan, no orbit).
- Motion is subtle to medium only: eye blinks, tiny head and shoulder movement, small facial changes, soft breathing, hair/fabric/breeze, gentle environmental motion (light, water, trees).
- Never change the pose dramatically, never make people run/jump/dance, never add fantasy or silly effects.
- Tone: warm, emotional, cinematic, grounded—not technical and not poetic nonsense.

PHOTO-SPECIFIC REQUIREMENT:
Every suggestion MUST be tied to the specific content of this photo, using:
- category (portrait_single, portrait_couple, group, animal_pet, animal_horse, water, landscape, etc.)
- peopleCount
- hasAnimal / hasBaby
- and what you can see in the image (e.g. parent holding baby, couple holding hands, dog on a couch, family at the beach, etc.)

FORCE VARIETY (you must include at least one of each):
1. One suggestion focusing on facial expression / smile
2. One suggestion focusing on eyes / gaze
3. One suggestion focusing on body micro-movement (head/shoulders/hands)
4. One suggestion focusing on environment (light, breeze, water, trees, background)
5. If there are multiple people, one suggestion focusing on a tiny moment of connection between them (shared glance, tiny lean together, etc.)

OUTPUT FORMAT (strict JSON, no prose, no code fences):
{
  "suggestions": [
    {
      "id": "machine_friendly_id",
      "label": "Short, neutral, cinematic label",
      "description": "One short sentence in plain language.",
      "prompt": "2–4 sentences: detailed Kling-like generation prompt mentioning the actual subjects, emotions, subtle–medium motion, camera locked, and concrete elements in this photo."
    }
  ]
}

RULES:
- "id": lowercase with underscores only (no spaces)
- "label": max ~60 characters, NOT generic like "Natural motion". Say what is happening (e.g. "Baby's sleepy smile in mother's arms" not "Soft smile")
- "description": one sentence, plain language
- "prompt": 2–4 sentences, mention visible subjects, mood, subtle motion, camera locked`;

    const contextHints = [
      category ? `Photo category: ${category}` : null,
      typeof peopleCount === 'number' ? `Number of people visible: ${peopleCount}` : null,
      hasAnimal ? `Contains an animal or pet` : null,
      hasBaby ? `Contains a baby or infant` : null,
    ].filter(Boolean).join('. ');

    const userPrompt = `Look closely at this photo and analyze what you see.

CLASSIFICATION HINTS (use these as starting points, but base your ideas on what you actually observe):
${contextHints || 'No classification hints available.'}

YOUR TASK:
1. Identify who/what is in the photo: people (ages, relationships), animals, environment details
2. Propose exactly 5–7 distinct animation suggestions tailored specifically to THIS photo
3. Each suggestion must reference concrete elements you can see (not generic descriptions)
4. Follow the variety rules: include facial expression, eyes/gaze, body micro-movement, environment, and connection moments (if multiple people)

Return ONLY the JSON object with a "suggestions" array. Do not include any explanation or code fences.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: photoUrl } }
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0.6,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ suggestions: fallbackSuggestions }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const rawContent = message?.content;

    if (!rawContent) {
      console.error("No content in OpenAI response:", data);
      return new Response(
        JSON.stringify({ suggestions: fallbackSuggestions }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let contentText: string;
    if (typeof rawContent === "string") {
      contentText = rawContent;
    } else if (Array.isArray(rawContent)) {
      contentText = rawContent
        .filter((part: any) => part.type === "text" && typeof part.text === "string")
        .map((part: any) => part.text)
        .join("\n")
        .trim();
    } else {
      console.error("Unexpected OpenAI message.content format:", rawContent);
      return new Response(
        JSON.stringify({ suggestions: fallbackSuggestions }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("OpenAI raw JSON text:", contentText);

    let result: any;
    try {
      result = JSON.parse(contentText);
    } catch (parseError) {
      console.error("Failed to parse OpenAI JSON:", parseError, "content:", contentText);
      return new Response(
        JSON.stringify({ suggestions: fallbackSuggestions }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (
      !result ||
      !Array.isArray(result.suggestions) ||
      result.suggestions.length === 0
    ) {
      console.warn("Invalid or empty suggestions in JSON result:", result);
      return new Response(
        JSON.stringify({ suggestions: fallbackSuggestions }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ suggestions: result.suggestions }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
