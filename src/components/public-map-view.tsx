'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Decoy } from '@/lib/types';
import { Skeleton } from './ui/skeleton';

export default function PublicMapView() {
  const [decoy, setDecoy] = useState<Decoy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'decoys', 'latest'), (doc) => {
      if (doc.exists()) {
        setDecoy(doc.data() as Decoy);
      } else {
        setDecoy(null);
      }
      setLoading(false);
    }, (error) => {
        console.error("Error fetching decoy:", error);
        setLoading(false);
    });

    return () => unsub();
  }, []);

  const mapImage = PlaceHolderImages.find((img) => img.id === 'azerbaijan-map');

  // Dummy position for decoy on the map.
  // In a real app, this would be calculated based on lat/lng relative to map bounds.
  const [decoyPosition, setDecoyPosition] = useState({ top: '0%', left: '0%' });

  useEffect(() => {
    if (decoy) {
        // Create a pseudo-random but consistent position based on coords
        const lat = decoy.location.lat || 40.4093;
        const lng = decoy.location.lng || 49.8671;
        const top = (Math.abs(Math.sin(lat) * 100)) % 70 + 15; // 15-85%
        const left = (Math.abs(Math.sin(lng) * 100)) % 80 + 10; // 10-90%
        setDecoyPosition({ top: `${top}%`, left: `${left}%` });
    }
  }, [decoy]);

  return (
    <Card className="w-full bg-card border-border shadow-2xl shadow-primary/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-headline text-primary-foreground">
          GeoGuard İctimai Yayım
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-sm font-medium text-red-400 uppercase tracking-wider">
            CANLI YAYIM
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full aspect-[3/2] overflow-hidden rounded-md border-2 border-border bg-muted">
          {mapImage ? (
            <Image
              src={mapImage.imageUrl}
              alt={mapImage.description}
              fill
              className="object-cover"
              data-ai-hint={mapImage.imageHint}
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p>Xəritə yüklənir...</p>
            </div>
          )}

          {loading ? (
             <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-white">Məlumatlar yoxlanılır...</p>
                    <Skeleton className='w-48 h-4 mx-auto' />
                </div>
             </div>
          ) : !decoy ? (
             <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <p className="text-white">Hal-hazırda aktiv yem mövqeyi yoxdur.</p>
             </div>
          ) : (
            <div
              className="absolute transition-all duration-1000"
              style={{ top: decoyPosition.top, left: decoyPosition.left, transform: 'translate(-50%, -50%)' }}
              title={`Yem mövqeyi: ${decoy.reasoning.substring(0, 100)}...`}
            >
              <div className="relative w-6 h-6">
                <div className="absolute inset-0 bg-red-600 rounded-full pulse-anim"></div>
                <div className="absolute inset-1 bg-red-400 rounded-full"></div>
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-muted-foreground mt-4 text-sm">
          Bu xəritə strateji məqsədlər üçün təqdim olunur və yalnız komandanlıq tərəfindən təsdiqlənmiş məlumatları əks etdirir.
        </p>
      </CardContent>
    </Card>
  );
}
