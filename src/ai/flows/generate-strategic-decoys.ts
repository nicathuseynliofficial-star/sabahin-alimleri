'use server';

/**
 * @fileOverview A Genkit flow for generating realistic decoy coordinates based on military objectives.
 *
 * - generateStrategicDecoys - A function that generates decoy coordinates using AI.
 * - GenerateStrategicDecoysInput - The input type for the generateStrategicDecoys function.
 * - GenerateStrategicDecoysOutput - The return type for the generateStrategicDecoys function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStrategicDecoysInputSchema = z.object({
  latitude: z.number().describe('Latitude of the actual military objective.'),
  longitude: z.number().describe('Longitude of the actual military objective.'),
  terrainType: z
    .string() // Consider using an enum for predefined terrain types
    .describe('Type of terrain around the objective (e.g., mountain, desert, urban).'),
  proximityToPopulatedAreas: z
    .string() // Consider using an enum (e.g., high, medium, low)
    .describe('Proximity of the objective to populated areas (high, medium, low).'),
  knownEnemyPatrolRoutes: z
    .string()
    .describe('Description of known enemy patrol routes in the area.'),
  radiusKm: z
    .number()
    .describe(
      'The radius in kilometers within which the decoy coordinate should be generated.'
    ),
});
export type GenerateStrategicDecoysInput = z.infer<typeof GenerateStrategicDecoysInputSchema>;

const GenerateStrategicDecoysOutputSchema = z.object({
  decoyLatitude: z.number().describe('Latitude of the generated decoy coordinate.'),
  decoyLongitude: z.number().describe('Longitude of the generated decoy coordinate.'),
  reasoning: z
    .string()
    .describe(
      'Explanation of why this location was chosen as a decoy, considering the input factors.'
    ),
});
export type GenerateStrategicDecoysOutput = z.infer<typeof GenerateStrategicDecoysOutputSchema>;

export async function generateStrategicDecoys(
  input: GenerateStrategicDecoysInput
): Promise<GenerateStrategicDecoysOutput> {
  return generateStrategicDecoysFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStrategicDecoysPrompt',
  input: {schema: GenerateStrategicDecoysInputSchema},
  output: {schema: GenerateStrategicDecoysOutputSchema},
  prompt: `You are a military strategist tasked with generating realistic decoy coordinates to divert enemy attention.

  Given an actual military objective with the following characteristics:
  - Latitude: {{latitude}}
  - Longitude: {{longitude}}
  - Terrain Type: {{terrainType}}
  - Proximity to Populated Areas: {{proximityToPopulatedAreas}}
  - Known Enemy Patrol Routes: {{knownEnemyPatrolRoutes}}

  Generate a decoy coordinate within a radius of {{radiusKm}} kilometers that would plausibly attract enemy attention, effectively diverting resources and misdirecting their strategic focus.

  Consider factors such as:
  - Terrain: The decoy should be placed in terrain that is accessible and strategically relevant.
  - Proximity to Populated Areas: The decoy should be close enough to populated areas to seem like a potential target but not so close that it would cause immediate civilian casualties.
  - Enemy Patrol Routes: The decoy should be placed along or near known enemy patrol routes to increase the likelihood of detection.

  The decoy location should be likely to be visited or checked out based on the location properties.
  Explain your reasoning for choosing this particular location.

  Output the latitude, longitude, and reasoning.`,
});

const generateStrategicDecoysFlow = ai.defineFlow(
  {
    name: 'generateStrategicDecoysFlow',
    inputSchema: GenerateStrategicDecoysInputSchema,
    outputSchema: GenerateStrategicDecoysOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
