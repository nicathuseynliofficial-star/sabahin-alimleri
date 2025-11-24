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
  prompt: `You are a military strategist tasked with generating a single, realistic decoy coordinate to divert enemy attention.

  Given an actual military objective with the following characteristics:
  - Latitude: {{latitude}}
  - Longitude: {{longitude}}
  - Terrain Type: {{terrainType}}
  - Proximity to Populated Areas: {{proximityToPopulatedAreas}}
  - Known Enemy Patrol Routes: {{knownEnemyPatrolRoutes}}

  Your task is to generate ONE plausible decoy coordinate. This decoy must be within a {{radiusKm}} kilometer radius of the actual objective. It should be a location that would believably attract enemy attention.

  CRITICAL: The decoy's coordinates (latitude and longitude) MUST be a plausible offset from the original objective's coordinates, staying within the specified {{radiusKm}} radius. Do NOT generate coordinates on the opposite side of the planet. A small, realistic deviation is required. For example, add or subtract a small decimal value (e.g., 0.01 to 0.09) to the original latitude and longitude.

  Consider these factors for placement:
  - Terrain: The decoy should be in accessible and strategically relevant terrain.
  - Proximity to Populated Areas: Place it near enough to populated areas to seem like a real target, but not so close as to cause immediate civilian casualties.
  - Enemy Patrol Routes: The decoy should be near known enemy patrol routes to increase detection likelihood.

  The decoy location should be a place an enemy would likely investigate.

  Output ONLY the decoy's latitude and longitude. Do NOT provide any reasoning.`,
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
