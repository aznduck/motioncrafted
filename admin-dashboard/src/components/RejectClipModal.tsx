import { useState } from "react";

interface RejectClipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (notes: string, regenerate: boolean) => void;
}

export default function RejectClipModal({ isOpen, onClose, onSubmit }: RejectClipModalProps) {
  const [notes, setNotes] = useState("");
  const [regenerate, setRegenerate] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(notes, regenerate);
    // Reset for next time
    setNotes("");
    setRegenerate(false);
  };

  const handleClose = () => {
    setNotes("");
    setRegenerate(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Reject Clip</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What needs improvement?"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Describe what's wrong with this clip to help improve future generations.
            </p>
          </div>

          {notes.trim().length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={regenerate}
                  onChange={(e) => setRegenerate(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    Regenerate clip automatically
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    Your feedback will be used to improve the animation prompt with AI, and a new clip will be generated.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            {regenerate ? "Reject & Regenerate" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
