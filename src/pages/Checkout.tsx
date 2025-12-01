import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const checkoutSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Please enter a valid email address").max(255, "Email must be less than 255 characters"),
  phoneNumber: z.string().trim().max(20, "Phone number must be less than 20 characters").optional(),
  notes: z.string().trim().max(500, "Notes must be less than 500 characters").optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

const Checkout = () => {
  const navigate = useNavigate();
  const [photoCount, setPhotoCount] = useState<number>(0);
  const [orderId, setOrderId] = useState<string>('');
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
    
    // Read Order ID from localStorage
    const storedOrderId = localStorage.getItem('mc_orderId');
    if (storedOrderId) {
      setOrderId(storedOrderId);
    }
  }, [navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true);
    console.log("Checkout form submitted:", data);
    // Redirect to Stripe payment link with locked quantity parameter
    const stripeLink = 'https://buy.stripe.com/live_xxx123';
    window.location.href = `${stripeLink}?quantity=${photoCount}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 px-4 py-8 md:py-12 pt-24 md:pt-28">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-display text-foreground mb-2">
              Step 2 – Review & Complete Your Order
            </h1>
            {orderId && (
              <p className="text-xs text-muted-foreground/60 mt-2">
                Order ID: {orderId}
              </p>
            )}
          </div>

          {/* Order Summary Card */}
          <Card className="mb-8 border-2 shadow-soft">
            <CardContent className="pt-6">
              <h2 className="text-xl font-display text-foreground mb-4">
                Order Summary
              </h2>
              <div className="space-y-2 text-muted-foreground">
                <p className="text-lg">
                  You added <span className="font-semibold text-foreground">{photoCount}</span> photo{photoCount !== 1 ? 's' : ''}
                </p>
                <p className="text-lg">
                  Total price: <span className="font-semibold text-foreground">${pricePerPhoto} × {photoCount} = ${totalPrice}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card className="border-2 shadow-soft">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    {...register("fullName")}
                    placeholder="John Smith"
                    className={errors.fullName ? "border-destructive" : ""}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName.message}</p>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="john@example.com"
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-foreground">
                    Phone Number <span className="text-muted-foreground text-sm">(optional)</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    {...register("phoneNumber")}
                    placeholder="+1 (555) 123-4567"
                    className={errors.phoneNumber ? "border-destructive" : ""}
                  />
                  {errors.phoneNumber && (
                    <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-foreground">
                    Notes <span className="text-muted-foreground text-sm">(optional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Any special instructions or requests..."
                    rows={4}
                    className={errors.notes ? "border-destructive" : ""}
                  />
                  {errors.notes && (
                    <p className="text-sm text-destructive">{errors.notes.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="xl"
                  variant="hero"
                  className="w-full mt-8"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Continue to Payment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
