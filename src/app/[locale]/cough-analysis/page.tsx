"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Mic, MicOff, Loader2, ExternalLink, MapPin, AlertTriangle, Activity, ShieldCheck, Save } from "lucide-react";
import { analyzeCough } from "@/ai/flows/cough-analysis";
import { useUser } from "@/firebase/auth/useUser";
import { useScanStore } from "@/firebase/firestore/useScanStore";
import { toast } from "sonner";
import { FadeIn } from "@/components/ui/fade-in";
import { saveHealthRecord } from "@/firebase/healthRecords";
import { EmergencyOverlay } from "@/components/emergency-overlay";

type Results = any;

export default function CoughAnalysisPage() {
    const t = useTranslations("scan.cough");
    const { user } = useUser();
    const { saveScan } = useScanStore();

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const [step, setStep] = useState<"audio" | "metadata" | "analyzing" | "results">("audio");
    
    // Audio State
    const [recording, setRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [audioData, setAudioData] = useState<string | null>(null);
    
    // Metadata State
    const [duration, setDuration] = useState("Recent (3-7 days)");
    const [fever, setFever] = useState("None");
    const [breathingDifficulty, setBreathingDifficulty] = useState("None");

    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Results | null>(null);
    const [isEmergency, setIsEmergency] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (recording) {
            timer = setInterval(() => {
                setSeconds((s) => {
                    if (s >= 5) {
                        stopRecording();
                        return 5;
                    }
                    return s + 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [recording]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(",")[1];
                    setAudioData(base64);
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setRecording(true);
            setSeconds(0);
            setResults(null);
        } catch (error) {
            console.error("Microphone error:", error);
            toast.error("Could not access microphone.");
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        setRecording(false);
    }, []);

    const handleNextStep = () => {
        if (!audioData) {
            toast.error("Please record audio before proceeding.");
            return;
        }
        setStep("metadata");
    };

    const handleAnalyze = async () => {
        if (!audioData) return;
        setStep("analyzing");
        setLoading(true);
        try {
            const response = await fetch('/api/cough-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audioBase64: audioData,
                    duration,
                    fever,
                    breathingDifficulty,
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to analyze");
            
            setResults(result);
            if (!result) return;

            const isHighPriority = result.triagePriority === "High Triage Priority" || result.triagePriority === "CRITICAL_EMERGENCY";
            if (isHighPriority) {
                setIsEmergency(true);
            }

            // Auto-save the health record
            const severityLevel = isHighPriority ? "high" : result.triagePriority === "Elevated Triage Priority" ? "moderate" : "low";
            const verdictStr = isHighPriority ? "doctor_today" : severityLevel === "moderate" ? "monitor" : "rest";

            saveHealthRecord(user?.uid, {
                type: "cough",
                title: "Respiratory Assessment",
                severity: severityLevel,
                verdict: verdictStr,
                summary: result.simpleExplanation,
                details: {
                    condition: result.coughType,
                    medicines: result.otcMedicines.map((m: { name: string }) => m.name),
                    homecare: result.precautions
                }
            }).catch(console.error);
            
            // Also save specifically to scan store
            if (user) {
                saveScan(user.uid, "self", "coughAnalyses", result).catch(console.error);
            }

            setStep("results");
        } catch (error) {
            console.error("Analysis error:", error);
            toast.error("Analysis failed. Please try again.");
            setStep("metadata");
        } finally {
            setLoading(false);
        }
    };

    const resetWizard = () => {
        setAudioData(null);
        setDuration("Recent (3-7 days)");
        setFever("None");
        setBreathingDifficulty("None");
        setResults(null);
        setStep("audio");
    };

    const coughTypeColors: Record<string, string> = {
        dry: "bg-yellow-500",
        wet: "bg-blue-500",
        wheezing: "bg-orange-500",
        barking: "bg-red-500",
        unknown: "bg-gray-500",
    };

    if (isEmergency) {
        return <EmergencyOverlay onDismiss={() => setIsEmergency(false)} />;
    }

    return (
        <div className="space-y-6">
            <FadeIn direction="down">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Mic className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Respiratory Assessment</h1>
                        <p className="text-muted-foreground">Analyze your cough audio to determine triage priority.</p>
                    </div>
                </div>
            </FadeIn>

            {step === "audio" && (
                <FadeIn delay={0.1}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Step 1: Record Cough</CardTitle>
                            <CardDescription>Record a 5-second sample of your cough.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center gap-4 py-4">
                                <div
                                    className={`flex h-32 w-32 items-center justify-center rounded-full border-4 transition-colors ${recording ? "border-destructive animate-pulse bg-destructive/10" : "border-muted"
                                        }`}
                                >
                                    {recording ? (
                                        <MicOff className="h-12 w-12 text-destructive" />
                                    ) : (
                                        <Mic className="h-12 w-12 text-muted-foreground" />
                                    )}
                                </div>

                                {recording && (
                                    <div className="w-full max-w-xs space-y-2">
                                        <Progress value={(seconds / 5) * 100} />
                                        <p className="text-center text-sm text-muted-foreground">
                                            Recording: {seconds}/5s
                                        </p>
                                    </div>
                                )}

                                {audioData && !recording && (
                                    <Badge variant="secondary" className="px-4 py-2 text-sm bg-green-500/10 text-green-600 dark:text-green-400">
                                        ✓ Audio recorded successfully
                                    </Badge>
                                )}
                            </div>

                            <div className="flex flex-col gap-3">
                                {!recording ? (
                                    <Button onClick={startRecording} variant={audioData ? "outline" : "default"} size="lg" className="w-full">
                                        <Mic className="mr-2 h-4 w-4" /> {audioData ? "Record Again" : "Start Voice Recording"}
                                    </Button>
                                ) : (
                                    <Button onClick={stopRecording} variant="destructive" size="lg" className="w-full">
                                        <MicOff className="mr-2 h-4 w-4" /> Stop Recording
                                    </Button>
                                )}

                                {audioData && !recording && (
                                    <Button onClick={handleNextStep} className="w-full bg-[#00BFA5] hover:bg-[#00BFA5]/90 text-white" size="lg">
                                        Continue to Clinical Details
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>
            )}

            {step === "metadata" && (
                <FadeIn delay={0.1}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Step 2: Respiratory Details</CardTitle>
                            <CardDescription>Provide context to aid the audio analysis.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Duration of Cough</Label>
                                <Select value={duration} onValueChange={setDuration}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Acute (<3 days)">Acute (&lt;3 days)</SelectItem>
                                        <SelectItem value="Recent (3-7 days)">Recent (3-7 days)</SelectItem>
                                        <SelectItem value="Persistent (1-2 weeks)">Persistent (1-2 weeks)</SelectItem>
                                        <SelectItem value="Chronic (>2 weeks)">Chronic (&gt;2 weeks)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Breathing Difficulty Status</Label>
                                <Select value={breathingDifficulty} onValueChange={setBreathingDifficulty}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select breathing status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="None">None (Normal breathing)</SelectItem>
                                        <SelectItem value="Mild (Out of breath on exertion)">Mild (Out of breath on exertion)</SelectItem>
                                        <SelectItem value="Moderate (Noticeable effort when resting)">Moderate (Noticeable effort when resting)</SelectItem>
                                        <SelectItem value="Severe (Gasping, inability to speak full sentences)">Severe (Gasping, inability to speak full sentences)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Fever Presence</Label>
                                <Select value={fever} onValueChange={setFever}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select fever status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="None">None</SelectItem>
                                        <SelectItem value="Low-grade (99-100.4°F)">Low-grade (99-100.4°F)</SelectItem>
                                        <SelectItem value="High (>100.4°F)">High (&gt;100.4°F)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setStep("audio")}>Back</Button>
                                <Button
                                    onClick={handleAnalyze}
                                    disabled={loading}
                                    className="flex-1 bg-[#00BFA5] hover:bg-[#00BFA5]/90 hover:shadow-[0_0_15px_rgba(0,191,165,0.4)] transition-all duration-300 text-white font-medium"
                                >
                                    Analyze Respiratory Audio
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>
            )}

            {step === "analyzing" && (
                <Card>
                    <CardContent className="flex flex-col items-center gap-4 p-12">
                        <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
                        <p className="text-muted-foreground">Analyzing audio signature and respiratory metadata...</p>
                    </CardContent>
                </Card>
            )}

            {step === "results" && results && (
                <FadeIn delay={0.2} className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Respiratory Assessment Report</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            {/* Triage Priority */}
                            <div className="flex items-center justify-center gap-2">
                                <Activity className="h-5 w-5" />
                                <span className="font-medium">Triage Priority:</span>
                                <Badge variant={results.triagePriority === "High Triage Priority" ? "destructive" : results.triagePriority === "Elevated Triage Priority" ? "default" : "secondary"}>
                                    {results.triagePriority === "High Triage Priority" ? "🔴" : results.triagePriority === "Elevated Triage Priority" ? "🟡" : "🟢"} {results.triagePriority}
                                </Badge>
                            </div>

                            {/* State */}
                            <div className="flex items-center justify-center gap-3 border rounded-xl p-4 bg-muted/20">
                                <div className={`h-4 w-4 rounded-full ${coughTypeColors[results.coughType]}`} />
                                <span className="text-lg font-semibold capitalize">{results.coughType} Cough Signature</span>
                            </div>

                            <Card className="border-teal-500/20 shadow-sm bg-teal-500/5 dark:bg-teal-900/10">
                                <CardContent className="p-4">
                                    <p className="text-sm dark:text-teal-100">{results.description}</p>
                                    <p className="text-sm mt-2 dark:text-teal-100 font-medium">{results.simpleExplanation}</p>
                                </CardContent>
                            </Card>

                            <div className="space-y-3">
                                <h4 className="font-semibold flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-green-500" />
                                    Respiratory Care Steps
                                </h4>
                                <ul className="space-y-2">
                                    {results.precautions.map((p: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm rounded-lg bg-muted/50 p-2.5">
                                            <span className="mt-0.5 h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold">
                                                {i + 1}
                                            </span>
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* OTC Medicines */}
                            {results.otcMedicines.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-semibold p-1">Supportive Items</h4>
                                    <div className="space-y-2">
                                        {results.otcMedicines.map((med: { name: string; purpose: string; searchQuery: string }, i: number) => (
                                            <div key={i} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                                                <div>
                                                    <p className="font-medium text-sm">{med.name}</p>
                                                    <p className="text-xs text-muted-foreground">{med.purpose}</p>
                                                </div>
                                                <Button variant="outline" size="sm" asChild className="shrink-0">
                                                    <a
                                                        href={`https://www.google.com/search?q=${encodeURIComponent(med.searchQuery)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <ExternalLink className="mr-1.5 h-3 w-3" />
                                                        Find
                                                    </a>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {results.triagePriority === "High Triage Priority" && (
                                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 space-y-3 mt-6">
                                    <h4 className="flex items-center gap-2 font-medium text-red-600 dark:text-red-400">
                                        <AlertTriangle className="h-5 w-5" /> Urgent Medical Support Recommended
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        Your respiratory analysis indicates a need for professional medical intervention. Please visit a nearby clinic or emergency room immediately.
                                    </p>
                                    <Button variant="destructive" className="w-full" asChild>
                                        <a
                                            href="https://www.google.com/maps/search/Hospitals+and+Clinics+near+me"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <MapPin className="mr-2 h-4 w-4" /> Find Local Emergency Room
                                        </a>
                                    </Button>
                                </div>
                            )}

                            <Button 
                                onClick={() => {
                                    import("@/lib/downloadReport").then(m => {
                                        m.downloadReportAsText("Respiratory Assessment", results);
                                        toast.success("Report downloaded successfully");
                                    });
                                }} 
                                className="w-full mb-3"
                            >
                                <Save className="mr-2 h-4 w-4" /> Download Report
                            </Button>
                            <Button onClick={resetWizard} variant="outline" className="w-full">
                                Retake Assessment
                            </Button>
                        </CardContent>
                    </Card>

                    <MedicalDisclaimer />
                </FadeIn>
            )}
        </div>
    );
}
