import { NextResponse } from 'next/server';
import { z } from 'zod';
import { genkit } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';
import { createClient } from '@supabase/supabase-js';

// Initialize Genkit
const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY })],
});

// Zod Schema for structured AI output
const AiOutputSchema = z.object({
  findings: z.array(z.string()).describe('List of radiological or pathological findings.'),
  confidence_score: z.number().min(0).max(1).describe('Confidence score between 0.0 and 1.0.'),
  clinical_summary: z.string().describe('A concise clinical summary of the analysis.'),
  differential_assessment: z.array(z.string()).describe('List of possible differential assesss.')
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { record_id, image_url } = body;

    if (!record_id || !image_url) {
      return NextResponse.json(
        { error: 'Missing record_id or image_url in request body.' },
        { status: 400 }
      );
    }

    // Call Genkit Gemini model
    const { output } = await ai.generate({
      model: gemini15Flash,
      prompt: [
        { text: 'Analyze this scan as an expert radiologist/pathologist. Provide detailed findings, a confidence score, a clinical summary, and differential assesss based strictly on the provided image.' },
        { media: { url: image_url } }
      ],
      output: { 
        schema: AiOutputSchema 
      }
    });

    if (!output) {
      throw new Error('AI generated no structured output.');
    }

    // Initialize Supabase Admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert into ai_insights using service role
    const { error: insertError } = await supabase
      .from('ai_insights')
      .insert({
        record_id,
        ai_model_used: 'gemini-1.5-flash',
        raw_analysis_json: output,
        confidence_score: output.confidence_score,
        clinical_summary: output.clinical_summary,
        status: 'pending'
      });

    if (insertError) {
      console.error('Supabase Insert Error:', insertError);
      throw new Error('Failed to save AI insights to the database.');
    }

    return NextResponse.json({ success: true, data: output });

  } catch (error: any) {
    console.error('Analyze Scan API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
