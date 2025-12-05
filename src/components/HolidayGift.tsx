import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";

const HolidayGift = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24 bg-primary/5 relative overflow-hidden">
      {/* Subtle decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Gift className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground">
            Make This Christmas Truly Unforgettable
          </h2>
          
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              If you're searching for a heartfelt, personal gift — something deeper than a card or a store-bought present — <strong className="text-foreground">this is it.</strong>
            </p>
            <p>
              Your finished video arrives as a beautiful, emotional surprise your loved one can watch again and again.
            </p>
            <p className="text-foreground font-medium">
              Add a custom message at the end for the perfect final touch.
            </p>
          </div>
          
          <Button 
            onClick={() => navigate("/upload")}
            variant="hero"
            size="xl"
            className="mt-4"
          >
            Create a Holiday Gift Video
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HolidayGift;
