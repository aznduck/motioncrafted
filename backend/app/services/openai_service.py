"""
OpenAI Service - Image analysis and animation prompt generation
Uses GPT-4 Vision to analyze photos and generate vibe-specific prompts
"""

import base64
from typing import Dict, Any, Optional
from openai import OpenAI
from app.core.config import settings


# System prompt for anti-AI face animation
ANTI_AI_FACE_SYSTEM_PROMPT = """
You are an expert at writing animation prompts for image-to-video generation.

CRITICAL CONSTRAINTS (must be followed exactly):
- Preserve the original face and identity from the input image.
- Do NOT beautify, idealize, smooth, or alter facial structure.
- Maintain natural skin texture, asymmetry, imperfections, and realistic proportions.
- Avoid the "AI-generated face" look (overly smooth skin, perfect symmetry, doll-like features).

CAMERA RULES (very important):
- Camera must remain static or nearly static.
- NO camera movement: no zooms, push-ins, pull-outs, pans, tilts, rotations, parallax, or orbit shots.
- If motion is present, it should come ONLY from subtle subject movement, not the camera.

MOTION GUIDELINES:
- Use minimal, realistic motion (e.g. breathing, blinking, slight head or body movement).
- Movement should feel grounded, physical, and restrained.

STYLE CONTROL:
- Avoid cinematic camera language unless explicitly allowed.
- Do not add dramatic lighting changes, lens effects, depth warping, or facial exaggeration.
- Keep animation faithful to the original photo.

Return ONLY the final animation prompt.
""".strip()


