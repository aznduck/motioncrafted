import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-photos.jpg";

const Hero = () => {
  return (
    <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left space-y-6 lg:space-y-8 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight text-foreground">
              Bring Your Photos to Life
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto lg:mx-0">
              Premium handcrafted animations from your most cherished memories.
            </p>
            <div className="pt-4">
              <Button 
                variant="hero" 
                size="xl"
                className="w-full sm:w-auto min-w-[280px]"
              >
                Upload Your Photos
              </Button>
            </div>
          </div>
          
          <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative rounded-2xl overflow-hidden shadow-premium">
              <img 
                src={heroImage} 
                alt="Collection of cherished family photos spread artistically" 
                className="w-full h-auto object-cover"
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
