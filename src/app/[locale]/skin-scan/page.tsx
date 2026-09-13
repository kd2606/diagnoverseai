"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { GlassCard } from "@/components/dashboard/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Camera, Upload, Loader2, ExternalLink, MapPin, Save, ArrowRight, ArrowLeft, Phone } from "lucide-react";
import { analyzeSkinScan } from "@/ai/flows/skin-scan";
import { useUser } from "@/firebase/auth/useUser";
import { useScanStore } from "@/firebase/firestore/useScanStore";
import { toast } from "sonner";
import { FadeIn } from "@/components/ui/fade-in";
import { saveHealthRecord } from "@/firebase/healthRecords";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { saveOfflineSkinScan } from "@/lib/offlineSkinScans";
import { EmergencyOverlay } from "@/components/emergency-overlay";


export default function SkinScanPage() {
    const t = useTranslations("scan.skin");
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState(1);
    const [imageData, setImageData] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [isEmergency, setIsEmergency] = useState(false);
    
    // Metadata states
    const [itchingLevel, setItchingLevel] = useState<string>("");
    const [spreadRate, setSpreadRate] = useState<string>("");
    const [recentChanges, setRecentChanges] = useState<string>("");

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [results, setResults] = useState<Awaited<ReturnType<typeof analyzeSkinScan>> | null>(null);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);
    const [capacityExhausted, setCapacityExhausted] = useState(false);

    const { user } = useUser();
    const { saveScan } = useScanStore();

    // Cooldown timer for 503 AI_CAPACITY_EXHAUSTED
    useEffect(() => {
        if (cooldownSeconds <= 0) return;
        const timer = setInterval(() => {
            setCooldownSeconds(prev => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldownSeconds]);

    if (isEmergency) {
        return <EmergencyOverlay onDismiss={() => setIsEmergency(false)} />;
    }

    const compressImage = (fileOrBlob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(fileOrBlob);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    // WebP at 70% quality to compress from ~8MB to ~400KB
                    const dataUrl = canvas.toDataURL("image/webp", 0.7);
                    resolve(dataUrl.split(",")[1]);
                } else {
                    reject("No canvas context");
                }
                URL.revokeObjectURL(url);
            };
            img.onerror = () => {
                reject("Image load error");
                URL.revokeObjectURL(url);
            };
            img.src = url;
        });
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setShowCamera(true);
        } catch (error) {
            console.error("Camera error:", error);
            toast.error("Could not access camera. Please allow permissions.");
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.drawImage(video, 0, 0);
            const base64 = canvas.toDataURL("image/webp", 0.7).split(",")[1];
            setImageData(base64);
            const stream = video.srcObject as MediaStream;
            stream?.getTracks().forEach((track) => track.stop());
            setShowCamera(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressedBase64 = await compressImage(file);
            setImageData(compressedBase64);
        } catch (err) {
            toast.error("Failed to compress image");
        }
    };

    const isMetadataComplete = itchingLevel && spreadRate && recentChanges;

    const handleAnalyze = async () => {
        if (!imageData || !isMetadataComplete) return;
        setLoading(true);
        setStep(3); // move to results
        try {
            const response = await fetch('/api/skin-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: imageData, itchingLevel, spreadRate, recentChanges })
            });
            const result = await response.json();
            if (!response.ok) {
                // Check for AI capacity exhaustion before throwing generic error
                if (response.status === 503 && result?.error === 'AI_CAPACITY_EXHAUSTED') {
                    setCapacityExhausted(true);
                    setCooldownSeconds(30);
                    setStep(2);
                    setLoading(false);
                    return;
                }
                throw new Error(result.error || "Failed to analyze skin photo");
            }
            
            setResults(result);
            if (!result) return;

            const topPriority = result.triagePriority;
            if (topPriority === "High Triage Priority" || topPriority === "CRITICAL_EMERGENCY") {
                setIsEmergency(true);
            }

            // Auto-save the health record
            const severityLevel = topPriority === "High Triage Priority" ? "high" : topPriority === "Elevated Triage Priority" ? "moderate" : "low";
            const verdictStr = topPriority === "High Triage Priority" ? "doctor_today" : topPriority === "Elevated Triage Priority" ? "monitor" : "rest";

            saveHealthRecord(user?.uid, {
                type: "skin",
                title: "Skin Analysis",
                severity: severityLevel,
                verdict: verdictStr,
                summary: result.simpleExplanation,
                details: {
                    features: result.visualFeatures?.map((f: any) => f.feature) || [],
                    medicines: result.otcMedicines?.map((m: any) => m.name) || [],
                    precautions: result.precautions || []
                }

            }).catch(console.error);
        } catch (error: any) {
            console.error("Analysis error:", error);
            const msg = error.message || "Could not fetch the report. Please try again later.";
            if (msg.includes("503") || msg.includes("experiencing high demand") || msg.includes("429")) {
                toast.error("Our AI servers are currently experiencing extremely high demand. Please try again in 1-2 minutes.");
            } else {
                toast.error(msg);
            }
            setStep(2); // bring back to step 2 on error
        } finally {
            setLoading(false);
        }
    };

    const handleShareWithDoctor = () => {
        if (!results) return;

        const triagePriority = results.triagePriority || "Unknown";
        const simpleExplanation = results.simpleExplanation || "No explanation available.";
        const precautionsPoints = results.precautions?.length > 0 ? results.precautions.map((t: string) => "• " + t).join("\n   ") : "None";
        const medicineNames = results.otcMedicines?.length > 0 ? results.otcMedicines.map((m: any) => "• " + m.name).join("\n   ") : "None";

        const message = `🏥 *Diagnoverse AI — Skin Analysis Report*
   
⚠️ *Triage Priority:* ${triagePriority}
   
💬 *In Simple Words:*
${simpleExplanation}

📋 *User Metadata:*
Itching Level: ${itchingLevel}
Spread Rate: ${spreadRate}
Recent Changes: ${recentChanges}
   
🏠 *Precautions:*
   ${precautionsPoints}
   
💊 *Supportive Items:*
   ${medicineNames}
   
─────────────────
Generated by Diagnoverse AI
⚠️ This is an AI wellness triage tool. Please consult a doctor.`;

        const whatsappURL = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappURL, '_blank');
    };

    const renderSeverityBadge = (priority: string) => {
        const config = {
            "High Triage Priority": { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: "🔴", glow: "shadow-[0_0_20px_rgba(239,68,68,0.2)]" },
            "Elevated Triage Priority": { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: "🟡", glow: "shadow-[0_0_20px_rgba(234,179,8,0.1)]" },
            "Routine Triage Priority": { color: "text-[#0D9488] dark:text-[#14B8A6]", bg: "bg-[#0D9488]/10 dark:bg-[#14B8A6]/10", border: "border-[#0D9488]/20 dark:border-[#14B8A6]/20", icon: "🟢", glow: "shadow-[0_0_20px_rgba(52,211,153,0.1)]" }
        }[priority] || { color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-300 dark:border-slate-600", icon: "⚪", glow: "" };

        return (
            <div className={cn("w-full rounded-2xl border p-6 flex items-center gap-4 transition-all duration-500", config.bg, config.border, config.glow)}>
                <div className="text-2xl">{config.icon}</div>
                <div>
                    <p className={cn("font-heading font-bold text-lg tracking-tight uppercase", config.color)}>
                        {priority.replace("Triage Priority", "Risk")}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                        {priority === "High Triage Priority" ? "Doctor visit strongly recommended today." : priority === "Elevated Triage Priority" ? "Keep checking closely for changes." : "Looks normal, but stay alert."}
                    </p>
                </div>
            </div>
        )
    };

    return (
        <div className="space-y-6">
            <FadeIn direction="down">
                <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground">{t("description")}</p>
            </FadeIn>

            {/* Stepper Header */}
            <div className="flex items-center justify-between mb-16 max-w-xl mx-auto">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-4 w-1/3 relative group">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold z-10 transition-all duration-500 border-2 ${
                            step >= i 
                            ? "bg-[#0D9488] text-white dark:bg-[#14B8A6] dark:text-slate-900 border-[#0D9488] dark:border-[#14B8A6] shadow-[0_0_20px_rgba(13,148,136,0.3)] dark:shadow-[0_0_20px_rgba(20,184,166,0.4)] scale-110" 
                            : "bg-[#0B1120] dark:bg-[#1E293B] text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
                        }`}>
                            {i}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${step >= i ? "text-[#0D9488] dark:text-[#14B8A6]" : "text-slate-400 dark:text-slate-500"}`}>
                            {i === 1 ? "Photo" : i === 2 ? "Details" : "Result"}
                        </span>
                        {i < 3 && (
                            <div className={`absolute top-6 left-1/2 w-full h-[1px] -z-0 transition-all duration-1000 ${step > i ? "bg-[#0D9488] dark:bg-[#14B8A6] shadow-[0_0_10px_rgba(13,148,136,0.5)]" : "bg-slate-200 dark:bg-slate-700"}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 1: Image Capture */}
            {step === 1 && (
                <FadeIn delay={0.1} className="max-w-2xl mx-auto w-full">
                    <div className="bg-[#0B1120] dark:bg-[#1E293B] p-10 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-800 relative w-full">
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-heading font-bold tracking-tight">Step 1: <span className="text-slate-500 dark:text-slate-400">Photo</span></h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Take a clear picture of your skin problem.</p>
                            </div>

                            <div className={`relative overflow-hidden rounded-[24px] border-2 border-dashed border-[#0D9488]/40 dark:border-[#14B8A6]/40 bg-slate-50 dark:bg-[#1E293B] aspect-video flex items-center justify-center ${showCamera ? "block" : "hidden"}`}>
                                <div className="absolute inset-0 bg-[#0D9488]/5 dark:bg-[#14B8A6]/5 animate-pulse pointer-events-none" />
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-[24px]" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none rounded-[24px]" />
                                <Button onClick={capturePhoto} className="absolute bottom-8 bg-[#0D9488] text-slate-800 dark:text-white dark:bg-[#14B8A6] dark:text-slate-900 hover:bg-[#0F766E] dark:hover:bg-[#0D9488] font-bold px-8 h-12 rounded-[16px] shadow-lg shadow-[#0D9488]/20 dark:shadow-[#14B8A6]/20 transition-all active:scale-95">
                                    <Camera className="mr-2 h-4 w-4" /> Take Picture
                                </Button>
                            </div>

                            {imageData && (
                                <div className="overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-black/20 aspect-video relative group">
                                    <img src={`data:image/jpeg;base64,${imageData}`} alt="Skin area" className="w-full h-full object-cover grayscale-[0.2]" />
                                    <div className="absolute inset-0 bg-[#0D9488]/10 dark:bg-[#14B8A6]/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </div>
                            )}

                            <canvas ref={canvasRef} className="hidden" />
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

                            <div className="flex gap-4">
                                <Button variant="outline" onClick={startCamera} disabled={showCamera} className="h-14 flex-1 rounded-2xl border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:bg-slate-700 font-bold">
                                    <Camera className="mr-2 h-5 w-5 text-[#0D9488] dark:text-[#14B8A6]" /> Start Camera
                                </Button>
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-14 flex-1 rounded-2xl border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:bg-slate-700 font-bold">
                                    <Upload className="mr-2 h-5 w-5 text-[#0D9488] dark:text-[#14B8A6]" /> Upload from Phone
                                </Button>
                            </div>

                            {imageData && (
                                <Button onClick={() => setStep(2)} className="w-full h-16 rounded-2xl bg-[#0D9488] text-white dark:bg-[#14B8A6] dark:text-slate-900 hover:bg-[#0F766E] dark:hover:bg-[#0D9488] font-bold text-lg emerald-glow">
                                    Next Step <ArrowRight className="ml-2 h-6 w-6" />
                                </Button>
                            )}
                        </div>
                    </div>
                </FadeIn>
            )}

            {/* Step 2: Metadata */}
            {step === 2 && (
                <FadeIn delay={0.1} className="max-w-2xl mx-auto w-full">
                    <div className="bg-[#0B1120] dark:bg-[#1E293B] p-10 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-800 relative w-full">
                        <div className="space-y-10">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-heading font-bold tracking-tight text-slate-800 dark:text-white">Tell us <span className="text-slate-500 dark:text-slate-400">More</span></h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Answer these easy questions about your skin.</p>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0D9488] dark:text-[#14B8A6]/80">Does it itch?</Label>
                                    <Select value={itchingLevel} onValueChange={setItchingLevel}>
                                        <SelectTrigger className="h-14 rounded-2xl border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-white">
                                            <SelectValue placeholder="Choose one..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#FAFAF9] dark:bg-[#0B1120] border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
                                            <SelectItem value="none">No, it does not itch</SelectItem>
                                            <SelectItem value="mild">Yes, a little bit</SelectItem>
                                            <SelectItem value="severe">Yes, it itches a lot</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0D9488] dark:text-[#14B8A6]/80">Is it spreading?</Label>
                                    <Select value={spreadRate} onValueChange={setSpreadRate}>
                                        <SelectTrigger className="h-14 rounded-2xl border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-white">
                                            <SelectValue placeholder="Choose one..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#FAFAF9] dark:bg-[#0B1120] border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
                                            <SelectItem value="not_spreading">No, it stays the same</SelectItem>
                                            <SelectItem value="slowly">Yes, it is slowly growing</SelectItem>
                                            <SelectItem value="rapidly">Yes, it is growing fast</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Any other changes?</Label>
                                    <Select value={recentChanges} onValueChange={setRecentChanges}>
                                        <SelectTrigger className="h-14 rounded-2xl border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-white">
                                            <SelectValue placeholder="Choose one..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#FAFAF9] dark:bg-[#0B1120] border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
                                            <SelectItem value="no_change">No other changes</SelectItem>
                                            <SelectItem value="changed_color_size">Color or shape changed</SelectItem>
                                            <SelectItem value="bleeding_oozing">It is bleeding or oozing liquid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button variant="outline" onClick={() => setStep(1)} className="h-16 px-8 rounded-2xl border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:bg-slate-700 font-bold">
                                    <ArrowLeft className="mr-2 h-5 w-5" /> Back
                                </Button>
                                <Button onClick={handleAnalyze} disabled={!isMetadataComplete} className="h-16 flex-1 rounded-2xl bg-[#0D9488] text-white dark:bg-[#14B8A6] dark:text-slate-900 hover:bg-white/90 font-bold text-lg shadow-xl shadow-white/5">
                                    Show Result <ArrowRight className="ml-2 h-6 w-6" />
                                </Button>
                            </div>

                            {capacityExhausted && (
                                <div className="mt-6 p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-4 animate-in fade-in duration-500">
                                    <div className="flex items-center gap-2 text-amber-400">
                                        <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">High Demand</h3>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        Our AI servers are experiencing high demand. For urgent symptoms, please contact emergency services immediately.
                                    </p>
                                    <div className="flex gap-3">
                                        <Button
                                            disabled={cooldownSeconds > 0}
                                            onClick={() => { setCapacityExhausted(false); handleAnalyze(); }}
                                            className="flex-1 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 font-bold"
                                        >
                                            {cooldownSeconds > 0 ? `Try again in ${cooldownSeconds}s` : "Try again now"}
                                        </Button>
                                        <Button
                                            onClick={async () => {
                                                if (!user?.uid || !imageData) {
                                                    toast.error("Please login to save offline.");
                                                    return;
                                                }
                                                try {
                                                    await saveOfflineSkinScan({
                                                        userId: user.uid,
                                                        imageBase64: imageData,
                                                        itchingLevel,
                                                        spreadRate,
                                                        recentChanges,
                                                    });
                                                    toast.success("Saved offline! Will sync when AI is available.");
                                                    setCapacityExhausted(false);
                                                } catch (err) {
                                                    toast.error("Failed to save offline. Please try again.");
                                                }
                                            }}
                                            className="flex-1 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:bg-slate-700 font-bold"
                                        >
                                            <Save className="mr-2 h-4 w-4" /> Save offline
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </FadeIn>
            )}

            {/* Step 3: Loading & Results */}
            {step === 3 && loading && (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Checking your photo, please wait...</p>
                </div>
            )}

            {step === 3 && !loading && results && (
                <FadeIn delay={0.2} className="max-w-4xl mx-auto w-full space-y-8 pb-12">
                    {/* Urgency Header */}
                    {renderSeverityBadge(results.triagePriority)}

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Summary Column */}
                        <div className="space-y-8">
                            <GlassCard className="!p-8 border-[#0D9488]/20 dark:border-[#14B8A6]/20 bg-emerald-500/[0.02]">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-[#0D9488] dark:text-[#14B8A6]">
                                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">What we found</h3>
                                    </div>
                                    <p className="text-xl font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                                        {results.simpleExplanation}
                                    </p>
                                </div>
                            </GlassCard>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-2">Key Signs</h4>
                                <div className="space-y-3">
                                    {results.visualFeatures?.map((feature: any, i: number) => (
                                        <div key={i} className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:bg-slate-700 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="font-bold text-slate-700 dark:text-slate-200">{feature.feature}</p>
                                                <Badge variant="outline" className="text-[8px] border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 uppercase">
                                                    {feature.urgencyLevel}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Actions Column */}
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-2">What you should do</h4>
                                <GlassCard className="!p-6 space-y-4">
                                    <ul className="space-y-4">
                                        {results.precautions?.map((tip: string, i: number) => (
                                            <li key={i} className="flex items-start gap-4 text-sm text-slate-600 dark:text-slate-300">
                                                <div className="mt-1 h-1 w-4 rounded-full bg-indigo-500/40" />
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </GlassCard>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={handleShareWithDoctor}
                                    className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-800 dark:text-white font-bold flex items-center justify-center gap-3 shadow-xl shadow-green-500/10"
                                >
                                    <ExternalLink className="h-5 w-5" /> Share with Doctor
                                </Button>
                                
                                <Button
                                    onClick={() => {
                                        import("@/lib/downloadReport").then(m => {
                                            m.downloadReportAsText("Skin Analysis", results);
                                            toast.success("Report downloaded successfully");
                                        });
                                    }}
                                    className="h-14 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold"
                                >
                                    <Save className="mr-2 h-4 w-4" /> Download Report
                                </Button>
                            </div>

                            {results.triagePriority === "High Triage Priority" && (
                                <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4 animate-pulse">
                                    <div className="flex items-center gap-2 text-red-400">
                                        <Phone className="h-4 w-4" />
                                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Urgent Care Needed</h3>
                                    </div>
                                    <Button className="w-full h-12 bg-red-500 hover:bg-red-600 text-slate-800 dark:text-white font-bold rounded-xl" asChild>
                                        <a href="https://www.google.com/maps/search/Dermatologist+near+me" target="_blank" rel="noopener noreferrer">
                                            Find Doctor Nearby
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-200 dark:border-slate-700 text-center">
                        <Button variant="ghost" className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:text-white" onClick={() => {
                            setStep(1);
                            setImageData(null);
                            setResults(null);
                        }}>
                           ← Start Over
                        </Button>
                    </div>
                </FadeIn>
            )}
        </div>
    );
}
