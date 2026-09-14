import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Call Sarvam AI Text-to-Speech API
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY || '',
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: 'hi-IN', // You can adjust or make this dynamic later
        speaker: 'meera', // Ensure this is a valid Sarvam AI speaker ID
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 8000,
        enable_preprocessing: true,
        model: 'indic-tts-hi' // Check Sarvam docs for the exact model name required
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Sarvam TTS Error]:', errorData);
      return NextResponse.json({ error: 'Failed to generate speech' }, { status: response.status });
    }

    const data = await response.json();
    
    // Sarvam returns base64 encoded audio
    return NextResponse.json({ audioBase64: data.audios[0] });

  } catch (error) {
    console.error('[TTS Catch Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
