import { Play, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Delivery = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Headline */}
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="font-elegant text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-4">
              Your Motion Crafted Video
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Thank you for trusting us with your memories. Your finished video is ready below.
            </p>
          </div>

          {/* Video Container */}
          <div className="my-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="relative w-full aspect-video bg-muted/30 rounded-lg shadow-soft overflow-hidden border border-border/50">
              {/* Placeholder video frame with play icon */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/40">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 backdrop-blur-sm border-2 border-primary/30 flex items-center justify-center hover:bg-primary/20 hover:scale-110 transition-smooth cursor-pointer group">
                    <Play className="w-10 h-10 sm:w-12 sm:h-12 text-primary fill-primary group-hover:scale-110 transition-smooth" />
                  </div>
                  <p className="text-sm text-muted-foreground">Video player placeholder</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button
              variant="hero"
              size="xl"
              className="w-full sm:w-auto"
              asChild
            >
              <a href="#download-placeholder" className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download Video
              </a>
            </Button>
            
            <Button
              variant="outline"
              size="xl"
              className="w-full sm:w-auto"
              asChild
            >
              <a href="#share-placeholder" className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Share Video
              </a>
            </Button>
          </div>

          {/* Divider */}
          <div className="my-8">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent"></div>
          </div>

          {/* Reassurance */}
          <div className="text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <p>
              If you ever need help accessing your video, contact us at{" "}
              <a 
                href="mailto:motioncrafted@gmail.com" 
                className="text-primary hover:underline transition-smooth"
              >
                motioncrafted@gmail.com
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Delivery;
