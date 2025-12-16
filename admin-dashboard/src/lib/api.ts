/**
 * API Client for Admin Dashboard
 * Handles all backend communication with JWT authentication
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ access_token: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('admin_token', data.access_token);
    return data;
  }

  logout() {
    localStorage.removeItem('admin_token');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('admin_token');
  }

  // Orders
  async getOrders(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<{ orders: any[]; total: number }>(`/admin/orders${params}`);
  }

  async getOrderDetail(orderId: string) {
    return this.request<any>(`/admin/orders/${orderId}`);
  }

  async finalizeOrder(orderId: string) {
    return this.request<any>(`/admin/orders/${orderId}/finalize`, {
      method: 'POST',
    });
  }

  getDownloadUrl(orderId: string): string {
    const token = localStorage.getItem('admin_token');
    return `${API_URL}/admin/orders/${orderId}/download?token=${token}`;
  }

  // Clips
  async approveClip(clipId: string) {
    return this.request<any>(`/admin/clips/${clipId}/approve`, {
      method: 'POST',
    });
  }

  async rejectClip(clipId: string, notes?: string, regenerate = false) {
    return this.request<any>(`/admin/clips/${clipId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ notes, regenerate }),
    });
  }

  getClipStreamUrl(clipId: string): string {
    const token = localStorage.getItem('admin_token');
    return `${API_URL}/admin/clips/${clipId}/stream?token=${token}`;
  }
}

export const api = new ApiClient();
