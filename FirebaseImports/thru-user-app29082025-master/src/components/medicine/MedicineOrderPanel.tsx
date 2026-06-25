'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import {
  buildOrderId,
  formatMedicineLineDetails,
  generateMedicineLineId,
  type ParsedMedicineLine,
  type PrescriptionMetadata,
} from '@/lib/prescription-types';
import { prescriptionValidationMessage, prescriptionManualReviewMessage } from '@/lib/prescription-validation';
import { Camera, Loader2, Plus, Trash2, Pill, Upload, AlertCircle, CheckCircle2, Search, Minus } from 'lucide-react';
import { MedicineQuantitySuggestions } from '@/components/medicine/MedicineQuantitySuggestions';
import type {
  MedicineDosageSuggestion,
  MedicineQuantitySuggestion,
} from '@/lib/medicine-quantity-search';
import { CategoryRouteShops } from '@/components/order/CategoryRouteShops';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import type {
  MedicineDiscoveryResult,
  MedicineDiscoveryVariant,
  ProductSearchResponse,
} from '@/types/product-discovery';

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
  const { setMedicineItems, selectedMedicineVendor, setSelectedMedicineVendor } = useOrderFlow();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [placing, setPlacing] = React.useState(false);
  const [prescriptionDate, setPrescriptionDate] = React.useState('');
  const [doctorName, setDoctorName] = React.useState('');
  const [dateValid, setDateValid] = React.useState<boolean | null>(null);
  const [medicines, setMedicines] = React.useState<ParsedMedicineLine[]>([]);
  const [requiresManualReview, setRequiresManualReview] = React.useState(false);
  const [manualName, setManualName] = React.useState('');
  const [manualQty, setManualQty] = React.useState(1);
  const [manualStrength, setManualStrength] = React.useState<string | undefined>();
  const [manualPackLabel, setManualPackLabel] = React.useState<string | undefined>();
  const [medicineMode, setMedicineMode] = React.useState<'human' | 'pet'>('human');
  const [medicineQuery, setMedicineQuery] = React.useState('');
  const [medicineResults, setMedicineResults] = React.useState<MedicineDiscoveryResult[]>([]);
  const [searchingMedicines, setSearchingMedicines] = React.useState(false);
  const [selectedMedicine, setSelectedMedicine] = React.useState<MedicineDiscoveryResult | null>(null);
  const [selectedVariantId, setSelectedVariantId] = React.useState('');
  const [selectedQuantity, setSelectedQuantity] = React.useState(1);

  React.useEffect(() => {
    const query = medicineQuery.trim();
    if (query.length < 2) {
      setMedicineResults([]);
      setSearchingMedicines(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingMedicines(true);
      try {
        const params = new URLSearchParams({
          q: query,
          type: 'medicine',
          pet: medicineMode === 'pet' ? 'true' : 'false',
        });
        const response = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal });
        const data = (await response.json()) as ProductSearchResponse;
        setMedicineResults(data.medicines ?? []);
      } catch (error) {
        if (!controller.signal.aborted) setMedicineResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchingMedicines(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [medicineQuery, medicineMode]);

  React.useEffect(() => {
    setMedicineItems(
      medicines.map((m) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        quantity: m.quantity,
        unitPrice: 0,
      }))
    );
  }, [medicines, setMedicineItems]);

  const readFileAsDataUri = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const enterManualReviewMode = () => {
    setRequiresManualReview(true);
    setPrescriptionDate('');
    setDoctorName('');
    setDateValid(null);
    setMedicines([]);
  };

  const handleImageSelected = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please upload an image.' });
      return;
    }
    const dataUri = await readFileAsDataUri(file);
    setImagePreview(dataUri);
    setRequiresManualReview(false);
    setPrescriptionDate('');
    setDoctorName('');
    setDateValid(null);
    setMedicines([]);
    setAnalyzing(true);
    try {
      const res = await fetch('/api/ai/analyze-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUri: dataUri }),
      });
      const data = await res.json();

      if (data.manualReviewRequired) {
        enterManualReviewMode();
        toast({
          title: 'Prescription uploaded',
          description: data.message ?? prescriptionManualReviewMessage(),
        });
        return;
      }

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

      if (!data.medicines?.length) {
        enterManualReviewMode();
        toast({
          title: 'Prescription uploaded',
          description: prescriptionManualReviewMessage(),
        });
        return;
      }

      toast({
        title: data.mock ? 'Demo prescription parsed' : 'Prescription analyzed',
        description: data.validationMessage,
        variant: data.dateValid ? 'default' : 'destructive',
      });
    } catch {
      enterManualReviewMode();
      toast({
        title: 'Prescription uploaded',
        description: prescriptionManualReviewMessage(),
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const applyStrengthSuggestion = (
    id: string | 'manual',
    suggestion: MedicineDosageSuggestion
  ) => {
    if (id === 'manual') {
      setManualStrength(suggestion.label);
      return;
    }
    updateMedicine(id, { strength: suggestion.label });
  };

  const applyPackSuggestion = (
    id: string | 'manual',
    suggestion: MedicineQuantitySuggestion
  ) => {
    if (id === 'manual') {
      setManualQty(suggestion.quantity);
      setManualPackLabel(suggestion.label);
      return;
    }
    updateMedicine(id, { quantity: suggestion.quantity, packSize: suggestion.label });
  };

  const addManualMedicine = () => {
    const name = manualName.trim();
    if (!name) return;
    setMedicines((prev) => [
      ...prev,
      {
        id: generateMedicineLineId(),
        name,
        quantity: Math.max(1, manualQty),
        strength: manualStrength,
        packSize: manualPackLabel,
      },
    ]);
    setManualName('');
    setManualQty(1);
    setManualStrength(undefined);
    setManualPackLabel(undefined);
  };

  const openMedicineSelection = (medicine: MedicineDiscoveryResult) => {
    setSelectedMedicine(medicine);
    setSelectedVariantId(medicine.variants[0]?.id ?? '');
    setSelectedQuantity(1);
  };

  const addSelectedMedicine = () => {
    if (!selectedMedicine) return;
    const variant = selectedMedicine.variants.find((item) => item.id === selectedVariantId) ?? selectedMedicine.variants[0];
    setMedicines((prev) => [
      ...prev,
      {
        id: generateMedicineLineId(),
        name: selectedMedicine.name,
        quantity: selectedQuantity,
        strength: variant?.strength ?? undefined,
        packSize: variant?.label,
        dosage: [variant?.strength, variant?.label, variant?.animalWeightRange].filter(Boolean).join(' · ') || undefined,
      },
    ]);
    setSelectedMedicine(null);
    setMedicineQuery('');
    setMedicineResults([]);
  };

  const updateMedicine = (id: string, patch: Partial<ParsedMedicineLine>) => {
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMedicine = (id: string) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const canPlaceOrder =
    Boolean(imagePreview) &&
    selectedMedicineVendor &&
    startCoords &&
    destCoords &&
    (requiresManualReview || (dateValid === true && medicines.length > 0));

  const placeOrder = async () => {
    if (!canPlaceOrder) {
      toast({
        variant: 'destructive',
        title: 'Cannot place order',
        description:
          !imagePreview
            ? 'Upload a prescription image first.'
            : !requiresManualReview && dateValid !== true
              ? prescriptionValidationMessage(false)
              : 'Select a pharmacy on your route.',
      });
      return;
    }

    const vendor = selectedMedicineVendor;
    if (!vendor) return;

    setPlacing(true);
    const orderId = buildOrderId();

    const prescription: PrescriptionMetadata = {
      imageDataUri: imagePreview ?? undefined,
      prescriptionDate: requiresManualReview ? undefined : prescriptionDate,
      dateValid: requiresManualReview ? undefined : true,
      doctorName: doctorName || undefined,
      requiresManualReview,
      aiRawNotes: requiresManualReview
        ? 'Automatic reading unavailable — pharmacy to review prescription image.'
        : undefined,
      medicines,
    };

    const orderItems = requiresManualReview
      ? [
          {
            itemId: 'rx_manual_review',
            name: 'Prescription — pharmacy to confirm medicines',
            quantity: 1,
            pricePerItem: 0,
            totalPrice: 0,
            details: 'Prescription image attached. Pharmacy partner will read and quote medicines.',
          },
        ]
      : medicines.map((m) => ({
          itemId: m.id,
          name: m.name,
          quantity: m.quantity,
          pricePerItem: 0,
          totalPrice: 0,
          details: formatMedicineLineDetails(m),
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
      vendorIds: [vendor.vendorId],
      vendorPortions: [
        {
          vendorId: vendor.vendorId,
          vendorName: vendor.vendorName,
          vendorAddress: vendor.address ?? '',
          vendorType: 'pharmacy',
          vendorLocation: null,
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
        description: requiresManualReview
          ? `Order ${orderId} sent to ${vendor.vendorName}. The pharmacy will review your prescription and confirm medicines.`
          : `Order ${orderId} sent to ${vendor.vendorName}. Await pharmacy quote.`,
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
          Upload a prescription or search medicines. Edit everything before ordering.
        </p>
      </div>

      <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
        {(['human', 'pet'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              medicineMode === mode ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
            }`}
            onClick={() => {
              setMedicineMode(mode);
              setMedicineQuery('');
              setMedicineResults([]);
            }}
          >
            {mode === 'human' ? 'Human' : 'Pet'}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 p-3">
        <p className="mb-2 text-sm font-semibold">
          {medicineMode === 'pet' ? 'Upload Vet Prescription' : 'Upload Prescription'}
        </p>
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
      </div>

      <div className="space-y-2">
        <Label>{medicineMode === 'pet' ? 'Search Pet Medicine' : 'Search Medicines'}</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={medicineQuery}
            onChange={(event) => setMedicineQuery(event.target.value)}
            placeholder={medicineMode === 'pet' ? 'Search Nexgard, dewormer…' : 'Search Dolo, Pantocid…'}
            className="h-12 rounded-xl border-0 bg-muted/50 pl-9 text-base"
          />
        </div>
        {searchingMedicines ? (
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching medicines…
          </div>
        ) : null}
        {medicineResults.length > 0 ? (
          <div className="space-y-2">
            {medicineResults.map((medicine) => (
              <button
                key={medicine.id}
                type="button"
                className="w-full rounded-xl border border-border/60 bg-background p-3 text-left shadow-sm"
                onClick={() => openMedicineSelection(medicine)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{medicine.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[medicine.manufacturer, medicine.variants[0]?.label, medicine.isOtc ? 'OTC' : medicine.requiresPrescription ? 'Prescription' : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {medicine.medicineType === 'pet' ? (
                      <p className="mt-1 text-xs font-medium text-primary">{medicine.species || 'Pet medicine'}</p>
                    ) : null}
                  </div>
                  <Badge variant={medicine.requiresPrescription ? 'secondary' : 'outline'}>
                    {medicine.requiresPrescription ? 'Rx' : 'OTC'}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {imagePreview && (
        <img
          src={imagePreview}
          alt="Prescription"
          className="max-h-40 rounded-md border object-contain w-full bg-muted"
        />
      )}

      {requiresManualReview && (
        <div className="flex items-start gap-2 text-sm rounded-md p-3 border bg-amber-50 border-amber-200 text-amber-950">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t verify.</p>
            <p>{prescriptionManualReviewMessage()} Tap to choose medicines manually.</p>
          </div>
        </div>
      )}

      {dateValid !== null && !requiresManualReview && (
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
        <div className="space-y-3">
          <Label>{imagePreview ? 'Detected Medicines' : 'Added Medicines'}</Label>
          {medicines.map((m) => (
            <div key={m.id} className="space-y-2 border rounded-md p-2">
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  className="flex-1 min-w-[140px]"
                  value={m.name}
                  onChange={(e) =>
                    updateMedicine(m.id, {
                      name: e.target.value,
                      strength: undefined,
                      packSize: undefined,
                      dosage: undefined,
                    })
                  }
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
              {(m.strength || m.packSize || m.dosage) && (
                <p className="text-xs text-muted-foreground pl-0.5">
                  {formatMedicineLineDetails(m)}
                </p>
              )}
              <MedicineQuantitySuggestions
                medicineName={m.name}
                selectedStrength={m.strength}
                selectedPackLabel={m.packSize ?? m.dosage}
                onSelectStrength={(suggestion) => applyStrengthSuggestion(m.id, suggestion)}
                onSelectPack={(suggestion) => applyPackSuggestion(m.id, suggestion)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 border-t pt-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs">Couldn&apos;t find it? Add manually</Label>
            <Input
              placeholder="Medicine name"
              value={manualName}
              onChange={(e) => {
                setManualName(e.target.value);
                setManualStrength(undefined);
                setManualPackLabel(undefined);
              }}
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
        {(manualStrength || manualPackLabel) && (
          <p className="text-xs text-muted-foreground">
            {formatMedicineLineDetails({
              strength: manualStrength,
              packSize: manualPackLabel,
            })}
          </p>
        )}
        <MedicineQuantitySuggestions
          medicineName={manualName}
          selectedStrength={manualStrength}
          selectedPackLabel={manualPackLabel}
          onSelectStrength={(suggestion) => applyStrengthSuggestion('manual', suggestion)}
          onSelectPack={(suggestion) => applyPackSuggestion('manual', suggestion)}
        />
      </div>

      <CategoryRouteShops
        category="medicine"
        selectedVendor={selectedMedicineVendor}
        onSelectVendor={setSelectedMedicineVendor}
      />

      <Button
        className="w-full"
        disabled={!canPlaceOrder || placing}
        onClick={() => void placeOrder()}
      >
        {placing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {requiresManualReview
          ? 'Request medicines (pharmacy will review prescription)'
          : 'Request medicines (await pharmacy quote)'}
      </Button>

      <Sheet open={Boolean(selectedMedicine)} onOpenChange={(open) => !open && setSelectedMedicine(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          {selectedMedicine ? (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle className="text-left">{selectedMedicine.name}</SheetTitle>
              </SheetHeader>

              <div>
                <p className="mb-2 text-sm font-semibold">Pack Size</p>
                <div className="grid grid-cols-1 gap-2">
                  {(selectedMedicine.variants.length > 0 ? selectedMedicine.variants : [{ id: `${selectedMedicine.id}-default`, label: 'Pack' } as MedicineDiscoveryVariant]).map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      className={`rounded-xl border p-3 text-left text-sm font-medium ${
                        selectedVariantId === variant.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background'
                      }`}
                      onClick={() => setSelectedVariantId(variant.id)}
                    >
                      <span>{variant.label}</span>
                      {[variant.strength, variant.form, variant.animalWeightRange].filter(Boolean).length > 0 ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {[variant.strength, variant.form, variant.animalWeightRange].filter(Boolean).join(' · ')}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Quantity</p>
                <div className="flex w-fit items-center rounded-full border border-border bg-muted/30 p-1">
                  <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedQuantity((value) => Math.max(1, value - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-10 text-center font-bold">{selectedQuantity}</span>
                  <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedQuantity((value) => value + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedMedicine.requiresPrescription || selectedMedicine.medicineType === 'pet' ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  {selectedMedicine.medicineType === 'pet' ? 'Upload Vet Prescription if required by the pharmacy.' : 'Prescription may be required for this medicine.'}
                </p>
              ) : null}

              <Button type="button" className="h-12 w-full rounded-xl text-base font-semibold" onClick={addSelectedMedicine}>
                Add
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
