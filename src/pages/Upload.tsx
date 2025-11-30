import { useEffect, useState, useRef } from "react";
import { Camera, Image, FolderOpen, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UploadedPhoto {
  id: string;
  url: string;
}

const Upload = () => {
  const navigate = useNavigate();
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const rollInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://ucarecdn.com/libs/widget/3.x/uploadcare.full.min.js";
    script.async = true;
    document.body.appendChild(script);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://ucarecdn.com/libs/widget/3.x/uploadcare.min.css";
    document.head.appendChild(link);

    return () => {
      document.body.removeChild(script);
      document.head.removeChild(link);
    };
  }, []);

  const setupUploader = (fileInput: HTMLInputElement) => {
    const handleChange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;

      if (files && files.length > 0) {
        const file = files[0];

        try {
          if ((window as any).uploadcare) {
            const uploadedFile = (window as any).uploadcare.fileFrom(
              "object",
              file,
              { publicKey: "31b0edbe0c35c307eaa8" }
            );

            uploadedFile.done((fileInfo: any) => {
              const newPhoto: UploadedPhoto = {
                id: fileInfo.uuid,
                url: fileInfo.cdnUrl,
              };
              setUploadedPhotos((prev) => [...prev, newPhoto]);
            });
          } else {
            const localUrl = URL.createObjectURL(file);
            const newPhoto: UploadedPhoto = {
              id: Date.now().toString(),
              url: localUrl,
            };
            setUploadedPhotos((prev) => [...prev, newPhoto]);
          }
        } catch (error) {
          console.error("Upload error:", error);
        }

        target.value = "";
      }
    };

    fileInput.addEventListener("change", handleChange);
    return () => fileInput.removeEventListener("change", handleChange);
  };

  useEffect(() => {
    if (cameraInputRef.current) {
      return setupUploader(cameraInputRef.current);
    }
  }, []);

  useEffect(() => {
    if (rollInputRef.current) {
      return setupUploader(rollInputRef.current);
    }
  }, []);

  useEffect(() => {
    if (filesInputRef.current) {
      return setupUploader(filesInputRef.current);
    }
  }, []);

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
    setUploadedPhotos((prev) => prev.filter((photo) => photo.id !== id));
  };

  const handleContinue = () => {
    // Navigate to checkout or next step
    alert("Proceeding to checkout with " + uploadedPhotos.length + " photos");
  };

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-display text-foreground">
              Step 1 – Add Your Photos
            </h1>
            <p className="text-base md:text-lg text-muted-foreground">
              Add at least 5 photos to continue.
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
                <div className="text-xs text-muted-foreground">Choose from your photo library</div>
              </div>
            </button>

            <button
              onClick={triggerFiles}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-smooth"
            >
              <FolderOpen className="h-6 w-6 text-primary flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-sm">Choose from Local Files</div>
                <div className="text-xs text-muted-foreground">Browse your device storage</div>
              </div>
            </button>
          </div>

          {/* Photo Count */}
          <div className="text-center py-4">
            <p className="text-lg font-semibold text-foreground">
              Photos added: {uploadedPhotos.length} (minimum 5)
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
                <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border-2 border-border shadow-soft">
                  <img
                    src={photo.url}
                    alt="Uploaded photo"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-1 right-1 bg-background/90 hover:bg-destructive hover:text-destructive-foreground rounded-full p-1 transition-smooth shadow-soft"
                    aria-label="Delete photo"
                  >
                    <Plus className="h-4 w-4 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Continue Button */}
          <div className="pt-6 flex justify-center">
            <button
              onClick={handleContinue}
              disabled={uploadedPhotos.length < 5}
              className="px-10 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg shadow-premium hover:shadow-soft hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:hover:shadow-premium"
            >
              Continue ({uploadedPhotos.length}/5)
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
    </div>
  );
};

export default Upload;
