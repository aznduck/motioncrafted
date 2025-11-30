import { Sparkles, Gift, Clock, UserCheck, Heart, Zap } from "lucide-react";

const benefits = [
  {
    icon: Sparkles,
    title: "High-quality, handcrafted animations",
    description: "Every frame is carefully crafted by our expert team",
  },
  {
    icon: Gift,
    title: "Perfect for gifts, memorials, and celebrations",
    description: "Create lasting memories for any special occasion",
  },
  {
    icon: Clock,
    title: "Fast 48-hour delivery",
    description: "Get your beautiful video back quickly",
  },
  {
    icon: UserCheck,
    title: "Done-for-you professional service",
    description: "Sit back while we handle all the details",
  },
  {
    icon: Heart,
    title: "Emotional, meaningful final results",
    description: "Videos that capture the heart of your memories",
  },
  {
    icon: Zap,
    title: "Zero technical skills required",
    description: "Simply upload your photos and we do the rest",
  },
];

const WhyChooseUs = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Why Choose Us
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're dedicated to preserving your precious memories with care and artistry
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="flex gap-4 animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
