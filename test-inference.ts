import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { generateClinicalTriage } from './src/actions/nova-inference';

async function main() {
  console.log("Starting test...");
  try {
    const result = await generateClinicalTriage("high fever,cold, cough, headache");
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Test script error:", e);
  }
}

main();
