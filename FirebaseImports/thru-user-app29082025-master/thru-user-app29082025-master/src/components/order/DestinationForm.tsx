'use client';

import * as React from 'react';
import {
  ArrowRightLeft,
  Clock,
  LocateFixed,
  MapPin,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DepartureTimePicker } from '@/components/home/DepartureTimePicker';
import { SavedDestinationsPanel } from '@/components/home/SavedDestinationsPanel';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { useFirebaseUser } from '@/hooks/useFirebaseUser';
import { useSavedDestinations } from '@/hooks/useSavedDestinations';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { SavedDestination } from '@/types/saved-destinations';

function formatTimeDisplay(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function DestinationForm() {
  const { toast } = useToast();
  const flow = useOrderFlow();
  const { setStart, setDestination, setRouteCoords, setDeparture, patch } = flow;
  const { user, firebaseUid } = useFirebaseUser();
  const { destinations, loading, saveDestination, removeDestination } = useSavedDestinations(firebaseUid);

  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [mapsReady, setMapsReady] = React.useState(false);
  const [fetchingLocation, setFetchingLocation] = React.useState(false);
  const autoLocatedRef = React.useRef(false);

  const startRef = React.useRef<HTMLDivElement>(null);
  const destRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const tick = () => {
      if ((window as any).google?.maps?.places) setMapsReady(true);
    };
    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (!mapsReady) return;
    const googleObj = (window as any).google;
    if (!googleObj?.maps?.places) return;

    const mount = (
      container: HTMLDivElement | null,
      id: string,
      placeholder: string,
      onPick: (addr: string, coords: string) => void
    ) => {
      if (!container || container.querySelector(`#${id}`)) return;
      container.innerHTML = `<input id="${id}" class="flex h-12 w-full rounded-xl border-0 bg-muted/50 pl-10 pr-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" placeholder="${placeholder}" />`;
      const input = document.getElementById(id) as HTMLInputElement;
      const ac = new googleObj.maps.places.Autocomplete(input, {
        fields: ['formatted_address', 'geometry'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place?.geometry?.location) {
          const coords = `${place.geometry.location.lat()}, ${place.geometry.location.lng()}`;
          onPick(place.formatted_address || coords, coords);
        }
      });
    };

    mount(startRef.current, 'order-start', 'Your location', setStart);
    mount(destRef.current, 'order-dest', 'Where are you going?', setDestination);
  }, [mapsReady, setStart, setDestination]);

  React.useEffect(() => {
    const parse = (str: string | null) => {
      if (!str) return null;
      const m = str.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
      if (!m) return null;
      return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    };
    const start = parse(flow.selectedStartLocation);
    const dest = parse(flow.selectedDestination);
    if (start && dest) setRouteCoords({ start, dest });
  }, [flow.selectedStartLocation, flow.selectedDestination, setRouteCoords]);

  React.useEffect(() => {
    if (!mapsReady) return;
    const startEl = document.getElementById('order-start') as HTMLInputElement | null;
    if (startEl && flow.startLocationQuery && startEl.value !== flow.startLocationQuery) {
      startEl.value = flow.startLocationQuery;
    }
    const destEl = document.getElementById('order-dest') as HTMLInputElement | null;
    if (destEl && flow.destinationQuery && destEl.value !== flow.destinationQuery) {
      destEl.value = flow.destinationQuery;
    }
  }, [flow.startLocationQuery, flow.destinationQuery, mapsReady]);

  const handleUseCurrentLocation = React.useCallback(() => {
    if (!navigator.geolocation) return;
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = `${latitude}, ${longitude}`;
        setStart(coords, coords);
        if ((window as any).google?.maps) {
          const geocoder = new (window as any).google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: any, status: string) => {
            if (status === 'OK' && results?.[0]) {
              setStart(results[0].formatted_address, coords);
            }
            setFetchingLocation(false);
          });
        } else {
          setFetchingLocation(false);
        }
      },
      () => {
        setFetchingLocation(false);
        toast({
          variant: 'destructive',
          title: 'Location unavailable',
          description: 'Enter your start manually.',
        });
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [setStart, toast]);

  React.useEffect(() => {
    if (!mapsReady || flow.selectedStartLocation || autoLocatedRef.current) return;
    autoLocatedRef.current = true;
    handleUseCurrentLocation();
  }, [mapsReady, flow.selectedStartLocation, handleUseCurrentLocation]);

  const handleImmediate = (checked: boolean) => {
    if (checked) {
      const now = new Date();
      const y = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const h = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      setDeparture(`${y}-${mo}-${d}T${h}:${mi}`, true);
    } else {
      setDeparture('', false);
    }
  };

  const handleTimeSelect = (time24h: string) => {
    const now = new Date();
    const [hours, minutes] = time24h.split(':');
    const selected = new Date(now);
    selected.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    if (selected < now) selected.setDate(selected.getDate() + 1);
    setDeparture(selected.toISOString().slice(0, 16), false);
    setShowTimePicker(false);
  };

  const destDraft = React.useMemo(() => {
    if (!flow.selectedDestination) return null;
    const m = flow.selectedDestination.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (!m) return null;
    return {
      address: flow.destinationQuery || flow.selectedDestination,
      latitude: parseFloat(m[1]),
      longitude: parseFloat(m[2]),
    };
  }, [flow.selectedDestination, flow.destinationQuery]);

  const applySaved = (dest: SavedDestination) => {
    const coords = `${dest.latitude}, ${dest.longitude}`;
    setDestination(dest.address, coords);
    const el = document.getElementById('order-dest') as HTMLInputElement | null;
    if (el) el.value = dest.address;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Where are you going?</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Your destination shapes everything we find along the way.
        </p>
      </div>

      <div className="relative space-y-3">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <LocateFixed className={cn('h-4 w-4 text-primary', fetchingLocation && 'animate-pulse')} />
          </div>
          <div ref={startRef} className="w-full" />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary font-medium px-2 py-1"
            onClick={handleUseCurrentLocation}
          >
            Refresh
          </button>
        </div>

        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <MapPin className="h-5 w-5 text-accent" />
          </div>
          <div ref={destRef} className="w-full [&_input]:pl-10 [&_input]:text-lg [&_input]:font-medium" />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute -right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full shadow-sm z-10 hidden sm:flex"
          onClick={() =>
            patch({
              startLocationQuery: flow.destinationQuery,
              selectedStartLocation: flow.selectedDestination,
              destinationQuery: flow.startLocationQuery,
              selectedDestination: flow.selectedStartLocation,
            })
          }
        >
          <ArrowRightLeft className="h-4 w-4 rotate-90" />
        </Button>
      </div>

      <SavedDestinationsPanel
        firebaseUid={firebaseUid}
        destinations={destinations}
        loading={loading}
        destinationDraft={destDraft}
        onApplyDestination={applySaved}
        onSaveDestination={(input) => saveDestination({ ...input, phone: user?.phoneNumber ?? null })}
        onDeleteDestination={removeDestination}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={flow.isImmediate ? 'default' : 'outline'}
          className="rounded-xl h-11 flex-1 min-w-[140px] justify-start"
          onClick={() => {
            if (!flow.isImmediate) handleImmediate(true);
          }}
        >
          <Clock className="h-4 w-4 mr-2" />
          Leaving now
        </Button>
        <Button
          type="button"
          variant={!flow.isImmediate ? 'default' : 'outline'}
          className="rounded-xl h-11 flex-1 min-w-[140px]"
          onClick={() => {
            handleImmediate(false);
            setShowTimePicker(true);
          }}
        >
          {flow.isImmediate ? 'Schedule for later' : formatTimeDisplay(flow.departureTime)}
        </Button>
      </div>

      <DepartureTimePicker
        open={showTimePicker}
        onOpenChange={setShowTimePicker}
        value={flow.departureTime}
        onConfirm={handleTimeSelect}
      />

      <div
        className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer"
        onClick={() =>
          toast({
            title: 'Add stops',
            description: 'Stop management opens in the next update on this step.',
          })
        }
      >
        <PlusCircle className="h-4 w-4" />
        <span>Add stops along the way</span>
        {flow.routeStops.length > 0 && (
          <span className="text-primary font-medium">({flow.routeStops.length})</span>
        )}
      </div>
    </div>
  );
}
