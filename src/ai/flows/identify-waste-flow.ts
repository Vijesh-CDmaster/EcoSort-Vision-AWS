"use server";

import { ai } from "@/ai/genkit";
import { z } from "zod";

// Schema for waste identification response
const WasteIdentificationSchema = z.object({
  itemName: z.string().describe("The name of the identified item/object"),
  category: z.enum(["recyclable", "compostable", "e-waste", "hazardous", "landfill", "reusable"]).describe("Waste category"),
  material: z.string().describe("Primary material the item is made of"),
  binSuggestion: z.enum(["plastic", "glass", "compost", "landfill"]).describe("Which bin to put it in"),
  confidence: z.number().min(0).max(100).describe("Confidence percentage 0-100"),
  disposalTips: z.string().describe("Brief tips for proper disposal"),
});

export type WasteIdentification = z.infer<typeof WasteIdentificationSchema>;

export async function identifyWasteFromImage(imageBase64: string): Promise<WasteIdentification> {
  // Remove data URL prefix if present
  const base64Data = imageBase64.includes(",") 
    ? imageBase64.split(",")[1] 
    : imageBase64;

  const prompt = `You are an expert waste identification and classification system. Analyze this image and identify what object(s) are shown.

Identify the main object in the image and classify it for proper waste disposal.

For the item you see, provide:
1. itemName: What is this object? Be specific (e.g., "Solder wire spool", "Arduino Uno microcontroller board", "Plastic water bottle", "Cardboard box")
2. category: Choose the most appropriate category:
   - "recyclable" for plastics, metals, paper, cardboard, glass
   - "compostable" for food waste, organic materials, yard waste
   - "e-waste" for electronics, batteries, circuit boards, cables, phones, computers
   - "hazardous" for chemicals, paint, batteries, fluorescent bulbs
   - "landfill" for non-recyclable items, mixed materials
   - "reusable" for items that can be donated or repurposed
3. material: What is it made of? (e.g., "Electronic components and PCB", "Tin and solder", "PET plastic")
4. binSuggestion: Which standard bin should it go in:
   - "plastic" for recyclable plastics, metals, cans
   - "glass" for glass items
   - "compost" for organic/food waste
   - "landfill" for everything else (including e-waste which needs special disposal)
5. confidence: How confident are you in this identification (0-100)?
6. disposalTips: Brief disposal advice (e.g., "Take to e-waste recycling center", "Rinse before recycling")

Return ONLY valid JSON matching this exact structure:
{
  "itemName": "string",
  "category": "recyclable|compostable|e-waste|hazardous|landfill|reusable",
  "material": "string", 
  "binSuggestion": "plastic|glass|compost|landfill",
  "confidence": number,
  "disposalTips": "string"
}`;

  try {
    const response = await ai.generate({
      model: "googleai/gemini-2.0-flash",
      prompt: [
        { text: prompt },
        { 
          media: { 
            url: `data:image/jpeg;base64,${base64Data}`,
            contentType: "image/jpeg"
          } 
        }
      ],
    });

    const text = response.text;
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate with schema
    const result = WasteIdentificationSchema.parse(parsed);
    return result;
  } catch (error) {
    console.error("Gemini Vision identification error:", error);
    
    // Return a default response on error
    return {
      itemName: "Unknown Object",
      category: "landfill",
      material: "Unknown",
      binSuggestion: "landfill",
      confidence: 0,
      disposalTips: "If unsure, check with local waste management guidelines.",
    };
  }
}
