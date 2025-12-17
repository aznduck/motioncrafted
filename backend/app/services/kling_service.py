"""
Kling AI Service - Generate animated videos from images
Based on Kling v1 image2video API
"""

import time
import requests
import jwt
from typing import Dict, Any
from app.core.config import settings


class KlingService:
    """Service for Kling AI video generation (image2video)"""

    def __init__(self):
        self.access_key = settings.KLING_API_KEY
        self.secret_key = getattr(settings, 'KLING_SECRET_KEY', '')
        self.base_url = "https://api-singapore.klingai.com/v1"

    def _generate_jwt_token(self) -> str:
        """
        Generate JWT token for Kling API authentication

        Token format (RFC 7519):
        - Header: { "alg": "HS256", "typ": "JWT" }
        - Payload: { "iss": access_key, "exp": current_time + 1800, "nbf": current_time - 5 }
        - Signature: signed with secret_key

        Returns:
            JWT token string
        """
        headers = {
            "alg": "HS256",
            "typ": "JWT"
        }
        payload = {
            "iss": self.access_key,
            "exp": int(time.time()) + 1800,  # Valid for 30 minutes
            "nbf": int(time.time()) - 5  # Valid from 5 seconds ago
        }
        token = jwt.encode(payload, self.secret_key, headers=headers)
        return token

    def _get_headers(self) -> Dict[str, str]:
        """
        Get request headers with fresh JWT token

        Returns:
            Headers dict with Authorization and Content-Type
        """
        token = self._generate_jwt_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def create_animation(
        self,
        image_url: str,
        prompt: str,
        duration: int = 5,
        mode: str = "pro",
        model_name: str = "kling-v2-5-turbo"
    ) -> str:
        """
        Submit an image2video job to Kling AI

        Args:
            image_url: Public URL to the source image
            prompt: Animation prompt (max 2500 chars)
            duration: Video duration in seconds (5 or 10)
            mode: "std" (standard) or "pro" (professional)
            model_name: Model version (kling-v2-5-turbo recommended)

        Returns:
            task_id for tracking the job
        """
        endpoint = f"{self.base_url}/videos/image2video"

        payload = {
            "model_name": model_name,
            "mode": mode,
            "duration": str(duration),
            "image": image_url,
            "prompt": prompt[:2500],
            "cfg_scale": 0.5,
            "aspect_ratio": "16:9"
        }

        try:
            response = requests.post(
                endpoint,
                headers=self._get_headers(),
                json=payload,
                timeout=30
            )

            if response.status_code != 200:
                raise Exception(f"Kling API returned {response.status_code}: {response.text}")

            data = response.json()

            if data.get("code") != 0:
                raise Exception(f"Kling error: {data.get('message', 'Unknown error')}")

            task_id = data.get("data", {}).get("task_id")
            if not task_id:
                raise Exception(f"No task_id in response: {data}")

            print(f"✅ Kling job created: {task_id}")
            return task_id

        except Exception as e:
            raise Exception(f"Failed to create Kling animation: {str(e)}")

    def check_status(self, task_id: str) -> Dict[str, Any]:
        """
        Check the status of a Kling video generation job

        Args:
            task_id: The task ID from create_animation()

        Returns:
            {
                "status": "submitted" | "processing" | "succeed" | "failed",
                "progress": 0-100,
                "video_url": "..." (if completed),
                "duration": "5" (if completed),
                "error": "..." (if failed)
            }
        """
        endpoint = f"{self.base_url}/videos/image2video/{task_id}"

        try:
            response = requests.get(
                endpoint,
                headers=self._get_headers(),
                timeout=30
            )

            if response.status_code != 200:
                return {
                    "status": "error",
                    "progress": 0,
                    "video_url": None,
                    "error": f"API error {response.status_code}"
                }

            data = response.json()

            if data.get("code") != 0:
                return {
                    "status": "failed",
                    "progress": 0,
                    "video_url": None,
                    "error": data.get("message", "Unknown error")
                }

            task_data = data.get("data", {})
            task_status = task_data.get("task_status", "unknown")
            task_status_msg = task_data.get("task_status_msg", "")

            # Extract video info if succeeded
            video_url = None
            duration = None
            if task_status == "succeed":
                task_result = task_data.get("task_result", {})
                videos = task_result.get("videos", [])
                if videos:
                    video_url = videos[0].get("url")
                    duration = videos[0].get("duration")

            # Map status to progress
            progress_map = {
                "submitted": 10,
                "processing": 50,
                "succeed": 100,
                "failed": 0
            }

            return {
                "status": task_status,
                "progress": progress_map.get(task_status, 0),
                "video_url": video_url,
                "duration": duration,
                "error": task_status_msg if task_status == "failed" else None
            }

        except Exception as e:
            return {
                "status": "error",
                "progress": 0,
                "video_url": None,
                "error": str(e)
            }

    def wait_for_completion(
        self,
        task_id: str,
        timeout: int = 600,
        poll_interval: int = 10
    ) -> Dict[str, Any]:
        """
        Poll Kling API until video generation is complete

        Args:
            task_id: Task ID from create_animation()
            timeout: Max wait time in seconds (default 10 min)
            poll_interval: Seconds between status checks (default 10s)

        Returns:
            Status dict with video_url when complete

        Raises:
            Exception: If generation fails or times out
        """
        start_time = time.time()
        last_status = None

        print(f"⏳ Waiting for Kling task {task_id}...")

        while time.time() - start_time < timeout:
            status = self.check_status(task_id)

            # Log status changes
            if status["status"] != last_status:
                print(f"   Status: {status['status']} ({status['progress']}%)")
                last_status = status["status"]

            if status["status"] == "succeed":
                print(f"✅ Kling generation complete!")
                return status

            if status["status"] == "failed":
                error = status.get("error", "Unknown error")
                raise Exception(f"Kling generation failed: {error}")

            time.sleep(poll_interval)

        raise Exception(f"Kling timed out after {timeout}s")

    def download_video(self, video_url: str) -> bytes:
        """
        Download generated video from Kling

        Args:
            video_url: URL from task result

        Returns:
            Binary video data
        """
        try:
            print(f"⬇️  Downloading video...")
            response = requests.get(video_url, timeout=120)
            response.raise_for_status()

            video_data = response.content
            size_mb = len(video_data) / 1024 / 1024
            print(f"✅ Downloaded {size_mb:.2f} MB")
            return video_data

        except Exception as e:
            raise Exception(f"Failed to download video: {str(e)}")

    def generate_video_complete(
        self,
        image_url: str,
        prompt: str,
        max_retries: int = 3
    ) -> bytes:
        """
        Complete workflow with retry logic:
        submit → wait → download

        Args:
            image_url: Public URL to source image
            prompt: Animation prompt
            max_retries: Retry attempts on failure

        Returns:
            Binary video data
        """
        for attempt in range(max_retries):
            try:
                print(f"🎬 Kling attempt {attempt + 1}/{max_retries}")

                # Submit job
                task_id = self.create_animation(image_url, prompt)

                # Wait for completion
                result = self.wait_for_completion(task_id)

                # Download
                video_data = self.download_video(result["video_url"])
                return video_data

            except Exception as e:
                print(f"❌ Attempt {attempt + 1} failed: {str(e)}")

                if attempt == max_retries - 1:
                    raise

                # Exponential backoff
                wait_time = 5 * (2 ** attempt)
                print(f"⏳ Retrying in {wait_time}s...")
                time.sleep(wait_time)

        raise Exception("Kling generation failed after all retries")


# Singleton instance
kling_service = KlingService()
