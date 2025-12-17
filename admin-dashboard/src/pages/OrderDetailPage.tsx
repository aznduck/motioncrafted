import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "sonner";
import RejectClipModal from "../components/RejectClipModal";
import ConfirmModal from "../components/ConfirmModal";

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [clipToReject, setClipToReject] = useState<string | null>(null);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  console.log(order);

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
      toast.success("Clip approved");
      loadOrder();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReject = (clipId: string) => {
    setClipToReject(clipId);
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (notes: string, regenerate: boolean) => {
    if (!clipToReject) return;

    setRejectModalOpen(false);

    try {
      await api.rejectClip(clipToReject, notes || undefined, regenerate);
      toast.success(
        regenerate
          ? "Clip rejected - regeneration started!"
          : "Clip rejected"
      );
      loadOrder();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setClipToReject(null);
    }
  };

  const handleFinalize = async () => {
    setFinalizeModalOpen(false);
    setFinalizing(true);
    try {
      await api.finalizeOrder(orderId!);
      toast.success("Final video created successfully! 🎉");
      loadOrder();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownload = () => {
    window.open(api.getDownloadUrl(orderId!), "_blank");
  };

  const handleSendEmail = async () => {
    setEmailModalOpen(false);
    setSendingEmail(true);
    try {
      await api.sendDeliveryEmail(orderId!);
      toast.success(`Delivery email sent to ${order.customer_email}! ✉️`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!order) return <div className="p-8">Order not found</div>;

  // Filter out archived clips (regenerated clips)
  const activeClips = order.clips.filter((c: any) => c.review_status !== "archived");
  const allApproved =
    activeClips.length > 0 &&
    activeClips.every((c: any) => c.review_status === "approved");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Reject Modal */}
      <RejectClipModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setClipToReject(null);
        }}
        onSubmit={handleRejectSubmit}
      />

      {/* Finalize Confirmation Modal */}
      <ConfirmModal
        isOpen={finalizeModalOpen}
        title="Finalize Order"
        message="This will stitch all approved clips into the final video. Are you sure you want to continue?"
        confirmText="Finalize Order"
        confirmColor="green"
        onConfirm={handleFinalize}
        onCancel={() => setFinalizeModalOpen(false)}
      />

      {/* Send Email Confirmation Modal */}
      <ConfirmModal
        isOpen={emailModalOpen}
        title="Send Delivery Email"
        message={`Send delivery email to ${order?.customer_email}?\n\nThis will send them a link to view and download their video.`}
        confirmText="Send Email"
        confirmColor="purple"
        onConfirm={handleSendEmail}
        onCancel={() => setEmailModalOpen(false)}
      />

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <button
              onClick={() => navigate("/")}
              className="text-sm text-blue-600 hover:text-blue-800 mb-2"
            >
              ← Back to Orders
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {order.customer_name}
            </h1>
            <p className="text-sm text-gray-600">{order.customer_email}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mb-2">
              {order.status.replace("_", " ")}
            </span>
            {order.status === "approved" && (
              <button
                onClick={() => setFinalizeModalOpen(true)}
                disabled={finalizing}
                className="block w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {finalizing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Video...
                  </span>
                ) : (
                  "Finalize Order"
                )}
              </button>
            )}
            {order.status === "completed" && (
              <div className="space-y-2">
                <button
                  onClick={handleDownload}
                  className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Download Video
                </button>
                <button
                  onClick={() => setEmailModalOpen(true)}
                  disabled={sendingEmail}
                  className="block w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingEmail ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    "Send Delivery Email"
                  )}
                </button>
              </div>
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
              <p className="font-medium">{order.vibe.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-gray-600">Photos:</p>
              <p className="font-medium">{order.photos.length}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-600">Personalization Message:</p>
              <p className="font-medium italic">
                {order.personalization_message}
              </p>
            </div>
          </div>
        </div>

        {/* Original Photos */}
        {order.photos && order.photos.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">
              Original Photos ({order.photos.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {order.photos.map((photo: any, index: number) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.photo_url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => window.open(photo.photo_url, "_blank")}
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                    #{photo.upload_order + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final Video */}
        {order.final_video_url && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Final Video</h2>
            <div className="max-w-3xl mx-auto">
              <video
                controls
                className="w-full rounded-lg bg-black shadow-lg"
                src={order.final_video_url}
              />
            </div>
          </div>
        )}

        {/* Clips */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Clips ({activeClips.length})
          </h2>
          {activeClips.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
              No clips generated yet
            </div>
          ) : (
            activeClips.map((clip: any) => (
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
                      <p className="font-medium">
                        {clip.review_status || "Pending"}
                      </p>
                    </div>
                    {clip.admin_notes && (
                      <div>
                        <p className="text-sm text-gray-600">Notes:</p>
                        <p className="text-sm">{clip.admin_notes}</p>
                      </div>
                    )}
                    {clip.review_status !== "approved" && (
                      <button
                        onClick={() => handleApprove(clip.id)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                      >
                        Approve
                      </button>
                    )}
                    {clip.review_status !== "rejected" && (
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
        {allApproved && order.status === "pending_review" && (
          <div className="mt-6 bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-green-800 font-medium">
              ✓ All clips approved! Ready to finalize.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
