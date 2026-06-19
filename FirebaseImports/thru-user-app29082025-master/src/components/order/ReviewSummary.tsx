'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { saveActiveTripRoute } from '@/lib/active-trip-route';
import { placeOrderFromFlow, type CheckoutVehicle } from '@/lib/place-order-from-flow';
import { computeCartSummary, formatCartInr, getPickupStores } from '@/lib/order-cart-pricing';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

type CheckoutProfile = {
  name?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  gender?: string;
  city?: string;
  vehicles?: CheckoutVehicle[];
  vehicleNumbers?: string[];
};

function formatVehicle(vehicle: CheckoutVehicle) {
  const details = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  return details ? `${vehicle.number} · ${details}` : vehicle.number;
}

export function ReviewSummary() {
  const flow = useOrderFlow();
  const router = useRouter();
  const { toast } = useToast();
  const [processing, setProcessing] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<FirebaseUser | null>(auth?.currentUser ?? null);
  const [profile, setProfile] = React.useState<CheckoutProfile | null>(null);
  const [vehicles, setVehicles] = React.useState<CheckoutVehicle[]>([]);
  const [selectedVehicleNumber, setSelectedVehicleNumber] = React.useState('');
  const [newVehicle, setNewVehicle] = React.useState<CheckoutVehicle>({ number: '' });

  const summary = React.useMemo(() => computeCartSummary(flow), [flow]);
  const pickupStores = React.useMemo(() => getPickupStores(flow), [flow]);
  const groceryCount = flow.groceryItems.length;
  const orderedNeeds = summary.categories.map((category) => category.label).join(', ') || '—';
  const hasItems = summary.itemCount > 0;
  const medicineOnly =
    summary.categories.length === 1 && summary.categories[0]?.category === 'medicine';

  const startLocation =
    flow.startLocationQuery || flow.selectedStartLocation || '';
  const destination =
    flow.destinationQuery || flow.selectedDestination || '';

  React.useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setCurrentUser);
  }, []);

  React.useEffect(() => {
    if (!currentUser?.phoneNumber) return;

    const loadVehicles = async () => {
      try {
        const params = new URLSearchParams({
          firebaseUid: currentUser.uid,
          phone: currentUser.phoneNumber ?? '',
        });
        const response = await fetch(`/api/user/profile?${params.toString()}`);
        const result = await response.json();
        if (!response.ok || !result.success) return;

        const loadedProfile = result.profile as CheckoutProfile | null;
        const loadedVehicles = loadedProfile?.vehicles?.length
          ? loadedProfile.vehicles
          : loadedProfile?.vehicleNumbers?.map((number) => ({ number })) ?? [];

        setProfile(loadedProfile);
        setVehicles(loadedVehicles);
        setSelectedVehicleNumber((current) => current || loadedVehicles[0]?.number || '');
      } catch (error) {
        console.warn('Failed to load checkout vehicles', error);
      }
    };

    void loadVehicles();
  }, [currentUser]);

  const selectedVehicle = React.useMemo(
    () => vehicles.find((vehicle) => vehicle.number === selectedVehicleNumber) ?? null,
    [selectedVehicleNumber, vehicles]
  );

  const handleAddVehicle = async () => {
    const vehicle = {
      number: newVehicle.number.trim().toUpperCase(),
      make: newVehicle.make?.trim() || undefined,
      model: newVehicle.model?.trim() || undefined,
    };

    if (!vehicle.number) {
      toast({
        variant: 'destructive',
        title: 'Vehicle number required',
        description: 'Add the vehicle number you will arrive in.',
      });
      return;
    }

    const nextVehicles = [
      vehicle,
      ...vehicles.filter((existing) => existing.number !== vehicle.number),
    ];
    setVehicles(nextVehicles);
    setSelectedVehicleNumber(vehicle.number);
    setNewVehicle({ number: '' });

    if (!currentUser?.uid || !currentUser.phoneNumber) return;

    const nextProfile: CheckoutProfile = {
      ...profile,
      name: profile?.name || currentUser.displayName?.split(',')[0] || 'Customer',
      phoneNumber: profile?.phoneNumber || currentUser.phoneNumber,
      vehicles: nextVehicles,
      vehicleNumbers: nextVehicles.map((item) => item.number),
    };

    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: currentUser.uid,
          ...nextProfile,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Could not save vehicle');
      }
      setProfile(result.profile);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Vehicle saved for this order',
        description: error instanceof Error ? error.message : 'Could not save it to your profile.',
      });
    }
  };

  const handleCheckout = async () => {
    setProcessing(true);
    try {
      // Staged payment — simulate gateway delay then place order
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const result = await placeOrderFromFlow(flow, selectedVehicle);
      if (!result.success || !result.orderId) {
        throw new Error(result.error || 'Could not place order');
      }

      saveActiveTripRoute({
        orderId: result.orderId,
        startLocation,
        destination,
        pickupStops: pickupStores.map((store) => ({
          id: `${store.category}-${store.vendorId}`,
          name: store.vendorName,
          address: store.address,
          category: store.category,
          vendorId: store.vendorId,
        })),
        createdAt: new Date().toISOString(),
      });

      toast({
        title: 'Payment successful',
        description: `Order #${result.orderId} sent to vendors.`,
      });

      router.push(`/order-tracking/${result.orderId}`);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Checkout failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Review & checkout</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {hasItems
            ? "Here's what you've added for your trip."
            : 'Your route is ready — continue when you are.'}
        </p>
      </div>

      {hasItems && (
        <div className="rounded-2xl bg-muted/30 p-5 space-y-4">
          {!medicineOnly && (
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Order total</span>
              <span className="text-3xl font-bold tabular-nums">
                {formatCartInr(summary.total)}
              </span>
            </div>
          )}
          {medicineOnly && (
            <p className="text-sm font-medium text-muted-foreground">Pharmacy quote pending</p>
          )}
          {summary.savings > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Estimated savings</span>
              <span>−{formatCartInr(summary.savings)}</span>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl bg-background border border-border/50 p-4 space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">From:</span>{' '}
          <span className="font-medium">{startLocation || '—'}</span>
        </p>
        <p>
          <span className="text-muted-foreground">To:</span>{' '}
          <span className="font-medium">{destination || '—'}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Needs:</span>{' '}
          <span className="font-medium">{orderedNeeds}</span>
          {groceryCount > 0 && ` · ${groceryCount} grocery item${groceryCount > 1 ? 's' : ''}`}
        </p>
        {pickupStores.length > 0 && (
          <div className="space-y-1 pt-1">
            <p className="text-muted-foreground">Pickup stops:</p>
            {pickupStores.map((store) => (
              <p key={`${store.category}-${store.vendorId}`}>
                <span className="font-medium capitalize">{store.category}:</span>{' '}
                {store.vendorName}
                {store.address ? (
                  <span className="text-muted-foreground"> · {store.address}</span>
                ) : null}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-background border border-border/50 p-4 space-y-3 text-sm">
        <div>
          <p className="font-medium">Arrival vehicle</p>
          <p className="text-xs text-muted-foreground">
            Shopkeepers will use this to identify you at pickup.
          </p>
        </div>

        {vehicles.length > 0 && (
          <Select value={selectedVehicleNumber} onValueChange={setSelectedVehicleNumber}>
            <SelectTrigger>
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.number} value={vehicle.number}>
                  {formatVehicle(vehicle)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="rounded-lg border border-border/50 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Add another vehicle</p>
          <Input
            value={newVehicle.number}
            onChange={(event) => setNewVehicle((prev) => ({ ...prev, number: event.target.value.toUpperCase() }))}
            placeholder="Vehicle number, eg. MH-12-HZ-1820"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              value={newVehicle.make ?? ''}
              onChange={(event) => setNewVehicle((prev) => ({ ...prev, make: event.target.value }))}
              placeholder="Make, eg. Honda"
            />
            <Input
              value={newVehicle.model ?? ''}
              onChange={(event) => setNewVehicle((prev) => ({ ...prev, model: event.target.value }))}
              placeholder="Model, eg. City"
            />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={() => void handleAddVehicle()}>
            Add vehicle
          </Button>
        </div>
      </div>

      <Button
        type="button"
        className="w-full h-12 rounded-xl text-base font-semibold"
        onClick={() => void handleCheckout()}
        disabled={processing || (!hasItems && pickupStores.length === 0)}
      >
        {processing ? 'Processing payment…' : 'Continue to checkout'}
      </Button>
    </div>
  );
}
