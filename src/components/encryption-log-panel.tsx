"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Cpu, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface EncryptionLogPanelProps {
  activeStep: number;
  isEncrypting: boolean;
}

const steps = [
    {
        title: "1. Collatz Qarışdırması",
        details: ["→ İlkin koordinat emal edilir...", "→ Nəticə: Gizlədilib"],
    },
    {
        title: "2. Prime-Jump Şifrələməsi",
        details: ["→ Sadə ədəd cədvəli tətbiq edilir...", "→ Nəticə: Gizlədilib"],
    },
    {
        title: "3. Fibonaççi Spiralı",
        details: ["→ Spiral ofset tətbiq edilir...", "→ Nəticə: Gizlədilib"],
    },
    {
        title: "4. Lehmer RNG Sürüşdürməsi",
        details: ["→ Təsadüfi sürüşdürmə tətbiq edilir...", "→ Nəticə: Gizlədilib"],
    },
    {
        title: "5. Kvant Geo-Sürüşdürmə",
        details: ["→ Yekun təhlükəsizlik layı tətbiq edildi.", "→ Yem koordinatı: TƏSDİQLƏNDİ"],
        isFinal: true,
    },
];

export default function EncryptionLogPanel({ activeStep, isEncrypting }: EncryptionLogPanelProps) {

    const getStepClass = (stepIndex: number) => {
        const isActive = isEncrypting && activeStep > stepIndex;
        if (isActive) {
            return steps[stepIndex].isFinal ? "text-green-400" : "text-yellow-400";
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

                            {steps.map((step, index) => (
                                <div key={index} className={cn("transition-colors", getStepClass(index))}>
                                    <p className="font-semibold flex items-center gap-2">
                                     {step.isFinal && <ShieldCheck size={14} />}
                                     {step.title}
                                    </p>
                                    {step.details.map((detail, detailIndex) => (
                                         <p key={detailIndex} className="pl-2">{detail}</p>
                                    ))}
                                </div>
                            ))}

                            <p className={cn("transition-colors", activeStep > steps.length ? "text-green-400" : "text-muted-foreground")}>
                                [SİSTEM] Proses tamamlandı. Yem yayıma hazırdır.
                            </p>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