class OpenAIService:
    """Service for OpenAI GPT-4 Vision integration"""

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def analyze_image(self, image_data: bytes) -> Dict[str, Any]:
        """
        Analyze an image using GPT-4 Vision

        Args:
            image_data: Binary image data

        Returns:
            Dictionary with analysis results:
            {
                "description": "A boy riding a horse in a field",
                "subjects": ["boy", "horse"],
                "setting": "outdoor field",
                "mood": "joyful",
                "suggested_actions": ["waving", "smiling", "riding"]
            }
        """
        try:
            # Encode image to base64
            base64_image = base64.b64encode(image_data).decode('utf-8')

            # Create vision prompt
            response = self.client.chat.completions.create(
                model="gpt-4o",  # GPT-4 Vision
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """Analyze this photo in detail. Provide:
1. A clear description of what's happening
2. The main subjects (people, animals, objects)
3. The setting/location
4. The overall mood/emotion
5. Suggested natural movements or actions that would look good when animated

Return your response in this exact JSON format:
{
    "description": "brief description",
    "subjects": ["subject1", "subject2"],
    "setting": "location description",
    "mood": "emotional tone",
    "suggested_actions": ["action1", "action2"]
}"""
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500,
                temperature=0.7
            )

            # Parse response
            content = response.choices[0].message.content

            # Try to parse as JSON
            import json
            import re

            try:
                # First try direct JSON parsing
                analysis = json.loads(content)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
                if json_match:
                    try:
                        analysis = json.loads(json_match.group(1))
                    except json.JSONDecodeError:
                        # If still fails, create structured response from text
                        analysis = {
                            "description": content,
                            "subjects": [],
                            "setting": "unknown",
                            "mood": "neutral",
                            "suggested_actions": []
                        }
                else:
                    # If not valid JSON, create structured response from text
                    analysis = {
                        "description": content,
                        "subjects": [],
                        "setting": "unknown",
                        "mood": "neutral",
                        "suggested_actions": []
                    }

            return analysis

        except Exception as e:
            raise Exception(f"OpenAI image analysis failed: {str(e)}")

    def generate_animation_prompt(
        self,
        analysis: Dict[str, Any],
        vibe: str
    ) -> str:
        """
        Generate animation prompt based on image analysis and selected vibe
        Uses GPT-4 to create prompts following anti-AI face constraints

        Args:
            analysis: Image analysis from analyze_image()
            vibe: One of: cinematic_emotional, warm_human, joyful_alive, quiet_timeless

        Returns:
            Animation prompt optimized for Kling AI with anti-AI face constraints
        """

        # Vibe-specific guidance
        vibe_guidance = {
            "cinematic_emotional": "Add subtle, emotional depth through minimal subject movement (breathing, slight expressions). Keep camera static. Avoid dramatic effects.",
            "warm_human": "Focus on natural, authentic human motion (gentle breathing, soft expressions). Static camera. Maintain warmth and realism.",
            "joyful_alive": "Include gentle, joyful expressions or slight body movement. Camera remains still. Keep energy grounded and realistic.",
            "quiet_timeless": "Minimal, contemplative motion (breathing, very slight movement). Static camera. Emphasize calm and stillness."
        }

        guidance = vibe_guidance.get(vibe, vibe_guidance["cinematic_emotional"])

        # Build context from analysis
        description = analysis.get("description", "the scene")
        subjects = analysis.get("subjects", [])
        mood = analysis.get("mood", "neutral")

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": ANTI_AI_FACE_SYSTEM_PROMPT
                    },
                    {
                        "role": "user",
                        "content": f"""Image description: {description}
Subjects: {', '.join(subjects) if subjects else 'N/A'}
Mood: {mood}

Vibe guidance: {guidance}

Create an animation prompt for Kling AI that:
1. Preserves natural faces and identities (no AI beautification)
2. Uses ONLY subtle subject movement (no camera movement)
3. Follows the vibe guidance above
4. Stays under 500 characters

Return ONLY the prompt."""
                    }
                ],
                max_tokens=200,
                temperature=0.7
            )

            prompt = response.choices[0].message.content.strip()

            # Remove quotes if GPT wrapped it
            prompt = prompt.strip('"').strip("'")

            # Ensure it's not too long
            if len(prompt) > 500:
                prompt = prompt[:497] + "..."

            return prompt

        except Exception as e:
            # Fallback to simple template if OpenAI fails
            return f"Animate {description} with minimal, natural subject movement. Static camera. Preserve natural appearance."

    def generate_prompt_simple(
        self,
        description: str,
        vibe: str
    ) -> str:
        """
        Simpler prompt generation if full analysis isn't available

        Args:
            description: Simple description of the image
            vibe: Video vibe

        Returns:
            Animation prompt
        """
        vibe_styles = {
            "cinematic_emotional": "with cinematic, emotional movement",
            "warm_human": "with warm, natural, lifelike motion",
            "joyful_alive": "with joyful, energetic movement",
            "quiet_timeless": "with minimal, calm, timeless movement"
        }

        style = vibe_styles.get(vibe, vibe_styles["cinematic_emotional"])
        return f"Animate {description} {style}."

    def refine_animation_prompt(
        self,
        original_prompt: str,
        rejection_notes: str,
        vibe: str
    ) -> str:
        """
        Refine an animation prompt based on admin rejection feedback
        Uses anti-AI face constraints to ensure natural results

        Args:
            original_prompt: The original animation prompt that was rejected
            rejection_notes: Admin's feedback on what was wrong
            vibe: The video vibe (for context)

        Returns:
            Improved animation prompt addressing the feedback
        """
        # Vibe context
        vibe_context = {
            "cinematic_emotional": "subtle emotional depth, minimal subject movement",
            "warm_human": "natural authentic motion, gentle expressions",
            "joyful_alive": "gentle joyful energy, grounded realistic movement",
            "quiet_timeless": "minimal contemplative motion, calm stillness"
        }

        context = vibe_context.get(vibe, vibe_context["cinematic_emotional"])

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": ANTI_AI_FACE_SYSTEM_PROMPT
                    },
                    {
                        "role": "user",
                        "content": f"""Original prompt: "{original_prompt}"

Admin feedback: "{rejection_notes}"

Vibe: {vibe} ({context})

Create an improved prompt that:
1. Addresses the admin's specific feedback
2. Follows the vibe guidance
3. Stays under 500 characters

Return ONLY the improved prompt."""
                    }
                ],
                max_tokens=200,
                temperature=0.7
            )

            refined_prompt = response.choices[0].message.content.strip()

            # Remove quotes if GPT wrapped it
            refined_prompt = refined_prompt.strip('"').strip("'")

            # Ensure it's not too long
            if len(refined_prompt) > 500:
                refined_prompt = refined_prompt[:497] + "..."

            return refined_prompt

        except Exception as e:
            raise Exception(f"Failed to refine prompt: {str(e)}")


# Create singleton instance
openai_service = OpenAIService()
