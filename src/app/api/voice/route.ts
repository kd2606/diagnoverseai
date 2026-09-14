import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('file');

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Using Sarvam AI's translate endpoint. 
    // It auto-detects Indian regional languages and translates them to English.
    const sarvamRes = await fetch('https://api.sarvam.ai/speech-to-text-translate', {
      method: 'POST',
      headers: {
        'api-subscription-key': process.env.SARVAM_API_KEY || '',
      },
      body: formData, 
    });

    if (!sarvamRes.ok) {
      const errorText = await sarvamRes.text();
      console.error('[Sarvam Translation Error]:', errorText);
      return NextResponse.json({ error: 'Translation API failed' }, { status: sarvamRes.status });
    }

    const data = await sarvamRes.json();
    
    // data.transcript will contain the English translated text of the regional speech
    return NextResponse.json({ 
      transcript: data.transcript || data.text,
      isTranslated: true 
    });
  } catch (error) {
    console.error('[Voice Translation Catch Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
