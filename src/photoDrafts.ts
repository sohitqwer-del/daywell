import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { z } from "zod";
import { plateItemSchema } from "./photoModel";
import { recognitionSchema } from "./recognition";

const photo = z.object({
  image: z
    .string()
    .max(2_000_000)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/),
  thumbnail: z
    .string()
    .max(40000)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/),
  qualityWarnings: z.array(z.string().max(300)).max(5).optional(),
});
export const photoDraftSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
  photo,
  name: z.string().max(150),
  place: z.string().max(150),
  notes: z.string().max(1000),
  percent: z.number().min(1).max(100),
  mode: z.enum(["whole", "items"]),
  items: z.array(plateItemSchema).max(20),
  plate: z.object({
    calories: z.number().finite().min(0).max(100000),
    protein: z.number().finite().min(0).max(100000),
    carbs: z.number().finite().min(0).max(100000),
    fat: z.number().finite().min(0).max(100000),
  }),
  nutrition: z.boolean(),
  estimated: z.boolean(),
  reviewed: z.boolean(),
  recognition: recognitionSchema.nullable(),
  remember: z
    .array(
      z.object({ label: z.string().max(150), foodId: z.string().max(100) }),
    )
    .max(20),
});
export type PhotoDraft = z.infer<typeof photoDraftSchema>;
async function webDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("daywell-drafts", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("drafts");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(Error("Draft storage is unavailable."));
  });
}
async function webOp(action: "read" | "write" | "delete", value?: PhotoDraft) {
  const db = await webDb();
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(
          "drafts",
          action === "read" ? "readonly" : "readwrite",
        ),
        store = tx.objectStore("drafts");
      const r =
        action === "read"
          ? store.get("meal")
          : action === "write"
            ? store.put(value, "meal")
            : store.delete("meal");
      tx.oncomplete = () => resolve(r.result);
      tx.onerror = () => reject(Error("The photo draft could not be saved."));
    });
  } finally {
    db.close();
  }
}
export async function loadPhotoDraft(): Promise<PhotoDraft | null> {
  await queue.catch(() => {});
  let raw: unknown;
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Filesystem.readFile({
        path: "meal-draft.json",
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      raw = JSON.parse(String(result.data));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (/not exist|no such|not found/i.test(message)) return null;
      throw Error(
        "The saved photo draft could not be read. Existing meal records are unchanged.",
      );
    }
  } else raw = await webOp("read");
  if (!raw) return null;
  const checked = photoDraftSchema.safeParse(raw);
  if (!checked.success)
    throw Error(
      "The saved photo draft needs attention. Your logged meals are unchanged.",
    );
  return checked.data;
}
let queue = Promise.resolve();
export function savePhotoDraft(value: PhotoDraft) {
  const checked = photoDraftSchema.parse(value);
  queue = queue
    .catch(() => {})
    .then(async () => {
      if (Capacitor.isNativePlatform())
        await Filesystem.writeFile({
          path: "meal-draft.json",
          directory: Directory.Data,
          data: JSON.stringify(checked),
          encoding: Encoding.UTF8,
        });
      else await webOp("write", checked);
    });
  return queue;
}
export async function clearPhotoDraft() {
  await queue.catch(() => {});
  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.deleteFile({
        path: "meal-draft.json",
        directory: Directory.Data,
      });
    } catch (e) {
      if (
        !/not exist|no such|not found/i.test(
          e instanceof Error ? e.message : String(e),
        )
      )
        throw Error("The old photo draft could not be removed.");
    }
  } else await webOp("delete");
}
