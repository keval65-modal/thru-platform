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
import {
  buildLocalDepartureIso,
  clampScheduledDepartureIso,
  formatTimeForDisplay,
  isDepartureIsoInPast,
  loadDepartureTimeFormat,
  nextValidDepartureParts,
  PAST_DEPARTURE_TIME_MESSAGE,
  time24hFromDateString,
} from '@/lib/departure-time';
import type { SavedDestination } from '@/types/saved-destinations';

function formatTimeDisplay(dateString: string) {
  if (!dateString) return 'Pick time';
  const parts = time24hFromDateString(dateString);
  if (!parts) return 'Pick time';
  const format = typeof window !== 'undefined' ? loadDepartureTimeFormat() : '12';
  return formatTimeForDisplay(parts.hours, parts.minutes, format);
}

function parseCoordString(str: string | null): { lat: number; lng: number } | null {
  if (!str) return null;
  const m = str.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (!m) return null;
  return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
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
      container.innerHTML = `<input id="${id}" class="flex h-10 w-full rounded-xl border-0 bg-muted/50 pl-9 pr-14 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" placeholder="${placeholder}" />`;
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
    const start = parseCoordString(flow.selectedStartLocation);
    const dest = parseCoordString(flow.selectedDestination);
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
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    if (checked) {
      setDeparture(`${y}-${mo}-${d}T${h}:${mi}`, true);
    } else {
      const scheduled =
        flow.departureTime && !flow.isImmediate && !isDepartureIsoInPast(flow.departureTime)
          ? flow.departureTime
          : (() => {
              const parts = nextValidDepartureParts();
              return buildLocalDepartureIso(parts.hours, parts.minutes);
            })();
      setDeparture(scheduled, false);
    }
  };

  const handleTimeSelect = (time24h: string) => {
    const [hours, minutes] = time24h.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    if (isDepartureIsoInPast(buildLocalDepartureIso(h, m))) {
      toast({
        variant: 'destructive',
        title: 'Invalid departure time',
        description: PAST_DEPARTURE_TIME_MESSAGE,
      });
      return;
    }
    setDeparture(buildLocalDepartureIso(h, m), false);
    setShowTimePicker(false);
  };

  React.useEffect(() => {
    if (!flow.hydrated || flow.isImmediate || !flow.departureTime) return;
    if (!isDepartureIsoInPast(flow.departureTime)) return;
    setDeparture(clampScheduledDepartureIso(flow.departureTime), false);
  }, [flow.hydrated, flow.isImmediate, flow.departureTime, setDeparture]);

  const destDraft = React.useMemo(() => {
    const coords = parseCoordString(flow.selectedDestination);
    if (!coords) return null;
    return {
      address: flow.destinationQuery || flow.selectedDestination || '',
      latitude: coords.lat,
      longitude: coords.lng,
    };
  }, [flow.selectedDestination, flow.destinationQuery]);

  const applySaved = (dest: SavedDestination) => {
    if (dest.latitude == null || dest.longitude == null) return;
    const coords = `${dest.latitude}, ${dest.longitude}`;
    setDestination(dest.address, coords);
    const el = document.getElementById('order-dest') as HTMLInputElement | null;
    if (el) el.value = dest.address;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Where are you going?</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Your destination shapes everything we find along the way.
        </p>
      </div>

      <div className="relative space-y-2">
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
            <MapPin className="h-4 w-4 text-accent" />
          </div>
          <div ref={destRef} className="w-full [&_input]:pl-9 [&_input]:text-sm [&_input]:font-medium" />
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
        onDeleteDestination={async (id) => {
          try {
            await removeDestination(id);
          } catch {
            toast({ variant: 'destructive', title: 'Could not remove saved place' });
          }
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={flow.isImmediate ? 'default' : 'outline'}
          className="h-10 min-w-[130px] flex-1 justify-start rounded-xl text-sm"
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
          className="h-10 min-w-[130px] flex-1 rounded-xl text-sm"
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
        className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"
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
