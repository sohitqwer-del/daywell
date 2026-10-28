import { z } from "zod";
export const plateItemSchema = z.object({
  name: z.string().min(1).max(150),
  serving: z.string().max(150),
  calories: z.number().finite().min(0).max(10000),
  protein: z.number().finite().min(0).max(1000),
  carbs: z.number().finite().min(0).max(1500),
  fat: z.number().finite().min(0).max(1000),
  eatenPercent: z.number().min(0).max(100).default(100),
  nutritionKnown: z.boolean().default(true),
});
export type PlateItem = z.infer<typeof plateItemSchema>;
export const plateEstimateSchema = z.object({
  name: z.string().min(1).max(150),
  calories: z.number().finite().min(0).max(10000).default(0),
  protein: z.number().finite().min(0).max(1000).default(0),
  carbs: z.number().finite().min(0).max(1500).default(0),
  fat: z.number().finite().min(0).max(1000).default(0),
  notes: z.string().max(1000).default(""),
  items: z.array(plateItemSchema).max(20).optional(),
});
export function parseEstimate(text: string) {
  const value = text
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
  const result = plateEstimateSchema.parse(JSON.parse(value));
  if (result.items?.length) {
    const sum = plateTotals(result.items, false);
    return { ...result, ...sum };
  }
  return result;
}
export function plateTotals(items: PlateItem[], consumed = true) {
  return items.reduce(
    (sum, item) => {
      const factor = consumed ? item.eatenPercent / 100 : 1;
      return {
        calories: sum.calories + item.calories * factor,
        protein: sum.protein + item.protein * factor,
        carbs: sum.carbs + item.carbs * factor,
        fat: sum.fat + item.fat * factor,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
export function photoPortion(meal: {
  quantity: number;
  photo?: { items?: unknown[] };
}) {
  return meal.photo?.items?.length
    ? "Custom food portions"
    : `${Math.round(meal.quantity * 100)}% of photographed plate`;
}
