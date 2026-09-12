export default function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Clinician Dashboard</h1>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
}
