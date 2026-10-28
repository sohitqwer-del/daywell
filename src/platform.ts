import { Capacitor, registerPlugin, CapacitorHttp } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Health } from "@capgo/capacitor-health";
import { indianFoods } from "./data/indianFoods";
import {
  createState,
  validateBackup,
  foodSchema,
  dayKey,
  shiftDay,
  type State,
  type Food,
} from "./domain";
interface NativeBridge {
  load(): Promise<{ value?: string }>;
  save(o: { value: string }): Promise<void>;
  setKey(o: { key: string }): Promise<void>;
  status(): Promise<{
    hasKey: boolean;
    chatgpt: boolean;
    email?: string;
    authError?: string;
  }>;
  disconnect(): Promise<void>;
  signIn(): Promise<{ email: string }>;
  cancelSignIn(): Promise<void>;
  models(): Promise<{ models: { id: string; name: string }[] }>;
  ask(o: {
    mode: string;
    model: string;
    instructions: string;
    input: string;
    image?: string;
  }): Promise<{ text: string; input: number; output: number }>;
}
export const Native = registerPlugin<NativeBridge>("Wellness");
export const isNative = Capacitor.isNativePlatform();
export async function loadState() {
  const raw = isNative
    ? (await Native.load()).value
    : localStorage.getItem("forma-state");
  const state = raw ? validateBackup(JSON.parse(raw)) : createState();
  const existing = new Set(state.foods.map((f) => f.id));
  for (const food of indianFoods)
    if (!existing.has(food.id) && state.foods.length < 5000)
      state.foods.push(food);
  return state;
}
export async function saveState(state: State) {
  const raw = JSON.stringify(state);
  if (isNative) await Native.save({ value: raw });
  else localStorage.setItem("forma-state", raw);
}
export async function exportData(state: State) {
  const name = `daywell-backup-${dayKey()}.json`,
    data = JSON.stringify(
      { ...state, media: await (await import("./photos")).backupPhotos(state) },
      null,
      2,
    );
  if (data.length > 64_000_000)
    throw Error(
      "Backup exceeds 64 MB. Export fewer photos in a future release or keep a device backup.",
    );
  if (isNative) {
    const file = await Filesystem.writeFile({
      path: name,
      data,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: "Daywell backup",
      url: file.uri,
      dialogTitle: "Save your Daywell backup",
    });
  } else {
    const url = URL.createObjectURL(
      new Blob([data], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
export async function lookupBarcode(barcode: string): Promise<Food> {
  if (!/^\d{8,14}$/.test(barcode))
    throw Error("Enter an 8–14 digit product barcode.");
  const response = await CapacitorHttp.get({
    url: `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
    params: { fields: "product_name,brands,nutriments,quantity" },
    headers: {
      "User-Agent": "Daywell/1.0 (open-source Android nutrition diary)",
    },
    connectTimeout: 15000,
    readTimeout: 15000,
  });
  const data =
    typeof response.data === "string"
      ? JSON.parse(response.data)
      : response.data;
  if (response.status !== 200 || data.status !== 1)
    throw Error("Product not found. You can add it manually.");
  const p = data.product,
    n = p.nutriments;
  if (!n || n["energy-kcal_100g"] === undefined)
    throw Error(
      "This product has no calorie data. Check its label and add it manually.",
    );
  return foodSchema.parse({
    id: "off-" + barcode,
    name: p.product_name || p.brands || "Scanned food",
    serving: "100 g",
    calories: Number(n["energy-kcal_100g"]) || 0,
    protein: Number(n.proteins_100g) || 0,
    carbs: Number(n.carbohydrates_100g) || 0,
    fat: Number(n.fat_100g) || 0,
    source: `Open Food Facts · ${barcode} · per 100 g; verify label`,
  });
}
export async function syncHealth(): Promise<State["health"]> {
  if (!isNative) throw Error("Health Connect is available in the Android app.");
  const available = await Health.isAvailable();
  if (!available.available)
    throw Error("Install or update Health Connect, then try again.");
  const permission = await Health.requestAuthorization({
    read: ["steps", "sleep", "weight"],
    write: [],
  });
  const endDate = new Date().toISOString(),
    startDate = new Date(shiftDay(dayKey(), -6) + "T00:00:00").toISOString();
  const result: State["health"] = {
    steps: [],
    sleep: [],
    weights: [],
    permissions: permission.readAuthorized,
    lastSync: endDate,
  };
  if (permission.readAuthorized.includes("steps")) {
    const rows = await Health.queryAggregated({
      dataType: "steps",
      startDate,
      endDate,
      bucket: "day",
      aggregation: "sum",
    });
    result.steps = rows.samples.map((s) => ({
      date: dayKey(new Date(s.startDate)),
      count: s.value,
    }));
  }
  if (permission.readAuthorized.includes("weight")) {
    const rows = await Health.readSamples({
      dataType: "weight",
      startDate,
      endDate,
      limit: 1000,
    });
    result.weights = rows.samples.map((s) => ({
      date: dayKey(new Date(s.startDate)),
      kg: s.value,
      source: s.sourceName || "Health Connect",
    }));
  }
  if (permission.readAuthorized.includes("sleep")) {
    const rows = await Health.readSamples({
      dataType: "sleep",
      startDate,
      endDate,
      limit: 1000,
    });
    const groups = new Map<string, typeof rows.samples>();
    rows.samples
      .filter((s) => s.sleepState !== "awake" && s.sleepState !== "inBed")
      .forEach((s) => {
        const key = dayKey(new Date(s.endDate));
        const current = groups.get(key) || [];
        current.push(s);
        groups.set(key, current);
      });
    for (const [date, samples] of groups) {
      const source = samples[0].sourceId || samples[0].sourceName;
      const chosen = samples.filter(
        (s) => (s.sourceId || s.sourceName) === source,
      );
      const ranges = chosen
        .map((s) => [
          new Date(s.startDate).getTime(),
          new Date(s.endDate).getTime(),
        ])
        .sort((a, b) => a[0] - b[0]);
      let duration = 0,
        lastEnd = 0;
      for (const [start, end] of ranges) {
        duration += Math.max(0, end - Math.max(start, lastEnd));
        lastEnd = Math.max(lastEnd, end);
      }
      result.sleep.push({
        date,
        minutes: duration / 60000,
        source: chosen[0].sourceName || "Health Connect",
      });
    }
  }
  if (permission.readAuthorized.length === 0)
    throw Error("No permissions granted. Your existing records are unchanged.");
  return result;
}
