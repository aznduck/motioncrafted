import { Heart, Sparkles, Play, Music, MessageSquareHeart, Palette } from "lucide-react";

const benefits = [
  {
    icon: Palette,
    title: "Handcrafted With Care",
    description: "Each video is thoughtfully refined — ensuring your memories look beautiful, natural, and emotionally meaningful. We combine advanced tools with a creator's touch to deliver quality you can feel.",
  },
  {
    icon: Heart,
    title: "Emotional Storytelling",
    description: "We artfully sequence your photos to build a beginning, a middle, and a powerful ending that lands with emotion.",
  },
  {
    icon: Play,
    title: "Soft, Gentle Motion",
    description: "No uncanny deepfake effects — just subtle, tasteful movement that enhances the memory without changing it.",
  },
  {
    icon: Music,
    title: "Meaningful Music",
    description: "We pair your photos with a warm, sentimental soundtrack that sets the emotional tone.",
  },
  {
    icon: MessageSquareHeart,
    title: "A Personal Touch",
    description: "Add a custom message at the end — the perfect final moment that often brings people to tears.",
  },
];

const WhyChooseUs = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-6">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Why Motion Crafted Is Different
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="group p-6 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-smooth animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex flex-col items-start space-y-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
