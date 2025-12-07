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
import { supabase } from "@/integrations/supabase/client";

type AnimationSuggestion = {
  id: string;
  label: string;
  description: string;
  prompt: string;
};

interface PhotoWithAnimation {
  id: string;
  url: string;
  animationId: string;
  animationLabel: string;
  klingPrompt: string;
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
  const [suggestionsByPhoto, setSuggestionsByPhoto] = useState<Record<string, AnimationSuggestion[]>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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
        photos.map((p: any) => ({
          id: p.id,
          url: p.url,
          animationId: "",
          animationLabel: "",
          klingPrompt: "",
        }))
      );

      // Fetch AI suggestions for each photo
      const fetchSuggestions = async () => {
        setLoadingSuggestions(true);
        try {
          const nextSuggestionsByPhoto: Record<string, AnimationSuggestion[]> = {};
          for (const photo of photos) {
            const { data, error } = await supabase.functions.invoke("suggest-animations", {
              body: {
                photoUrl: photo.url,
                category: photo.category ?? null,
                peopleCount: photo.peopleCount ?? null,
                hasAnimal: photo.hasAnimal ?? false,
                hasBaby: photo.hasBaby ?? false,
              },
            });

            if (error) {
              console.error("Error fetching suggestions for photo", photo.id, error);
              continue;
            }

            const suggestions = (data?.suggestions as AnimationSuggestion[]) ?? [];
            if (suggestions.length > 0) {
              nextSuggestionsByPhoto[photo.id] = suggestions;
            }
          }
          setSuggestionsByPhoto(nextSuggestionsByPhoto);
        } catch (err) {
          console.error("Unexpected error fetching animation suggestions", err);
        } finally {
          setLoadingSuggestions(false);
        }
      };

      fetchSuggestions();
    } catch (e) {
      console.error("Failed to parse photos:", e);
      navigate("/upload", { replace: true });
    }
  }, [navigate]);

  const handleAnimationChange = (photoId: string, selectedValue: string) => {
    setPhotoAnimations((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p;

        const aiSuggestions = suggestionsByPhoto[photoId] || [];
        const matched = aiSuggestions.find((s) => s.id === selectedValue);

        if (matched) {
          return {
            ...p,
            animationId: matched.id,
            animationLabel: matched.label,
            klingPrompt: matched.prompt,
          };
        }

        // Fallback to static label
        return {
          ...p,
          animationId: selectedValue,
          animationLabel: selectedValue,
          klingPrompt: "",
        };
      })
    );
  };

  const hasAISuggestionsFor = (photoId: string) => {
    const ai = suggestionsByPhoto[photoId] || [];
    return ai.length > 0;
  };

  const allSelected = photoAnimations.every((p) => p.animationId !== "");

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
                Step 2 –
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
            {loadingSuggestions && (
              <p className="text-sm text-muted-foreground mb-4">
                Fetching AI animation ideas for your photos…
              </p>
            )}
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {photoAnimations.map((photo, index) => {
                const aiSuggestionsForPhoto = suggestionsByPhoto[photo.id] || [];
                const hasAISuggestions = aiSuggestionsForPhoto.length > 0;

                const optionsToRender = hasAISuggestions
                  ? aiSuggestionsForPhoto.map((s) => ({
                      value: s.id,
                      label: s.label,
                    }))
                  : ANIMATION_OPTIONS.map((label) => ({
                      value: label,
                      label,
                    }));

                return (
                  <div
                    key={photo.id}
                    className="flex items-center gap-4 p-4 rounded-lg border-2 border-border bg-card shadow-soft"
                  >
                    {/* Dropdown */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-2">
                        Photo {index + 1}
                      </p>
                      {/* Debug block */}
                      <div className="mb-1">
                        <p className="text-[10px] text-gray-400">
                          Debug – Source: {hasAISuggestions ? "AI" : "STATIC"} • Photo ID: {photo.id}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Options: {optionsToRender.map((o) => o.label).join(" | ")}
                        </p>
                      </div>
                      <Select
                        value={photo.animationId}
                        onValueChange={(value) => handleAnimationChange(photo.id, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select animation…" />
                        </SelectTrigger>
                        <SelectContent>
                          {optionsToRender.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                );
              })}
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
