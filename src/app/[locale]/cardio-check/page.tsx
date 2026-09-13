"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, HeartPulse, Loader2, Save, Activity, ShieldAlert } from "lucide-react";
import { useUser } from "@/firebase/auth/useUser";
import { useScanStore } from "@/firebase/firestore/useScanStore";
import { toast } from "sonner";
import { FadeIn } from "@/components/ui/fade-in";
import { saveHealthRecord } from "@/firebase/healthRecords";
import { EmergencyOverlay } from "@/components/emergency-overlay";

export default function CardioCheckPage() {
    const t = useTranslations("cardioCheck");
    const { user } = useUser();
    const { saveScan } = useScanStore();

    const [step, setStep] = useState<"step1" | "step2" | "analyzing" | "results">("step1");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [isEmergency, setIsEmergency] = useState(false);

    const [formData, setFormData] = useState({
        age: "",
        gender: "",
        bmi: "",
        restingHR: "",
        chestPainType: "",
        exerciseAngina: "",
        bloodSugar: "",
        smokerTarget: ""
    });

    const updateForm = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    if (isEmergency) {
        return <EmergencyOverlay onDismiss={() => setIsEmergency(false)} />;
    }

    const handleNext = () => {
        if (!formData.age || !formData.gender) {
            toast.error("Please fill in the required biometrics (Age & Gender)");
            return;
        }
        setStep("step2");
    };

    const submitAnalysis = async () => {
        if (!formData.chestPainType || !formData.exerciseAngina || !formData.bloodSugar || !formData.smokerTarget) {
            toast.error("Please complete all lifestyle inputs");
            return;
        }

        setStep("analyzing");
        setLoading(true);

        try {
            const response = await fetch("/api/cardio-check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error("Failed to analyze");
            }

            const data = await response.json();
            setResults(data);

            const isHighPriority = data.triagePriority === "High Priority";
            
            if (isHighPriority) {
                setIsEmergency(true);
            }

            // Auto-save the health record
            const severityLevel = isHighPriority ? "high" : data.triagePriority === "Elevated Priority" ? "moderate" : "low";
            const verdictStr = isHighPriority ? "urgent_support" : data.triagePriority === "Elevated Priority" ? "monitor" : "rest";

            saveHealthRecord(user?.uid, {
                type: "heart",
                title: "Cardio Screen",
                severity: severityLevel,
                verdict: verdictStr,
                summary: data.overallAssessment,
                details: {
                    condition: data.triagePriority,
                    medicines: [],
                    homecare: data.precautions
                }
            }).catch(console.error);

            setStep("results");
        } catch (error) {
            console.error("Analysis error:", error);
            setStep("step2");
            toast.error("Analysis failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const resetWizard = () => {
        setFormData({
            age: "",
            gender: "",
            bmi: "",
            restingHR: "",
            chestPainType: "",
            exerciseAngina: "",
            bloodSugar: "",
            smokerTarget: ""
        });
        setResults(null);
        setStep("step1");
    };

    const priorityBadgeColor = (priority: string) => {
        if (priority === "High Priority") return "destructive";
        if (priority === "Elevated Priority") return "default";
        return "secondary";
    };

    const priorityIcon = (priority: string) => {
        if (priority === "High Priority") return "🔴";
        if (priority === "Elevated Priority") return "🟡";
        return "🟢";
    };

    const scoreColor = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 60) return "text-yellow-500";
        if (score >= 40) return "text-orange-500";
        return "text-red-500";
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <FadeIn direction="down">
                <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground">{t("description")}</p>
            </FadeIn>

            {step === "step1" && (
                <FadeIn delay={0.1}>
                    {/* HARD MANDATORY RED FLAG OVERRIDE BANNER */}
                    <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-md mb-6 flex items-start gap-3">
                        <ShieldAlert className="h-6 w-6 text-red-500 shrink-0" />
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                            {t("emergencyBanner")}
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Step 1: {t("step1Title")}
                            </CardTitle>
                            <CardDescription>{t("step1Desc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("age")} *</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 45"
                                        value={formData.age}
                                        onChange={(e) => updateForm("age", e.target.value)}
                                        min="1"
                                        max="120"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("gender")} *</Label>
                                    <Select value={formData.gender} onValueChange={(v) => updateForm("gender", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("selectGender")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">{t("male")}</SelectItem>
                                            <SelectItem value="Female">{t("female")}</SelectItem>
                                            <SelectItem value="Other">{t("other")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("bmi")}</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 24.5"
                                        value={formData.bmi}
                                        onChange={(e) => updateForm("bmi", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("restingHR")}</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 72"
                                        value={formData.restingHR}
                                        onChange={(e) => updateForm("restingHR", e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button onClick={handleNext} className="w-full mt-4">Next Step</Button>
                        </CardContent>
                    </Card>
                </FadeIn>
            )}

            {step === "step2" && (
                <FadeIn delay={0.1}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HeartPulse className="h-5 w-5" />
                                Step 2: {t("step2Title")}
                            </CardTitle>
                            <CardDescription>{t("step2Desc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t("chestPainType")} *</Label>
                                    <Select value={formData.chestPainType} onValueChange={(v) => updateForm("chestPainType", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("selectChestPain")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="None">{t("cpNone")}</SelectItem>
                                            <SelectItem value="Mild / Occasional">{t("cpMild")}</SelectItem>
                                            <SelectItem value="Atypical Angina">{t("cpAtypical")}</SelectItem>
                                            <SelectItem value="Typical Angina">{t("cpTypical")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("exerciseAngina")} *</Label>
                                    <Select value={formData.exerciseAngina} onValueChange={(v) => updateForm("exerciseAngina", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Yes">{t("yes")}</SelectItem>
                                            <SelectItem value="No">{t("no")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("bloodSugar")} *</Label>
                                    <Select value={formData.bloodSugar} onValueChange={(v) => updateForm("bloodSugar", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Yes">{t("yes")}</SelectItem>
                                            <SelectItem value="No">{t("no")}</SelectItem>
                                            <SelectItem value="Unknown">{t("unknown")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("smoker")} *</Label>
                                    <Select value={formData.smokerTarget} onValueChange={(v) => updateForm("smokerTarget", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Yes">{t("yes")}</SelectItem>
                                            <SelectItem value="No">{t("no")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setStep("step1")} className="w-1/3">Back</Button>
                                <Button onClick={submitAnalysis} className="w-2/3">Analyze Wellness</Button>
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>
            )}

            {step === "analyzing" && (
                <Card>
                    <CardContent className="flex flex-col items-center gap-4 p-12">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-muted-foreground">{t("analyzing")}</p>
                    </CardContent>
                </Card>
            )}

            {step === "results" && results && (
                <FadeIn delay={0.2} className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{t("results")}</CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    import("@/lib/downloadReport").then(m => {
                                        m.downloadReportAsText("Cardio Screen", results);
                                        toast.success("Report downloaded successfully");
                                    });
                                }}
                            >
                                <Save className="mr-2 h-4 w-4" /> Download Report
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Score */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-muted">
                                    <span className={`text-4xl font-bold ${scoreColor(results.wellnessScore)}`}>
                                        {results.wellnessScore}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{t("wellnessScore")}</p>
                            </div>

                            {/* Triage Priority */}
                            <div className="flex items-center justify-center gap-2">
                                <HeartPulse className="h-5 w-5" />
                                <span className="font-medium">Priority Tier:</span>
                                <Badge variant={priorityBadgeColor(results.triagePriority)}>
                                    {priorityIcon(results.triagePriority)} {results.triagePriority}
                                </Badge>
                            </div>

                            {/* Overall Assessment */}
                            <div className="rounded-lg bg-muted p-4">
                                <h4 className="font-medium mb-1">{t("overallAssessment")}</h4>
                                <p className="text-sm leading-relaxed text-muted-foreground">{results.overallAssessment}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Precautions */}
                                <div className="space-y-2">
                                    <h4 className="font-medium">{t("precautions")}</h4>
                                    <ul className="space-y-2">
                                        {results.precautions.map((rec: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground border-l-2 border-primary/50 pl-2">
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {/* Recommendations */}
                                <div className="space-y-2">
                                    <h4 className="font-medium">{t("recommendations")}</h4>
                                    <ul className="space-y-2">
                                        {results.recommendations.map((rec: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground border-l-2 border-blue-500/50 pl-2">
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* EMERGENCY FALLBACK COMOPONENT */}
                            {results.seekEmergency && (
                                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 space-y-3 mt-6">
                                    <h4 className="flex items-center gap-2 font-medium text-red-600 dark:text-red-400">
                                        <ShieldAlert className="h-5 w-5" /> {t("urgentSupportTitle")}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {t("urgentSupportDesc")}
                                    </p>
                                    <Button variant="destructive" className="w-full" asChild>
                                        <a
                                            href="tel:108"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Call Emergency Services (108)
                                        </a>
                                    </Button>
                                </div>
                            )}

                            <div className="text-xs text-muted-foreground italic text-center pt-4 opacity-70">
                                {results.disclaimer}
                            </div>

                            <Button onClick={resetWizard} variant="outline" className="w-full mt-4">
                                Start Over
                            </Button>
                        </CardContent>
                    </Card>
                </FadeIn>
            )}
        </div>
    );
}
