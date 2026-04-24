import imageCompression from "browser-image-compression";

const OPTIONS = {
  maxSizeMB: 0.3, // ~300 KB final size
  maxWidthOrHeight: 1600, // big enough for detail view, small enough to be cheap
  useWebWorker: true, // off the main thread — UI stays smooth
  initialQuality: 0.8,
  fileType: "image/webp", // webp is ~30% smaller than jpeg at same quality
};

export async function compressImage(file) {
  // Skip files that aren't images or are already tiny
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 200 * 1024) return file;

  try {
    const compressed = await imageCompression(file, OPTIONS);
    // Preserve a sensible filename so the storage path keeps the right extension
    const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([compressed], newName, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("Compression failed, uploading original:", err);
    return file;
  }
}
