import json
import os
import glob

messages_dir = "d:\\E\\diagnoverse.ai\\messages"
locales = glob.glob(os.path.join(messages_dir, "*.json"))

data_to_add_dashboard = {
  "greeting_morning": "Good morning, {name}.",
  "greeting_afternoon": "Good afternoon, {name}.",
  "greeting_night": "Good evening, {name}.",
  "hero_subtitle": "Your health intelligence is active.",
  "hero_description": "Three captures are being watched by Nova and your care team. Speak your symptoms any time — no typing, no forms, works without signal."
}

data_to_add_common = {
  "nova_title": "Always listening. Tap to speak your symptoms...",
  "nova_description": "Try: 'I've had a tight chest...' Nova structures it into a clinical intake note...",
  "upload_title": "Upload a scan",
  "upload_description": "Compressed on your device, encrypted, then queued."
}

bn_dashboard = {
  "greeting_morning": "সুপ্রভাত, {name}।",
  "greeting_afternoon": "শুভ অপরাহ্ন, {name}।",
  "greeting_night": "শুভ সন্ধ্যা, {name}।",
  "hero_subtitle": "আপনার স্বাস্থ্য বুদ্ধিমত্তা সক্রিয় আছে।",
  "hero_description": "নোভা এবং আপনার কেয়ার টিম তিনটি ক্যাপচার পর্যবেক্ষণ করছে। যেকোনো সময় আপনার লক্ষণগুলি বলুন — কোনও টাইপিং নেই, কোনও ফর্ম নেই, সিগন্যাল ছাড়াই কাজ করে।"
}

bn_common = {
  "nova_title": "সর্বদা শুনছি। আপনার লক্ষণগুলি বলতে ট্যাপ করুন...",
  "nova_description": "চেষ্টা করুন: 'আমার বুকে ব্যথা হচ্ছে...' নোভা এটিকে একটি ক্লিনিকাল নোটে গঠন করে...",
  "upload_title": "একটি স্ক্যান আপলোড করুন",
  "upload_description": "আপনার ডিভাইসে সংকুচিত, এনক্রিপ্ট করা, তারপর সারিবদ্ধ।"
}

hi_dashboard = {
  "greeting_morning": "सुप्रभात, {name}।",
  "greeting_afternoon": "शुभ दोपहर, {name}।",
  "greeting_night": "शुभ संध्या, {name}।",
  "hero_subtitle": "आपकी स्वास्थ्य बुद्धिमत्ता सक्रिय है।",
  "hero_description": "नोवा और आपकी देखभाल टीम द्वारा तीन कैप्चर देखे जा रहे हैं। किसी भी समय अपने लक्षण बोलें — कोई टाइपिंग नहीं, कोई फॉर्म नहीं, बिना सिग्नल के काम करता है।"
}

hi_common = {
  "nova_title": "हमेशा सुन रहा है। अपने लक्षण बोलने के लिए टैप करें...",
  "nova_description": "प्रयास करें: 'मुझे सीने में जकड़न हो रही है...' नोवा इसे एक नैदानिक नोट में संचरित करता है...",
  "upload_title": "एक स्कैन अपलोड करें",
  "upload_description": "आपके डिवाइस पर संपीड़ित, एन्क्रिप्टेड, फिर कतारबद्ध।"
}

for filepath in locales:
    filename = os.path.basename(filepath)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = json.load(f)
    
    if "Dashboard" not in content:
        content["Dashboard"] = {}
    if "Common" not in content:
        content["Common"] = {}

    if filename == "bn.json":
        dash = bn_dashboard
        comm = bn_common
    elif filename == "hi.json":
        dash = hi_dashboard
        comm = hi_common
    else:
        dash = data_to_add_dashboard
        comm = data_to_add_common
    
    for k, v in dash.items():
        content["Dashboard"][k] = v
            
    for k, v in comm.items():
        content["Common"][k] = v

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

print("Updated locales successfully.")
