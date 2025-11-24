"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Map, Shield, Target, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth-provider';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, where } from 'firebase/firestore';
import type { MilitaryUnit, OperationTarget } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { generateStrategicDecoys, type GenerateStrategicDecoysInput } from '@/ai/flows/generate-strategic-decoys';


type MapMode = 'azerbaijan' | 'karabakh' | 'custom';

type ClickCoordinates = {
    x: number;
    y: number;
} | null;


export default function MapPlaceholder() {
  const [mapMode, setMapMode] = useState<MapMode>('azerbaijan');
  const [secureMode, setSecureMode] = useState(true);
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const isCommander = user?.role === 'commander';
  
  const [customMapUrl, setCustomMapUrl] = useState('');
  const [tempCustomMapUrl, setTempCustomMapUrl] = useState('');
  const [isMapImportOpen, setIsMapImportOpen] = useState(false);

  // State for the new target dialog
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [targetCoordinates, setTargetCoordinates] = useState<ClickCoordinates>(null);
  const [targetName, setTargetName] = useState('');
  const [assignedUnitId, setAssignedUnitId] = useState('');
  
  // State for decoy generation
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [selectedTargetForDecoy, setSelectedTargetForDecoy] = useState<OperationTarget | null>(null);


  // Base query for units
  const unitsBaseQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const q = collection(firestore, 'military_units');

    // For sub-commanders without full visibility, only query for their own unit.
    if (user.role === 'sub-commander' && !user.canSeeAllUnits && user.assignedUnitId) {
        return query(q, where('id', '==', user.assignedUnitId));
    }
    // For commanders or sub-commanders with full visibility, we start with the full collection.
    // The filtering by mapId will happen in the derived query.
    return q;
  }, [firestore, user]);

  // Derived query for units, filtered by the current mapMode
  const unitsQuery = useMemoFirebase(() => {
      if (!unitsBaseQuery) return null;
      // This query will only fetch units that match the current mapId
      return query(unitsBaseQuery, where('mapId', '==', mapMode));
  }, [unitsBaseQuery, mapMode]);

  const { data: units, isLoading: isLoadingUnits } = useCollection<MilitaryUnit>(unitsQuery);

  // Base query for targets
  const targetsBaseQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      const q = collection(firestore, 'operation_targets');

      // If sub-commander without full visibility, only query targets assigned to their unit.
      if (user.role === 'sub-commander' && !user.canSeeAllUnits && user.assignedUnitId) {
          return query(q, where('assignedUnitId', '==', user.assignedUnitId));
      }
      // Commanders or sub-commanders with full visibility get all targets for the given map.
      return q;
  }, [firestore, user]);
  
  // Derived query for targets, filtered by current mapMode
  const targetsQuery = useMemoFirebase(() => {
      if (!targetsBaseQuery) return null;
      return query(targetsBaseQuery, where('mapId', '==', mapMode));
  }, [targetsBaseQuery, mapMode]);

  const { data: targets, isLoading: isLoadingTargets } = useCollection<OperationTarget>(targetsQuery);


  useEffect(() => {
    const storedMapUrl = localStorage.getItem('customMapUrl');
    const storedMapMode = localStorage.getItem('mapMode') as MapMode;
    if (storedMapUrl) {
      setCustomMapUrl(storedMapUrl);
    }
    if (storedMapMode) {
      setMapMode(storedMapMode);
    }
  }, []);

  const handleSaveCustomMap = () => {
    setCustomMapUrl(tempCustomMapUrl);
    localStorage.setItem('customMapUrl', tempCustomMapUrl);
    setMapMode('custom');
    localStorage.setItem('mapMode', 'custom');
    setIsMapImportOpen(false);
  };

  const handleMapModeChange = (value: string) => {
    const newMode = value as MapMode;
    setMapMode(newMode);
    localStorage.setItem('mapMode', newMode);
  }

  const mapImageSrc = () => {
    if (mapMode === 'custom' && customMapUrl) {
      return customMapUrl;
    }
    const selectedMap = PlaceHolderImages.find(
      (img) => img.id === (mapMode === 'azerbaijan' ? 'azerbaijan-map' : 'karabakh-map')
    );
    return selectedMap?.imageUrl ?? PlaceHolderImages[0].imageUrl;
  }
  
  const mapImageAlt = () => {
     if (mapMode === 'custom') {
      return 'Custom imported map';
    }
    const selectedMap = PlaceHolderImages.find(
      (img) => img.id === (mapMode === 'azerbaijan' ? 'azerbaijan-map' : 'karabakh-map')
    );
    return selectedMap?.description ?? 'Map';
  }


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
            description: "Hədəf adı və bölük seçilməlidir.",
        });
        return;
    }

    const newTarget: Omit<OperationTarget, 'id'> = {
        name: targetName,
        assignedUnitId: assignedUnitId,
        latitude: targetCoordinates.y,
        longitude: targetCoordinates.x,
        status: 'pending',
        mapId: mapMode,
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
            latitude: decoyResult.decoyLatitude,
            longitude: decoyResult.decoyLongitude,
            reasoning: decoyResult.reasoning,
            originalTargetId: target.id,
            timestamp: new Date()
        };

        const decoysCollection = collection(firestore, 'decoys');
        // Setting a specific document ID for the public view to listen to
        const latestDecoyDoc = doc(decoysCollection, 'latest');
        setDocumentNonBlocking(latestDecoyDoc, newDecoy, { merge: false });

        toast({
            title: 'Şifrələmə Uğurlu Oldu',
            description: `Yeni yem koordinatı yaradıldı və ictimai yayıma göndərildi.`,
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


  return (
    <div className="h-screen w-full flex flex-col p-4 gap-4">
      <div className="flex-shrink-0 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Əməliyyat Xəritəsi</h1>
        <div className="flex items-center gap-6">
          <RadioGroup value={mapMode} onValueChange={handleMapModeChange} className="flex items-center gap-4">
            <Label htmlFor="map-azerbaijan" className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="azerbaijan" id="map-azerbaijan" />
              Ümumi Xəritə
            </Label>
            <Label htmlFor="map-karabakh" className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="karabakh" id="map-karabakh" />
              Qarabağ
            </Label>
             {customMapUrl && (
              <Label htmlFor="map-custom" className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="custom" id="map-custom" />
                İdxal edilmiş
              </Label>
            )}
          </RadioGroup>
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
                src={mapImageSrc()}
                alt={mapImageAlt()}
                fill
                className="object-cover"
                unoptimized={mapMode === 'custom'}
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
                            <Target className={`w-8 h-8 ${isEncrypting && selectedTargetForDecoy?.id === target.id ? 'animate-ping text-yellow-400' : isCommander ? 'text-blue-400 animate-pulse' : 'text-green-400 animate-pulse'}`} />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Hədəf: {target.name}</p>
                        <p className='text-muted-foreground'>Bölük: {units?.find(u => u.id === target.assignedUnitId)?.name ?? 'Naməlum'}</p>
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
                    value={tempCustomMapUrl}
                    onChange={(e) => setTempCustomMapUrl(e.target.value)}
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
              Xəritədə seçdiyiniz nöqtəyə ad verin və onu bir bölüyə təyin edin.
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
