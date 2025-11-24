
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Cpu, ShieldCheck } from "lucide-react"

// Bu, AI axınının arxa planda necə işlədiyini simulyasiya edən bir komponentdir.
// Hər addımda koordinatların necə dəyişdiyini göstərir.
export default function EncryptionLogPanel() {
    return (
        <div className="p-2 mt-auto">
            <Separator className="my-2" />
            <Card className="bg-transparent border-none shadow-none">
                <CardHeader className="p-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-accent" />
                        <span>Şifrələmə Jurnalı</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                    <ScrollArea className="h-48 w-full rounded-md border border-dashed border-border p-2">
                        <div className="text-xs text-muted-foreground space-y-3 font-mono">
                            <p className="text-accent">[SİSTEM] Əməliyyat gözlənilir...</p>
                            
                            <div>
                                <p className="font-semibold">1. Collatz Qarışdırması</p>
                                <p className="pl-2">→ İlkin koordinat: 40.37, 49.84</p>
                                <p className="pl-2">→ Nəticə: <span className="text-yellow-400">40.41, 49.88</span></p>
                            </div>
                            
                            <div>
                                <p className="font-semibold">2. Prime-Jump Şifrələməsi</p>
                                <p className="pl-2">→ Sadə ədəd cədvəli tətbiq edilir...</p>
                                <p className="pl-2">→ Nəticə: <span className="text-yellow-400">40.39, 49.91</span></p>
                            </div>
                            
                             <div>
                                <p className="font-semibold">3. Fibonaççi Spiralı</p>
                                <p className="pl-2">→ Spiral ofset tətbiq edilir...</p>
                                <p className="pl-2">→ Nəticə: <span className="text-yellow-400">40.45, 49.89</span></p>
                            </div>

                             <div>
                                <p className="font-semibold">4. Lehmer RNG Sürüşdürməsi</p>
                                <p className="pl-2">→ Təsadüfi, lakin təkrarlanabilən sürüşdürmə...</p>
                                <p className="pl-2">→ Nəticə: <span className="text-yellow-400">40.48, 49.93</span></p>
                            </div>
                            
                            <div>
                                <div className="font-semibold flex items-center gap-2">
                                  <ShieldCheck size={14} className="text-green-500" />
                                  <span>5. Kvant Geo-Sürüşdürmə</span>
                                </div>
                                <p className="pl-2">→ Yekun təhlükəsizlik layı tətbiq edildi.</p>
                                <p className="pl-2">→ Yem koordinatı: <span className="text-green-400 font-bold">40.4812, 49.9334</span></p>
                            </div>
                            <p className="text-accent">[SİSTEM] Proses tamamlandı. Yem yayıma hazırdır.</p>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
