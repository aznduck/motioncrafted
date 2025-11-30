import { useEffect } from "react";
import heroImage from "@/assets/hero-photos.jpg";

const Hero = () => {
  useEffect(() => {
    const btn = document.getElementById('uploadcare-trigger');
    if (!btn || typeof (window as any).uploadcare === 'undefined') return;

    const handleClick = () => {
      const dialog = (window as any).uploadcare.openDialog(null, {
        multiple: true,
        imagesOnly: true,
        tabs: 'file camera'
      });

      dialog.done((fileGroup: any) => {
        alert('Your photos have been uploaded. Scroll down to choose your package.');
        console.log('Uploaded file group:', fileGroup);
      });
    };

    btn.addEventListener('click', handleClick);
    return () => btn.removeEventListener('click', handleClick);
  }, []);

  return (
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
                id="uploadcare-trigger"
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
  );
};

export default Hero;
