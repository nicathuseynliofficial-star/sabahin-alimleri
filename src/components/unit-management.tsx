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

interface UnitManagementProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export default function UnitManagement({ isOpen, onOpenChange }: UnitManagementProps) {
  const [unitName, setUnitName] = useState('');
  const [commanderUsername, setCommanderUsername] = useState('');
  const [commanderPassword, setCommanderPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateUnit = async () => {
    setLoading(true);
    // In a real app, you would call a server action here to:
    // 1. Create a document in /military_units
    // 2. Create a document in /users with role 'sub-commander'
    console.log({ unitName, commanderUsername, commanderPassword });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
        title: "Uğurlu Əməliyyat",
        description: `Bölük "${unitName}" və komandiri "${commanderUsername}" yaradıldı.`
    });

    setLoading(false);
    onOpenChange(false);
    // Reset form
    setUnitName('');
    setCommanderUsername('');
    setCommanderPassword('');
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
            <Label htmlFor="password" value={commanderPassword} className="text-right">
              Şifrə
            </Label>
            <Input id="password" type="password" onChange={(e) => setCommanderPassword(e.target.value)} className="col-span-3" />
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
