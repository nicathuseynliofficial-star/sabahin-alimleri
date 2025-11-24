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


  // Fetch units and targets from Firestore
  const unitsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    if (user.role === 'commander') {
      return collection(firestore, 'military_units');
    }
    // Sub-commanders see all if they have the perm, else only their own.
    if (user.canSeeAllUnits) {
       return collection(firestore, 'military_units');
    }
    if (user.assignedUnitId) {
        return query(collection(firestore, 'military_units'), where('id', '==', user.assignedUnitId));
    }
    return null;
  }, [firestore, user]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<MilitaryUnit>(unitsQuery);

  const targetsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
     if (user.role === 'commander') {
      return collection(firestore, 'operation_targets');
    }
     // Sub-commanders see all targets if they can see all units
    if (user.canSeeAllUnits) {
       return collection(firestore, 'operation_targets');
    }
    // Otherwise, they see targets assigned to their unit
    if (user.assignedUnitId) {
        return query(collection(firestore, 'operation_targets'), where('assignedUnitId', '==', user.assignedUnitId));
    }
    return null;
  }, [firestore, user]);
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

    const newTarget: OperationTarget = {
        id: uuidv4(),
        name: targetName,
        assignedUnitId: assignedUnitId,
        location: {
            lat: targetCoordinates.y, // Using percentage as lat/lng for placeholder
            lng: targetCoordinates.x,
        },
        status: 'pending'
    };

    const targetsCollection = collection(firestore, 'operation_targets');
    addDocumentNonBlocking(targetsCollection, newTarget);

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
            <div className="relative w-full h-full rounded-md overflow-hidden bg-muted" onClick={handleMapClick}>
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
                    <div className="absolute" style={{ top: `${unit.location.lat}%`, left: `${unit.location.lng}%` }}>
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
                    <div className="absolute" style={{ top: `${target.location.lat}%`, left: `${target.location.lng}%` }}>
                      <Target className={`w-8 h-8 animate-pulse ${
                          isCommander ? 'text-blue-400' : 'text-green-400'
                        }`} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                     <p>Hədəf: {target.name}</p>
                    <p className='text-muted-foreground'>Bölük: {units?.find(u => u.id === target.assignedUnitId)?.name}</p>
                     {isCommander && <Button size="sm" className="mt-2 w-full bg-accent text-accent-foreground">Hədəfi Şifrələ</Button>}
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
