import { z } from "zod";
const confidence = z.enum(["high", "medium", "low"]);
export const recognitionSchema = z
  .object({
    isFood: z.boolean(),
    quality: z.enum(["clear", "dark", "blurred", "obstructed"]),
    mealName: z.string().max(150),
    notes: z.string().max(1000),
    question: z.string().max(300),
    dishes: z
      .array(
        z.object({
          name: z.string().min(1).max(150),
          visibleAmount: z.string().max(150),
          confidence,
          alternatives: z.array(z.string().min(1).max(150)).max(3),
          catalogFoodId: z.string().max(100).nullable(),
        }),
      )
      .max(12),
  })
  .superRefine((value, ctx) => {
    if (!value.isFood && value.dishes.length)
      ctx.addIssue({
        code: "custom",
        message: "Non-food result cannot contain dishes.",
      });
  });
export type Recognition = z.infer<typeof recognitionSchema>;
