import { useState, useRef } from "react";
import { Camera, Image, FolderOpen, Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CropModal from "@/components/CropModal";

// ===== TYPES =====
type UploadedPhoto = {
  id: string;
  name: string;
  previewUrl: string;
  uploadedUrl?: string; // CDN URL after Uploadcare upload
  isUploading?: boolean;
};

type QueuedFile = {
  file: File;
  objectUrl: string;
};

// ===== COMPONENT =====
const Upload = () => {
  const navigate = useNavigate();

  // ===== SINGLE SOURCE OF TRUTH FOR GRID =====
  // This state is ONLY modified by:
  // 1. Adding a photo after crop+upload completes
  // 2. User clicking delete on a specific photo
  // NEVER cleared automatically by useEffect or any other mechanism
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);

  // ===== CROP QUEUE STATE (separate from grid) =====
  const [cropQueue, setCropQueue] = useState<QueuedFile[]>([]);
  const [currentFileForCrop, setCurrentFileForCrop] = useState<QueuedFile | null>(null);

  // ===== REFS FOR FILE INPUTS =====
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const rollInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  // ===== ORDER ID (lazy init via useState, no useEffect) =====
  const [mcOrderId] = useState(() => {
    const existing = localStorage.getItem("mc_orderId");
    if (existing) return existing;
    const newId = `MC-${Date.now()}`;
    localStorage.setItem("mc_orderId", newId);
    return newId;
  });

  console.log("Upload rendered, uploadedPhotos.length =", uploadedPhotos.length);

  // ===== FILE SELECTION HANDLERS =====
  const handleFileSelect = (files: FileList | null, isSingle: boolean) => {
    if (!files || files.length === 0) return;

    console.log("handleFileSelect called with", files.length, "files");

    const newQueueItems: QueuedFile[] = Array.from(files).map((file) => ({
      file,
      objectUrl: URL.createObjectURL(file),
    }));

    if (isSingle || !currentFileForCrop) {
      // Start cropping the first file immediately
      setCurrentFileForCrop(newQueueItems[0]);
      if (newQueueItems.length > 1) {
        setCropQueue((prev) => [...prev, ...newQueueItems.slice(1)]);
      }
    } else {
      // Add all to queue
      setCropQueue((prev) => [...prev, ...newQueueItems]);
    }
  };

  // ===== PROCESS NEXT IN CROP QUEUE =====
  const processNextInQueue = () => {
    setCropQueue((prev) => {
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

  // ===== CROP CONFIRM HANDLER =====
  const handleCropConfirm = async (croppedBlob: Blob) => {
    const tempId = crypto.randomUUID();
    const fileName = currentFileForCrop?.file.name || "cropped.jpg";
    const localPreviewUrl = URL.createObjectURL(croppedBlob);

    console.log("Crop confirmed, adding photo with tempId:", tempId);

    // 1. Add to uploadedPhotos immediately (with loading state)
    setUploadedPhotos((prev) => [
      ...prev,
      {
        id: tempId,
        name: fileName,
        previewUrl: localPreviewUrl,
        isUploading: true,
      },
    ]);

    // 2. Clean up current crop file's object URL
    if (currentFileForCrop) {
      URL.revokeObjectURL(currentFileForCrop.objectUrl);
    }

    // 3. Move to next file in queue
    processNextInQueue();

    // 4. Upload to Uploadcare (async, updates state when done)
    try {
      const croppedFile = new File([croppedBlob], fileName, { type: "image/jpeg" });

      // Load Uploadcare if not already loaded
      if (!(window as any).uploadcare) {
        await loadUploadcareScript();
      }

      if ((window as any).uploadcare) {
        const uploadPromise = (window as any).uploadcare.fileFrom("object", croppedFile, {
          publicKey: "31b0edbe0c35c307eaa8",
        });

        uploadPromise.done((fileInfo: any) => {
          console.log("Uploadcare success:", fileInfo.uuid);
          // Update the photo with CDN URL, mark as done
          setUploadedPhotos((prev) =>
            prev.map((p) =>
              p.id === tempId
                ? { ...p, uploadedUrl: fileInfo.cdnUrl, isUploading: false }
                : p
            )
          );
          // Persist to localStorage
          persistPhotosToStorage();
        });

        uploadPromise.fail((error: any) => {
          console.error("Uploadcare failed:", error);
          // Keep the local preview, just mark as done (fallback)
          setUploadedPhotos((prev) =>
            prev.map((p) =>
              p.id === tempId ? { ...p, isUploading: false } : p
            )
          );
          persistPhotosToStorage();
        });
      } else {
        // Uploadcare not available, use local preview
        console.warn("Uploadcare not available, using local preview");
        setUploadedPhotos((prev) =>
          prev.map((p) =>
            p.id === tempId ? { ...p, isUploading: false } : p
          )
        );
        persistPhotosToStorage();
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadedPhotos((prev) =>
        prev.map((p) =>
          p.id === tempId ? { ...p, isUploading: false } : p
        )
      );
      persistPhotosToStorage();
    }
  };

  // ===== CROP CANCEL HANDLER =====
  const handleCropCancel = () => {
    if (currentFileForCrop) {
      URL.revokeObjectURL(currentFileForCrop.objectUrl);
    }
    processNextInQueue();
  };

  // ===== DELETE PHOTO HANDLER =====
  const handleDeletePhoto = (id: string) => {
    console.log("Deleting photo:", id);
    setUploadedPhotos((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      // Persist after delete
      savePhotosToLocalStorage(updated);
      return updated;
    });
  };

  // ===== PERSIST TO LOCALSTORAGE =====
  const persistPhotosToStorage = () => {
    // Use a timeout to ensure state has updated
    setTimeout(() => {
      const photosToSave = uploadedPhotos
        .filter((p) => !p.isUploading)
        .map((p) => ({
          id: p.id,
          url: p.uploadedUrl || p.previewUrl,
        }));
      localStorage.setItem("mc_uploadedPhotos", JSON.stringify(photosToSave));
    }, 100);
  };

  const savePhotosToLocalStorage = (photos: UploadedPhoto[]) => {
    const photosToSave = photos
      .filter((p) => !p.isUploading)
      .map((p) => ({
        id: p.id,
        url: p.uploadedUrl || p.previewUrl,
      }));
    localStorage.setItem("mc_uploadedPhotos", JSON.stringify(photosToSave));
  };

  // ===== LOAD UPLOADCARE SCRIPT =====
  const loadUploadcareScript = (): Promise<void> => {
    return new Promise((resolve) => {
      if ((window as any).uploadcare) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://ucarecdn.com/libs/widget/3.x/uploadcare.full.min.js";
      script.async = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  };

  // ===== CONTINUE HANDLER =====
  const handleContinue = () => {
    const readyPhotos = uploadedPhotos.filter((p) => !p.isUploading);
    if (readyPhotos.length < 5) {
      alert("You need at least 5 photos to continue.");
      return;
    }
    // Save to localStorage before navigating
    const count = readyPhotos.length;
    localStorage.setItem("mc_photoCount", String(count));
    localStorage.setItem("mc_uploadedPhotos", JSON.stringify(
      readyPhotos.map((p) => ({
        id: p.id,
        url: p.uploadedUrl || p.previewUrl,
        name: p.name,
      }))
    ));
    console.log("Navigating to /checkout with mc_photoCount =", count);
    navigate("/checkout");
  };

  // ===== DERIVED STATE =====
  const readyCount = uploadedPhotos.filter((p) => !p.isUploading).length;
  const hasUploading = uploadedPhotos.some((p) => p.isUploading);
  const canContinue = readyCount >= 5 && !hasUploading;

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
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-all"
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
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-all"
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
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-all"
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

          {/* ===== PHOTO GRID - DRIVEN ONLY BY uploadedPhotos ===== */}
          {uploadedPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
              {uploadedPhotos.map((photo) => (
                <div key={photo.id} className="flex flex-col gap-1">
                  <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-border shadow-sm bg-muted flex items-center justify-center">
                    {photo.isUploading ? (
                      <>
                        <img
                          src={photo.previewUrl}
                          alt={photo.name}
                          className="w-full h-full object-contain opacity-50"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        </div>
                      </>
                    ) : (
                      <>
                        <img
                          src={photo.uploadedUrl || photo.previewUrl}
                          alt={photo.name}
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-1 right-1 bg-background/90 hover:bg-destructive hover:text-destructive-foreground rounded-full p-1 transition-all shadow-sm"
                          aria-label="Delete photo"
                        >
                          <Plus className="h-4 w-4 rotate-45" />
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight text-center truncate">
                    {photo.isUploading ? "Uploading..." : photo.name}
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
              className="px-10 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg shadow-md hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasUploading ? "Uploading..." : "Continue"}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden File Inputs with direct onChange */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          handleFileSelect(e.target.files, true);
          e.target.value = "";
        }}
        className="hidden"
      />
      <input
        ref={rollInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          handleFileSelect(e.target.files, false);
          e.target.value = "";
        }}
        className="hidden"
      />
      <input
        ref={filesInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          handleFileSelect(e.target.files, false);
          e.target.value = "";
        }}
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
