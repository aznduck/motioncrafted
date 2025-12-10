import { useEffect, useState, useRef } from "react";
import { Camera, Image, FolderOpen, Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CropModal from "@/components/CropModal";

interface UploadedPhoto {
  id: string;
  url: string;
  loading?: boolean;
}

interface QueuedFile {
  file: File;
  objectUrl: string;
}

// Helper to persist photos to localStorage
const savePhotosToStorage = (photos: UploadedPhoto[]) => {
  const toSave = photos
    .filter((p) => !p.loading && p.url)
    .map((p) => ({ id: p.id, url: p.url }));
  localStorage.setItem("mc_uploadedPhotos", JSON.stringify(toSave));
};

// Helper to load photos from localStorage
const loadPhotosFromStorage = (): UploadedPhoto[] => {
  try {
    const saved = localStorage.getItem("mc_uploadedPhotos");
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p: any) => ({
      id: p.id || String(Date.now() + Math.random()),
      url: p.url || "",
      loading: false,
    }));
  } catch {
    return [];
  }
};

const Upload = () => {
  const navigate = useNavigate();
  
  // ===== UPLOADED PHOTOS STATE =====
  // This is THE source of truth for what appears in the grid.
  // It is ONLY modified by:
  // 1. Initial load from localStorage (once)
  // 2. Adding a new photo after crop+upload completes
  // 3. User clicking delete on a specific photo
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>(() => {
    // Initialize from localStorage on first render
    return loadPhotosFromStorage();
  });

  // ===== CROP QUEUE STATE =====
  // Completely separate from uploadedPhotos.
  // Only controls the crop modal flow.
  const [cropQueue, setCropQueue] = useState<QueuedFile[]>([]);
  const [currentFileForCrop, setCurrentFileForCrop] = useState<QueuedFile | null>(null);

  // Refs for file inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const rollInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  // Generate/reuse Order ID
  const [mcOrderId] = useState(() => {
    const existing = localStorage.getItem("mc_orderId");
    if (existing) return existing;
    const newId = `MC-${Date.now()}`;
    localStorage.setItem("mc_orderId", newId);
    return newId;
  });

  // Load Uploadcare script once (no cleanup that removes it)
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

  // ===== FILE SELECTION HANDLERS =====
  // These add files to the crop queue, NOT to uploadedPhotos
  
  const handleCameraFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const objectUrl = URL.createObjectURL(file);
      // If no file is currently being cropped, start cropping this one
      if (!currentFileForCrop) {
        setCurrentFileForCrop({ file, objectUrl });
      } else {
        // Otherwise add to queue
        setCropQueue(prev => [...prev, { file, objectUrl }]);
      }
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleMultiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newQueueItems: QueuedFile[] = Array.from(files).map(file => ({
        file,
        objectUrl: URL.createObjectURL(file),
      }));
      
      if (!currentFileForCrop && newQueueItems.length > 0) {
        // Start cropping the first file
        setCurrentFileForCrop(newQueueItems[0]);
        setCropQueue(prev => [...prev, ...newQueueItems.slice(1)]);
      } else {
        // Add all to queue
        setCropQueue(prev => [...prev, ...newQueueItems]);
      }
    }
    e.target.value = "";
  };

  // ===== CROP MODAL HANDLERS =====
  
  const processNextInQueue = () => {
    setCropQueue(prev => {
      if (prev.length > 0) {
        const [next, ...rest] = prev;
        setCurrentFileForCrop(next);
        return rest;
      } else {
        setCurrentFileForCrop(null);
        return prev;
      }
    });
  };

  const handleCropConfirm = async (croppedBlob: Blob) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const fileName = currentFileForCrop?.file.name || "cropped.jpg";
    
    // 1. Add loading placeholder to uploadedPhotos
    setUploadedPhotos(prev => {
      const updated = [...prev, { id: tempId, url: "", loading: true }];
      // Don't save loading items to localStorage
      return updated;
    });

    // 2. Clean up current crop file
    if (currentFileForCrop) {
      URL.revokeObjectURL(currentFileForCrop.objectUrl);
    }

    // 3. Move to next file in queue
    processNextInQueue();

    // 4. Upload to Uploadcare
    try {
      const croppedFile = new File([croppedBlob], fileName, { type: "image/jpeg" });

      if ((window as any).uploadcare) {
        const uploadPromise = (window as any).uploadcare.fileFrom("object", croppedFile, {
          publicKey: "31b0edbe0c35c307eaa8",
        });

        uploadPromise.done((fileInfo: any) => {
          // Replace loading placeholder with actual photo
          setUploadedPhotos(prev => {
            const updated = prev.map(p => 
              p.id === tempId 
                ? { id: fileInfo.uuid, url: fileInfo.cdnUrl, loading: false }
                : p
            );
            savePhotosToStorage(updated);
            return updated;
          });
        });

        uploadPromise.fail(() => {
          // Remove failed upload
          setUploadedPhotos(prev => {
            const updated = prev.filter(p => p.id !== tempId);
            savePhotosToStorage(updated);
            return updated;
          });
        });
      } else {
        // Fallback: use local blob URL
        const localUrl = URL.createObjectURL(croppedBlob);
        setUploadedPhotos(prev => {
          const updated = prev.map(p =>
            p.id === tempId
              ? { id: tempId, url: localUrl, loading: false }
              : p
          );
          savePhotosToStorage(updated);
          return updated;
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadedPhotos(prev => {
        const updated = prev.filter(p => p.id !== tempId);
        savePhotosToStorage(updated);
        return updated;
      });
    }
  };

  const handleCropCancel = () => {
    if (currentFileForCrop) {
      URL.revokeObjectURL(currentFileForCrop.objectUrl);
    }
    processNextInQueue();
  };

  // ===== DELETE PHOTO HANDLER =====
  const handleDeletePhoto = (id: string) => {
    setUploadedPhotos(prev => {
      const updated = prev.filter(p => p.id !== id);
      savePhotosToStorage(updated);
      return updated;
    });
  };

  // ===== CONTINUE HANDLER =====
  const handleContinue = () => {
    const validPhotos = uploadedPhotos.filter(p => !p.loading && p.url);
    if (validPhotos.length < 5) {
      alert("You need at least 5 photos to continue.");
      return;
    }
    localStorage.setItem("mc_photoCount", String(validPhotos.length));
    savePhotosToStorage(validPhotos);
    navigate("/animations");
  };

  // ===== DERIVED STATE FOR UI =====
  const completePhotos = uploadedPhotos.filter(p => !p.loading);
  const hasAnyLoading = uploadedPhotos.some(p => p.loading);
  const canContinue = completePhotos.length >= 5 && !hasAnyLoading;

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
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-smooth"
            >
              <Camera className="h-6 w-6 text-primary flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-sm">Take Photo</div>
                <div className="text-xs text-muted-foreground">Open your device camera</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => rollInputRef.current?.click()}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-smooth"
            >
              <Image className="h-6 w-6 text-primary flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-sm">Select from Camera Roll</div>
                <div className="text-xs text-muted-foreground">Choose multiple photos at once</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => filesInputRef.current?.click()}
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

          {/* Photo Grid - ONLY driven by uploadedPhotos state */}
          {uploadedPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
              {uploadedPhotos.map((photo) => (
                <div key={photo.id} className="flex flex-col gap-1">
                  <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-border shadow-soft bg-muted flex items-center justify-center">
                    {photo.loading ? (
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    ) : (
                      <>
                        <img
                          src={photo.url}
                          alt="Uploaded photo"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
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
              type="button"
              onClick={handleContinue}
              disabled={!canContinue}
              className="px-10 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg shadow-premium hover:shadow-soft hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasAnyLoading ? "Uploading..." : "Continue"}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden File Inputs - using onChange prop directly */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraFileChange}
        className="hidden"
      />
      <input
        ref={rollInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleMultiFileChange}
        className="hidden"
      />
      <input
        ref={filesInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleMultiFileChange}
        className="hidden"
      />

      {/* Crop Modal - completely separate from uploadedPhotos */}
      {currentFileForCrop && (
        <CropModal
          imageUrl={currentFileForCrop.objectUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          queueRemaining={cropQueue.length}
        />
      )}
    </div>
  );
};

export default Upload;
