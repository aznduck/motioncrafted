import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const pricingTiers = [
  {
    name: "Basic",
    price: "$49",
    description: "Perfect for small collections",
    features: ["8 animated photos", "HD quality", "48-hour delivery", "Email support"],
  },
  {
    name: "Premium",
    price: "$99",
    description: "Ideal for family albums",
    features: ["20 animated photos", "Full HD quality", "48-hour delivery", "Priority support", "Custom music"],
    featured: true,
  },
  {
    name: "Tribute",
    price: "$149",
    description: "Ultimate memory experience",
    features: [
      "40 animated photos",
      "4K quality",
      "Cinematic editing",
      "24-hour delivery",
      "Premium support",
      "Custom soundtrack",
    ],
  },
];

const Pricing = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Choose Your Package
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select the perfect plan to bring your memories to life
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingTiers.map((tier, index) => (
            <Card 
              key={index}
              className={`relative flex flex-col transition-smooth hover:shadow-premium ${
                tier.featured ? 'border-2 border-primary shadow-premium scale-105' : 'border-border'
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold shadow-soft">
                    Most Popular
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-display mb-2">{tier.name}</CardTitle>
                <CardDescription className="text-muted-foreground mb-4">
                  {tier.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-display font-bold text-foreground">
                    {tier.price}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="flex-grow">
                <ul className="space-y-3">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={tier.featured ? "hero" : "default"}
                  size="lg"
                >
                  Order Now
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
