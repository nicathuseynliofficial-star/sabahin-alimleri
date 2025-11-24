"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MoreVertical, PlusCircle, Trash2 } from 'lucide-react';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import UnitManagement from './unit-management';
import type { MilitaryUnit, UserProfile } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';


export default function UnitsDashboard() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isNewUnitDialogOpen, setIsNewUnitDialogOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<MilitaryUnit | null>(null);

  const unitsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'military_units');
  }, [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<MilitaryUnit>(unitsQuery);

  const usersQuery = useMemoFirebase(() => {
    if(!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const [selectedUnit, setSelectedUnit] = useState<MilitaryUnit | null>(null);

  const handleDeleteClick = (unit: MilitaryUnit) => {
    setUnitToDelete(unit);
  };

  const confirmDelete = () => {
    if (unitToDelete && firestore) {
      const unitDocRef = doc(firestore, 'military_units', unitToDelete.id);
      deleteDocumentNonBlocking(unitDocRef);

      // Also delete the associated commander user
      if (unitToDelete.commanderId) {
        const userDocRef = doc(firestore, 'users', unitToDelete.commanderId);
        deleteDocumentNonBlocking(userDocRef);
      }
      
      toast({
        title: "Bölük Silindi",
        description: `${unitToDelete.name} və əlaqəli komandir sistemdən silindi.`,
      });
      setUnitToDelete(null);
      setSelectedUnit(null);
    }
  };


  const getStatusVariant = (status: MilitaryUnit['status']) => {
    switch (status) {
      case 'operating':
        return 'default';
      case 'alert':
        return 'destructive';
      case 'offline':
        return 'secondary';
    }
  };

  const getCommanderUsername = (commanderId: string | undefined) => {
    if (!users || !commanderId) return 'Təyin edilməyib';
    return users.find(u => u.id === commanderId)?.username || 'Naməlum';
  }

  return (
    <div className="h-screen w-full grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="lg:col-span-1 flex flex-col">
        <Card className="flex-grow">
          <CardHeader className='flex-row items-center justify-between'>
            <div>
                <CardTitle>Bölüklər</CardTitle>
                <CardDescription>{units?.length ?? 0} aktiv bölük</CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsNewUnitDialogOpen(true)}>
                <PlusCircle className='mr-2 h-4 w-4' />
                Yeni Bölük
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Əməliyyatlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUnits ? (
                    <TableRow><TableCell colSpan={3}>Yüklənir...</TableCell></TableRow>
                ) : units?.map((unit) => (
                  <TableRow key={unit.id} onClick={() => setSelectedUnit(unit)} className={`cursor-pointer ${selectedUnit?.id === unit.id ? 'bg-muted/50' : ''}`}>
                    <TableCell className="font-medium">{unit.name}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(unit.status)}>{unit.status}</Badge></TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedUnit(unit); }}>
                                    <MoreVertical className='h-4 w-4' />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                                <DropdownMenuItem onClick={() => handleDeleteClick(unit)} className="text-destructive">
                                    <Trash2 className='mr-2 h-4 w-4' />
                                    Sil
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 flex flex-col">
        {selectedUnit ? (
          <Card className="flex-grow">
            <CardHeader>
              <CardTitle>Bölük Məlumatı: {selectedUnit.name}</CardTitle>
              <CardDescription>ID: {selectedUnit.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className='space-y-2'>
                    <h3 className='font-semibold'>Status</h3>
                    <p><Badge variant={getStatusVariant(selectedUnit.status)}>{selectedUnit.status}</Badge></p>
                </div>
                <div className='space-y-2'>
                    <h3 className='font-semibold'>Koordinatlar</h3>
                    <p className='font-mono'>{selectedUnit.location.lat.toFixed(4)}, {selectedUnit.location.lng.toFixed(4)}</p>
                </div>
                <div className='space-y-2'>
                    <h3 className='font-semibold'>Komandir</h3>
                    <p>{getCommanderUsername(selectedUnit.commanderId)}</p>
                </div>
                <div className='space-y-4 rounded-lg border p-4'>
                    <h3 className='font-semibold'>İcazələr</h3>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="can-see-all-units" className='flex-grow'>Bütün xəritəni görə bilər</Label>
                        <Switch id="can-see-all-units" />
                    </div>
                </div>
            </CardContent>
          </Card>
        ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground rounded-lg border-dashed border-2">
                Məlumat üçün bölük seçin.
            </div>
        )}
      </div>
      <UnitManagement isOpen={isNewUnitDialogOpen} onOpenChange={setIsNewUnitDialogOpen} />

      <AlertDialog open={!!unitToDelete} onOpenChange={(open) => !open && setUnitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Silməni Təsdiqlə</AlertDialogTitle>
            <AlertDialogDescription>
              "{unitToDelete?.name}" bölüyünü və ona bağlı komandir hesabını silmək istədiyinizdən əminsinizmi? Bu əməliyyat geri qaytarıla bilməz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnitToDelete(null)}>Ləğv Et</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Bəli, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
