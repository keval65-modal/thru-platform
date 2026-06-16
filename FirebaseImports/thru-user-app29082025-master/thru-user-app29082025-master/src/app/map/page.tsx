"use client";

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { Loader2, MapIcon, Navigation, X } from 'lucide-react';
import { ShopMap } from '@/components/map/ShopMap';
import { TripRouteMap } from '@/components/map/TripRouteMap';
import { ShopMarkerData, ShopCategory } from '@/types/map-types';
import { getAllShopsForMap, subscribeToShopUpdates } from '@/lib/map-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/layout/bottom-nav';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { distanceKm } from '@/lib/geo-utils';
import {
  clearActiveTripRoute,
  loadActiveTripRoute,
  type ActiveTripRoute,
} from '@/lib/active-trip-route';

// Category filter configuration
const CATEGORY_FILTERS = [
  { 
    category: 'all' as const, 
    label: 'All Shops', 
    icon: '🏪',
    color: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
    activeColor: 'bg-gray-800 text-white'
  },
  { 
    category: ShopCategory.CAFE, 
    label: 'Cafes', 
    icon: '☕',
    color: 'bg-amber-50 hover:bg-amber-100 text-amber-800',
    activeColor: 'bg-amber-600 text-white'
  },
  { 
    category: ShopCategory.RESTAURANT, 
    label: 'Restaurants', 
    icon: '🍽️',
    color: 'bg-orange-50 hover:bg-orange-100 text-orange-800',
    activeColor: 'bg-orange-600 text-white'
  },
  { 
    category: ShopCategory.MEDICAL, 
    label: 'Medical', 
    icon: '⚕️',
    color: 'bg-red-50 hover:bg-red-100 text-red-800',
    activeColor: 'bg-red-600 text-white'
  },
  { 
    category: ShopCategory.GROCERY, 
    label: 'Grocery', 
    icon: '🛒',
    color: 'bg-green-50 hover:bg-green-100 text-green-800',
    activeColor: 'bg-green-600 text-white'
  }
];

