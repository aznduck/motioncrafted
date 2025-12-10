import { useEffect, useState, useRef, useCallback } from "react";
import { Camera, Image, FolderOpen, Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CropModal from "@/components/CropModal";

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
  
  // Use refs for values needed in callbacks to avoid stale closures
  const cropQueueRef = useRef<QueuedFile[]>([]);
  cropQueueRef.current = cropQueue;
  
  const currentFileRef = useRef<QueuedFile | null>(null);
  currentFileRef.current = currentFileForCrop;
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const rollInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  
  // Track if initial load has happened
  const hasLoadedRef = useRef(false);

  // Generate unique Order ID once on mount, or reuse existing one
  const [mcOrderId] = useState(() => {
    const existing = localStorage.getItem("mc_orderId");
    if (existing) return existing;
    const newId = `MC-${Date.now()}`;
    localStorage.setItem("mc_orderId", newId);
    return newId;
  });

  // Load existing photos from localStorage on mount - only once
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
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

  // Load Uploadcare script once
  useEffect(() => {
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
  }, []);

  // Persist photos to localStorage helper
  const persistPhotos = useCallback((photos: UploadedPhoto[]) => {
    const photosForStorage = photos
      .filter((p) => !p.loading)
      .map((p) => ({ id: p.id, url: p.url }));
    localStorage.setItem("mc_uploadedPhotos", JSON.stringify(photosForStorage));
  }, []);

  // Move to next file in queue - using refs to avoid stale closure
  const processNextInQueue = useCallback(() => {
    const queue = cropQueueRef.current;
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrentFileForCrop(next);
      setCropQueue(rest);
    } else {
      setCurrentFileForCrop(null);
    }
  }, []);

  // Handle single file (camera) - opens crop modal directly
  const handleSingleFileSelect = useCallback((file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setCurrentFileForCrop({ file, objectUrl });
  }, []);

  // Handle multiple files - adds to queue
  const handleMultipleFilesSelect = useCallback((files: File[]) => {
    const queuedFiles: QueuedFile[] = files.map((file) => ({
      file,
      objectUrl: URL.createObjectURL(file),
    }));

    if (currentFileRef.current === null && queuedFiles.length > 0) {
      setCurrentFileForCrop(queuedFiles[0]);
      setCropQueue(queuedFiles.slice(1));
    } else {
      setCropQueue((prev) => [...prev, ...queuedFiles]);
    }
  }, []);

  // Setup file input handlers - using stable callbacks
  useEffect(() => {
    const cameraInput = cameraInputRef.current;
    const rollInput = rollInputRef.current;
    const filesInput = filesInputRef.current;

    const handleCameraChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (files && files.length > 0) {
        handleSingleFileSelect(files[0]);
        target.value = "";
      }
    };

    const handleMultiChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (files && files.length > 0) {
        handleMultipleFilesSelect(Array.from(files));
        target.value = "";
      }
    };

    cameraInput?.addEventListener("change", handleCameraChange);
    rollInput?.addEventListener("change", handleMultiChange);
    filesInput?.addEventListener("change", handleMultiChange);

    return () => {
      cameraInput?.removeEventListener("change", handleCameraChange);
      rollInput?.removeEventListener("change", handleMultiChange);
      filesInput?.removeEventListener("change", handleMultiChange);
    };
  }, [handleSingleFileSelect, handleMultipleFilesSelect]);

  // Upload cropped image to Uploadcare
  const uploadCroppedImage = useCallback(async (croppedBlob: Blob) => {
    const tempId = Date.now().toString() + Math.random();
    const fileName = currentFileRef.current?.file.name || "cropped-image.jpg";
    
    // Add loading placeholder
    const loadingPhoto: UploadedPhoto = {
      id: tempId,
      url: "",
      loading: true,
    };
    setUploadedPhotos((prev) => [...prev, loadingPhoto]);

    // Clean up current file and move to next
    if (currentFileRef.current) {
      URL.revokeObjectURL(currentFileRef.current.objectUrl);
    }
    processNextInQueue();

    try {
      const croppedFile = new File([croppedBlob], fileName, {
        type: "image/jpeg",
      });

      if ((window as any).uploadcare) {
        const uploadedFile = (window as any).uploadcare.fileFrom(
          "object",
          croppedFile,
          { publicKey: "31b0edbe0c35c307eaa8" }
        );

        uploadedFile.done((fileInfo: any) => {
          const newPhoto: UploadedPhoto = {
            id: fileInfo.uuid,
            url: fileInfo.cdnUrl,
            loading: false,
            category: null,
            peopleCount: null,
            hasAnimal: false,
            hasBaby: false,
          };
          
          setUploadedPhotos((prev) => {
            const updated = prev.map((photo) =>
              photo.id === tempId ? newPhoto : photo
            );
            // Persist immediately after successful upload
            persistPhotos(updated);
            return updated;
          });
        });

        uploadedFile.fail(() => {
          setUploadedPhotos((prev) => {
            const updated = prev.filter((photo) => photo.id !== tempId);
            persistPhotos(updated);
            return updated;
          });
        });
      } else {
        // Fallback - also persist to localStorage
        const localUrl = URL.createObjectURL(croppedBlob);
        setUploadedPhotos((prev) => {
          const updated = prev.map((photo) =>
            photo.id === tempId
              ? { id: tempId, url: localUrl, loading: false }
              : photo
          );
          persistPhotos(updated);
          return updated;
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadedPhotos((prev) => {
        const updated = prev.filter((photo) => photo.id !== tempId);
        persistPhotos(updated);
        return updated;
      });
    }
  }, [processNextInQueue, persistPhotos]);

  // Cancel crop - skip current file and move to next
  const handleCropCancel = useCallback(() => {
    if (currentFileRef.current) {
      URL.revokeObjectURL(currentFileRef.current.objectUrl);
    }
    processNextInQueue();
  }, [processNextInQueue]);

  const triggerCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const triggerCameraRoll = useCallback(() => {
    rollInputRef.current?.click();
  }, []);

  const triggerFiles = useCallback(() => {
    filesInputRef.current?.click();
  }, []);

  const handleDeletePhoto = useCallback((id: string) => {
    setUploadedPhotos((prev) => {
      const updated = prev.filter((photo) => photo.id !== id);
      persistPhotos(updated);
      return updated;
    });
  }, [persistPhotos]);

  const handleContinue = useCallback(() => {
    const validPhotos = uploadedPhotos.filter((p) => !p.loading);
    const count = validPhotos.length;
    
    if (count < 5) {
      alert("Please wait until all photos finish uploading. You need at least 5 completed photos to continue.");
      return;
    }
    
    localStorage.setItem('mc_photoCount', String(count));
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
  }, [uploadedPhotos, navigate]);

  const completePhotos = uploadedPhotos.filter((p) => !p.loading);
  const hasAnyLoading = uploadedPhotos.some((p) => p.loading);
  const isDisabled = completePhotos.length < 5 || hasAnyLoading;

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
                  <p className="text-[10px] text-muted-foreground leading-tight text-center truncate">
                    {photo.loading ? "Uploading..." : "Ready"}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Continue Button */}
          <div className="pt-6 flex justify-center">
            <button
              onClick={handleContinue}
              disabled={isDisabled}
              className="px-10 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg shadow-premium hover:shadow-soft hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:hover:shadow-premium"
            >
              {hasAnyLoading ? "Uploading..." : "Continue"}
            </button>
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