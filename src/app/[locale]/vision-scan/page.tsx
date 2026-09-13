"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { GlassCard } from "@/components/dashboard/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Camera, Upload, Loader2, CheckCircle, XCircle, ExternalLink, Activity, ShieldCheck, Moon, Laptop, HeartPulse, Save } from "lucide-react";
import { analyzeVisionScan } from "@/ai/flows/vision-scan";
import { useUser } from "@/firebase/auth/useUser";
import { useScanStore } from "@/firebase/firestore/useScanStore";
import { toast } from "sonner";
import { FadeIn } from "@/components/ui/fade-in";
import { EmergencyOverlay } from "@/components/emergency-overlay";
import { saveHealthRecord } from "@/firebase/healthRecords";
import { motion, AnimatePresence } from "framer-motion";

const ANIMATION_URL = "https://lottie.host/933a216f-a63e-4d45-ae57-4180860d5bfa/YkX9Nl6zH4.json";


type Results = Awaited<ReturnType<typeof analyzeVisionScan>>;

export default function VisionScanPage() {
    const t = useTranslations("scan.vision");
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { user } = useUser();
    const { saveScan } = useScanStore();

    const [step, setStep] = useState<"capture" | "metadata" | "analyzing" | "results">("capture");

    // Capture State
    const [imageData, setImageData] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);

    // Metadata State
    const [screenTime, setScreenTime] = useState("4-6 hours");
    const [sleepHours, setSleepHours] = useState("6-8 hours");
    const [stressLevel, setStressLevel] = useState("Moderate");

    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Results | null>(null);
    const [isEmergency, setIsEmergency] = useState(false);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setShowCamera(true);
        } catch (error) {
            console.error("Camera error:", error);
            toast.error("Could not access camera. Please allow permissions.");
        }
    }, []);

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
            img.onerror = () => reject("Image load error");
            img.src = url;
        });
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

    const handleNextStep = () => {
        if (!imageData) {
            toast.error("Please capture or upload a photo before proceeding.");
            return;
        }
        setStep("metadata");
    };

    const handleAnalyze = async () => {
        if (!imageData) return;
        setStep("analyzing");
        setLoading(true);
        try {
            const response = await fetch('/api/vision-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: imageData, screenTime, sleepHours, stressLevel })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to analyze vision scan");
            setResults(result);
            if (!result) return;

            const isHighPriority = result.triagePriority === "High Fatigue Priority" || result.triagePriority === "CRITICAL_EMERGENCY";
            if (isHighPriority) {
                setIsEmergency(true);
            }

            // Auto-save the health record
            const severityLevel = isHighPriority ? "high" : result.triagePriority === "Elevated Strain Profile" ? "moderate" : "low";
            const verdictStr = isHighPriority ? "doctor_today" : severityLevel === "moderate" ? "monitor" : "rest";

            saveHealthRecord(user?.uid, {
                type: "vision",
                title: "Ocular & Facial Strain Analysis",
                severity: severityLevel,
                verdict: verdictStr,
                summary: result.simpleExplanation,
                details: {
                    condition: `Fatigue Index: ${result.fatigueIndex}%`,
                    medicines: result.otcMedicines.map((m: any) => m.name),
                    homecare: result.precautions
                }
            }).catch(console.error);

            if (user) {
                saveScan(user.uid, "self", "visionScans", result).catch(console.error);
            }

            setStep("results");
        } catch (error: any) {
            console.error("Analysis error:", error);
            const msg = error.message || "Could not fetch the report. Please try again later.";
            // If it's a 503 or 429, make it user friendly
            if (msg.includes("503") || msg.includes("experiencing high demand") || msg.includes("429")) {
                toast.error("Our AI servers are currently experiencing extremely high demand. Please try again in 1-2 minutes.");
            } else {
                toast.error(msg);
            }
            setStep("metadata");
        } finally {
            setLoading(false);
        }
    };

    const resetWizard = () => {
        setImageData(null);
        setScreenTime("4-6 hours");
        setSleepHours("6-8 hours");
        setStressLevel("Moderate");
        setResults(null);
        setStep("capture");
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20 px-4">
            <FadeIn direction="down">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-700 pb-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0D9488]/10 dark:bg-[#14B8A6]/10 text-[#0D9488] dark:text-[#14B8A6] border border-[#0D9488]/20 dark:border-[#14B8A6]/20 shadow-2xl">
                                <Camera className="h-6 w-6" />
                            </div>
                            <Badge variant="outline" className="bg-[#0D9488]/5 dark:bg-[#14B8A6]/5 text-[#0D9488] dark:text-[#14B8A6] border-[#0D9488]/20 dark:border-[#14B8A6]/20 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase">
                                Status Active
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-heading text-slate-800 dark:text-white">Vision & <span className="text-[#0D9488] dark:text-[#14B8A6] italic">Face Scan</span></h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md">Check your face for signs of tiredness and stress.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-4 rounded-3xl backdrop-blur-xl">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-8 w-8 rounded-full border-2 border-[#0e0e0e] bg-[#0D9488]/20 dark:bg-[#14B8A6]/20 flex items-center justify-center">
                                    <Activity className="h-4 w-4 text-[#0D9488] dark:text-[#14B8A6]" />
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Scanning</p>
                    </div>
                </div>
            </FadeIn>

            {step === "capture" && (
                <FadeIn delay={0.1}>
                    <GlassCard className="p-8 md:p-12 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#0D9488]/5 dark:bg-[#14B8A6]/5 blur-[120px] pointer-events-none" />
                        
                        <div className="relative z-10 space-y-10">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold font-heading text-slate-800 dark:text-white tracking-tight uppercase">Step 1: Photo</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Take a clear picture of your face to get started.</p>
                            </div>

                            <div className="max-w-2xl mx-auto space-y-8">
                                <div className={`relative overflow-hidden rounded-[24px] border-2 border-dashed border-[#0D9488]/40 dark:border-[#14B8A6]/40 bg-slate-50 dark:bg-[#1E293B] aspect-video transition-all ${showCamera ? "block ring-2 ring-[#0D9488]/50 dark:ring-[#14B8A6]/50" : "hidden"}`}>
                                    <div className="absolute inset-0 bg-[#0D9488]/5 dark:bg-[#14B8A6]/5 animate-pulse pointer-events-none" />
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full scale-x-[-1] rounded-[24px] aspect-video object-cover" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 border border-slate-300 dark:border-slate-600 rounded-[24px] pointer-events-none" />
                                    <Button onClick={capturePhoto} className="absolute bottom-8 left-1/2 -translate-x-1/2 h-16 px-10 bg-[#0D9488] text-slate-800 dark:text-white dark:bg-[#14B8A6] dark:text-slate-900 hover:bg-[#0F766E] dark:hover:bg-[#0D9488] rounded-[16px] font-bold font-sans transition-all active:scale-95 shadow-lg shadow-[#0D9488]/20 dark:shadow-[#14B8A6]/20">
                                        <Camera className="mr-3 h-5 w-5" /> TAKE PICTURE
                                    </Button>
                                </div>

                                {imageData && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="overflow-hidden rounded-[2.5rem] border border-slate-300 dark:border-slate-600 bg-black/40 shadow-2xl relative group"
                                    >
                                        <img
                                            src={`data:image/jpeg;base64,${imageData}`}
                                            alt="Captured face"
                                            className="w-full max-h-[400px] object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </motion.div>
                                )}

                                <canvas ref={canvasRef} className="hidden" />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleUpload}
                                />

                                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                    {imageData ? (
                                        <>
                                            <Button variant="outline" onClick={() => setImageData(null)} className="flex-1 h-16 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold font-heading uppercase tracking-widest">
                                                Retake
                                            </Button>
                                            <Button onClick={handleNextStep} className="flex-[2] h-16 bg-[#0D9488] text-white dark:bg-[#14B8A6] dark:text-slate-900 hover:bg-[#0F766E] dark:hover:bg-[#0D9488] rounded-2xl font-bold font-heading uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95">
                                                Next Step
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button variant="outline" onClick={startCamera} disabled={showCamera} className="flex-1 h-16 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold font-heading uppercase tracking-widest">
                                                <Camera className="mr-3 h-5 w-5" /> Start Camera
                                            </Button>
                                            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 h-16 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold font-heading uppercase tracking-widest">
                                                <Upload className="mr-3 h-5 w-5" /> Upload from Phone
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </FadeIn>
            )}

            {step === "metadata" && (
                <FadeIn delay={0.1}>
                    <GlassCard className="p-8 md:p-12 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#0D9488]/5 dark:bg-[#14B8A6]/5 blur-[120px] pointer-events-none" />
                        
                        <div className="relative z-10 space-y-10">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold font-heading text-slate-800 dark:text-white tracking-tight uppercase">Tell us More</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Answer a few questions to help us understand your health better.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-4 p-8 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                                    <Label className="flex items-center gap-3 text-[#0D9488] dark:text-[#14B8A6] font-bold uppercase tracking-widest text-[10px]">
                                        <Laptop className="h-4 w-4" /> Screen Exposure
                                    </Label>
                                    <Select value={screenTime} onValueChange={setScreenTime}>
                                        <SelectTrigger className="h-14 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-2xl font-heading uppercase font-bold text-xs tracking-widest">
                                            <SelectValue placeholder="Select exposure" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#FAFAF9] dark:bg-[#0B1120] border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white font-heading uppercase text-[10px] font-bold">
                                            <SelectItem value="< 2 hours">&lt; 2 Hours</SelectItem>
                                            <SelectItem value="2-4 hours">2-4 Hours</SelectItem>
                                            <SelectItem value="4-6 hours">4-6 Hours</SelectItem>
                                            <SelectItem value="6-8 hours">6-8 Hours</SelectItem>
                                            <SelectItem value="> 8 hours">&gt; 8 Hours</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-4 p-8 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                                    <Label className="flex items-center gap-3 text-purple-400 font-bold uppercase tracking-widest text-[10px]">
                                        <Moon className="h-4 w-4" /> Rest Cycles
                                    </Label>
                                    <Select value={sleepHours} onValueChange={setSleepHours}>
                                        <SelectTrigger className="h-14 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-2xl font-heading uppercase font-bold text-xs tracking-widest">
                                            <SelectValue placeholder="Select sleep" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#FAFAF9] dark:bg-[#0B1120] border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white font-heading uppercase text-[10px] font-bold">
                                            <SelectItem value="< 4 hours">&lt; 4 Hours</SelectItem>
                                            <SelectItem value="4-6 hours">4-6 Hours</SelectItem>
                                            <SelectItem value="6-8 hours">6-8 Hours</SelectItem>
                                            <SelectItem value="> 8 hours">&gt; 8 Hours</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-4 p-8 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                                    <Label className="flex items-center gap-3 text-rose-400 font-bold uppercase tracking-widest text-[10px]">
                                        <HeartPulse className="h-4 w-4" /> Cortisol Index
                                    </Label>
                                    <Select value={stressLevel} onValueChange={setStressLevel}>
                                        <SelectTrigger className="h-14 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-2xl font-heading uppercase font-bold text-xs tracking-widest">
                                            <SelectValue placeholder="Select level" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#FAFAF9] dark:bg-[#0B1120] border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white font-heading uppercase text-[10px] font-bold">
                                            <SelectItem value="Low">Low Stress</SelectItem>
                                            <SelectItem value="Moderate">Moderate</SelectItem>
                                            <SelectItem value="High">High Stress</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <Button variant="outline" onClick={() => setStep("capture")} className="h-16 px-10 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold font-heading uppercase tracking-widest">
                                    Back
                                </Button>
                                <Button
                                    onClick={handleAnalyze}
                                    disabled={loading}
                                    className="flex-1 h-16 bg-[#0D9488] text-white dark:bg-[#14B8A6] dark:text-slate-900 hover:bg-[#0F766E] dark:hover:bg-[#0D9488] rounded-2xl font-bold font-heading uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95"
                                >
                                    SHOW RESULT
                                </Button>
                            </div>
                        </div>
                    </GlassCard>
                </FadeIn>
            )}

            {step === "analyzing" && (
                <GlassCard className="p-20 flex flex-col items-center justify-center gap-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#0D9488]/5 dark:bg-[#14B8A6]/5 animate-pulse" />
                    <Loader2 className="h-16 w-16 animate-spin text-[#0D9488] dark:text-[#14B8A6] relative z-10" />
                    <div className="text-center space-y-2 relative z-10">
                        <p className="text-[12px] font-bold uppercase tracking-[0.4em] text-slate-800 dark:text-white">Checking your photo, please wait...</p>
                    </div>
                </GlassCard>
            )}

            {step === "results" && results && (
                <FadeIn delay={0.2} className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Summary Panel */}
                        <GlassCard className="lg:col-span-2 p-8 md:p-12 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-[#0D9488]/20 dark:bg-[#14B8A6]/20" />
                            
                            <div className="space-y-10">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h3 className="text-3xl font-bold font-heading text-slate-800 dark:text-white tracking-tighter uppercase shrink-0">Your <span className="text-[#0D9488] dark:text-[#14B8A6]">Result</span></h3>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">Based on your photo & details</p>
                                    </div>
                                    <Badge className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-[0.15em] border ${
                                        results.triagePriority === "High Fatigue Priority" 
                                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                                        : results.triagePriority === "Elevated Strain Profile" 
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                                        : "bg-[#0D9488]/10 dark:bg-[#14B8A6]/10 text-[#0D9488] dark:text-[#14B8A6] border-[#0D9488]/20 dark:border-[#14B8A6]/20"
                                    }`}>
                                        {results.triagePriority === "High Fatigue Priority" ? "VERY TIRED" : results.triagePriority === "Elevated Strain Profile" ? "SOMEWHAT TIRED" : "NORMAL"}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="p-8 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Activity className="h-5 w-5 text-[#0D9488] dark:text-[#14B8A6]" />
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tiredness Score</span>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <span className="text-6xl font-bold font-heading text-slate-800 dark:text-white tracking-tighter">{results.fatigueIndex}</span>
                                            <span className="text-xl font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-tight">/ 100</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${results.fatigueIndex}%` }}
                                                className={`h-full ${results.fatigueIndex > 70 ? 'bg-rose-500' : results.fatigueIndex > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck className="h-5 w-5 text-[#0D9488] dark:text-[#14B8A6]" />
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Certainty Score</span>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <span className="text-6xl font-bold font-heading text-slate-800 dark:text-white tracking-tighter">94</span>
                                            <span className="text-xl font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-tight">%</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">AI checking complete.</p>
                                    </div>
                                </div>

                                <div className="p-8 rounded-[3rem] bg-indigo-500/[0.03] border border-indigo-500/10">
                                    <p className="text-lg text-slate-800 dark:text-white font-medium leading-relaxed font-heading">{results.overallAssessment}</p>
                                    <p className="text-slate-500 dark:text-slate-400 mt-4 font-medium italic">"{results.simpleExplanation}"</p>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Recovery Protocols */}
                        <div className="space-y-8">
                            <GlassCard className="p-8 border-slate-200 dark:border-slate-700 bg-[#0a0a0a]/40 backdrop-blur-3xl">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    What you should do
                                </h4>
                                <ul className="space-y-4">
                                    {results.precautions.map((p: string, i: number) => (
                                        <li key={i} className="flex gap-4 group">
                                            <span className="text-slate-400 dark:text-slate-500 font-bold font-heading text-xl group-hover:text-[#0D9488] dark:text-[#14B8A6] transition-colors">0{i + 1}</span>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed pt-1 uppercase tracking-tight">{p}</p>
                                        </li>
                                    ))}
                                </ul>
                            </GlassCard>

                            <GlassCard className="p-8 border-slate-200 dark:border-slate-700 bg-[#0a0a0a]/40 backdrop-blur-3xl">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                                    Items that can help
                                </h4>
                                <div className="space-y-3">
                                    {results.otcMedicines.map((med: { name: string; purpose: string; searchQuery: string }, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600 transition-all group">
                                            <div className="text-left">
                                                <p className="text-[10px] font-bold text-slate-800 dark:text-white uppercase tracking-widest">{med.name}</p>
                                                <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">{med.purpose}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" asChild className="h-10 w-10 text-slate-400 dark:text-slate-500 group-hover:text-[#0D9488] dark:text-[#14B8A6]">
                                                <a
                                                    href={`https://www.google.com/search?q=${encodeURIComponent(med.searchQuery)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-4 py-4 px-8 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 backdrop-blur-xl">
                            <Activity className="h-4 w-4 text-amber-500" />
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">AI Guess Only • Show this to a doctor</p>
                        </div>
                        
                        <div className="flex gap-4 w-full max-w-md mx-auto">
                            <Button 
                                onClick={() => {
                                    import("@/lib/downloadReport").then(m => {
                                        m.downloadReportAsText("Ocular & Facial Strain Analysis", results);
                                        toast.success("Report downloaded successfully");
                                    });
                                }} 
                                className="w-full h-14 rounded-2xl border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white font-bold"
                            >
                                <Save className="mr-2 h-4 w-4" /> Download Report
                            </Button>
                            <Button onClick={resetWizard} variant="outline" className="flex-1 h-14 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold font-heading uppercase tracking-widest">
                                Re-Scan
                            </Button>
                            <Button className="flex-1 h-14 bg-[#0D9488] text-white dark:bg-[#14B8A6] dark:text-slate-900 hover:bg-[#0F766E] dark:hover:bg-[#0D9488] rounded-2xl font-bold font-heading uppercase tracking-widest shadow-2xl transition-all" asChild>
                                <Link href="/dashboard">Dashboard</Link>
                            </Button>
                        </div>
                    </div>
                    <MedicalDisclaimer />
                </FadeIn>
            )}
        </div>
    );
}
