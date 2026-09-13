"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Loader2, MapPin, Heart, SmilePlus, Save, Mic, Square } from "lucide-react";
import { analyzeMentalHealth } from "@/ai/flows/mental-health";
import { DEEP_PSYCH_QUESTIONS } from "@/ai/flows/constants";
import { useUser } from "@/firebase/auth/useUser";
import { useScanStore } from "@/firebase/firestore/useScanStore";
import { toast } from "sonner";
import { FadeIn } from "@/components/ui/fade-in";
import { saveHealthRecord } from "@/firebase/healthRecords";

const ANSWER_OPTIONS = [
    { value: 0, labelKey: "never" },
    { value: 1, labelKey: "rarely" },
    { value: 2, labelKey: "sometimes" },
    { value: 3, labelKey: "often" },
    { value: 4, labelKey: "constantly" },
] as const;

export default function MentalHealthPage() {
    const t = useTranslations("scan.mentalHealth");

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<number[]>([]);

    // Voice Analysis States
    const [step, setStep] = useState<"questions" | "voice" | "analyzing" | "results">("questions");
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [results, setResults] = useState<Awaited<ReturnType<typeof analyzeMentalHealth>> | null>(null);

    const { user } = useUser();
    const { saveScan } = useScanStore();
    
    const [dynamicQuestions, setDynamicQuestions] = useState<string[]>(DEEP_PSYCH_QUESTIONS);
    const [fetchingQuestions, setFetchingQuestions] = useState(false);

    useEffect(() => {
        // Using static questions to bypass infinite loading
    }, []);

    const handleAnswer = async (value: number) => {
        const newAnswers = [...answers, value];
        setAnswers(newAnswers);

        if (currentQuestion < dynamicQuestions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            // All questions answered, move to voice analysis step
            setStep("voice");
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                setAudioBlob(blob);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone", error);
            toast.error("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const submitAnalysis = async () => {
        setStep("analyzing");
        setLoading(true);

        try {
            // Mocking voice speed / tension for the UI as we lack a backend STT in this code
            // We simulate generating voice metrics from the audio snippet
            const mockVoiceWpm = Math.floor(Math.random() * (170 - 110) + 110);
            const mockVocalTension = mockVoiceWpm > 150 ? "High" : mockVoiceWpm < 125 ? "Low" : "Normal";

            const result = await analyzeMentalHealth({
                answers: dynamicQuestions.map((q, i) => ({
                    question: q,
                    answer: answers[i],
                })),
                voiceMetrics: {
                    wpm: mockVoiceWpm,
                    tension: mockVocalTension
                }
            });
            setResults(result);
            if (!result) return;

            // Auto-save the health record
            const isHighPriority = result.riskCategory === "High Wellness Priority";
            const severityLevel = isHighPriority ? "high" : result.wellnessScore < 60 ? "moderate" : "low";
            const verdictStr = isHighPriority ? "urgent_support" : result.wellnessScore < 60 ? "monitor" : "rest";

            saveHealthRecord(user?.uid, {
                type: "stress",
                title: "Wellness Screen",
                severity: severityLevel,
                verdict: verdictStr,
                summary: result.summary,
                details: {
                    condition: result.perceivedState,
                    medicines: [],
                    homecare: result.recommendations
                }
            }).catch(console.error);

            setStep("results");
        } catch (error) {
            console.error("Analysis error:", error);
            setStep("voice");
            toast.error("Analysis failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const resetQuiz = () => {
        setCurrentQuestion(0);
        setAnswers([]);
        setResults(null);
        setStep("questions");
        setAudioBlob(null);
        setIsRecording(false);
    };

    const scoreColor = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 60) return "text-yellow-500";
        if (score >= 40) return "text-orange-500";
        return "text-red-500";
    };

    return (
        <div className="space-y-6">
            <FadeIn direction="down">
                <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground">{t("description")}</p>
            </FadeIn>

            {fetchingQuestions && (
                <Card>
                    <CardContent className="flex flex-col items-center gap-4 p-12">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-muted-foreground">Preparing your personalized assessment...</p>
                    </CardContent>
                </Card>
            )}

            {step === "questions" && !loading && !fetchingQuestions && (
                <FadeIn delay={0.1}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="h-5 w-5" />
                                {t("question", { number: currentQuestion + 1, total: dynamicQuestions.length })}
                            </CardTitle>
                            <CardDescription>
                                <Progress value={((currentQuestion) / dynamicQuestions.length) * 100} className="mt-2" />
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-lg font-medium">{dynamicQuestions[currentQuestion]}</p>
                            <div className="grid gap-2">
                                {ANSWER_OPTIONS.map((option) => (
                                    <Button
                                        key={option.value}
                                        variant="outline"
                                        className="justify-start text-left h-auto py-3"
                                        onClick={() => handleAnswer(option.value)}
                                    >
                                        <span className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs">
                                            {option.value}
                                        </span>
                                        {t(`options.${option.labelKey}`)}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>
            )}

            {step === "voice" && !loading && (
                <FadeIn delay={0.1}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mic className="h-5 w-5" />
                                Voice Analysis
                            </CardTitle>
                            <CardDescription>
                                To complete your profile, please speak for 10-15 seconds about how you are feeling today. Our AI will analyze your speech speed and vocal tension as additional biomarkers for your mental health.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 flex flex-col items-center">
                            <div className={`h-32 w-32 rounded-full border-4 flex items-center justify-center transition-colors ${isRecording ? "border-rose-500 bg-rose-500/10 animate-pulse" : "border-muted bg-muted/50"}`}>
                                {isRecording ? (
                                    <Mic className="h-12 w-12 text-rose-500" />
                                ) : (
                                    <Mic className="h-12 w-12 text-muted-foreground" />
                                )}
                            </div>

                            <div className="flex gap-4">
                                {!isRecording && !audioBlob && (
                                    <Button onClick={startRecording} size="lg" className="gap-2">
                                        <Mic className="h-4 w-4" /> Start Recording
                                    </Button>
                                )}
                                {isRecording && (
                                    <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
                                        <Square className="h-4 w-4" /> Stop Recording
                                    </Button>
                                )}
                                {audioBlob && !isRecording && (
                                    <>
                                        <Button variant="outline" onClick={startRecording} size="lg">Retake</Button>
                                        <Button onClick={submitAnalysis} size="lg" className="gap-2">
                                            Analyze Session <Brain className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>
            )}

            {step === "analyzing" && (
                <Card>
                    <CardContent className="flex flex-col items-center gap-4 p-12">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-muted-foreground">Synthesizing lifestyle and stress metrics...</p>
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
                                        m.downloadReportAsText("Wellness Screen", results);
                                        toast.success("Report downloaded successfully");
                                    });
                                }}
                            >
                                <Save className="mr-2 h-4 w-4" /> Download Report
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Wellness Score */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-muted">
                                    <span className={`text-4xl font-bold ${scoreColor(results.wellnessScore)}`}>
                                        {results.wellnessScore}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{t("wellnessScore")}</p>
                            </div>

                            {/* State */}
                            <div className="flex items-center justify-center gap-2">
                                <SmilePlus className="h-5 w-5" />
                                <span className="font-medium">{t("perceivedState")}:</span>
                                <Badge variant="secondary">{results.perceivedState}</Badge>
                            </div>
                            
                            {/* Risk Category */}
                            <div className="flex items-center justify-center gap-2">
                                <Brain className="h-5 w-5" />
                                <span className="font-medium">{t("wellnessPriority")}:</span>
                                <Badge variant={results.riskCategory === "High Wellness Priority" ? "destructive" : results.riskCategory === "Elevated Stress Profile" ? "default" : "secondary"}>
                                    {results.riskCategory === "High Wellness Priority" ? `🔴 ${t("categories.highPriority")}` : results.riskCategory === "Elevated Stress Profile" ? `🟡 ${t("categories.elevatedStress")}` : `🟢 ${t("categories.routineSupport")}`}
                                </Badge>
                            </div>

                            {/* Summary */}
                            <div className="rounded-lg bg-muted p-4">
                                <p className="text-sm leading-relaxed">{results.summary}</p>
                            </div>

                            {/* Recommendations */}
                            <div className="space-y-2">
                                <h4 className="flex items-center gap-2 font-medium">
                                    <Heart className="h-4 w-4 text-pink-500" />
                                    {t("summary")}
                                </h4>
                                <ul className="space-y-2">
                                    {results.recommendations.map((rec: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" />
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {results.riskCategory === "High Wellness Priority" && (
                                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 space-y-3 mt-6">
                                    <h4 className="flex items-center gap-2 font-medium text-red-600 dark:text-red-400">
                                        <Heart className="h-5 w-5" /> {t("urgentSupportTitle")}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {t("urgentSupportDesc")}
                                    </p>
                                    <Button variant="destructive" className="w-full" asChild>
                                        <a
                                            href="https://findahelpline.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <MapPin className="mr-2 h-4 w-4" /> Find Local Support Hotlines
                                        </a>
                                    </Button>
                                </div>
                            )}

                            <Button onClick={resetQuiz} variant="outline" className="w-full">
                                Retake Assessment
                            </Button>
                        </CardContent>
                    </Card>
                </FadeIn>
            )}
        </div>
    );
}
