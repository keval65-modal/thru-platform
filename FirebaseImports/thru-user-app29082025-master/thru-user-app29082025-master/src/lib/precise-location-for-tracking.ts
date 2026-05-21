/**
 * High-accuracy GPS gate for active order route tracking only.
 * Does not change app-wide permission requests elsewhere.
 */

import { Capacitor } from '@capacitor/core';

/** Must match `appId` in capacitor.config.ts */
export const THRU_APP_PACKAGE_ID = 'com.thru.userapp';

/**
 * Maximum acceptable horizontal accuracy (meters) for route tracking.
 * Values above this are treated as approximate / low-accuracy fixes.
 */
export const ROUTE_TRACKING_MAX_ACCURACY_METERS = 150;

export type PreciseLocationFailureReason =
  | 'unsupported'
  | 'denied'
  | 'timeout'
  | 'unavailable'
  | 'coarse';

export type PreciseLocationResult =
  | {
      ok: true;
      latitude: number;
      longitude: number;
      accuracy: number;
    }
  | {
      ok: false;
      reason: PreciseLocationFailureReason;
      accuracy?: number;
    };

function mapGeolocationError(code: number): PreciseLocationFailureReason {
  switch (code) {
    case 1:
      return 'denied';
    case 2:
      return 'unavailable';
    case 3:
      return 'timeout';
    default:
      return 'unavailable';
  }
}

/**
 * Single high-accuracy read suitable for verifying "precise" location before route tracking.
 */
export function getPrecisePositionForRouteTracking(): Promise<PreciseLocationResult> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: 'unsupported' });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const acc = position.coords.accuracy;
        if (!Number.isFinite(acc) || acc > ROUTE_TRACKING_MAX_ACCURACY_METERS) {
          resolve({
            ok: false,
            reason: 'coarse',
            accuracy: Number.isFinite(acc) ? acc : undefined,
          });
          return;
        }
        resolve({
          ok: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: acc,
        });
      },
      (error) => {
        resolve({
          ok: false,
          reason: mapGeolocationError(error?.code ?? 2),
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 25_000,
      }
    );
  });
}

/**
 * Opens OS settings where the user can enable precise location (iOS) / accurate location (Android).
 * No-op on web; callers may show inline help instead.
 */
async function openNativeDeepLink(url: string): Promise<void> {
  const { App } = await import('@capacitor/app');
  const app = App as typeof App & { openUrl?: (opts: { url: string }) => Promise<void> };
  if (typeof app.openUrl === 'function') {
    await app.openUrl({ url });
    return;
  }
  if (typeof window !== 'undefined') {
    window.location.assign(url);
  }
}

export async function openDeviceLocationSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const platform = Capacitor.getPlatform();

    if (platform === 'ios') {
      await openNativeDeepLink('app-settings:');
      return;
    }

    if (platform === 'android') {
      await openNativeDeepLink(
        `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package%3A${encodeURIComponent(
          THRU_APP_PACKAGE_ID
        )};end`
      );
    }
  } catch (err) {
    console.warn('[precise-location] openDeviceLocationSettings failed:', err);
    try {
      if (Capacitor.getPlatform() === 'android') {
        await openNativeDeepLink(
          'intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end'
        );
      }
    } catch {
      /* ignore */
    }
  }
}
