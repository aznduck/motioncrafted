"""
OpenAI Service - Image analysis and animation prompt generation
Uses GPT-4 Vision to analyze photos and generate vibe-specific prompts
"""

import base64
from typing import Dict, Any, Optional
from openai import OpenAI
from app.core.config import settings


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

        Args:
            analysis: Image analysis from analyze_image()
            vibe: One of: cinematic_emotional, warm_human, joyful_alive, quiet_timeless

        Returns:
            Animation prompt optimized for Kling AI
        """

        # Vibe-specific templates
        vibe_templates = {
            "cinematic_emotional": {
                "style": "cinematic, film-like movement with emotional depth",
                "pacing": "deliberate and meaningful",
                "emphasis": "story and emotional connection",
                "tone_words": ["dramatic", "heartfelt", "evocative", "moving"]
            },
            "warm_human": {
                "style": "natural, lifelike motion that feels personal and real",
                "pacing": "gentle and authentic",
                "emphasis": "warmth and human connection",
                "tone_words": ["tender", "comforting", "genuine", "intimate"]
            },
            "joyful_alive": {
                "style": "bright, expressive energy",
                "pacing": "upbeat and dynamic",
                "emphasis": "happiness and celebration",
                "tone_words": ["joyful", "vibrant", "energetic", "lively"]
            },
            "quiet_timeless": {
                "style": "minimal, almost still movement",
                "pacing": "slow and contemplative",
                "emphasis": "calm and timelessness",
                "tone_words": ["serene", "peaceful", "timeless", "respectful"]
            }
        }

        template = vibe_templates.get(vibe, vibe_templates["cinematic_emotional"])

        # Build prompt
        description = analysis.get("description", "the scene")
        subjects = analysis.get("subjects", [])
        setting = analysis.get("setting", "")
        mood = analysis.get("mood", "")
        actions = analysis.get("suggested_actions", [])

        # Select action based on vibe
        if actions:
            action = actions[0]
        else:
            action = "natural movement"

        # Construct prompt
        prompt_parts = [
            f"Animate {description}",
            f"with {template['style']}.",
        ]

        if subjects:
            subject_str = ", ".join(subjects[:2])  # Limit to 2 subjects
            prompt_parts.append(f"Focus on {subject_str}")

        if action and action != "natural movement":
            prompt_parts.append(f"showing {action}")

        # Add tone
        tone_word = template["tone_words"][0]
        prompt_parts.append(f"in a {tone_word} way.")

        # Add pacing instruction
        prompt_parts.append(f"Movement should be {template['pacing']}.")

        prompt = " ".join(prompt_parts)

        # Ensure prompt isn't too long (Kling has limits)
        if len(prompt) > 500:
            prompt = prompt[:497] + "..."

        return prompt

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


# Create singleton instance
openai_service = OpenAIService()
