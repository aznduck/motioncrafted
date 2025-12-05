import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PhotoWithAnimation {
  id: string;
  url: string;
  animation: string;
}

const ANIMATION_OPTIONS = [
  "Soft smile & subtle movement",
  "Blink & gentle eye movement",
  "Look at camera",
  "Look at other person in photo",
  "Gentle head tilt",
  "Warm, emotional expression",
  "Natural idle motion",
];

const Animations = () => {
  const navigate = useNavigate();
  const [photoAnimations, setPhotoAnimations] = useState<PhotoWithAnimation[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("mc_uploadedPhotos");
    if (!raw) {
      navigate("/upload", { replace: true });
      return;
    }

    try {
      const photos = JSON.parse(raw);
      if (!Array.isArray(photos) || photos.length < 5) {
        navigate("/upload", { replace: true });
        return;
      }

      setPhotoAnimations(
        photos.map((p: { id: string; url: string }) => ({
          id: p.id,
          url: p.url,
          animation: "",
        }))
      );
    } catch (e) {
      console.error("Failed to parse photos:", e);
      navigate("/upload", { replace: true });
    }
  }, [navigate]);

  const handleAnimationChange = (photoId: string, animation: string) => {
    setPhotoAnimations((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, animation } : p))
    );
  };

  const allSelected = photoAnimations.every((p) => p.animation !== "");

  const handleContinue = () => {
    localStorage.setItem("mc_photoAnimations", JSON.stringify(photoAnimations));
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left side - Title and CTA */}
          <div className="lg:w-2/5 space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-display text-foreground">
                Choose Animations for Each Photo
              </h1>
              <p className="text-muted-foreground">
                Pick how you'd like each photo to come to life. You'll select one animation style per photo.
              </p>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleContinue}
                disabled={!allSelected}
                variant="hero"
                size="xl"
                className="w-full lg:w-auto"
              >
                Continue to Order Summary
              </Button>
              {!allSelected && (
                <p className="text-sm text-destructive mt-2">
                  Please select an animation for every photo.
                </p>
              )}
            </div>
          </div>

          {/* Right side - Photo list with dropdowns */}
          <div className="lg:w-3/5">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {photoAnimations.map((photo, index) => (
                <div
                  key={photo.id}
                  className="flex items-center gap-4 p-4 rounded-lg border-2 border-border bg-card shadow-soft"
                >
                  {/* Dropdown */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-2">
                      Photo {index + 1}
                    </p>
                    <Select
                      value={photo.animation}
                      onValueChange={(value) => handleAnimationChange(photo.id, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select animation…" />
                      </SelectTrigger>
                      <SelectContent>
                        {ANIMATION_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Photo thumbnail */}
                  <div className="flex-shrink-0">
                    <img
                      src={photo.url}
                      alt={`Photo ${index + 1}`}
                      className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg border-2 border-border"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Animations;
