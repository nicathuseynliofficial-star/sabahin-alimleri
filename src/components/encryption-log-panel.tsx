"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Cpu, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface EncryptionLogPanelProps {
  activeStep: number;
  isEncrypting: boolean;
}

const initialSteps = [
    {
        title: "1. Collatz Qarışdırması",
        details: ["→ İlkin koordinat emal edilir...", "→ Nəticə: Gözlənilir..."],
    },
    {
        title: "2. Prime-Jump Şifrələməsi",
        details: ["→ Sadə ədəd cədvəli tətbiq edilir...", "→ Nəticə: Gözlənilir..."],
    },
    {
        title: "3. Fibonaççi Spiralı",
        details: ["→ Spiral ofset tətbiq edilir...", "→ Nəticə: Gözlənilir..."],
    },
    {
        title: "4. Lehmer RNG Sürüşdürməsi",
        details: ["→ Təsadüfi sürüşdürmə tətbiq edilir...", "→ Nəticə: Gözlənilir..."],
    },
    {
        title: "5. Kvant Geo-Sürüşdürmə",
        details: ["→ Yekun təhlükəsizlik layı tətbiq edildi.", "→ Yem koordinatı: TƏSDİQLƏNİR..."],
        isFinal: true,
    },
];

export default function EncryptionLogPanel({ activeStep, isEncrypting }: EncryptionLogPanelProps) {
    const [logSteps, setLogSteps] = useState(initialSteps);

    useEffect(() => {
        if (isEncrypting) {
            if (activeStep > 0 && activeStep <= logSteps.length) {
                const currentStepIndex = activeStep - 1;
                
                let resultText = `→ Nəticə: TƏSDİQLƏNDİ`;

                if (logSteps[currentStepIndex].isFinal) {
                    resultText = `→ Yem koordinatı: TƏSDİQLƏNDİ`;
                }

                const updatedSteps = [...logSteps];
                updatedSteps[currentStepIndex].details[1] = resultText;
                setLogSteps(updatedSteps);
            }
        } else {
            // Reset when not encrypting
            setLogSteps(initialSteps);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeStep, isEncrypting]);

    const getStepClass = (stepIndex: number) => {
        if (isEncrypting && activeStep > stepIndex) {
            return logSteps[stepIndex].isFinal ? "text-green-400" : "text-yellow-400";
        }
        return "text-muted-foreground";
    };

    return (
        <div className="p-2 mt-auto">
            <Separator className="my-2" />
            <Card className="bg-transparent border-none shadow-none">
                <CardHeader className="p-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Cpu className={cn("w-4 h-4", isEncrypting ? "text-accent animate-pulse" : "text-muted-foreground")} />
                        <span>Şifrələmə Jurnalı</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                    <ScrollArea className="h-48 w-full rounded-md border border-dashed border-border p-2">
                        <div className="text-xs space-y-3 font-mono">
                            <p className={cn("transition-colors", isEncrypting ? "text-accent" : "text-muted-foreground")}>
                                {isEncrypting ? "[SİSTEM] Əməliyyat icra edilir..." : "[SİSTEM] Əməliyyat gözlənilir..."}
                            </p>

                            {logSteps.map((step, index) => (
                                <div key={index} className={cn("transition-colors", getStepClass(index))}>
                                    <p className="font-semibold flex items-center gap-2">
                                     {step.isFinal && activeStep > index && <ShieldCheck size={14} />}
                                     {step.title}
                                    </p>
                                    {step.details.map((detail, detailIndex) => (
                                         <p key={detailIndex} className="pl-2">{detail}</p>
                                    ))}
                                </div>
                            ))}

                            <p className={cn("transition-colors", activeStep > logSteps.length ? "text-green-400" : "text-muted-foreground")}>
                                [SİSTEM] Proses tamamlandı. Yem yayıma hazırdır.
                            </p>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
