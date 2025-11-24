"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { v4 as uuidv4 } from 'uuid';
import type { MilitaryUnit, UserProfile } from '@/lib/types';

interface UnitManagementProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

const SINGLE_MAP_ID = 'main';

export default function UnitManagement({ isOpen, onOpenChange }: UnitManagementProps) {
  const { firestore } = useFirebase();
  const [unitName, setUnitName] = useState('');
  const [commanderUsername, setCommanderUsername] = useState('');
  const [commanderPassword, setCommanderPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateUnit = async () => {
    if (!unitName || !commanderUsername || !commanderPassword) {
      toast({
        variant: "destructive",
        title: "Xəta",
        description: "Bütün xanaları doldurun.",
      });
      return;
    }

    if (!firestore) {
        toast({
            variant: "destructive",
            title: "Xəta",
            description: "Database bağlantısı yoxdur.",
          });
        return;
    }

    setLoading(true);
    
    const newUnitId = uuidv4();
    const newUserId = uuidv4();

    try {
      // 1. Create the sub-commander user
      const userDocRef = doc(firestore, 'users', newUserId);
      const newUser: UserProfile = {
        id: newUserId,
        username: commanderUsername,
        password: commanderPassword,
        role: 'sub-commander',
        canSeeAllUnits: false,
        assignedUnitId: newUnitId,
      };
      setDocumentNonBlocking(userDocRef, newUser);

      // 2. Create the military unit and link it to the user
      const unitDocRef = doc(firestore, 'military_units', newUnitId);
      const newUnit: Omit<MilitaryUnit, 'id'> = {
        name: unitName,
        status: 'offline', // Default status
        commanderId: newUserId,
        latitude: 40.4093 + (Math.random() - 0.5) * 0.5, // Random initial position around Baku
        longitude: 49.8671 + (Math.random() - 0.5) * 0.5,
        mapId: SINGLE_MAP_ID, // Associate with the single main map
      };
      const unitWithId = { ...newUnit, id: newUnitId };
      setDocumentNonBlocking(unitDocRef, unitWithId);

      toast({
          title: "Uğurlu Əməliyyat",
          description: `Bölük "${unitName}" və komandiri "${commanderUsername}" yaradıldı.`
      });

      onOpenChange(false);
      // Reset form
      setUnitName('');
      setCommanderUsername('');
      setCommanderPassword('');

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Xəta",
            description: "Bölük yaradılarkən xəta baş verdi: " + error.message,
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Yeni Bölük Yarat</DialogTitle>
          <DialogDescription>
            Yeni bir hərbi vahid və ona təyin olunmuş komandir hesabı yaradın.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unit-name" className="text-right">
              Bölük Adı
            </Label>
            <Input id="unit-name" value={unitName} onChange={(e) => setUnitName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Komandir Adı
            </Label>
            <Input id="username" value={commanderUsername} onChange={(e) => setCommanderUsername(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Şifrə
            </Label>
            <Input id="password" type="password" value={commanderPassword} onChange={(e) => setCommanderPassword(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Ləğv et</Button>
          <Button type="submit" onClick={handleCreateUnit} disabled={loading}>
            {loading ? 'Yaradılır...' : 'Yarat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
