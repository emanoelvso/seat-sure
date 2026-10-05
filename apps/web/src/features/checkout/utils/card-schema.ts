import { z } from "zod";
import { validateCard } from "@/features/checkout/utils/card";

// AD-019: built on card.ts's rules rather than re-expressing them, so the
// pay action's field errors always match the preview/form validation.
export const cardSchema = z
  .object({
    number: z.string(),
    holder: z.string(),
    expiry: z.string(),
    cvv: z.string(),
  })
  .superRefine((data, ctx) => {
    const errors = validateCard(data, new Date());
    for (const [field, message] of Object.entries(errors)) {
      if (message) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [field] });
      }
    }
  });

export type CardFormValues = z.infer<typeof cardSchema>;
