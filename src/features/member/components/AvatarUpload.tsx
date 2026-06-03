import { useRef, useState } from "react";
import { Camera, X, Upload } from "lucide-react";

interface AvatarUploadProps {
  /** Current avatar URL (data URL or remote). null = show initials. */
  avatarUrl: string | null;
  initials: string;
  /** Called with a data URL when the user selects a new image. */
  onChange: (dataUrl: string) => void;
  /** Called when the user removes the current avatar. */
  onRemove: () => void;
  /** Show the edit overlay (only on own profile). */
  editable?: boolean;
}

const MAX_SIZE_MB = 2;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function AvatarUpload({
  avatarUrl,
  initials,
  onChange,
  onRemove,
  editable = false,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function processFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError("Only JPEG, PNG, WebP, or GIF files are accepted.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") onChange(result);
      else setError("Could not read the file. Please try again.");
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
    };
    reader.onerror = () => {
      setError("Failed to read the file. Please try another image.");
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
    };
    reader.onabort = () => {
      setError("File read was cancelled.");
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
    };
    reader.readAsDataURL(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div
        className={`relative h-24 w-24 shrink-0 ${
          editable && dragging ? "ring-2 ring-white/40 ring-offset-2 ring-offset-background" : ""
        }`}
        onDragOver={
          editable
            ? (e) => {
                e.preventDefault();
                setDragging(true);
              }
            : undefined
        }
        onDragLeave={editable ? () => setDragging(false) : undefined}
        onDrop={editable ? handleDrop : undefined}
      >
        {/* Image or initials */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile avatar"
            className="h-full w-full border-2 border-white/20 object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center border-2 border-white/20 bg-white/5 font-display text-3xl tracking-display text-foreground">
            {initials}
          </div>
        )}

        {/* Edit overlay — shown on hover when editable */}
        {editable && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
            aria-label="Change profile picture"
          >
            <Camera className="h-5 w-5 text-white" />
            <span className="text-[9px] font-tech uppercase tracking-wider-2 text-white/80">
              Change
            </span>
          </button>
        )}

        {/* Remove button — top-right corner when avatar is set */}
        {editable && avatarUrl && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center border border-white/20 bg-background text-muted-foreground transition hover:text-foreground"
            aria-label="Remove profile picture"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Upload button — shown below avatar when editable */}
      {editable && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 border border-white/12 bg-white/5 px-4 py-2 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground transition hover:border-white/25 hover:text-foreground"
          >
            <Upload className="h-3.5 w-3.5" />
            {avatarUrl ? "Replace Photo" : "Upload Photo"}
          </button>

          {error && (
            <p className="text-[10px] font-tech uppercase tracking-wider-2 text-red-400">{error}</p>
          )}

          <p className="text-[9px] text-muted-foreground/50">
            JPEG, PNG, WebP or GIF · max {MAX_SIZE_MB} MB
          </p>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            onChange={handleFileInput}
            className="sr-only"
            aria-hidden="true"
          />
        </>
      )}
    </div>
  );
}
