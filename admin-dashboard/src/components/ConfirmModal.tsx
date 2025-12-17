interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: "red" | "green" | "blue" | "purple";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "blue",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colorClasses = {
    red: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    green: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
    blue: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    purple: "bg-purple-600 hover:bg-purple-700 focus:ring-purple-500",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-gray-600 whitespace-pre-line">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${colorClasses[confirmColor]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
