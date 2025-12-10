import { useState } from "react";

// ===== DEBUG VERSION =====
// This is a minimal test to verify React state works correctly.
// All Uploadcare, localStorage, crop queue logic is removed.

type DebugPhoto = {
  id: string;
  name: string;
  previewUrl: string;
};

const Upload = () => {
  const [debugPhotos, setDebugPhotos] = useState<DebugPhoto[]>([]);

  console.log("Upload component rendered, debugPhotos.length =", debugPhotos.length);

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-display text-foreground mb-6">
          DEBUG Upload Page
        </h1>

        {/* Debug file input */}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            console.log("DEBUG onChange fired with", files.length, "files");

            setDebugPhotos((prev) => [
              ...prev,
              ...files.map((file) => ({
                id: crypto.randomUUID(),
                name: file.name,
                previewUrl: URL.createObjectURL(file),
              })),
            ]);

            // Allow re-selecting same file
            e.target.value = "";
          }}
        />

        {/* Debug photo grid */}
        <div className="mt-8">
          <p className="text-lg font-semibold mb-4">
            Debug photo count: {debugPhotos.length}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
            }}
          >
            {debugPhotos.map((photo) => (
              <div key={photo.id}>
                <img
                  src={photo.previewUrl}
                  alt={photo.name}
                  style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: "4px",
                  }}
                />
                <small>{photo.name}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
