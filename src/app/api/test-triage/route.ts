import { submitVoiceTriage } from '@/actions/nova-voice-triage-action';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await submitVoiceTriage('test-id', 'high fever, cold');
  return NextResponse.json(result);
}
