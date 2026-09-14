import { NextResponse } from 'next/server';

const LOCALE_TO_SARVAM: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', te: 'te-IN',
  mr: 'mr-IN', ta: 'ta-IN', ur: 'ur-IN', gu: 'gu-IN',
  kn: 'kn-IN', or: 'od-IN', ml: 'ml-IN', pa: 'pa-IN', as: 'as-IN',
};

const LOCALE_TO_TTS_MODEL: Record<string, string> = {
  en: 'indic-tts-en', hi: 'indic-tts-hi', bn: 'indic-tts-bn', te: 'indic-tts-te',
  mr: 'indic-tts-mr', ta: 'indic-tts-ta', ur: 'indic-tts-ur', gu: 'indic-tts-gu',
  kn: 'indic-tts-kn', or: 'indic-tts-od', ml: 'indic-tts-ml', pa: 'indic-tts-pa', as: 'indic-tts-as',
};

export async function POST(req: Request) {
  try {
    const { text, languageCode } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const locale = languageCode || 'hi';
    const targetLang = LOCALE_TO_SARVAM[locale] || 'hi-IN';
    const ttsModel = LOCALE_TO_TTS_MODEL[locale] || 'indic-tts-hi';

    // Call Sarvam AI Text-to-Speech API
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY || '',
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: targetLang,
        speaker: 'meera',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 8000,
        enable_preprocessing: true,
        model: ttsModel,
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
