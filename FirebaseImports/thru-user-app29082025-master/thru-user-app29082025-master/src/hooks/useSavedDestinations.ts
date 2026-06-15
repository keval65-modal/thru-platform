'use client';

import * as React from 'react';
import type {
  SavedDestination,
  SavedDestinationLabelType,
} from '@/types/saved-destinations';

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok || !data?.success) {
    const message =
      typeof data?.error === 'string'
        ? data.error
        : 'Request failed';
    throw new Error(message);
  }
  return data as T;
}

export function useSavedDestinations(firebaseUid: string | null) {
  const [destinations, setDestinations] = React.useState<SavedDestination[]>([]);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!firebaseUid) {
      setDestinations([]);
      return;
    }
    setLoading(true);
    try {
      const data = await parseJson<{ destinations: SavedDestination[] }>(
        await fetch(`/api/user/saved-destinations?firebaseUid=${encodeURIComponent(firebaseUid)}`)
      );
      setDestinations(data.destinations);
    } catch (error) {
      console.error('[useSavedDestinations]', error);
      setDestinations([]);
    } finally {
      setLoading(false);
    }
  }, [firebaseUid]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const saveDestination = React.useCallback(
    async (input: {
      labelType: SavedDestinationLabelType;
      customLabel?: string;
      address: string;
      latitude: number;
      longitude: number;
      placeId?: string | null;
      phone?: string | null;
    }) => {
      if (!firebaseUid) throw new Error('Sign in to save destinations');

      const data = await parseJson<{ destination: SavedDestination }>(
        await fetch('/api/user/saved-destinations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseUid,
            phone: input.phone ?? null,
            labelType: input.labelType,
            customLabel: input.customLabel ?? null,
            address: input.address,
            latitude: input.latitude,
            longitude: input.longitude,
            placeId: input.placeId ?? null,
          }),
        })
      );

      setDestinations((prev) => {
        const without = prev.filter((d) => {
          if (d.labelType !== data.destination.labelType) return true;
          if (data.destination.labelType === 'other') {
            return d.customLabel?.toLowerCase() !== data.destination.customLabel?.toLowerCase();
          }
          return false;
        });
        return [...without, data.destination].sort((a, b) =>
          a.displayLabel.localeCompare(b.displayLabel)
        );
      });

      return data.destination;
    },
    [firebaseUid]
  );

  const removeDestination = React.useCallback(
    async (id: string) => {
      if (!firebaseUid) return;
      await parseJson(
        await fetch(`/api/user/saved-destinations/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firebaseUid }),
        })
      );
      setDestinations((prev) => prev.filter((d) => d.id !== id));
    },
    [firebaseUid]
  );

  const recordTravelPattern = React.useCallback(
    async (input: {
      destinationLabel: string;
      destinationLat: number;
      destinationLng: number;
      departureAt: string;
      isImmediate: boolean;
      savedDestinationId?: string | null;
    }) => {
      if (!firebaseUid) return;
      try {
        await parseJson(
          await fetch('/api/user/travel-patterns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firebaseUid,
              ...input,
            }),
          })
        );
      } catch (error) {
        console.warn('[recordTravelPattern]', error);
      }
    },
    [firebaseUid]
  );

  return {
    destinations,
    loading,
    refresh,
    saveDestination,
    removeDestination,
    recordTravelPattern,
  };
}
