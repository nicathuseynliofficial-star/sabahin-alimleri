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

type MapMode = 'azerbaijan' | 'karabakh' | 'custom';

export default function MapPlaceholder() {
  const [mapMode, setMapMode] = useState<MapMode>('azerbaijan');
  const [secureMode, setSecureMode] = useState(true);
  const { user } = useAuth();
  const isCommander = user?.role === 'commander';
  
  const [customMapUrl, setCustomMapUrl] = useState('');
  const [tempCustomMapUrl, setTempCustomMapUrl] = useState('');
  const [isMapImportOpen, setIsMapImportOpen] = useState(false);

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


  // Placeholder data for units and targets
  const [units, setUnits] = useState([
    { id: 'unit1', name: 'Qartal', location: { top: '30%', left: '40%' } },
    { id: 'unit2', name: 'Şahin', location: { top: '60%', left: '70%' } },
  ]);
  const [targets, setTargets] = useState([
    { id: 'target1', name: 'Hədəf Alfa', location: { top: '50%', left: '50%' }, assignedUnitId: 'unit1' },
  ]);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCommander) return;
    // In a real app, open a dialog here to create a new target.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    console.log(`Commander clicked at ${x.toFixed(2)}%, ${y.toFixed(2)}%`);
    // Example: setDialogState({ open: true, location: { lat: ..., lng: ... }})
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
              {units.map((unit) => (
                <Tooltip key={unit.id}>
                  <TooltipTrigger asChild>
                    <div className="absolute" style={{ top: unit.location.top, left: unit.location.left }}>
                      <Shield className="w-8 h-8 text-white fill-blue-500/50 stroke-2" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Bölük: {unit.name}</p>
                    <p className='text-muted-foreground'>Status: {secureMode ? 'Əməliyyatda' : 'Encrypted ••••'}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {/* Render Targets */}
              {targets.map((target) => (
                <Tooltip key={target.id}>
                  <TooltipTrigger asChild>
                    <div className="absolute" style={{ top: target.location.top, left: target.location.left }}>
                      <Target className={`w-8 h-8 animate-pulse ${
                          isCommander ? 'text-blue-400' : 'text-green-400'
                        }`} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                     <p>Hədəf: {target.name}</p>
                    <p className='text-muted-foreground'>Bölük: {units.find(u => u.id === target.assignedUnitId)?.name}</p>
                     {isCommander && <Button size="sm" className="mt-2 w-full bg-accent text-accent-foreground">Hədəfi Şifrələ</Button>}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
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
    </div>
  );
}
