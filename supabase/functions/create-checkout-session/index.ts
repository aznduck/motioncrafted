import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const PRICE_ID = "price_1SZRrdBI6vfgLmxLsSj9Z45n";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const { photoCount, mc_orderId } = await req.json();

    // Validate photoCount
    if (!photoCount || photoCount < 5) {
      return new Response(
        JSON.stringify({ error: 'photoCount must be at least 5' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate mc_orderId
    if (!mc_orderId) {
      return new Response(
        JSON.stringify({ error: 'mc_orderId is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Creating Stripe checkout session for order:', mc_orderId, 'with', photoCount, 'photos');

    // Initialize Stripe
    const stripe = new Stripe(STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: PRICE_ID,
          quantity: photoCount,
        },
      ],
      success_url: "https://motioncrafted.co/order-confirmed?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://motioncrafted.co/checkout?canceled=1",
      metadata: {
        mc_orderId,
        photoCount: String(photoCount),
      },
      payment_intent_data: {
        metadata: {
          mc_orderId,
          photoCount: String(photoCount),
        },
      },
    });

    console.log('Stripe checkout session created successfully:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Error creating Stripe checkout session:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
