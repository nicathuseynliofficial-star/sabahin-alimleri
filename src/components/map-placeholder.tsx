"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Map, Shield, Target, Upload, Dot, Bot, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, where, doc, getDocs, writeBatch } from 'firebase/firestore';
import type { MilitaryUnit, OperationTarget, Decoy } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { generateStrategicDecoys, type GenerateStrategicDecoysInput } from '@/ai/flows/generate-strategic-decoys';


type ClickCoordinates = {
    x: number;
    y: number;
} | null;

const SINGLE_MAP_ID = 'main';

export default function MapPlaceholder() {
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
  
  // State for decoy generation
  const [isEncrypting, setIsEncrypting] = useState(false);
  
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
      const q = collection(firestore, 'operation_targets');

      if (user.role === 'sub-commander' && !user.canSeeAllUnits && user.assignedUnitId) {
          return query(q, where('assignedUnitId', '==', user.assignedUnitId));
      }
      return q;
  }, [firestore, user]);
  
  const targetsQuery = useMemoFirebase(() => {
      if (!targetsBaseQuery) return null;
      return targetsBaseQuery;
  }, [targetsBaseQuery]);

  const { data: targets } = useCollection<OperationTarget>(targetsQuery);


  useEffect(() => {
    const storedMapUrl = localStorage.getItem('mainMapUrl');
    const defaultMap = PlaceHolderImages.find(img => img.id === 'azerbaijan-map')?.imageUrl;
    if (storedMapUrl) {
      setMapUrl(storedMapUrl);
    } else if (defaultMap) {
      setMapUrl(defaultMap);
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
      updateDocumentNonBlocking(targetDocRef, {
        name: targetName,
        assignedUnitId: assignedUnitId,
        status: targetStatus,
      });
      toast({
        title: "Hədəf Yeniləndi",
        description: `"${targetName}" adlı hədəf məlumatları yeniləndi.`
      });
    } else if (targetCoordinates) {
      // Create new target
       const newTarget: Omit<OperationTarget, 'id'> = {
          name: targetName,
          assignedUnitId: assignedUnitId,
          latitude: targetCoordinates.y,
          longitude: targetCoordinates.x,
          status: targetStatus,
          mapId: SINGLE_MAP_ID,
      };
      
      const targetWithId = { ...newTarget, id: uuidv4() };

      const targetsCollection = collection(firestore, 'operation_targets');
      const targetDocRef = doc(targetsCollection, targetWithId.id);
      setDocumentNonBlocking(targetDocRef, targetWithId);

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

    setIsEncrypting(true);
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
            const newDecoy: Omit<Decoy, 'id'> = {
                publicName: `Bölük ${publicNames[index % publicNames.length]}`,
                latitude: decoyResult.decoyLatitude,
                longitude: decoyResult.decoyLongitude,
                reasoning: decoyResult.reasoning,
                originalTargetId: target.id,
                timestamp: new Date()
            };
            
            const decoyWithId = { ...newDecoy, id: uuidv4() };
            const decoyDocRef = doc(firestore, 'decoys', decoyWithId.id);
            return setDocumentNonBlocking(decoyDocRef, decoyWithId, { merge: false });
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
    } finally {
        setIsEncrypting(false);
    }
  };

  const handleEditTargetClick = (e: React.MouseEvent, target: OperationTarget) => {
    e.stopPropagation();
    setEditingTarget(target);
    setTargetName(target.name);
    setAssignedUnitId(target.assignedUnitId);
    setTargetStatus(target.status);
    setTargetCoordinates(null); // Not changing coordinates on edit
    setIsTargetDialogOpen(true);
  };
  
  const handleDeleteTargetClick = async (e: React.MouseEvent, target: OperationTarget) => {
     e.stopPropagation();
     if (!firestore) return;
     const confirmation = confirm(`"${target.name}" adlı hədəfi silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`);
     if (confirmation) {
        // Delete the target
        const targetDocRef = doc(firestore, 'operation_targets', target.id);
        deleteDocumentNonBlocking(targetDocRef);
        
        // Also delete any associated decoys
        const decoysToDeleteQuery = query(collection(firestore, 'decoys'), where('originalTargetId', '==', target.id));
        const decoysSnapshot = await getDocs(decoysToDeleteQuery);
        const deleteBatch = writeBatch(firestore);
        decoysSnapshot.forEach(decoyDoc => {
            deleteBatch.delete(decoyDoc.ref);
        });
        await deleteBatch.commit();

        toast({
            title: "Hədəf Silindi",
            description: `"${target.name}" adlı hədəf və əlaqəli yemlər silindi.`
        });
     }
  }


  const getTargetClasses = (target: OperationTarget) => {
    let colorClass = '';
    switch (target.status) {
      case 'active':
        colorClass = 'text-green-500';
        break;
      case 'passive':
        colorClass = 'text-red-500';
        break;
      case 'pending':
      default:
        colorClass = 'text-blue-400';
        break;
    }
    
    return colorClass;
  };


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
            <div className="relative w-full h-full rounded-md overflow-hidden bg-muted" onClick={isCommander ? handleMapClick : undefined}>
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
                    <div className="absolute" style={{ top: `${unit.latitude}%`, left: `${unit.longitude}%` }} data-interactive>
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
                 <Tooltip key={target.id}>
                    <TooltipTrigger asChild>
                        <div className="absolute" style={{ top: `${target.latitude}%`, left: `${target.longitude}%` }} data-interactive onClick={(e) => e.stopPropagation()}>
                            <Target className={`w-8 h-8 ${getTargetClasses(target)}`} />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent className="p-0" data-interactive onClick={(e) => e.stopPropagation()}>
                      <div className='p-2'>
                        <p>Hədəf: {target.name}</p>
                        <p className='text-muted-foreground'>Bölük: {units?.find(u => u.id === target.assignedUnitId)?.name ?? 'Naməlum'}</p>
                         <p className='text-muted-foreground capitalize'>Status: {target.status}</p>
                      </div>
                        {isCommander && (
                          <div className='flex items-center border-t mt-1 p-1'>
                            <Button variant="ghost" size="sm" className="w-full justify-start gap-1" onClick={(e) => handleEditTargetClick(e, target)}>
                              <Edit size={14} /> Redaktə et
                            </Button>
                            <Button variant="ghost" size="sm" className="w-full justify-start gap-1 text-destructive hover:text-destructive" onClick={(e) => handleDeleteTargetClick(e, target)}>
                              <Trash2 size={14} /> Sil
                            </Button>
                          </div>
                        )}
                    </TooltipContent>
                </Tooltip>
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
                    <TooltipContent data-interactive>
                        <p className='font-bold text-red-400'>Yem Hədəf (Decoy)</p>
                        <p className='text-muted-foreground'>Ad: {decoy.publicName}</p>
                        {isCommander && (
                          <div className='mt-2 pt-2 border-t border-border'>
                              <p className='font-semibold text-xs mb-1'>Necə Şifrələndi:</p>
                              <p className='text-muted-foreground max-w-xs text-xs'>{decoy.reasoning}</p>
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
    </div>
  );
}
