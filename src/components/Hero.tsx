import heroImage from "@/assets/hero-photos.jpg";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Hero = () => {
  const navigate = useNavigate();

  const handleUploadClick = () => {
    navigate("/upload");
  };

  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left space-y-6 lg:space-y-8 animate-fade-in order-2 lg:order-1">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display font-bold leading-tight text-foreground">
              Give a Gift They'll Remember Forever
            </h1>
            <p
              className="text-lg sm:text-xl lg:text-2xl font-normal max-w-2xl mx-auto lg:mx-0 leading-relaxed"
              style={{ color: "hsl(var(--hero-subtext))" }}
            >
              We turn your most cherished family photos into a beautiful,
              emotional video — crafted with gentle motion, music, and a
              heartfelt message.
            </p>
            <p className="text-base sm:text-lg italic text-muted-foreground max-w-xl mx-auto lg:mx-0">
              Designed to make your loved one tear up the moment they watch it.
              yes
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                onClick={handleUploadClick}
                variant="hero"
                size="xl"
                className="w-full sm:w-auto min-w-[280px]"
              >
                Create a Motion Crafted Gift
              </Button>
              <Button variant="outline" size="xl" className="w-full sm:w-auto">
                See Examples
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div
            className="relative animate-fade-in order-1 lg:order-2"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="relative rounded-3xl overflow-hidden shadow-premium mx-auto max-w-sm sm:max-w-md lg:max-w-none">
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
