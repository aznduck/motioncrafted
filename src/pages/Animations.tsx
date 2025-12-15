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
import { Textarea } from "@/components/ui/textarea";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PhotoItem {
  id: string;
  url: string;
}

type VideoVibe = "cinematic_emotional" | "warm_human" | "joyful_alive" | "quiet_timeless";

const VIDEO_VIBES: { value: VideoVibe; title: string; description: string }[] = [
  {
    value: "cinematic_emotional",
    title: "Cinematic & Emotional",
    description: "A cinematic, film-like feel with emotional movement and a sense of story.",
  },
  {
    value: "warm_human",
    title: "Warm & Human",
    description: "Natural, lifelike motion that feels personal, comforting, and real.",
  },
  {
    value: "joyful_alive",
    title: "Joyful & Alive",
    description: "Brighter, more expressive energy that highlights happiness and celebration.",
  },
  {
    value: "quiet_timeless",
    title: "Quiet & Timeless",
    description: "Almost still — calm, respectful, and timeless.",
  },
];

interface SortablePhotoProps {
  photo: PhotoItem;
  index: number;
}

const SortablePhoto = ({ photo, index }: SortablePhotoProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border-2 border-border bg-card shadow-soft"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-colors touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <span className="text-sm font-medium text-muted-foreground w-6">
        {index + 1}
      </span>

      <div
        className="relative w-[80px] md:w-[100px] aspect-[4/5] rounded-lg bg-muted overflow-hidden flex items-center justify-center border border-border cursor-pointer hover:opacity-80 transition-opacity"
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
};

const Animations = () => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [videoVibe, setVideoVibe] = useState<VideoVibe>("cinematic_emotional");
  const [specialMessage, setSpecialMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const raw = localStorage.getItem("mc_uploadedPhotos");
    if (!raw) {
      navigate("/upload", { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length < 5) {
        navigate("/upload", { replace: true });
        return;
      }

      setPhotos(
        parsed.map((p: any) => ({
          id: p.id,
          url: p.url,
        }))
      );
    } catch {
      navigate("/upload", { replace: true });
    }
  }, [navigate]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPhotos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleContinue = () => {
    const selectedVibe = VIDEO_VIBES.find((v) => v.value === videoVibe);
    
    const orderData = {
      photos: photos.map((p, idx) => ({
        id: p.id,
        url: p.url,
        order: idx + 1,
      })),
      video_vibe: videoVibe,
      vibeDetails: {
        value: videoVibe,
        title: selectedVibe?.title || "",
        description: selectedVibe?.description || "",
      },
      specialMessage: specialMessage.trim() || null,
    };

    localStorage.setItem("mc_photoAnimations", JSON.stringify(orderData));
    navigate("/checkout");
  };

  const selectedVibe = VIDEO_VIBES.find((v) => v.value === videoVibe);

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4 text-center">
            <h1 className="text-3xl md:text-4xl font-display text-foreground">
              Step 2 – Customize Your Video
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Set the mood for your memory, arrange your photos, and add a personal message.
            </p>
          </div>

          {/* Video Vibe Selector */}
          <div className="bg-card border-2 border-border rounded-xl p-6 shadow-soft">
            <h2 className="text-xl font-display text-foreground mb-2">
              Choose the vibe of your video
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              This sets the mood, motion, and music for your memory.
            </p>
            
            <Select value={videoVibe} onValueChange={(value) => setVideoVibe(value as VideoVibe)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a vibe..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {VIDEO_VIBES.map((vibe) => (
                  <SelectItem key={vibe.value} value={vibe.value}>
                    {vibe.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedVibe && (
              <p className="text-sm text-muted-foreground mt-3 italic">
                {selectedVibe.description}
              </p>
            )}
          </div>

          {/* Photo Order */}
          <div className="bg-card border-2 border-border rounded-xl p-6 shadow-soft">
            <label className="block text-sm font-medium text-foreground mb-3">
              Photo Order
            </label>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop to reorder your photos. They will appear in this sequence in your video.
            </p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={photos.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {photos.map((photo, index) => (
                    <SortablePhoto
                      key={photo.id}
                      photo={photo}
                      index={index}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Special Message */}
          <div className="bg-card border-2 border-border rounded-xl p-6 shadow-soft">
            <label className="block text-sm font-medium text-foreground mb-1">
              Special Message{" "}
              <span className="text-muted-foreground font-normal">(Optional – Recommended)</span>
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              Add a heartfelt message to display at the end of your video.
            </p>
            <Textarea
              placeholder="e.g., Happy 50th Anniversary, Mom & Dad! Here's to 50 more years of love..."
              value={specialMessage}
              onChange={(e) => setSpecialMessage(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {specialMessage.length}/300
            </p>
          </div>

          {/* Continue Button */}
          <div className="flex flex-col items-center gap-3 pt-4">
            <Button
              onClick={handleContinue}
              variant="hero"
              size="xl"
              className="w-full sm:w-auto"
            >
              Continue to Order Summary
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Animations;
