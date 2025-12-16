const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface CreateOrderRequest {
  customer_name: string;
  customer_email: string;
  vibe: 'cinematic_emotional' | 'warm_human' | 'joyful_alive' | 'quiet_timeless';
  personalization_message?: string;
  photos: File[];
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  vibe: string;
  personalization_message: string;
  status: string;
  payment_status: string;
  created_at: string;
  clips: any[];
  final_video_url?: string;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  order_id: string;
}

class CustomerApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async createOrder(data: CreateOrderRequest): Promise<{ order_id: string; message: string }> {
    const formData = new FormData();
    formData.append('customer_name', data.customer_name);
    formData.append('customer_email', data.customer_email);
    formData.append('vibe', data.vibe);

    if (data.personalization_message) {
      formData.append('personalization_message', data.personalization_message);
    }

    // Append all photos
    data.photos.forEach((photo) => {
      formData.append('photos', photo);
    });

    return this.request<{ order_id: string; message: string }>('/customer/orders', {
      method: 'POST',
      body: formData,
    });
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.request<Order>(`/customer/orders/${orderId}`);
  }

  async createCheckoutSession(orderId: string): Promise<CheckoutSessionResponse> {
    return this.request<CheckoutSessionResponse>(`/customer/orders/${orderId}/checkout`, {
      method: 'POST',
    });
  }

  getVideoDownloadUrl(orderId: string): string {
    return `${API_URL}/customer/orders/${orderId}/download`;
  }
}

export const customerApi = new CustomerApiClient();
