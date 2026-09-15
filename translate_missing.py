import json
import os
import time
from deep_translator import GoogleTranslator

locales = ['hi', 'bn', 'te', 'mr', 'ta', 'ur', 'gu', 'kn', 'or', 'ml', 'pa', 'as']

with open('messages/en.json', 'r', encoding='utf-8') as f:
    en_data = json.load(f)

def merge_translate(en_d, ext_d, lang):
    res = {}
    translator = GoogleTranslator(source='en', target=lang)
    for k, v in en_d.items():
        if isinstance(v, dict):
            res[k] = merge_translate(v, ext_d.get(k, {}), lang)
        else:
            if k in ext_d and ext_d[k]:
                res[k] = ext_d[k]
            else:
                try:
                    res[k] = translator.translate(v)
                except Exception as e:
                    res[k] = v
                time.sleep(0.05)
    return res

for loc in locales:
    print(f'Translating missing for {loc}...')
    loc_file = f'messages/{loc}.json'
    existing = {}
    if os.path.exists(loc_file):
        with open(loc_file, 'r', encoding='utf-8') as f:
            try:
                existing = json.load(f)
            except:
                pass
    translated_data = merge_translate(en_data, existing, loc)
    with open(loc_file, 'w', encoding='utf-8') as f:
        json.dump(translated_data, f, ensure_ascii=False, indent=2)

print('Translation complete.')
