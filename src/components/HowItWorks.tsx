import { Upload, Sparkles, Gift } from "lucide-react";

const steps = [
  {
    icon: Upload,
    number: "1",
    title: "Upload Your Photos",
    description: "Choose your favorite memories — old prints, scanned images, or phone photos.",
  },
  {
    icon: Sparkles,
    number: "2",
    title: "We Handcraft the Video",
    description: "We animate each photo, fix imperfections, and craft a moving story.",
  },
  {
    icon: Gift,
    number: "3",
    title: "Receive Your Finished Keepsake",
    description: "Delivered digitally within 48 hours. Ready to gift, save, or share with your family.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to transform your memories into a cinematic keepsake
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="text-center space-y-4 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-primary/10"></div>
                <div className="absolute inset-2 rounded-full bg-primary/5 flex items-center justify-center">
                  <step.icon className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {step.number}
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <h3 className="text-xl sm:text-2xl font-display font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
