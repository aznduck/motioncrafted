import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { toast } from 'sonner';

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;
    try {
      const data = await api.getOrderDetail(orderId);
      setOrder(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (clipId: string) => {
    try {
      await api.approveClip(clipId);
      toast.success('Clip approved');
      loadOrder();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReject = async (clipId: string) => {
    const notes = prompt('Rejection notes (optional):');
    try {
      await api.rejectClip(clipId, notes || undefined);
      toast.success('Clip rejected');
      loadOrder();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Finalize this order? This will create the final video.')) return;
    try {
      await api.finalizeOrder(orderId!);
      toast.success('Order finalized! Video is being created...');
      loadOrder();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDownload = () => {
    window.open(api.getDownloadUrl(orderId!), '_blank');
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!order) return <div className="p-8">Order not found</div>;

  const allApproved = order.clips.length > 0 && order.clips.every((c: any) => c.review_status === 'approved');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <button onClick={() => navigate('/')} className="text-sm text-blue-600 hover:text-blue-800 mb-2">← Back to Orders</button>
            <h1 className="text-2xl font-bold text-gray-900">{order.customer_name}</h1>
            <p className="text-sm text-gray-600">{order.customer_email}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mb-2">
              {order.status.replace('_', ' ')}
            </span>
            {order.status === 'approved' && (
              <button
                onClick={handleFinalize}
                className="block w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
              >
                Finalize Order
              </button>
            )}
            {order.status === 'completed' && (
              <button
                onClick={handleDownload}
                className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Download Video
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Order Info */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Vibe:</p>
              <p className="font-medium">{order.vibe.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-gray-600">Photos:</p>
              <p className="font-medium">{order.photos.length}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-600">Personalization Message:</p>
              <p className="font-medium italic">{order.personalization_message}</p>
            </div>
          </div>
        </div>

        {/* Clips */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Clips ({order.clips.length})</h2>
          {order.clips.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
              No clips generated yet
            </div>
          ) : (
            order.clips.map((clip: any) => (
              <div key={clip.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex gap-6">
                  {/* Video Player */}
                  <div className="flex-1">
                    <video
                      controls
                      className="w-full rounded-lg bg-black"
                      src={api.getClipStreamUrl(clip.id)}
                    />
                  </div>

                  {/* Controls */}
                  <div className="w-64 space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Status:</p>
                      <p className="font-medium">{clip.review_status || 'Pending'}</p>
                    </div>
                    {clip.admin_notes && (
                      <div>
                        <p className="text-sm text-gray-600">Notes:</p>
                        <p className="text-sm">{clip.admin_notes}</p>
                      </div>
                    )}
                    {clip.review_status !== 'approved' && (
                      <button
                        onClick={() => handleApprove(clip.id)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                      >
                        Approve
                      </button>
                    )}
                    {clip.review_status !== 'rejected' && (
                      <button
                        onClick={() => handleReject(clip.id)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {allApproved && order.status === 'pending_review' && (
          <div className="mt-6 bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-green-800 font-medium">✓ All clips approved! Ready to finalize.</p>
          </div>
        )}
      </main>
    </div>
  );
}
