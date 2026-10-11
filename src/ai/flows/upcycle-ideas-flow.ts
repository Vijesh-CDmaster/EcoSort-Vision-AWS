
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const UpcycleIdeasInputSchema = z.string();

const UpcycleIdeaSchema = z.object({
  title: z.string().describe('A short, catchy title for the upcycling idea.'),
  description: z.string().describe('A one-sentence description of the upcycling project.'),
});

const UpcycleIdeasOutputSchema = z.object({
    ideas: z.array(UpcycleIdeaSchema).describe('An array of 3 unique upcycling ideas.'),
});

export type UpcycleIdeasOutput = z.infer<typeof UpcycleIdeasOutputSchema>;


const prompt = ai.definePrompt({
    name: 'upcycleIdeasPrompt',
    input: { schema: UpcycleIdeasInputSchema },
    output: { schema: UpcycleIdeasOutputSchema },
    prompt: `You are a creative and eco-conscious DIY expert. Your task is to generate 3 unique, simple, and practical upcycling ideas for the given waste item.

    For each idea, provide a short title and a one-sentence description of the project.
    
    Waste Item: {{{prompt}}}
    
    Provide your response as a JSON object with a key "ideas" containing an array of 3 idea objects.`,
});

const upcycleIdeasFlow = ai.defineFlow(
  {
    name: 'upcycleIdeasFlow',
    inputSchema: UpcycleIdeasInputSchema,
    outputSchema: UpcycleIdeasOutputSchema,
  },
  async (item) => {
    const { output } = await prompt(item);
    return output!;
  }
);

export async function getUpcycleIdeas(item: string): Promise<UpcycleIdeasOutput> {
    return upcycleIdeasFlow(item);
}
