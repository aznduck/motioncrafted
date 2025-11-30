import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const OrderConfirmed = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          <div className="bg-card rounded-lg p-8 sm:p-12 shadow-soft border border-border/50 text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-primary" />
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="font-elegant text-3xl sm:text-4xl font-semibold mb-4 text-foreground">
              Your Order Is Confirmed
            </h1>

            {/* Supporting Text */}
            <div className="space-y-4 mb-8">
              <p className="text-foreground/80 text-lg">
                Thank you for trusting Motion Crafted with your memories.
              </p>
              <p className="text-foreground/80 text-lg">
                We'll begin animating your photos right away and you'll receive your finished video within 48 hours.
              </p>
            </div>

            {/* Reassurance Line */}
            <p className="text-sm text-muted-foreground mb-8">
              A confirmation email with your order details will be sent to you shortly.
            </p>

            {/* Back to Homepage Button */}
            <Button
              onClick={() => navigate("/")}
              variant="hero"
              size="lg"
              className="w-full sm:w-auto"
            >
              Back to Homepage
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderConfirmed;
