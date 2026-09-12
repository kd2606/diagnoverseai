import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMERGENCY_KEYWORDS = /chest pain|sudden weakness|heart attack|paralysis|severe bleeding/i;

export async function POST(req: Request) {
  try {
    const { transcript, locale } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: 'Missing transcript' }, { status: 400 });
    }

    const isEmergency = EMERGENCY_KEYWORDS.test(transcript);
    let responseText = '';

    if (isEmergency) {
      responseText = "This sounds like a medical emergency. Please hang up and call 108 or your local emergency number immediately.";
    } else {
      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an empathetic healthcare triage assistant. Provide a short, simple, reassuring response (under 2 sentences) to the user based on their symptoms.' },
          { role: 'user', content: transcript }
        ],
      });
      responseText = chatCompletion.choices[0].message.content || 'I understand. Let me help you with that.';
    }

    // Generate Audio
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: responseText,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const audioBase64 = buffer.toString('base64');

    return NextResponse.json({
      text: responseText,
      audioBase64,
      isEmergency
    });
  } catch (error: any) {
    console.error('Voice Triage Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
