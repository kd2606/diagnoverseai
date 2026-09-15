import json
import os
import time
from deep_translator import GoogleTranslator

with open('messages/en.json', 'r', encoding='utf-8') as f:
    en_data = json.load(f)

en_data['Vault'] = {
    'noMatchingRecords': 'No matching records',
    'noHealthRecordsYet': 'No health records yet',
    'tryDifferentName': 'Try a different name, date or clinic.',
    'aiAssessmentsSync': 'Your AI assessments will automatically sync here. Run a scan to create your first record.',
    'clearSearch': 'Clear search',
    'runScan': 'Run a Scan',
    'noRemindersSet': 'No reminders set',
    'setGentleNudges': 'Set gentle nudges for medication, follow-up scans or appointments. We\'ll notify you — never more than once a day.',
    'createReminder': 'Create a Reminder',
    'addReminder': 'Add Reminder',
    'noSchemesMatched': 'No schemes matched yet',
    'onceYouCompleteProfile': 'Once you complete a profile and one assessment, we\'ll check which public health schemes you may be eligible for and list them here.',
    'completeAssessment': 'Complete an Assessment',
    'viewDetails': 'View Details'
}

en_data['Assessments'] = {
    'start': 'Start',
    'shareClinician': 'Share with a Clinician',
    'takeAnother': 'Take Another',
    'wellnessScreeningWarning': 'THIS IS A WELLNESS SCREENING, NOT A DIAGNOSIS. SCORES ONLY REFLECT THE ANSWERS YOU GAVE TODAY.'
}

with open('messages/en.json', 'w', encoding='utf-8') as f:
    json.dump(en_data, f, indent=2)

print('Updated en.json with Vault and Assessments')
