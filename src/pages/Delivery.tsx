import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Play, Download, Loader2, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { customerApi, Order } from "@/lib/customerApi";
import { toast } from "sonner";

const Delivery = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
    // Poll for updates every 30 seconds if order is processing
    const interval = setInterval(() => {
      if (order && order.status !== 'completed' && order.status !== 'failed') {
        loadOrder();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadOrder = async () => {
    try {
      // Try to get order ID from URL params first, then localStorage
      const orderIdFromUrl = searchParams.get('order_id');
      const orderIdFromStorage = localStorage.getItem('mc_completed_order_id');
      const orderId = orderIdFromUrl || orderIdFromStorage;

      if (!orderId) {
        toast.error('No order found');
        navigate('/');
        return;
      }

      const orderData = await customerApi.getOrder(orderId);
      setOrder(orderData);
    } catch (error: any) {
      console.error('Error loading order:', error);
      toast.error(error.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending_payment: {
        label: 'Pending Payment',
        color: 'text-yellow-600',
        icon: <Clock className="w-5 h-5" />
      },
      pending: {
        label: 'Order Received',
        color: 'text-blue-600',
        icon: <Clock className="w-5 h-5" />
      },
      processing: {
        label: 'Analyzing Photos',
        color: 'text-blue-600',
        icon: <Loader2 className="w-5 h-5 animate-spin" />
      },
      generating_clips: {
        label: 'Generating Clips',
        color: 'text-purple-600',
        icon: <Loader2 className="w-5 h-5 animate-spin" />
      },
      pending_review: {
        label: 'Under Review',
        color: 'text-orange-600',
        icon: <Clock className="w-5 h-5" />
      },
      approved: {
        label: 'Creating Final Video',
        color: 'text-green-600',
        icon: <Loader2 className="w-5 h-5 animate-spin" />
      },
      completed: {
        label: 'Completed',
        color: 'text-green-600',
        icon: <CheckCircle className="w-5 h-5" />
      },
      failed: {
        label: 'Failed',
        color: 'text-red-600',
        icon: <Clock className="w-5 h-5" />
      }
    };

    return statusMap[status] || statusMap.pending;
  };

  const handleDownload = () => {
    if (order) {
      window.open(customerApi.getVideoDownloadUrl(order.id), '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your order...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Order not found</p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const statusInfo = getStatusDisplay(order.status);
  const isCompleted = order.status === 'completed';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Headline */}
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="font-elegant text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-4">
              {isCompleted ? 'Your Video is Ready!' : 'Order Status'}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              {isCompleted
                ? 'Thank you for trusting us with your memories. Your finished video is ready below.'
                : 'We\'re working on your video. Check back here for updates.'}
            </p>
          </div>

          {/* Status Card */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={statusInfo.color}>
                  {statusInfo.icon}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{statusInfo.label}</h2>
                  <p className="text-sm text-muted-foreground">Order ID: {order.id}</p>
                </div>
              </div>

              {!isCompleted && (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Your video is being created. This typically takes 30-60 minutes.</p>
                  <p>We'll send you an email at <span className="font-medium text-foreground">{order.customer_email}</span> when it's ready.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Video Player (only if completed) */}
          {isCompleted && order.final_video_url && (
            <>
              <div className="my-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="relative w-full aspect-video bg-muted/30 rounded-lg shadow-soft overflow-hidden border border-border/50">
                  <video
                    controls
                    className="w-full h-full"
                    src={order.final_video_url}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <Button
                  variant="hero"
                  size="xl"
                  className="w-full sm:w-auto"
                  onClick={handleDownload}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Video
                </Button>
              </div>
            </>
          )}

          {/* Divider */}
          <div className="my-8">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent"></div>
          </div>

          {/* Contact Info */}
          <div className="text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <p>
              If you need help or have questions, contact us at{" "}
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
