"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Map, Shield, Target, Upload, Bot, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, where, doc, getDocs, writeBatch } from 'firebase/firestore';
import type { MilitaryUnit, OperationTarget, Decoy } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { generateStrategicDecoys, type GenerateStrategicDecoysInput } from '@/ai/flows/generate-strategic-decoys';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';


type ClickCoordinates = {
    x: number;
    y: number;
} | null;

const SINGLE_MAP_ID = 'main';

export default function MapPlaceholder({
  isEncrypting,
  setIsEncrypting,
  encryptionStep,
  setEncryptionStep
}: {
  isEncrypting: boolean;
  setIsEncrypting: (isEncrypting: boolean) => void;
  encryptionStep: number;
  setEncryptionStep: (step: number) => void;
}) {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const isCommander = user?.role === 'commander';
  
  const [mapUrl, setMapUrl] = useState(PlaceHolderImages.find(img => img.id === 'azerbaijan-map')?.imageUrl ?? PlaceHolderImages[0].imageUrl);
  const [tempMapUrl, setTempMapUrl] = useState('');
  const [isMapImportOpen, setIsMapImportOpen] = useState(false);

  // State for the new/edit target dialog
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [targetCoordinates, setTargetCoordinates] = useState<ClickCoordinates>(null);
  const [targetName, setTargetName] = useState('');
  const [assignedUnitId, setAssignedUnitId] = useState('');
  const [targetStatus, setTargetStatus] = useState<OperationTarget['status']>('pending');
  const [editingTarget, setEditingTarget] = useState<OperationTarget | null>(null);

  // State for delete confirmation dialog
  const [targetToDelete, setTargetToDelete] = useState<OperationTarget | null>(null);
  
  const decoysQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'decoys');
  }, [firestore]);
  const { data: decoys } = useCollection<Decoy>(decoysQuery);

  // Base query for units
  const unitsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const q = collection(firestore, 'military_units');

    if (user.role === 'sub-commander' && !user.canSeeAllUnits && user.assignedUnitId) {
        return query(q, where('id', '==', user.assignedUnitId));
    }
    return q;
  }, [firestore, user]);

  const { data: units, isLoading: isLoadingUnits } = useCollection<MilitaryUnit>(unitsQuery);

  // Base query for targets
  const targetsBaseQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return collection(firestore, 'operation_targets');
  }, [firestore, user]);
  
  const targetsQuery = useMemoFirebase(() => {
      if (!targetsBaseQuery) return null;
      if (user?.role === 'sub-commander' && !user.canSeeAllUnits && user.assignedUnitId) {
          return query(targetsBaseQuery, where('assignedUnitId', '==', user.assignedUnitId));
      }
      return targetsBaseQuery;
  }, [targetsBaseQuery, user]);

  const { data: targets } = useCollection<OperationTarget>(targetsQuery);


  useEffect(() => {
    const defaultMap = PlaceHolderImages.find(img => img.id === 'azerbaijan-map')?.imageUrl;
    const storedMapUrl = localStorage.getItem('mainMapUrl') || defaultMap;
    if (storedMapUrl) {
      setMapUrl(storedMapUrl);
    }
  }, []);

  const handleSaveCustomMap = () => {
    if (tempMapUrl) {
      setMapUrl(tempMapUrl);
      localStorage.setItem('mainMapUrl', tempMapUrl);
      setIsMapImportOpen(false);
      setTempMapUrl('');
    }
  };


  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCommander) return;
    
    // Prevent dialog from opening if we clicked on an interactive element (like a target)
    if ((e.target as HTMLElement).closest('[data-interactive]')) {
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setTargetCoordinates({ x, y });
    setEditingTarget(null);
    setTargetName('');
    setAssignedUnitId('');
    setTargetStatus('pending');
    setIsTargetDialogOpen(true);
  };

  const handleSaveTarget = () => {
    if (!targetName || !assignedUnitId || !firestore) {
         toast({
            variant: "destructive",
            title: "Xəta",
            description: "Hədəf adı və bölük seçilməlidir.",
        });
        return;
    }
    
    if (editingTarget) {
      // Update existing target
      const targetDocRef = doc(firestore, 'operation_targets', editingTarget.id);
      const updatedData: Partial<OperationTarget> = {
        name: targetName,
        assignedUnitId: assignedUnitId,
        status: targetStatus,
      };
       setDocumentNonBlocking(targetDocRef, updatedData, { merge: true });


      toast({
        title: "Hədəf Yeniləndi",
        description: `"${targetName}" adlı hədəf məlumatları yeniləndi.`
      });
    } else if (targetCoordinates) {
      // Create new target
       const newTarget: OperationTarget = {
          id: uuidv4(),
          name: targetName,
          assignedUnitId: assignedUnitId,
          latitude: targetCoordinates.y,
          longitude: targetCoordinates.x,
          status: targetStatus,
          mapId: SINGLE_MAP_ID,
      };
      
      const targetDocRef = doc(firestore, 'operation_targets', newTarget.id);
      setDocumentNonBlocking(targetDocRef, newTarget);

      toast({
          title: "Hədəf Yaradıldı",
          description: `"${targetName}" adlı yeni hədəf yaradıldı və "${units?.find(u => u.id === assignedUnitId)?.name}" bölüyünə təyin edildi.`
      });
    }


    // Reset and close dialog
    setIsTargetDialogOpen(false);
    setEditingTarget(null);
    setTargetName('');
    setAssignedUnitId('');
    setTargetCoordinates(null);
    setTargetStatus('pending');
  };
  
  const handleStartOperation = async () => {
    if (!firestore || !targets) return;

    const activeTargets = targets.filter(t => t.status === 'active');
    if (activeTargets.length === 0) {
        toast({
            title: "Aktiv Hədəf Yoxdur",
            description: "Şifrələmə üçün ən az bir 'aktiv' statuslu hədəf olmalıdır.",
        });
        return;
    }
    
    setEncryptionStep(0);
    setIsEncrypting(true);
    
    // Simulate step-by-step encryption for the UI panel
    const stepInterval = setInterval(() => {
        setEncryptionStep(prev => {
            if (prev >= 6) {
                clearInterval(stepInterval);
                setIsEncrypting(false);
                return prev;
            }
            return prev + 1;
        });
    }, 700);


    toast({
      title: 'Əməliyyat Başladı',
      description: `${activeTargets.length} aktiv hədəf üçün yem koordinatları yaradılır...`,
    });

    try {
        // Clear all previous decoys first
        const oldDecoysQuery = collection(firestore, 'decoys');
        const oldDecoysSnapshot = await getDocs(oldDecoysQuery);
        const deleteBatch = writeBatch(firestore);
        oldDecoysSnapshot.forEach(doc => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();
        
        const decoyPromises = activeTargets.map(async (target, index) => {
            const decoyInput: GenerateStrategicDecoysInput = {
                latitude: target.latitude,
                longitude: target.longitude,
                terrainType: 'mountainous', // Can be made dynamic
                proximityToPopulatedAreas: 'low', // Can be made dynamic
                knownEnemyPatrolRoutes: 'None reported', // Can be made dynamic
                radiusKm: 15
            };
            const decoyResult = await generateStrategicDecoys(decoyInput);
            
            const publicNames = ["Alfa", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"];
            
            const newDecoy: Decoy = {
                id: uuidv4(),
                publicName: `Bölük ${publicNames[index % publicNames.length]}`,
                latitude: decoyResult.decoyLatitude,
                longitude: decoyResult.decoyLongitude,
                operationTargetId: target.id,
            };
            
            const decoyDocRef = doc(firestore, 'decoys', newDecoy.id);
            return setDocumentNonBlocking(decoyDocRef, newDecoy, { merge: false });
        });

        await Promise.all(decoyPromises);

        toast({
            title: 'Əməliyyat Uğurlu Oldu',
            description: `${activeTargets.length} yeni yem koordinatı yaradıldı və yayıma göndərildi.`,
        });

    } catch (error) {
        console.error('Error starting operation:', error);
        toast({
            variant: 'destructive',
            title: 'Əməliyyat Xətası',
            description: 'Yem koordinatları yaradılarkən problem baş verdi.',
        });
        clearInterval(stepInterval); // Stop animation on error
        setIsEncrypting(false);
    } 
  };

  const handleEditTargetClick = (target: OperationTarget) => {
    setEditingTarget(target);
    setTargetName(target.name);
    setAssignedUnitId(target.assignedUnitId);
    setTargetStatus(target.status);
    setTargetCoordinates(null); // Not changing coordinates on edit
    setIsTargetDialogOpen(true);
  };
  
  const handleDeleteTargetClick = (target: OperationTarget) => {
     setTargetToDelete(target);
  }

  const confirmDeleteTarget = async () => {
    if (!targetToDelete || !firestore) return;

    try {
        const batch = writeBatch(firestore);
        
        // Delete the target
        const targetDocRef = doc(firestore, 'operation_targets', targetToDelete.id);
        batch.delete(targetDocRef);
        
        // No need to delete associated decoys as they are cleared at the start of each operation
        
        await batch.commit();

        toast({
            title: "Hədəf Silindi",
            description: `"${targetToDelete.name}" adlı hədəf silindi.`
        });
    } catch (error) {
        console.error("Error deleting target:", error);
        toast({
            variant: "destructive",
            title: "Silmə Xətası",
            description: "Hədəf silinərkən bir problem yarandı."
        });
    } finally {
        setTargetToDelete(null);
    }
  };


  const getTargetClasses = (status: OperationTarget['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-500';
      case 'passive':
        return 'text-red-500';
      case 'pending':
      default:
        return 'text-blue-400';
    }
  };

  const staticReasoningText = `[SİSTEM] Əməliyyat gözlənilir...

1. Collatz Qarışdırması
→ İlkin koordinat emal edilir...
→ Nəticə: Gizlədilib

2. Prime-Jump Şifrələməsi
→ Sadə ədəd cədvəli tətbiq edilir...
→ Nəticə: Gizlədilib

3. Fibonaççi Spiralı
→ Spiral ofset tətbiq edilir...
→ Nəticə: Gizlədilib

4. Lehmer RNG Sürüşdürməsi
→ Təsadüfi sürüşdürmə tətbiq edilir...
→ Nəticə: Gizlədilib

5. Kvant Geo-Sürüşdürmə
→ Yekun təhlükəsizlik layı tətbiq edildi.
→ Yem koordinatı: TƏSDİQLƏNDİ

[SİSTEM] Proses tamamlandı. Yem yayıma hazırdır.`;


  return (
    <div className="h-screen w-full flex flex-col p-4 gap-4">
      <div className="flex-shrink-0 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Əməliyyat Xəritəsi</h1>
        <div className="flex items-center gap-2">
          {isCommander && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsMapImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Xəritəni Dəyişdir
              </Button>
              <Button size="sm" onClick={handleStartOperation} disabled={isEncrypting}>
                <Bot className="mr-2 h-4 w-4" />
                {isEncrypting ? 'Əməliyyat Gedir...' : 'Əməliyyata Başla'}
              </Button>
            </>
          )}
        </div>
      </div>
      <Card className="flex-grow w-full border-primary/20">
        <CardContent className="p-2 h-full">
          <TooltipProvider>
            <div className="relative w-full h-full rounded-md overflow-hidden bg-muted" onClick={handleMapClick}>
              <Image
                src={mapUrl}
                alt="Ümumi əməliyyat xəritəsi"
                fill
                className="object-cover"
                unoptimized
              />
              {/* Render Units */}
              {units?.map((unit) => (
                <Tooltip key={unit.id}>
                  <TooltipTrigger asChild>
                    <div className="absolute" style={{ top: `${unit.latitude}%`, left: `${unit.longitude}%` }} data-interactive onClick={(e) => e.stopPropagation()}>
                      <Shield className="w-8 h-8 text-white fill-blue-500/50 stroke-2" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Bölük: {unit.name}</p>
                    <p className='text-muted-foreground'>Status: {unit.status}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {/* Render Targets */}
              {targets?.map((target) => (
                 <div key={target.id} className="absolute" style={{ top: `${target.latitude}%`, left: `${target.longitude}%` }} data-interactive>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button onClick={(e) => e.stopPropagation()}>
                           <Target className={`w-8 h-8 ${getTargetClasses(target.status)} cursor-pointer`} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem disabled>
                            <div>
                                <p className="font-semibold">Hədəf: {target.name}</p>
                                <p className='text-muted-foreground text-xs'>Bölük: {units?.find(u => u.id === target.assignedUnitId)?.name ?? 'Naməlum'}</p>
                                <p className='text-muted-foreground text-xs capitalize'>Status: {target.status}</p>
                            </div>
                          </DropdownMenuItem>
                        {isCommander && (
                            <>
                                <DropdownMenuItem onSelect={() => handleEditTargetClick(target)}>
                                  <Edit size={14} className="mr-2" /> Redaktə et
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleDeleteTargetClick(target)} className="text-destructive focus:text-destructive">
                                  <Trash2 size={14} className="mr-2" /> Sil
                                </DropdownMenuItem>
                            </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
              ))}
               {/* Render Decoys */}
              {decoys?.map((decoy) => (
                 <Tooltip key={decoy.id}>
                    <TooltipTrigger asChild>
                      <div className="absolute" style={{ top: `${decoy.latitude}%`, left: `${decoy.longitude}%`, transform: 'translate(-50%, -50%)' }} data-interactive onClick={(e) => e.stopPropagation()}>
                        <div className="relative w-6 h-6">
                            <div className="absolute inset-0 bg-red-600 rounded-full pulse-anim"></div>
                            <div className="absolute inset-1 bg-red-400 rounded-full"></div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent data-interactive className="font-mono text-xs whitespace-pre-wrap max-w-sm">
                        <p className='font-bold text-red-400'>Yem Hədəf: {decoy.publicName}</p>
                        {isCommander && (
                          <div className='mt-2 pt-2 border-t border-border'>
                              <p className='font-semibold text-sm mb-1'>Şifrələnmə Jurnalı:</p>
                              <div className='text-muted-foreground'>{staticReasoningText}</div>
                          </div>
                        )}
                    </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
      
      {/* Map Import Dialog */}
      <Dialog open={isMapImportOpen} onOpenChange={setIsMapImportOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Xəritə İdxal Et</DialogTitle>
                <DialogDescription>
                    Yeni xəritə üçün bir şəkil URL-i daxil edin. Bu xəritə brauzerinizin yaddaşında saxlanacaq.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
                <Label htmlFor="map-url">Xəritə URL</Label>
                <Input 
                    id="map-url"
                    placeholder="https://example.com/map.jpg"
                    value={tempMapUrl}
                    onChange={(e) => setTempMapUrl(e.target.value)}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsMapImportOpen(false)}>Ləğv et</Button>
                <Button onClick={handleSaveCustomMap}>Yadda Saxla</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New/Edit Target Dialog */}
      <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTarget ? 'Hədəfi Redaktə Et' : 'Yeni Hədəf Təyin Et'}</DialogTitle>
            <DialogDescription>
              {editingTarget ? 'Hədəfin məlumatlarını yeniləyin.' : 'Xəritədə seçdiyiniz nöqtəyə ad verin, status təyin edin və onu bir bölüyə təyin edin.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="target-name" className="text-right">
                Hədəf Adı
              </Label>
              <Input
                id="target-name"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="col-span-3"
                placeholder="Məs. Alfa Nöqtəsi"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="target-status" className="text-right">
                Status
              </Label>
              <Select onValueChange={(v) => setTargetStatus(v as OperationTarget['status'])} value={targetStatus}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Status seçin..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="pending">Gözləmədə</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="passive">Passiv</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit-select" className="text-right">
                Bölük Seçin
              </Label>
              <Select onValueChange={setAssignedUnitId} value={assignedUnitId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Təyin olunacaq bölüyü seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingUnits ? (
                    <SelectItem value="loading" disabled>Yüklənir...</SelectItem>
                  ) : (
                    units?.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTargetDialogOpen(false)}>Ləğv Et</Button>
            <Button onClick={handleSaveTarget}>{editingTarget ? 'Yenilə' : 'Təyin Et'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Target Confirmation Dialog */}
      <AlertDialog open={!!targetToDelete} onOpenChange={(open) => !open && setTargetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Silməni Təsdiqlə</AlertDialogTitle>
            <AlertDialogDescription>
              "{targetToDelete?.name}" adlı hədəfi silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTargetToDelete(null)}>Ləğv Et</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTarget} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Bəli, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
