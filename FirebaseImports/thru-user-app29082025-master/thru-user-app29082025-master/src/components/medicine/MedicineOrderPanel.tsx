'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  buildOrderId,
  generateMedicineLineId,
  type ParsedMedicineLine,
  type PrescriptionMetadata,
} from '@/lib/prescription-types';
import { prescriptionValidationMessage } from '@/lib/prescription-validation';
import { Camera, Loader2, Plus, Trash2, Pill, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { routeBasedShopDiscovery } from '@/lib/route-based-shop-discovery';

type PharmacyShop = {
  id: string;
  name: string;
  address?: string;
  storeType?: string;
  location?: { lat: number; lng: number };
};

type Props = {
  startCoords?: { lat: number; lng: number } | null;
  destCoords?: { lat: number; lng: number } | null;
  tripStartLabel?: string;
  tripDestLabel?: string;
};

export function MedicineOrderPanel({
  startCoords,
  destCoords,
  tripStartLabel,
  tripDestLabel,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [placing, setPlacing] = React.useState(false);
  const [prescriptionDate, setPrescriptionDate] = React.useState('');
  const [doctorName, setDoctorName] = React.useState('');
  const [dateValid, setDateValid] = React.useState<boolean | null>(null);
  const [medicines, setMedicines] = React.useState<ParsedMedicineLine[]>([]);
  const [manualName, setManualName] = React.useState('');
  const [manualQty, setManualQty] = React.useState(1);
  const [pharmacies, setPharmacies] = React.useState<PharmacyShop[]>([]);
  const [selectedVendorId, setSelectedVendorId] = React.useState('');
  const [loadingShops, setLoadingShops] = React.useState(false);

  React.useEffect(() => {
    if (!startCoords || !destCoords) return;
    let cancelled = false;
    (async () => {
      setLoadingShops(true);
      try {
        const result = await routeBasedShopDiscovery.findShopsAlongRoute(
          {
            latitude: startCoords.lat,
            longitude: startCoords.lng,
            address: tripStartLabel ?? '',
          },
          {
            latitude: destCoords.lat,
            longitude: destCoords.lng,
            address: tripDestLabel ?? '',
          },
          5,
          ['medical', 'pharmacy']
        );
        if (cancelled) return;
        const shops: PharmacyShop[] = (result.shops ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          address: s.address,
          storeType: s.type,
          location: s.coordinates,
        }));
        setPharmacies(shops);
        if (shops[0]) setSelectedVendorId(shops[0].id);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingShops(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startCoords, destCoords, tripStartLabel, tripDestLabel]);

  const readFileAsDataUri = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageSelected = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please upload an image.' });
      return;
    }
    const dataUri = await readFileAsDataUri(file);
    setImagePreview(dataUri);
    setAnalyzing(true);
    try {
      const res = await fetch('/api/ai/analyze-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUri: dataUri }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');

      setPrescriptionDate(data.prescriptionDate ?? '');
      setDoctorName(data.doctorName ?? '');
      setDateValid(data.dateValid ?? false);
      setMedicines(
        (data.medicines ?? []).map((m: { id: string; name: string; dosage?: string; quantity: number }) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          quantity: m.quantity,
        }))
      );
      toast({
        title: data.mock ? 'Demo prescription parsed' : 'Prescription analyzed',
        description: data.validationMessage,
        variant: data.dateValid ? 'default' : 'destructive',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not read prescription',
        description: e instanceof Error ? e.message : 'Try again or add medicines manually.',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const addManualMedicine = () => {
    const name = manualName.trim();
    if (!name) return;
    setMedicines((prev) => [
      ...prev,
      { id: generateMedicineLineId(), name, quantity: Math.max(1, manualQty) },
    ]);
    setManualName('');
    setManualQty(1);
  };

  const updateMedicine = (id: string, patch: Partial<ParsedMedicineLine>) => {
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMedicine = (id: string) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const canPlaceOrder =
    dateValid === true &&
    medicines.length > 0 &&
    selectedVendorId &&
    startCoords &&
    destCoords;

  const placeOrder = async () => {
    if (!canPlaceOrder) {
      toast({
        variant: 'destructive',
        title: 'Cannot place order',
        description:
          dateValid !== true
            ? prescriptionValidationMessage(false)
            : 'Add medicines and select a pharmacy.',
      });
      return;
    }

    const vendor = pharmacies.find((p) => p.id === selectedVendorId);
    if (!vendor) return;

    setPlacing(true);
    const orderId = buildOrderId();

    const prescription: PrescriptionMetadata = {
      imageDataUri: imagePreview ?? undefined,
      prescriptionDate,
      dateValid: true,
      doctorName: doctorName || undefined,
      medicines,
    };

    const orderItems = medicines.map((m) => ({
      itemId: m.id,
      name: m.name,
      quantity: m.quantity,
      pricePerItem: 0,
      totalPrice: 0,
      details: m.dosage ? `Dosage: ${m.dosage}` : 'Awaiting pharmacy pricing',
    }));

    const payload = {
      orderId,
      createdAt: new Date().toISOString(),
      customerInfo: { name: 'Customer' },
      tripStartLocation: tripStartLabel ?? null,
      tripDestination: tripDestLabel ?? null,
      overallStatus: 'Pending Confirmation',
      paymentStatus: 'Pending',
      grandTotal: 0,
      platformFee: 0,
      paymentGatewayFee: 0,
      vendorIds: [vendor.id],
      vendorPortions: [
        {
          vendorId: vendor.id,
          vendorName: vendor.name,
          vendorAddress: vendor.address ?? '',
          vendorType: vendor.storeType ?? 'pharmacy',
          vendorLocation: vendor.location
            ? { latitude: vendor.location.lat, longitude: vendor.location.lng }
            : null,
          status: 'Pending Vendor Confirmation',
          vendorSubtotal: 0,
          orderType: 'medicine',
          prescription,
          items: orderItems,
        },
      ],
    };

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Order failed');

      toast({
        title: 'Medicine order placed',
        description: `Order ${orderId} sent to ${vendor.name}. Await pharmacy quote.`,
      });
      router.push(`/order-tracking/${orderId}`);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Order failed',
        description: e instanceof Error ? e.message : 'Please try again.',
      });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          Medicine order
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a prescription (within 3 months). AI reads medicines — edit before ordering.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleImageSelected(e.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={analyzing}>
          <Camera className="h-4 w-4 mr-2" />
          Camera
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (fileRef.current) {
              fileRef.current.removeAttribute('capture');
              fileRef.current.click();
            }
          }}
          disabled={analyzing}
        >
          <Upload className="h-4 w-4 mr-2" />
          Gallery
        </Button>
        {analyzing && (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Analyzing…
          </Badge>
        )}
      </div>

      {imagePreview && (
        <img
          src={imagePreview}
          alt="Prescription"
          className="max-h-40 rounded-md border object-contain w-full bg-muted"
        />
      )}

      {dateValid !== null && (
        <div
          className={`flex items-start gap-2 text-sm rounded-md p-3 border ${
            dateValid ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {dateValid ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <div>
            <p className="font-medium">{prescriptionValidationMessage(dateValid)}</p>
            {prescriptionDate && (
              <p className="text-xs mt-1 opacity-80">Prescription date: {prescriptionDate}</p>
            )}
            {doctorName && <p className="text-xs opacity-80">Doctor: {doctorName}</p>}
          </div>
        </div>
      )}

      {medicines.length > 0 && (
        <div className="space-y-2">
          <Label>Medicines</Label>
          {medicines.map((m) => (
            <div key={m.id} className="flex flex-wrap gap-2 items-center border rounded-md p-2">
              <Input
                className="flex-1 min-w-[140px]"
                value={m.name}
                onChange={(e) => updateMedicine(m.id, { name: e.target.value })}
              />
              <Input
                type="number"
                min={1}
                className="w-20"
                value={m.quantity}
                onChange={(e) =>
                  updateMedicine(m.id, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                }
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeMedicine(m.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end border-t pt-3">
        <div className="flex-1 min-w-[160px]">
          <Label className="text-xs">Add medicine manually</Label>
          <Input
            placeholder="Medicine name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addManualMedicine()}
          />
        </div>
        <Input
          type="number"
          min={1}
          className="w-20"
          value={manualQty}
          onChange={(e) => setManualQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
        />
        <Button type="button" variant="secondary" onClick={addManualMedicine}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Pharmacy on your route</Label>
        {loadingShops ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Finding pharmacies…
          </p>
        ) : pharmacies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Set start and destination above to find medical stores along your route.
          </p>
        ) : (
          <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
            <SelectTrigger>
              <SelectValue placeholder="Select pharmacy" />
            </SelectTrigger>
            <SelectContent>
              {pharmacies.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Button
        className="w-full"
        disabled={!canPlaceOrder || placing}
        onClick={() => void placeOrder()}
      >
        {placing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Request medicines (await pharmacy quote)
      </Button>
    </Card>
  );
}
