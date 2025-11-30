import { useEffect, useState, useRef } from "react";
import heroImage from "@/assets/hero-photos.jpg";
import { Camera, Image, FolderOpen, Plus } from "lucide-react";

interface UploadedPhoto {
  id: string;
  url: string;
}

const Hero = () => {
  const [showStep1, setShowStep1] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const rollInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);

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
          
          // Scroll to Step 1 section if not already visible
          if (step1Ref.current) {
            step1Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
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
    setShowStep1(true);
    // Scroll to Step 1 section
    setTimeout(() => {
      if (step1Ref.current) {
        step1Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleContinue = () => {
    if (uploadedPhotos.length >= 5) {
      // Scroll to next section (below Step 1)
      const nextSection = step1Ref.current?.nextElementSibling;
      if (nextSection) {
        nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    setUploadedPhotos(prev => prev.filter(photo => photo.id !== photoId));
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

      {/* Step 1 - Add Photos Section */}
      {showStep1 && (
        <section ref={step1Ref} className="py-16 md:py-24 bg-background border-t-2 border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="space-y-8">
              {/* Header */}
              <div className="text-center space-y-2">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  Step 1 – Add your photos
                </h2>
                <p className="text-lg text-muted-foreground">
                  Choose how you'd like to add photos to your animation
                </p>
              </div>

              {/* Upload Options - Three Cards */}
              <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <button
                  onClick={triggerCamera}
                  className="flex flex-col items-center gap-4 p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-smooth text-center group"
                >
                  <Camera className="h-10 w-10 text-primary" />
                  <div>
                    <div className="font-semibold text-lg mb-1">Take Photo</div>
                    <div className="text-sm text-muted-foreground">Open your device camera</div>
                  </div>
                </button>

                <button
                  onClick={triggerCameraRoll}
                  className="flex flex-col items-center gap-4 p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-smooth text-center group"
                >
                  <Image className="h-10 w-10 text-primary" />
                  <div>
                    <div className="font-semibold text-lg mb-1">Select from Camera Roll</div>
                    <div className="text-sm text-muted-foreground">Choose from your photo library</div>
                  </div>
                </button>

                <button
                  onClick={triggerFiles}
                  className="flex flex-col items-center gap-4 p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-smooth text-center group"
                >
                  <FolderOpen className="h-10 w-10 text-primary" />
                  <div>
                    <div className="font-semibold text-lg mb-1">Choose from Local Files</div>
                    <div className="text-sm text-muted-foreground">Browse your device storage</div>
                  </div>
                </button>
              </div>

              {/* Photo Count and Gallery */}
              <div className="space-y-6 pt-8">
                <div className="text-center">
                  <p className="text-xl font-semibold text-foreground mb-2">
                    Photos added: <span className="text-primary">{uploadedPhotos.length}</span> (minimum 5)
                  </p>
                  {uploadedPhotos.length < 5 && (
                    <p className="text-sm text-destructive">
                      Add at least 5 photos to continue.
                    </p>
                  )}
                </div>

                {/* Photo Grid */}
                {uploadedPhotos.length === 0 ? (
                  <div className="text-center py-16 px-4 border-2 border-dashed border-border rounded-2xl bg-muted/30">
                    <Image className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-lg text-muted-foreground">
                      No photos added yet. Add at least 5 photos to continue.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                    {uploadedPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-border shadow-soft hover:shadow-premium transition-smooth group"
                      >
                        <img
                          src={photo.url}
                          alt="Uploaded photo"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-smooth hover:scale-110"
                          aria-label="Delete photo"
                        >
                          <Plus className="h-4 w-4 rotate-45" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Continue Button */}
                <div className="pt-8 flex justify-center">
                  <button
                    onClick={handleContinue}
                    disabled={uploadedPhotos.length < 5}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold ring-offset-background transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium hover:scale-105 w-full sm:w-auto min-w-[280px] h-14 px-10 text-base"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default Hero;
