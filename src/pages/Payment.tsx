import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Payment = () => {
  const navigate = useNavigate();
  const [photoCount, setPhotoCount] = useState<number>(0);
  const pricePerPhoto = 6;
  const totalPrice = photoCount * pricePerPhoto;

  useEffect(() => {
    const storedCount = localStorage.getItem('mc_photoCount');
    const count = storedCount ? parseInt(storedCount, 10) : 0;
    
    if (!storedCount || count < 5) {
      navigate('/upload');
      return;
    }
    
    setPhotoCount(count);
  }, [navigate]);

  const handlePayment = () => {
    // Navigate to order confirmed page
    navigate('/order-confirmed');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 px-4 py-8 md:py-12 pt-24 md:pt-28">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-display text-foreground mb-2">
              Step 3 – Secure Payment
            </h1>
          </div>

          {/* Order Summary Card */}
          <Card className="mb-6 border-2 shadow-soft">
            <CardContent className="pt-6">
              <div className="space-y-3 text-center">
                <p className="text-lg text-muted-foreground">
                  You're animating <span className="font-semibold text-foreground">{photoCount}</span> photo{photoCount !== 1 ? 's' : ''}
                </p>
                <p className="text-2xl font-display text-foreground">
                  Total due: ${pricePerPhoto} × {photoCount} = ${totalPrice}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reassurance Text */}
          <p className="text-center text-muted-foreground mb-8">
            Your payment is processed securely. You'll receive your finished video within 48 hours.
          </p>

          {/* Payment Button */}
          <Button
            onClick={handlePayment}
            size="xl"
            variant="hero"
            className="w-full"
          >
            Pay Securely
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Payment;
