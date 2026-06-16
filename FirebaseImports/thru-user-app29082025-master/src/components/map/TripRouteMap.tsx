'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import type { ActiveTripPickupStop } from '@/lib/active-trip-route';

type Props = {
  startLocation: string;
  destination: string;
  pickupStops: ActiveTripPickupStop[];
  mapsReady: boolean;
  className?: string;
};

export function TripRouteMap({
  startLocation,
  destination,
  pickupStops,
  mapsReady,
  className = '',
}: Props) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<google.maps.Map | null>(null);
  const directionsRendererRef = React.useRef<google.maps.DirectionsRenderer | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!mapsReady || !mapRef.current || !window.google?.maps) return;

    try {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 18.5204, lng: 73.8567 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const directionsService = new window.google.maps.DirectionsService();
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#ef4444',
          strokeWeight: 5,
          strokeOpacity: 0.85,
        },
      });
      directionsRendererRef.current.setMap(mapInstanceRef.current);

      const waypoints = pickupStops
        .filter((stop) => stop.address)
        .map((stop) => ({ location: stop.address!, stopover: true }));

      const request: google.maps.DirectionsRequest = {
        origin: startLocation,
        destination,
        waypoints,
        optimizeWaypoints: waypoints.length > 1,
        travelMode: window.google.maps.TravelMode.DRIVING,
      };

      directionsService.route(request, (result, status) => {
        if (status !== window.google.maps.DirectionsStatus.OK || !result || !mapInstanceRef.current) {
          setError('Could not calculate route');
          return;
        }

        directionsRendererRef.current?.setDirections(result);
        const route = result.routes[0];
        const bounds = new window.google.maps.LatLngBounds();

        route.legs.forEach((leg) => {
          bounds.extend(leg.start_location);
          bounds.extend(leg.end_location);
        });
        mapInstanceRef.current.fitBounds(bounds);

        // Start marker
        new window.google.maps.Marker({
          position: route.legs[0].start_location,
          map: mapInstanceRef.current,
          title: 'Start',
          label: { text: 'S', color: '#ffffff', fontWeight: 'bold' },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#22c55e',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        // Pickup stop markers (use optimized waypoint order from Google)
        const waypointOrder = route.waypoint_order ?? [];
        const orderedStops =
          waypointOrder.length > 0
            ? waypointOrder.map((i) => pickupStops.filter((s) => s.address)[i])
            : pickupStops.filter((s) => s.address);

        orderedStops.forEach((stop, index) => {
          const leg = route.legs[index];
          if (!leg) return;
          new window.google.maps.Marker({
            position: leg.end_location,
            map: mapInstanceRef.current!,
            title: stop.name,
            label: { text: String(index + 1), color: '#ffffff', fontWeight: 'bold' },
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
        });

        // Destination marker
        const lastLeg = route.legs[route.legs.length - 1];
        new window.google.maps.Marker({
          position: lastLeg.end_location,
          map: mapInstanceRef.current,
          title: 'Destination',
          label: { text: 'D', color: '#ffffff', fontWeight: 'bold' },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
      });
    } catch {
      setError('Failed to load map');
    }
  }, [mapsReady, startLocation, destination, pickupStops]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-xl ${className}`}
      >
        <p className="text-sm text-destructive px-4 text-center">{error}</p>
      </div>
    );
  }

  if (!mapsReady) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-xl ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}
