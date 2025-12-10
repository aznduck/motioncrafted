import { useEffect, useState, useRef } from "react";
import { Camera, Image, FolderOpen, Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CropModal from "@/components/CropModal";
// OpenAI classification disabled - supabase import removed

interface UploadedPhoto {
  id: string;
  url: string;
  loading?: boolean;
  category?: string | null;
  peopleCount?: number | null;
  hasAnimal?: boolean;
  hasBaby?: boolean;
}

interface QueuedFile {
  file: File;
  objectUrl: string;
}

const Upload = () => {
  const navigate = useNavigate();
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  
  // Multi-file crop queue state
  const [cropQueue, setCropQueue] = useState<QueuedFile[]>([]);
  const [currentFileForCrop, setCurrentFileForCrop] = useState<QueuedFile | null>(null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const rollInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  // Generate unique Order ID once on mount, or reuse existing one
  const [mcOrderId] = useState(() => {
    const existing = localStorage.getItem("mc_orderId");
    if (existing) return existing;
    const newId = `MC-${Date.now()}`;
    localStorage.setItem("mc_orderId", newId);
    return newId;
  });

  // Load existing photos from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("mc_uploadedPhotos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUploadedPhotos(parsed.map((p: any) => ({
            id: p.id,
            url: p.url,
            loading: false,
            category: p.category ?? null,
            peopleCount: p.peopleCount ?? null,
            hasAnimal: p.hasAnimal ?? false,
            hasBaby: p.hasBaby ?? false,
          })));
        }
      } catch (e) {
        console.error("Failed to parse saved photos:", e);
      }
    }
  }, []);

  useEffect(() => {
    // Only add script if not already present
    if (!document.querySelector('script[src*="uploadcare"]')) {
      const script = document.createElement("script");
      script.src = "https://ucarecdn.com/libs/widget/3.x/uploadcare.full.min.js";
      script.async = true;
      document.body.appendChild(script);
    }

    if (!document.querySelector('link[href*="uploadcare"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://ucarecdn.com/libs/widget/3.x/uploadcare.min.css";
      document.head.appendChild(link);
    }

    // Don't remove script/stylesheet on cleanup - prevents remounting issues
  }, []);

  // Handle single file (camera) - opens crop modal directly
  const handleSingleFileSelect = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setCurrentFileForCrop({ file, objectUrl });
  };

  // Handle multiple files - adds to queue
  const handleMultipleFilesSelect = (files: File[]) => {
    const queuedFiles: QueuedFile[] = files.map((file) => ({
      file,
      objectUrl: URL.createObjectURL(file),
    }));

    if (currentFileForCrop === null && queuedFiles.length > 0) {
      // Start cropping the first file immediately
      setCurrentFileForCrop(queuedFiles[0]);
      setCropQueue(queuedFiles.slice(1));
    } else {
      // Add to existing queue
      setCropQueue((prev) => [...prev, ...queuedFiles]);
    }
  };

  // Move to next file in queue
  const processNextInQueue = () => {
    if (cropQueue.length > 0) {
      const [next, ...rest] = cropQueue;
      setCurrentFileForCrop(next);
      setCropQueue(rest);
    } else {
      setCurrentFileForCrop(null);
    }
  };

  // Setup camera input handler (single file)
  useEffect(() => {
    const input = cameraInputRef.current;
    if (!input) return;

    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (files && files.length > 0) {
        handleSingleFileSelect(files[0]);
        target.value = "";
      }
    };

    input.addEventListener("change", handleChange);
    return () => input.removeEventListener("change", handleChange);
  }, []);

  // Setup camera roll input handler (multiple files)
  useEffect(() => {
    const input = rollInputRef.current;
    if (!input) return;

    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (files && files.length > 0) {
        handleMultipleFilesSelect(Array.from(files));
        target.value = "";
      }
    };

    input.addEventListener("change", handleChange);
    return () => input.removeEventListener("change", handleChange);
  }, [currentFileForCrop, cropQueue]);

  // Setup local files input handler (multiple files)
  useEffect(() => {
    const input = filesInputRef.current;
    if (!input) return;

    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (files && files.length > 0) {
        handleMultipleFilesSelect(Array.from(files));
        target.value = "";
      }
    };

    input.addEventListener("change", handleChange);
    return () => input.removeEventListener("change", handleChange);
  }, [currentFileForCrop, cropQueue]);

  // Upload cropped image to Uploadcare
  const uploadCroppedImage = async (croppedBlob: Blob) => {
    const tempId = Date.now().toString() + Math.random();
    const fileName = currentFileForCrop?.file.name || "cropped-image.jpg";
    
    // Add loading placeholder
    const loadingPhoto: UploadedPhoto = {
      id: tempId,
      url: "",
      loading: true,
    };
    setUploadedPhotos((prev) => [...prev, loadingPhoto]);

    // Clean up current file and move to next
    if (currentFileForCrop) {
      URL.revokeObjectURL(currentFileForCrop.objectUrl);
    }
    processNextInQueue();

    try {
      // Create a File from the cropped Blob
      const croppedFile = new File([croppedBlob], fileName, {
        type: "image/jpeg",
      });

      if ((window as any).uploadcare) {
        const uploadedFile = (window as any).uploadcare.fileFrom(
          "object",
          croppedFile,
          { publicKey: "31b0edbe0c35c307eaa8" }
        );

        uploadedFile.done(async (fileInfo: any) => {
          // OpenAI classification disabled - using placeholder data
          const classification = {
            category: null as string | null,
            peopleCount: null as number | null,
            hasAnimal: false,
            hasBaby: false,
          };
          
          const newPhoto = {
            id: fileInfo.uuid,
            url: fileInfo.cdnUrl,
            loading: false,
            category: classification.category,
            peopleCount: classification.peopleCount,
            hasAnimal: classification.hasAnimal,
            hasBaby: classification.hasBaby,
          };
          
          // Replace loading placeholder with actual image
          setUploadedPhotos((prev) => {
            const updated = prev.map((photo) =>
              photo.id === tempId ? newPhoto : photo
            );
            // Persist photos to localStorage for animations page
            const photosForStorage = updated
              .filter((p) => !p.loading)
              .map((p) => ({ id: p.id, url: p.url }));
            localStorage.setItem("mc_uploadedPhotos", JSON.stringify(photosForStorage));
            return updated;
          });
        });

        uploadedFile.fail(() => {
          // Remove loading placeholder on error
          setUploadedPhotos((prev) => prev.filter((photo) => photo.id !== tempId));
        });
      } else {
        // Fallback to local URL if Uploadcare not loaded
        const localUrl = URL.createObjectURL(croppedBlob);
        setUploadedPhotos((prev) =>
          prev.map((photo) =>
            photo.id === tempId
              ? { id: tempId, url: localUrl, loading: false }
              : photo
          )
        );
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadedPhotos((prev) => prev.filter((photo) => photo.id !== tempId));
    }
  };

  // Cancel crop - skip current file and move to next
  const handleCropCancel = () => {
    if (currentFileForCrop) {
      URL.revokeObjectURL(currentFileForCrop.objectUrl);
    }
    processNextInQueue();
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  const triggerCameraRoll = () => {
    rollInputRef.current?.click();
  };

  const triggerFiles = () => {
    filesInputRef.current?.click();
  };

  const handleDeletePhoto = (id: string) => {
    setUploadedPhotos((prev) => {
      const updated = prev.filter((photo) => photo.id !== id);
      // Persist deletion to localStorage
      const photosForStorage = updated
        .filter((p) => !p.loading)
        .map((p) => ({ id: p.id, url: p.url }));
      localStorage.setItem("mc_uploadedPhotos", JSON.stringify(photosForStorage));
      return updated;
    });
  };

  const handleContinue = () => {
    const validPhotos = uploadedPhotos.filter((p) => !p.loading);
    const count = validPhotos.length;
    
    // Guard: don't navigate if fewer than 5 fully-uploaded photos
    if (count < 5) {
      alert("Please wait until all photos finish uploading. You need at least 5 completed photos to continue.");
      return;
    }
    
    localStorage.setItem('mc_photoCount', String(count));
    // Save photos with all data for animations page
    const photosForStorage = validPhotos.map((p) => ({
      id: p.id,
      url: p.url,
      category: p.category,
      peopleCount: p.peopleCount,
      hasAnimal: p.hasAnimal,
      hasBaby: p.hasBaby,
    }));
    localStorage.setItem("mc_uploadedPhotos", JSON.stringify(photosForStorage));
    navigate('/animations');
  };

  // Calculate remaining photos in queue for display
  const queueCount = cropQueue.length + (currentFileForCrop ? 1 : 0);

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-display text-foreground">
              Step 1 – Add Your Photos
            </h1>
          </div>

          {/* Tips */}
          <div className="text-center mb-3">
            <p className="text-sm text-muted-foreground">
              📸 Tips: Fill frame • Phone flat (no angles) • Good lighting
            </p>
          </div>

          {/* Upload Method Buttons */}
          <div className="grid gap-3 max-w-2xl mx-auto">
            <button
              onClick={triggerCamera}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-smooth"
            >
              <Camera className="h-6 w-6 text-primary flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-sm">Take Photo</div>
                <div className="text-xs text-muted-foreground">Open your device camera</div>
              </div>
            </button>

            <button
              onClick={triggerCameraRoll}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-smooth"
            >
              <Image className="h-6 w-6 text-primary flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-sm">Select from Camera Roll</div>
                <div className="text-xs text-muted-foreground">Choose multiple photos at once</div>
              </div>
            </button>

            <button
              onClick={triggerFiles}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-smooth"
            >
              <FolderOpen className="h-6 w-6 text-primary flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-sm">Choose from Local Files</div>
                <div className="text-xs text-muted-foreground">Select multiple files at once</div>
              </div>
            </button>
          </div>

          {/* Photo Count */}
          <div className="text-center py-4">
            <p className="text-lg font-semibold text-foreground">
              Photos added: {uploadedPhotos.length}
            </p>
            {uploadedPhotos.length < 5 && (
              <p className="text-sm text-destructive mt-1">
                Add at least 5 photos to continue.
              </p>
            )}
          </div>

          {/* Photo Grid */}
          {uploadedPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
              {uploadedPhotos.map((photo) => (
                <div key={photo.id} className="flex flex-col gap-1">
                  <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-border shadow-soft bg-muted flex items-center justify-center">
                    {photo.loading ? (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      </div>
                    ) : (
                      <>
                        <img
                          src={photo.url}
                          alt="Uploaded photo"
                          className="w-full h-full object-contain"
                        />
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-1 right-1 bg-background/90 hover:bg-destructive hover:text-destructive-foreground rounded-full p-1 transition-smooth shadow-soft"
                          aria-label="Delete photo"
                        >
                          <Plus className="h-4 w-4 rotate-45" />
                        </button>
                      </>
                    )}
                  </div>
                  {/* Photo status label - classification disabled */}
                  <p className="text-[10px] text-muted-foreground leading-tight text-center truncate">
                    {photo.loading ? "Uploading..." : "Ready"}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Continue Button */}
          <div className="pt-6 flex justify-center">
            {(() => {
              const completePhotos = uploadedPhotos.filter((p) => !p.loading);
              const hasAnyLoading = uploadedPhotos.some((p) => p.loading);
              const isDisabled = completePhotos.length < 5 || hasAnyLoading;
              return (
                <button
                  onClick={handleContinue}
                  disabled={isDisabled}
                  className="px-10 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg shadow-premium hover:shadow-soft hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:hover:shadow-premium"
                >
                  {hasAnyLoading ? "Uploading..." : "Continue"}
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <input
        ref={rollInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
      />
      <input
        ref={filesInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Crop Modal */}
      {currentFileForCrop && (
        <CropModal
          imageUrl={currentFileForCrop.objectUrl}
          onConfirm={uploadCroppedImage}
          onCancel={handleCropCancel}
          queueRemaining={cropQueue.length}
        />
      )}
    </div>
  );
};

export default Upload;
