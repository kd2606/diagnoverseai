import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('file');

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Forward to Sarvam AI API
    const sarvamRes = await fetch('https://api.sarvam.ai/speech-to-text-translate', {
      method: 'POST',
      headers: {
        'api-subscription-key': process.env.SARVAM_API_KEY || '',
      },
      body: formData, // Passes the multipart/form-data directly
    });

    if (!sarvamRes.ok) {
      const errorText = await sarvamRes.text();
      console.error('[Sarvam API Error]:', errorText);
      return NextResponse.json({ error: 'Failed to process voice via Sarvam AI' }, { status: sarvamRes.status });
    }

    const data = await sarvamRes.json();
    return NextResponse.json({ transcript: data.transcript || data.text });
  } catch (error) {
    console.error('[Voice API Catch Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