export default function MapPage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<ShopMarkerData[]>([]);
  const [filteredShops, setFilteredShops] = useState<ShopMarkerData[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<(ShopCategory | 'all')[]>(['all']);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | undefined>();
  const [vicinityKm, setVicinityKm] = useState(5); // default 5km vicinity
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [activeTrip, setActiveTrip] = useState<ActiveTripRoute | null>(null);
  const [showTripRoute, setShowTripRoute] = useState(true);

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Load shops on mount
  useEffect(() => {
    loadShops();
    const trip = loadActiveTripRoute();
    if (trip) {
      setActiveTrip(trip);
      setShowTripRoute(true);
    }
  }, []);

  // If navigating client-side, the script may already be loaded and `onLoad` won't fire.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.maps) {
      setIsGoogleMapsLoaded(true);
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToShopUpdates((updatedShops) => {
      setShops(updatedShops);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter shops when category selection changes
  useEffect(() => {
    const categoryFiltered = selectedCategories.includes('all')
      ? shops
      : shops.filter((shop) => selectedCategories.includes(shop.category as ShopCategory));

    // Apply vicinity filter only if we have user location.
    const vicinityFiltered = userLocation
      ? categoryFiltered.filter((shop) => {
          const d = distanceKm(userLocation, shop.location);
          return d <= vicinityKm;
        })
      : categoryFiltered;

    setFilteredShops(vicinityFiltered);
  }, [shops, selectedCategories, userLocation, vicinityKm]);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  const dismissTripRoute = () => {
    clearActiveTripRoute();
    setActiveTrip(null);
    setShowTripRoute(false);
  };

  const loadShops = async () => {
    setIsLoadingShops(true);
    try {
      const fetchedShops = await getAllShopsForMap();
      setShops(fetchedShops);
    } catch (error) {
      console.error('Error loading shops:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shops. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingShops(false);
    }
  };

  const handleCategoryToggle = (category: ShopCategory | 'all') => {
    if (category === 'all') {
      setSelectedCategories(['all']);
    } else {
      setSelectedCategories(prev => {
        // Remove 'all' if selecting a specific category
        const withoutAll = prev.filter(c => c !== 'all');
        
        if (withoutAll.includes(category)) {
          // Remove category if already selected
          const updated = withoutAll.filter(c => c !== category);
          // If no categories selected, default to 'all'
          return updated.length === 0 ? ['all'] : updated;
        } else {
          // Add category
          return [...withoutAll, category];
        }
      });
    }
  };

  const handleGoogleMapsLoad = () => {
    setIsGoogleMapsLoaded(true);
  };

  return (
    <>
      {/* Load Google Maps Script */}
      {GOOGLE_MAPS_API_KEY && !isGoogleMapsLoaded && (
        <Script
          id="google-maps-js"
          src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`}
          onLoad={handleGoogleMapsLoad}
          strategy="afterInteractive"
        />
      )}

      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="bg-white border-b shadow-sm z-10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <MapIcon className="h-6 w-6 text-primary shrink-0" />
                <h1 className="text-xl font-bold truncate">
                  {activeTrip && showTripRoute ? 'Your trip route' : 'Nearby Shops'}
                </h1>
              </div>
              {activeTrip && (
                <div className="flex items-center gap-1 shrink-0">
                  {!showTripRoute && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setShowTripRoute(true)}
                    >
                      <Navigation className="h-3.5 w-3.5 mr-1" />
                      Route
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={dismissTripRoute}
                    aria-label="Dismiss trip route"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {activeTrip && showTripRoute && (
              <div className="mb-3 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">
                  {activeTrip.pickupStops.length} pickup stop
                  {activeTrip.pickupStops.length === 1 ? '' : 's'} · optimized route
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {activeTrip.pickupStops.map((s) => s.name).join(' → ')} → destination
                </p>
              </div>
            )}

            {/* Category filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORY_FILTERS.map((filter) => {
                const isSelected = selectedCategories.includes(filter.category);
                return (
                  <Badge
                    key={filter.category}
                    onClick={() => handleCategoryToggle(filter.category)}
                    className={`cursor-pointer whitespace-nowrap transition-colors ${
                      isSelected ? filter.activeColor : filter.color
                    }`}
                  >
                    <span className="mr-1">{filter.icon}</span>
                    {filter.label}
                  </Badge>
                );
              })}
            </div>

            {/* Shop count */}
            <div className="mt-2 text-sm text-muted-foreground">
              {isLoadingShops ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading shops...</span>
                </div>
              ) : (
                <span>
                  Showing {filteredShops.length} {filteredShops.length === 1 ? 'shop' : 'shops'}
                  {' '}({filteredShops.filter(s => s.isOpen).length} open now)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {!isGoogleMapsLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          ) : activeTrip && showTripRoute ? (
            <TripRouteMap
              startLocation={activeTrip.startLocation}
              destination={activeTrip.destination}
              pickupStops={activeTrip.pickupStops}
              mapsReady={isGoogleMapsLoaded}
              className="w-full h-full"
            />
          ) : (
            <>
              <ShopMap
                shops={filteredShops}
                userLocation={userLocation}
                className="w-full h-full"
              />

              {/* Vicinity slider overlay */}
              <div className="absolute left-3 right-3 bottom-20 md:bottom-24 z-10">
                <div className="rounded-xl border bg-white/95 backdrop-blur px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <Label className="text-sm font-medium">Distance</Label>
                    <div className="text-sm text-muted-foreground tabular-nums">
                      Up to <span className="font-semibold text-foreground">{vicinityKm}</span> km
                    </div>
                  </div>
                  <Slider
                    value={[vicinityKm]}
                    min={1}
                    max={20}
                    step={1}
                    onValueChange={(v) => setVicinityKm(v[0] ?? 5)}
                  />
                  {!userLocation && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Turn on location to filter shops by distance.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
