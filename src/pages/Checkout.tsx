import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { customerApi } from "@/lib/customerApi";
import { toast } from "sonner";

const checkoutSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Please enter a valid email address").max(255, "Email must be less than 255 characters"),
  phoneNumber: z.string().trim().max(20, "Phone number must be less than 20 characters").optional(),
  
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface OrderData {
  photos: { id: string; url: string; order: number }[];
  video_vibe: string;
  specialMessage: string | null;
}

const Checkout = () => {
  const navigate = useNavigate();
  const [photoCount, setPhotoCount] = useState<number>(0);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const pricePerPhoto = 6;
  const totalPrice = photoCount * pricePerPhoto;

  useEffect(() => {
    // Load order data from localStorage
    const storedOrderData = localStorage.getItem('mc_photoAnimations');

    if (!storedOrderData) {
      navigate('/animations');
      return;
    }

    try {
      const parsed: OrderData = JSON.parse(storedOrderData);

      if (!parsed.photos || parsed.photos.length < 5) {
        navigate('/upload');
        return;
      }

      setOrderData(parsed);
      setPhotoCount(parsed.photos.length);
    } catch (error) {
      console.error('Failed to parse order data:', error);
      navigate('/animations');
    }
  }, [navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  // Helper function to download photo from URL and convert to File
  const downloadPhotoAsFile = async (url: string, filename: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  };

  const onSubmit = async (formData: CheckoutFormData) => {
    if (!orderData) {
      toast.error('Order data not found. Please start over.');
      navigate('/upload');
      return;
    }

    setIsLoading(true);

    try {
      // Download all photos from Uploadcare URLs and convert to Files
      toast.info('Preparing your photos...');

      const photoFiles = await Promise.all(
        orderData.photos.map(async (photo, index) => {
          const filename = `photo_${index + 1}.jpg`;
          return await downloadPhotoAsFile(photo.url, filename);
        })
      );

      // Create order via backend API
      toast.info('Creating your order...');

      const response = await customerApi.createOrder({
        customer_name: formData.fullName,
        customer_email: formData.email,
        vibe: orderData.video_vibe as any,
        personalization_message: orderData.specialMessage || undefined,
        photos: photoFiles,
      });

      // Store order ID for tracking
      localStorage.setItem('mc_completed_order_id', response.order_id);

      // Clear temporary order data
      localStorage.removeItem('mc_photoAnimations');
      localStorage.removeItem('mc_uploadedPhotos');
      localStorage.removeItem('mc_photoCount');

      toast.success('Order created successfully!');

      // For now, navigate to success page (Stripe integration will come later)
      navigate('/order-confirmed');
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 px-4 py-8 md:py-12 pt-24 md:pt-28">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-display text-foreground mb-2">
              Step 3 – Review & Complete Your Order
            </h1>
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
              </div>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card className="border-2 shadow-soft">
            <CardContent className="pt-6">
              <div className="space-y-6">
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


                {/* Submit Button */}
                <Button
                  size="xl"
                  variant="hero"
                  className="w-full mt-8"
                  onClick={handleSubmit(onSubmit)}
                  disabled={photoCount < 5 || isLoading}
                >
                  {isLoading ? "Processing..." : "Create Order"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
