"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Map, Shield, Target, Upload, Dot } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, where, doc } from 'firebase/firestore';
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
  const [secureMode, setSecureMode] = useState(true);
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const isCommander = user?.role === 'commander';
  
  const [mapUrl, setMapUrl] = useState(PlaceHolderImages.find(img => img.id === 'azerbaijan-map')?.imageUrl ?? PlaceHolderImages[0].imageUrl);
  const [tempMapUrl, setTempMapUrl] = useState('');
  const [isMapImportOpen, setIsMapImportOpen] = useState(false);

  // State for the new target dialog
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [targetCoordinates, setTargetCoordinates] = useState<ClickCoordinates>(null);
  const [targetName, setTargetName] = useState('');
  const [assignedUnitId, setAssignedUnitId] = useState('');
  const [targetStatus, setTargetStatus] = useState<OperationTarget['status']>('pending');
  
  // State for decoy generation
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [selectedTargetForDecoy, setSelectedTargetForDecoy] = useState<OperationTarget | null>(null);

  // Listen to the 'latest' decoy document
  const latestDecoyDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'decoys', 'latest');
  }, [firestore]);
  const { data: latestDecoy, isLoading: isLoadingDecoy } = useDoc<Decoy>(latestDecoyDocRef);


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
      return query(targetsBaseQuery, where('mapId', '==', SINGLE_MAP_ID));
  }, [targetsBaseQuery]);

  const { data: targets, isLoading: isLoadingTargets } = useCollection<OperationTarget>(targetsQuery);


  useEffect(() => {
    const storedMapUrl = localStorage.getItem('mainMapUrl');
    if (storedMapUrl) {
      setMapUrl(storedMapUrl);
    }
  }, []);

  const handleSaveCustomMap = () => {
    setMapUrl(tempMapUrl);
    localStorage.setItem('mainMapUrl', tempMapUrl);
    setIsMapImportOpen(false);
    setTempMapUrl('');
  };


  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCommander) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setTargetCoordinates({ x, y });
    setIsTargetDialogOpen(true);
  };

  const handleCreateTarget = () => {
    if (!targetName || !assignedUnitId || !targetCoordinates || !firestore) {
         toast({
            variant: "destructive",
            title: "Xəta",
            description: "Hədəf adı, status və bölük seçilməlidir.",
        });
        return;
    }

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
    addDocumentNonBlocking(targetsCollection, targetWithId);

    toast({
        title: "Hədəf Yaradıldı",
        description: `"${targetName}" adlı yeni hədəf yaradıldı və "${units?.find(u => u.id === assignedUnitId)?.name}" bölüyünə təyin edildi.`
    });

    // Reset and close dialog
    setIsTargetDialogOpen(false);
    setTargetName('');
    setAssignedUnitId('');
    setTargetCoordinates(null);
    setTargetStatus('pending');
  };
  
  const handleEncryptTarget = async (target: OperationTarget) => {
    if (!firestore) return;
    setSelectedTargetForDecoy(target);
    setIsEncrypting(true);

    try {
        const decoyInput: GenerateStrategicDecoysInput = {
            latitude: target.latitude,
            longitude: target.longitude,
            terrainType: 'mountainous', // This can be made dynamic later
            proximityToPopulatedAreas: 'low', // This can be made dynamic later
            knownEnemyPatrolRoutes: 'None reported', // This can be made dynamic later
            radiusKm: 10
        };

        const decoyResult = await generateStrategicDecoys(decoyInput);

        const newDecoy = {
            id: 'latest', // Static ID for the document
            latitude: decoyResult.decoyLatitude,
            longitude: decoyResult.decoyLongitude,
            reasoning: decoyResult.reasoning,
            originalTargetId: target.id,
            timestamp: new Date()
        };

        const decoyDocRef = doc(firestore, 'decoys', 'latest');
        setDocumentNonBlocking(decoyDocRef, newDecoy, { merge: false });

        toast({
            title: 'Şifrələmə Uğurlu Oldu',
            description: `Yeni yem koordinatı yaradıldı və yayıma göndərildi.`,
        });
    } catch (error) {
        console.error('Error generating decoy:', error);
        toast({
            variant: 'destructive',
            title: 'Şifrələmə Xətası',
            description: 'Yem koordinatı yaradılarkən problem baş verdi.',
        });
    } finally {
        setIsEncrypting(false);
        setSelectedTargetForDecoy(null);
    }
  };

  const getTargetClasses = (target: OperationTarget) => {
    const isEncryptingTarget = isEncrypting && selectedTargetForDecoy?.id === target.id;
    if (isEncryptingTarget) {
      return 'animate-ping text-yellow-400';
    }

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
    
    // Commanders see pulsing targets, sub-commanders see static ones unless they can see all
    if (isCommander || (user?.role === 'sub-commander' && user.canSeeAllUnits)) {
        return `${colorClass} animate-pulse`;
    }
    
    return colorClass;
  };


  return (
    <div className="h-screen w-full flex flex-col p-4 gap-4">
      <div className="flex-shrink-0 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Əməliyyat Xəritəsi</h1>
        <div className="flex items-center gap-6">
          <Button variant="outline" size="sm" onClick={() => setIsMapImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Xəritəni Dəyişdir
          </Button>
          <div className="flex items-center space-x-2">
            <Switch id="secure-mode" checked={secureMode} onCheckedChange={setSecureMode} />
            <Label htmlFor="secure-mode" className="text-accent font-medium">
              Secure Mode
            </Label>
          </div>
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
                    <div className="absolute" style={{ top: `${unit.latitude}%`, left: `${unit.longitude}%` }}>
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
                        <div className="absolute" style={{ top: `${target.latitude}%`, left: `${target.longitude}%` }}>
                            <Target className={`w-8 h-8 ${getTargetClasses(target)}`} />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Hədəf: {target.name}</p>
                        <p className='text-muted-foreground'>Bölük: {units?.find(u => u.id === target.assignedUnitId)?.name ?? 'Naməlum'}</p>
                         <p className='text-muted-foreground capitalize'>Status: {target.status}</p>
                        {isCommander && (
                        <Button 
                            size="sm" 
                            className="mt-2 w-full bg-accent text-accent-foreground"
                            onClick={() => handleEncryptTarget(target)}
                            disabled={isEncrypting}
                        >
                            {isEncrypting && selectedTargetForDecoy?.id === target.id ? 'Şifrələnir...' : 'Hədəfi Şifrələ'}
                        </Button>
                        )}
                    </TooltipContent>
                </Tooltip>
              ))}
               {/* Render Latest Decoy */}
              {latestDecoy && (
                 <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="absolute" style={{ top: `${latestDecoy.latitude}%`, left: `${latestDecoy.longitude}%`, transform: 'translate(-50%, -50%)' }}>
                        <div className="relative w-6 h-6">
                            <div className="absolute inset-0 bg-red-600 rounded-full pulse-anim"></div>
                            <div className="absolute inset-1 bg-red-400 rounded-full"></div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className='font-bold text-red-400'>Yem Hədəf (Decoy)</p>
                        <p className='text-muted-foreground max-w-xs'>Səbəb: {latestDecoy.reasoning}</p>
                    </TooltipContent>
                </Tooltip>
              )}
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
      
      {/* New Target Dialog */}
      <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Hədəf Təyin Et</DialogTitle>
            <DialogDescription>
              Xəritədə seçdiyiniz nöqtəyə ad verin, status təyin edin və onu bir bölüyə təyin edin.
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
            <Button onClick={handleCreateTarget}>Təyin Et</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
