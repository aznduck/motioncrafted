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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

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
  const [previewPhoto, setPreviewPhoto] = useState<{ id: string; url: string } | null>(null);

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
                  <div 
                    className="relative w-[100px] md:w-[140px] aspect-[4/5] rounded-xl bg-muted overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity border-2 border-border"
                    onClick={() => window.open(photo.url, "_blank")}
                    title="Click to view full image"
                  >
                    <img
                      src={photo.url}
                      alt={`Photo ${index + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full-size preview modal */}
      <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="relative w-full max-w-[min(90vw,640px)] bg-background/95 border-none shadow-xl rounded-2xl flex flex-col items-center justify-center gap-4 p-4 [&>button]:hidden">
          <button
            onClick={() => setPreviewPhoto(null)}
            className="absolute -right-2 -top-2 z-10 p-2 rounded-full bg-background/90 hover:bg-background transition-colors shadow-lg"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
          {previewPhoto && (
            <div className="w-full aspect-[4/5] max-w-full rounded-2xl bg-[#111111] flex items-center justify-center overflow-hidden">
              <img
                src={previewPhoto.url}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Animations;
