import { useEffect, useState, useRef } from "react";
import heroImage from "@/assets/hero-photos.jpg";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, Image, FolderOpen, Plus } from "lucide-react";

interface UploadedPhoto {
  id: string;
  url: string;
}

const Hero = () => {
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const rollInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleFileUpload = (input: HTMLInputElement) => {
      if (!input.files || !input.files.length || typeof (window as any).uploadcare === 'undefined') return;

      const files = Array.from(input.files).map((file) => {
        return (window as any).uploadcare.fileFrom('object', file);
      });

      Promise.all(files)
        .then((uploadedFiles: any[]) => {
          console.log('Uploaded files:', uploadedFiles);
          
          // Add uploaded photos to state
          const newPhotos: UploadedPhoto[] = uploadedFiles.map((file: any) => ({
            id: file.uuid || Math.random().toString(36).substr(2, 9),
            url: file.cdnUrl || URL.createObjectURL(input.files![0])
          }));
          
          setUploadedPhotos(prev => [...prev, ...newPhotos]);
          setShowUploadOptions(false);
        })
        .catch((err: any) => {
          console.error('Upload error:', err);
          alert('There was an issue uploading your photos. Please try again.');
        });

      input.value = '';
    };

    const setupInput = (ref: React.RefObject<HTMLInputElement>) => {
      if (!ref.current) return;
      
      const handler = () => handleFileUpload(ref.current!);
      ref.current.addEventListener('change', handler);
      
      return () => {
        if (ref.current) {
          ref.current.removeEventListener('change', handler);
        }
      };
    };

    const cleanup1 = setupInput(cameraInputRef);
    const cleanup2 = setupInput(rollInputRef);
    const cleanup3 = setupInput(filesInputRef);

    return () => {
      cleanup1?.();
      cleanup2?.();
      cleanup3?.();
    };
  }, []);

  const handleUploadClick = () => {
    setShowUploadOptions(true);
  };

  const handleContinueToPayment = () => {
    if (uploadedPhotos.length >= 5) {
      // TODO: Navigate to payment or next step
      alert('Continue to payment - this will be implemented next!');
    }
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

  return (
    <>
      {/* Hidden file inputs */}
      <input 
        ref={cameraInputRef}
        type="file" 
        accept="image/*" 
        capture="environment"
        multiple 
        style={{ display: 'none' }} 
      />
      <input 
        ref={rollInputRef}
        type="file" 
        accept="image/*" 
        multiple 
        style={{ display: 'none' }} 
      />
      <input 
        ref={filesInputRef}
        type="file" 
        multiple 
        style={{ display: 'none' }} 
      />

      <section className="relative pt-20 pb-16 md:pt-40 md:pb-24 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="text-center lg:text-left space-y-4 md:space-y-6 lg:space-y-8 animate-fade-in">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight text-foreground">
                Bring Your Photos to Life
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl font-normal max-w-2xl mx-auto lg:mx-0" style={{ color: 'hsl(var(--hero-subtext))' }}>
                Premium handcrafted animations from your most cherished memories.
              </p>
              <div className="pt-2 md:pt-4">
                <button 
                  onClick={handleUploadClick}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold ring-offset-background transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium hover:scale-105 w-full sm:w-auto min-w-[280px] h-16 md:h-14 px-12 md:px-10 text-lg md:text-base cursor-pointer"
                >
                  Upload Your Photos
                </button>
              </div>
            </div>
            
            <div className="relative animate-fade-in max-w-md mx-auto lg:max-w-none" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-3xl overflow-hidden shadow-premium h-[280px] sm:h-auto">
                <img 
                  src={heroImage} 
                  alt="Collection of cherished family photos spread artistically" 
                  className="w-full h-full sm:h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Preview Section */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="space-y-6">
            {/* Header with count and add more button */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-semibold text-foreground mb-2">
                  Your Photos
                </h2>
                <p className="text-lg text-muted-foreground">
                  Photos added: <span className="font-semibold text-foreground">{uploadedPhotos.length}</span> (minimum 5)
                </p>
                {uploadedPhotos.length < 5 && (
                  <p className="text-sm text-destructive mt-1">
                    You need at least 5 photos before you can continue.
                  </p>
                )}
              </div>
              <button
                onClick={handleUploadClick}
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition-smooth"
              >
                <Plus className="h-5 w-5" />
                Add more photos
              </button>
            </div>

            {/* Photo Grid */}
            {uploadedPhotos.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-border rounded-2xl bg-background">
                <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  No photos added yet. Add at least 5 photos to continue.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {uploadedPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-lg overflow-hidden border-2 border-border shadow-soft hover:shadow-premium transition-smooth"
                  >
                    <img
                      src={photo.url}
                      alt="Uploaded photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Continue Button */}
            <div className="pt-4 flex justify-center">
              <button
                onClick={handleContinueToPayment}
                disabled={uploadedPhotos.length < 5}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold ring-offset-background transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium hover:scale-105 w-full sm:w-auto min-w-[280px] h-14 px-10 text-base"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={showUploadOptions} onOpenChange={setShowUploadOptions}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col gap-4 py-4">
            <h2 className="text-2xl font-display font-semibold text-center mb-2">Choose Upload Method</h2>
            
            <button
              onClick={triggerCamera}
              className="flex items-center gap-4 p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-smooth text-left group"
            >
              <Camera className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold text-lg">Take Photo</div>
                <div className="text-sm text-muted-foreground">Open your device camera</div>
              </div>
            </button>

            <button
              onClick={triggerCameraRoll}
              className="flex items-center gap-4 p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-smooth text-left group"
            >
              <Image className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold text-lg">Select from Camera Roll</div>
                <div className="text-sm text-muted-foreground">Choose from your photo library</div>
              </div>
            </button>

            <button
              onClick={triggerFiles}
              className="flex items-center gap-4 p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-smooth text-left group"
            >
              <FolderOpen className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold text-lg">Choose from Local Files</div>
                <div className="text-sm text-muted-foreground">Browse your device storage</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Hero;
