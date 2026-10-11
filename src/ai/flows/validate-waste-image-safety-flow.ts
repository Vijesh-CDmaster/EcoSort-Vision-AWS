"use server";

import { ai } from "@/ai/genkit";
import { z } from "zod";

const WasteImageSafetySchema = z.object({
  safeForWasteClassification: z.boolean().describe("Whether the image is safe to classify as waste"),
  hasHuman: z.boolean().describe("Whether any human, face, hand, or body part is visible"),
  reason: z.string().describe("Short explanation of the safety decision"),
});

export type WasteImageSafetyResult = z.infer<typeof WasteImageSafetySchema>;

function extractBase64(imageBase64: string) {
  return imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
}

function getGeminiApiKey() {
  return process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
}

export async function validateWasteImageSafety(imageBase64: string): Promise<WasteImageSafetyResult> {
  if (!getGeminiApiKey()) {
    throw new Error("Safety check unavailable. Set GOOGLE_GENAI_API_KEY to enable Gemini image safety validation.");
  }

  const base64Data = extractBase64(imageBase64);

  const prompt = `You are validating an image for a waste classification system.

Rule: the system should classify only the waste object itself. Reject the image if ANY human content is visible, including a person, face, hand, arm, body part, reflection of a person, or someone holding the object.

Return ONLY valid JSON in this exact format:
{
  "safeForWasteClassification": true,
  "hasHuman": false,
  "reason": "short explanation"
}

Mark safeForWasteClassification as true only when the image shows the waste object alone with no visible human content.`;

  const response = await ai.generate({
    model: "googleai/gemini-2.0-flash",
    prompt: [
      { text: prompt },
      {
        media: {
          url: `data:image/jpeg;base64,${base64Data}`,
          contentType: "image/jpeg",
        },
      },
    ],
  });

  const text = response.text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Gemini safety check returned an invalid response.");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return WasteImageSafetySchema.parse(parsed);
}