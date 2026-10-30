import { describe, it, expect, vi } from "vitest";
import { createState, uid, validateBackup } from "../src/domain";
import {
  rankFoodMatches,
  normalizeFoodName,
  parseRecognition,
  suggestRecognizedFoods,
  confirmRecognizedFood,
  rememberCorrection,
  recognizeMeal,
  recognitionResponseSchema,
} from "../src/recognition";
import { plateTotals } from "../src/photoModel";

const response = {
  isFood: true,
  quality: "clear",
  mealName: "Rice and dal",
  notes: "Oil and spices cannot be verified.",
  question: "Is the curry dal or chickpeas?",
  dishes: [
    {
      name: "Rice",
      visibleAmount: "about 1 cup",
      confidence: "high",
      alternatives: [],
      catalogFoodId: "rice",
    },
    {
      name: "Dal",
      visibleAmount: "about 1 katori",
      confidence: "low",
      alternatives: ["Chole"],
      catalogFoodId: "dal",
    },
  ],
} as const;
describe("catalog-grounded recognition", () => {
  it("matches familiar Indian spellings and favours a plain staple over mixed rice", () => {
    const s = createState();
    expect(normalizeFoodName("Chapathi")).toBe("roti");
    expect(rankFoodMatches("rice", s.foods)[0].food.id).toBe("rice");
    expect(rankFoodMatches("chapati", s.foods)[0].food.id).toBe("roti");
    expect(
      rankFoodMatches("sambhar", s.foods).some(
        (x) => x.food.id === "in-sambar",
      ),
    ).toBe(true);
  });
  it("never treats a suggestion as a confirmed identity or nutrition measurement", () => {
    const s = createState(),
      result = parseRecognition(JSON.stringify(response));
    const items = suggestRecognizedFoods(result, s);
    expect(items).toHaveLength(2);
    expect(
      items.every((x) => x.confirmed === false && x.nutritionKnown === false),
    ).toBe(true);
    expect(plateTotals(items).calories).toBe(0);
  });
  it("uses selected catalog values after confirmation, not model-generated nutrients", () => {
    const s = createState();
    const result = parseRecognition(
      JSON.stringify({
        ...response,
        dishes: [{ ...response.dishes[0], calories: 99999 }],
      }),
    );
    const suggestion = suggestRecognizedFoods(result, s)[0],
      confirmed = confirmRecognizedFood(
        suggestion,
        s.foods.find((f) => f.id === "rice")!,
        1.5,
      );
    expect(confirmed.calories).toBe(307.5);
    expect(confirmed.confirmed).toBe(true);
    expect(plateTotals([{ ...confirmed, eatenPercent: 50 }]).calories).toBe(
      153.75,
    );
  });
  it("can confirm a name while keeping unknown nutrition unknown", () => {
    const s = createState(),
      suggestion = suggestRecognizedFoods(
        parseRecognition(JSON.stringify(response)),
        s,
      )[1];
    const item = confirmRecognizedFood(suggestion, null, 1);
    expect(item.confirmed).toBe(true);
    expect(item.nutritionKnown).toBe(false);
    expect(item.catalogFoodId).toBeUndefined();
    expect(() => confirmRecognizedFood(item, s.foods[0], -1)).toThrow();
  });
  it("rejects invalid recognition and non-food contradictions", () => {
    expect(() => parseRecognition("not json")).toThrow(/unreadable/);
    expect(() =>
      parseRecognition(JSON.stringify({ ...response, isFood: false })),
    ).toThrow(/complete food list/);
    const noFood = parseRecognition(
      JSON.stringify({ ...response, isFood: false, dishes: [] }),
    );
    expect(suggestRecognizedFoods(noFood, createState())).toEqual([]);
  });
  it("ignores invented catalog IDs and does not force a match for unknown names", () => {
    const s = createState();
    const result = parseRecognition(
      JSON.stringify({
        ...response,
        dishes: [
          {
            ...response.dishes[0],
            name: "unidentifiable dish xyz",
            catalogFoodId: "invented",
          },
        ],
      }),
    );
    expect(suggestRecognizedFoods(result, s)[0].catalogFoodId).toBeUndefined();
  });
  it("stores bounded, removable label feedback with no photos", () => {
    const s = createState();
    rememberCorrection(s, "Chapati", "roti");
    rememberCorrection(s, "chapathi", "roti");
    expect(s.recognitionCorrections).toHaveLength(1);
    expect(s.recognitionCorrections[0]).not.toHaveProperty("image");
    expect(validateBackup(s).recognitionCorrections).toHaveLength(1);
  });
  it("passes only recognition context and the selected photo to a provider adapter", async () => {
    const s = createState(),
      backend = vi.fn(async () => JSON.stringify(response));
    const result = await recognizeMeal(
      s,
      () => {},
      "data:image/jpeg;base64,test",
      "Lunch",
      "No onions",
      backend,
    );
    expect(result.isFood).toBe(true);
    const args = backend.mock.calls[0] as unknown as unknown[];
    expect(args[4]).toBe("data:image/jpeg;base64,test");
    expect(args[5]).toBe(recognitionResponseSchema);
    expect(args[3]).not.toHaveProperty("profile");
    expect(args[3]).not.toHaveProperty("workouts");
  });
});
