export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-blue-900">About DiagnoVerse AI</h1>
        <p className="text-lg text-slate-700 mb-6">
          At DiagnoVerse AI, our mission is to revolutionize healthcare by bridging the gap between advanced artificial intelligence and clinical practice. 
        </p>
        <p className="text-lg text-slate-700 mb-6">
          Using multimodal Gemini AI models, we empower clinicians with unparalleled insights, analyzing everything from medical imagery to unstructured patient histories in seconds. Our B2B/B2C SaaS platform ensures secure, role-based access for both doctors and patients, maintaining the highest standards of data privacy and clinical accuracy.
        </p>
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Our Vision</h2>
          <ul className="list-disc pl-6 space-y-2 text-slate-700">
            <li>Democratize access to specialist-level assessments</li>
            <li>Reduce assessment latency through instant multimodal analysis</li>
            <li>Provide a seamless, unified platform for healthcare providers and patients</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
