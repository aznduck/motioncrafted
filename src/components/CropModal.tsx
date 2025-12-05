import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";

interface CropModalProps {
  imageUrl: string;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
  queueRemaining?: number;
}

// Helper function to create cropped image from pixel crop
const createCroppedImage = (
  image: HTMLImageElement,
  crop: PixelCrop
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Set canvas size to crop size
  canvas.width = crop.width;
  canvas.height = crop.height;

  // Draw cropped image
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      "image/jpeg",
      0.9
    );
  });
};

const CropModal = ({ imageUrl, onConfirm, onCancel, queueRemaining = 0 }: CropModalProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // When image loads, set initial crop to cover most of the image
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Initial crop: 80% of image, centered
    const cropWidth = width * 0.8;
    const cropHeight = height * 0.8;
    const x = (width - cropWidth) / 2;
    const y = (height - cropHeight) / 2;

    const initialCrop: Crop = {
      unit: "px",
      x,
      y,
      width: cropWidth,
      height: cropHeight,
    };

    setCrop(initialCrop);
    setCompletedCrop({
      unit: "px",
      x,
      y,
      width: cropWidth,
      height: cropHeight,
    });
  }, []);

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) return;
    
    setIsProcessing(true);
    try {
      const croppedBlob = await createCroppedImage(imgRef.current, completedCrop);
      onConfirm(croppedBlob);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl mx-4 bg-card rounded-xl shadow-premium border-2 border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-display text-foreground">Crop Your Photo</h2>
            {queueRemaining > 0 && (
              <p className="text-xs text-muted-foreground">{queueRemaining} more photo{queueRemaining > 1 ? 's' : ''} in queue</p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-muted transition-smooth"
            aria-label="Cancel"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="p-4 bg-muted/50 flex items-center justify-center max-h-[60vh] overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            className="max-w-full"
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Crop preview"
              onLoad={onImageLoad}
              className="max-w-full max-h-[55vh] object-contain"
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>

        {/* Instructions */}
        <div className="px-4 py-2 text-center text-sm text-muted-foreground border-t border-border">
          Drag to move • Drag corners or edges to resize
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-4 border-t border-border">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="hero"
            className="flex-1"
            onClick={handleConfirm}
            disabled={isProcessing || !completedCrop}
          >
            {isProcessing ? (
              "Processing..."
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {queueRemaining > 0 ? "Confirm & Next" : "Confirm Crop"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CropModal;
