"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { FadeIn } from "@/components/ui/fade-in";
import { Loader2, ExternalLink, MapPin, Stethoscope, AlertTriangle, ShieldCheck, Info, Heart, Activity, Save } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/firebase/auth/useUser";
import { saveHealthRecord } from "@/firebase/healthRecords";
import { EmergencyOverlay } from "@/components/emergency-overlay";

const ANIMATION_URL = "https://lottie.host/933a216f-a63e-4d45-ae57-4180860d5bfa/YkX9Nl6zH4.json";

type Results = any;

export default function SymptomCheckerPage() {
    const t = useTranslations("symptomChecker");
    const { user } = useUser();

    const [step, setStep] = useState<"symptoms" | "metadata" | "analyzing" | "results">("symptoms");
    const [symptoms, setSymptoms] = useState("");
    const quickSymptoms = ["🤒 Fever", "🤕 Headache", "🤢 Stomach Pain", "🤧 Cold & Cough", "😴 Body Ache", "👁️ Eye Problem", "🫀 Chest Pain", "💊 Skin Issue"];
    
    // Metadata
    const [duration, setDuration] = useState("Recent (3-7 days)");
    const [painScale, setPainScale] = useState(5);
    const [fever, setFever] = useState("None");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");

    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Results | null>(null);
    const [isEmergency, setIsEmergency] = useState(false);

    const handleNextStep = () => {
        if (!symptoms.trim()) {
            toast.error(t("enterSymptoms") || "Please enter your symptoms.");
            return;
        }
        setStep("metadata");
    };

    const handleCheck = async () => {
        setStep("analyzing");
        setLoading(true);
        setResults(null);
        try {
            const response = await fetch('/api/symptom-checker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symptoms: symptoms.trim(),
                    duration,
                    painScale,
                    fever,
                    age: age ? parseInt(age, 10) : undefined,
                    gender: gender || undefined,
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to analyze symptoms");
            }

            const result = await response.json();
            setResults(result);
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
                type: "symptom",
                title: "Symptom Assessment",
                severity: severityLevel,
                verdict: verdictStr,
                summary: result.simpleExplanation,
                details: {
                    condition: result.symptomCluster,
                    medicines: result.otcMedicines.map((m: { name: string }) => m.name),
                    homecare: result.precautions
                }
            }).catch(console.error);

            setStep("results");
        } catch (error) {
            console.error("Symptom check error:", error);
            setStep("metadata");
            toast.error("Analysis failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const resetWizard = () => {
        setSymptoms("");
        setDuration("Recent (3-7 days)");
        setPainScale(5);
        setFever("None");
        setAge("");
        setGender("");
        setResults(null);
        setStep("symptoms");
    };

    return (
        <div className="space-y-6">
            <FadeIn direction="down">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Symptom Assessment</h1>
                        <p className="text-muted-foreground">Describe your symptoms for an AI-powered triage evaluation.</p>
                    </div>
                </div>
            </FadeIn>

            {step === "symptoms" && (
                <FadeIn delay={0.1}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Step 1: Document Symptoms</CardTitle>
                            <CardDescription>Describe how you are feeling in detail.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="symptoms">Symptoms</Label>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none w-full">
                                    {quickSymptoms.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setSymptoms(prev => prev ? prev + ", " + s : s)}
                                            className="whitespace-nowrap rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-700 dark:text-teal-400 transition-colors hover:bg-teal-500/20"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                <Textarea
                                    id="symptoms"
                                    placeholder="e.g. I have a fever since 2 days, headache, sore throat and body aches..."
                                    className="min-h-[120px] resize-none"
                                    value={symptoms}
                                    onChange={(e) => setSymptoms(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleNextStep} className="w-full">Continue to Clinical Details</Button>
                        </CardContent>
                    </Card>
                </FadeIn>
            )}

            {step === "metadata" && (
                <FadeIn delay={0.1}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Step 2: Clinical Details</CardTitle>
                            <CardDescription>Please provide a few more details to help us assess your triage priority accurately.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Duration of Symptoms</Label>
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
                                <Label>Select Fever Presence</Label>
                                <Select value={fever} onValueChange={setFever}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select fever presence" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="None">None</SelectItem>
                                        <SelectItem value="Low-grade (99-100.4°F)">Low-grade (99-100.4°F)</SelectItem>
                                        <SelectItem value="High (>100.4°F)">High (&gt;100.4°F)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3 p-4 border rounded-xl bg-muted/20">
                                <Label className="flex justify-between">
                                    <span>Pain/Discomfort Scale</span>
                                    <span className="font-bold text-teal-600">{painScale}/10</span>
                                </Label>
                                <input 
                                    type="range" 
                                    min="1" max="10" 
                                    value={painScale} 
                                    onChange={(e) => setPainScale(parseInt(e.target.value))}
                                    className="w-full accent-teal-600"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Mild</span>
                                    <span>Moderate</span>
                                    <span>Severe</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="age">Age <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <Input
                                        id="age"
                                        type="number"
                                        min={1}
                                        max={120}
                                        placeholder="e.g. 35"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Gender <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <Select value={gender} onValueChange={setGender}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setStep("symptoms")}>Back</Button>
                                <Button
                                    onClick={handleCheck}
                                    disabled={loading}
                                    className="flex-1 bg-[#00BFA5] hover:bg-[#00BFA5]/90 hover:shadow-[0_0_15px_rgba(0,191,165,0.4)] transition-all duration-300 text-white font-medium"
                                >
                                    Analyze Details
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
                        <p className="text-muted-foreground">Synthesizing clinical metadata & symptoms...</p>
                    </CardContent>
                </Card>
            )}

            {step === "results" && results && (
                <FadeIn delay={0.2} className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Triage Assessment Report</CardTitle>
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
                            <div className="flex items-center justify-center gap-2">
                                <Stethoscope className="h-5 w-5" />
                                <span className="font-medium">Symptom Cluster:</span>
                                <Badge variant="secondary">{results.symptomCluster}</Badge>
                            </div>

                            <Card className="border-teal-500/20 shadow-sm bg-teal-500/5 dark:bg-teal-900/10">
                                <CardContent className="p-4">
                                    <p className="text-sm dark:text-teal-100">{results.clusterDescription}</p>
                                    <p className="text-sm mt-2 dark:text-teal-100 font-medium">{results.simpleExplanation}</p>
                                </CardContent>
                            </Card>

                            <div className="space-y-3">
                                <h4 className="font-semibold flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-green-500" />
                                    Care Recommendations
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
                                    <h4 className="font-semibold p-1">Wellness Supplements</h4>
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
                                        Your severe symptom profile indicates a need for professional medical intervention. Please visit a nearby clinic or emergency room immediately.
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
                                        m.downloadReportAsText("Symptom Assessment", results);
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
