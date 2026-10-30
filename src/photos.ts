import { Camera, CameraSource, CameraResultType } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
const isNative = Capacitor.isNativePlatform();
import { uid, type State } from "./domain";

const jpeg = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
export interface PreparedPhoto {
  image: string;
  thumbnail: string;
  qualityWarnings?: string[];
}
async function photoDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("daywell-photos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("photos");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(Error("Photo storage could not open."));
  });
}
async function webPhoto(id: string, data?: string) {
  const db = await photoDb();
  try {
    return await new Promise<string>((resolve, reject) => {
      const tx = db.transaction("photos", data ? "readwrite" : "readonly");
      const store = tx.objectStore("photos");
      const r = data ? store.put(data, id) : store.get(id);
      tx.oncomplete = () => resolve(data || r.result);
      tx.onerror = () => reject(Error("Photo could not be saved."));
    });
  } finally {
    db.close();
  }
}
export async function preparePhoto(url: string): Promise<PreparedPhoto> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () =>
      reject(Error("This image could not be opened. Try a JPEG or PNG."));
    i.src = url;
  });
  if (!image.naturalWidth || !image.naturalHeight)
    throw Error("Photo is empty.");
  const render = (max: number, quality: number) => {
    const c = document.createElement("canvas"),
      scale = Math.min(
        1,
        max / Math.max(image.naturalWidth, image.naturalHeight),
      );
    c.width = Math.max(1, Math.round(image.naturalWidth * scale));
    c.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = c.getContext("2d");
    if (!ctx) throw Error("Photo processing is unavailable.");
    ctx.drawImage(image, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  };
  const result = render(1200, 0.76),
    thumbnail = render(180, 0.5);
  if (result.length > 2_000_000 || thumbnail.length > 40000)
    throw Error("Photo is too large. Choose a smaller image.");
  const qualityWarnings: string[] = [];
  if (image.naturalWidth < 240 || image.naturalHeight < 160)
    qualityWarnings.push(
      "This photo is small. A closer, higher-resolution photo may improve recognition.",
    );
  const sample = document.createElement("canvas");
  sample.width = 64;
  sample.height = 64;
  const ctx = sample.getContext("2d");
  if (ctx) {
    ctx.drawImage(image, 0, 0, 64, 64);
    const pixels = ctx.getImageData(0, 0, 64, 64).data;
    let dark = 0;
    for (let i = 0; i < pixels.length; i += 4)
      if (
        0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2] <
        22
      )
        dark++;
    if (dark / (pixels.length / 4) > 0.8)
      qualityWarnings.push(
        "This photo is very dark. Add light or retake it before identifying foods.",
      );
  }
  return { image: result, thumbnail, qualityWarnings };
}
export async function rotatePhoto(data: string) {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(Error("Photo could not be rotated."));
    image.src = data;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalHeight;
  canvas.height = img.naturalWidth;
  const context = canvas.getContext("2d");
  if (!context) throw Error("Photo editing is unavailable.");
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(Math.PI / 2);
  context.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return preparePhoto(canvas.toDataURL("image/jpeg", 0.85));
}
export async function takePhoto(source: "camera" | "gallery") {
  const photo = await Camera.getPhoto({
    source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
    resultType: CameraResultType.Uri,
    width: 1280,
    height: 1280,
    quality: 80,
    saveToGallery: false,
    correctOrientation: true,
    webUseInput: true,
  });
  if (!photo.webPath) throw Error("No photo was selected.");
  return preparePhoto(photo.webPath);
}
export async function savePhoto(data: string, id: string = uid()) {
  if (
    !/^[0-9a-f-]{36}$/.test(id) ||
    !jpeg.test(data) ||
    data.length > 2_000_000
  )
    throw Error("Invalid photo.");
  if (isNative)
    await Filesystem.writeFile({
      path: `photos/${id}.jpg`,
      data: data.split(",")[1],
      directory: Directory.Data,
      recursive: true,
    });
  else await webPhoto(id, data);
  return id;
}
export async function readPhoto(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw Error("Invalid photo reference.");
  if (isNative) {
    const result = await Filesystem.readFile({
      path: `photos/${id}.jpg`,
      directory: Directory.Data,
    });
    return "data:image/jpeg;base64," + result.data;
  }
  const data = await webPhoto(id);
  if (!data) throw Error("Photo unavailable");
  return data;
}
export async function photoUrl(id: string) {
  if (isNative) {
    const file = await Filesystem.getUri({
      path: `photos/${id}.jpg`,
      directory: Directory.Data,
    });
    return Capacitor.convertFileSrc(file.uri);
  }
  return readPhoto(id);
}
export async function backupPhotos(state: State) {
  const photos: Record<string, string> = {};
  for (const id of new Set(
    state.meals.map((m) => m.photo?.id).filter((id): id is string => !!id),
  )) {
    try {
      photos[id] = await readPhoto(id);
    } catch {
      throw Error(
        "A saved photo is missing. Your records have not changed. Restore its photo before making a full backup.",
      );
    }
  }
  return photos;
}
export function validatePhotoBackup(raw: unknown): Record<string, string> {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw Error("Invalid photo backup.");
  const entries = Object.entries(raw);
  if (entries.length > 2000) throw Error("Photo backup is too large.");
  for (const [id, data] of entries)
    if (
      !/^[0-9a-f-]{36}$/.test(id) ||
      typeof data !== "string" ||
      !jpeg.test(data) ||
      data.length > 2_000_000
    )
      throw Error("Backup contains an invalid photo.");
  return raw as Record<string, string>;
}
export async function restorePhotos(photos: Record<string, string>) {
  for (const [id, data] of Object.entries(photos)) await savePhoto(data, id);
}
export async function clearPhotos() {
  await (await import("./photoDrafts")).clearPhotoDraft();
  if (isNative) {
    try {
      await Filesystem.rmdir({
        path: "photos",
        directory: Directory.Data,
        recursive: true,
      });
    } catch {
      /* No photo directory yet. */
    }
  } else {
    const db = await photoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(Error("Photos could not be removed."));
    });
    db.close();
  }
}
