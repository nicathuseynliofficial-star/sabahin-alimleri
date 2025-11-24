"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Code, Cpu, ShieldCheck } from "lucide-react"

// This is a placeholder component as the AI flow is a black box.
// In a real scenario with access to intermediate steps, this would be dynamic.
export default function EncryptionLogPanel() {
    return (
        <div className="p-2 mt-auto">
            <Separator className="my-2" />
            <Card className="bg-transparent border-none shadow-none">
                <CardHeader className="p-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-accent" />
                        <span>Şifrələmə Prosesi</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                    <ScrollArea className="h-48 w-full rounded-md border border-dashed border-border p-2">
                        <div className="text-xs text-muted-foreground space-y-2 font-mono">
                            <p className="text-accent">[SYSTEM] Gözləmə rejimində.</p>
                            <p>Yeni hədəf üçün yem koordinat yaradılması gözlənilir...</p>
                            <div className="flex items-center gap-2">
                                <Code size={14} />
                                <span>1. Collatz Scrambling</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Code size={14} />
                                <span>2. Prime-Jump Encryption</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <Code size={14} />
                                <span>3. Fibonacci Spiral</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <Code size={14} />
                                <span>4. Lehmer RNG Shift</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={14} className="text-green-500" />
                                <span>5. Quantum Geo-Shift</span>
                            </div>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
