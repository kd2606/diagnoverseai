"use client";

import { useState } from "react";
import { User, Activity, Mail, Phone, MapPin, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function ProfileForm({ role, initialData }: { role: "patient" | "doctor", initialData: any }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: initialData?.full_name || "John M.",
    email: initialData?.email || "",
    phone: initialData?.phone || "+91 9876543210",
    address: initialData?.address || "Rural Health Post, Block A",
    bloodGroup: initialData?.blood_group || "O+",
    dob: initialData?.dob || "1985-05-15",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      toast.success("Profile details updated successfully");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
          <User className="h-8 w-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Edit Profile</h1>
          <p className="text-sm text-white/50 mt-1">Manage your personal and contact information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-white/50">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-white/50">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-white/50">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-white/50">Address / Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          {/* Role specific fields */}
          {role === 'patient' && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-widest text-white/50">Date of Birth</label>
                <div className="relative">
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-widest text-white/50">Blood Group</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none"
                >
                  <option className="bg-[#050505]" value="A+">A+</option>
                  <option className="bg-[#050505]" value="A-">A-</option>
                  <option className="bg-[#050505]" value="B+">B+</option>
                  <option className="bg-[#050505]" value="B-">B-</option>
                  <option className="bg-[#050505]" value="O+">O+</option>
                  <option className="bg-[#050505]" value="O-">O-</option>
                  <option className="bg-[#050505]" value="AB+">AB+</option>
                  <option className="bg-[#050505]" value="AB-">AB-</option>
                </select>
              </div>
            </>
          )}

          {role === 'doctor' && (
            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="text-xs font-medium uppercase tracking-widest text-white/50">Medical License / ID</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  disabled
                  value="RMP-IN-1092834"
                  className="w-full bg-white/[0.01] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white/40 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-white/30">License IDs are verified externally and cannot be changed here.</p>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-white/5 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <span className="animate-pulse">Saving...</span> : <><Save className="h-4 w-4" /> Save Details</>}
          </button>
        </div>
      </form>
    </div>
  );
}