const fs = require('fs');

// 1. Patch Audit Ledger
const auditPath = 'src/app/[locale]/dashboard/doctor/audit/_components/audit-ledger.tsx';
if (fs.existsSync(auditPath)) {
    let auditCode = fs.readFileSync(auditPath, 'utf8');
    const auditMapping = `
      const mappedEvents = (rawEvents || []).map(e => ({
        id: e.id,
        kind: e.actionType || 'inference',
        at: e.createdAt || new Date().toISOString(),
        actor: { name: e.actorName || 'System', role: e.actorRole || 'system' },
        subject: { mrn: 'MRN-' + (e.caseId ? e.caseId.slice(0,6).toUpperCase() : 'UNKNOWN'), label: 'Triage Case' },
        summary: e.summary || '',
        hash: e.hash || '',
        prevHash: e.prevHash || '',
        model: undefined,
        protocol: undefined
      }));
    `;
    auditCode = auditCode.replace(/export function AuditLedger\([^)]*\)\s*\{/, "$&\n" + auditMapping);
    auditCode = auditCode.replace(/rawEvents\.filter/g, 'mappedEvents.filter');
    auditCode = auditCode.replace(/rawEvents\[0\]/g, 'mappedEvents[0]');
    fs.writeFileSync(auditPath, auditCode);
    console.log('Patched audit-ledger.tsx');
}

// 2. Patch Patient Panel
const patientPath = 'src/app/[locale]/dashboard/doctor/patients/_components/patient-panel.tsx';
if (fs.existsSync(patientPath)) {
    let patientCode = fs.readFileSync(patientPath, 'utf8');
    const patientMapping = `
      const mappedPatients = (patients || []).map(p => ({
        id: p.id,
        name: p.fullName || 'Unknown Patient',
        mrn: p.mrn || 'UNKNOWN',
        age: p.age || 0,
        sex: p.sex || 'U',
        riskTier: p.latestConfidence ? (p.latestConfidence < 60 ? 'critical' : p.latestConfidence < 80 ? 'high' : 'moderate') : 'low',
        riskScore: p.latestConfidence || 0,
        chiefComplaint: p.chiefComplaint || 'No complaint recorded',
        lastTriageAt: p.lastSeenAt || p.createdAt || new Date().toISOString(),
        status: p.latestStatus === 'verified' ? 'discharged' : p.latestStatus === 'escalated' ? 'active' : 'monitoring',
        openActions: p.openCases || 0
      }));
    `;
    patientCode = patientCode.replace(/export function PatientPanel\([^)]*\)\s*\{/, "$&\n" + patientMapping);
    patientCode = patientCode.replace(/\{patients\.map/g, '{mappedPatients.map');
    patientCode = patientCode.replace(/patients\.length/g, 'mappedPatients.length');
    patientCode = patientCode.replace(/patients\.filter/g, 'mappedPatients.filter');
    patientCode = patientCode.replace(/patients\.reduce/g, 'mappedPatients.reduce');
    fs.writeFileSync(patientPath, patientCode);
    console.log('Patched patient-panel.tsx');
}
