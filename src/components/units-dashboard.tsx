"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MoreVertical, PlusCircle, Trash2 } from 'lucide-react';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import UnitManagement from './unit-management';
import type { MilitaryUnit } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const mockUnits: MilitaryUnit[] = [
    { id: 'unit1', name: 'Qartal-01', status: 'operating', commanderUsername: 'qartal_komandir', location: { lat: 40.3, lng: 49.8 } },
    { id: 'unit2', name: 'Şahin-07', status: 'offline', commanderUsername: 'sahin_komandir', location: { lat: 40.5, lng: 49.9 } },
    { id: 'unit3', name: 'Laçın-03', status: 'alert', commanderUsername: 'lacin_komandir', location: { lat: 39.9, lng: 46.7 } },
];


export default function UnitsDashboard() {
  const [units, setUnits] = useState<MilitaryUnit[]>(mockUnits);
  const [selectedUnit, setSelectedUnit] = useState<MilitaryUnit | null>(mockUnits[0]);
  const [isNewUnitDialogOpen, setIsNewUnitDialogOpen] = useState(false);

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

  return (
    <div className="h-screen w-full grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="lg:col-span-1 flex flex-col">
        <Card className="flex-grow">
          <CardHeader className='flex-row items-center justify-between'>
            <div>
                <CardTitle>Bölüklər</CardTitle>
                <CardDescription>{units.length} aktiv bölük</CardDescription>
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
                {units.map((unit) => (
                  <TableRow key={unit.id} onClick={() => setSelectedUnit(unit)} className="cursor-pointer">
                    <TableCell className="font-medium">{unit.name}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(unit.status)}>{unit.status}</Badge></TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedUnit(unit); }}>
                            <MoreVertical className='h-4 w-4' />
                        </Button>
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
                    <p>{selectedUnit.commanderUsername}</p>
                </div>
                <div className='space-y-4 rounded-lg border p-4'>
                    <h3 className='font-semibold'>İcazələr</h3>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="can-see-all-units" className='flex-grow'>Bütün xəritəni görə bilər</Label>
                        <Switch id="can-see-all-units" />
                    </div>
                </div>
                <Button variant="destructive" className="w-full">
                    <Trash2 className='mr-2 h-4 w-4'/>
                    Bölüyü Sil
                </Button>
            </CardContent>
          </Card>
        ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                Məlumat üçün bölük seçin.
            </div>
        )}
      </div>
      <UnitManagement isOpen={isNewUnitDialogOpen} onOpenChange={setIsNewUnitDialogOpen} />
    </div>
  );
}
