import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowRight, Activity, Brain, Shield } from 'lucide-react';

export default function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('Index'); // if exists, but we'll use static text for the skeleton

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="font-bold text-2xl text-blue-600 flex items-center gap-2">
          <Activity className="h-6 w-6" />
          DiagnoVerse AI
        </div>
        <nav className="flex gap-4">
          <Link href={`/${locale}/auth/login`} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium">
            Log In
          </Link>
          <Link href={`/${locale}/auth/register`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6">
          <Brain className="h-4 w-4" />
          Powered by Gemini AI
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
          Multimodal Healthcare Intelligence <br/> for the Modern Era
        </h1>
        <p className="text-xl text-slate-600 mb-10">
          Empowering clinicians and patients with AI-driven insights. Upload reports, track vitals, and get instant multimodal diagnostic analysis.
        </p>
        <div className="flex justify-center gap-4">
          <Link href={`/${locale}/auth/register`} className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg flex items-center gap-2 transition-transform hover:scale-105">
            Start Free Trial <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href={`/${locale}/about`} className="px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-lg transition-colors">
            Learn More
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Multimodal Diagnostics</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Genkit/Gemini AI</h3>
              <p className="text-slate-600">Advanced multimodal models that analyze text, images, and patient history for accurate insights.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="h-12 w-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Real-time Analytics</h3>
              <p className="text-slate-600">Continuous monitoring and predictive analytics for proactive patient care.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Enterprise Security</h3>
              <p className="text-slate-600">HIPAA-compliant infrastructure with robust role-based access control and SSR authentication.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
