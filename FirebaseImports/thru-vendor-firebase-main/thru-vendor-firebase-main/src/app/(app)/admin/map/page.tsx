'use client';

import { useEffect, useState, useRef } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, Filter } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import { getVendorsForMap } from '../actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cellToBoundary, latLngToCell, cellToLatLng } from 'h3-js';

const CATEGORY_COLORS: Record<string, string> = {
  grocery: '#22c55e', // green-500
  restaurant: '#f97316', // orange-500
  pharmacy: '#3b82f6', // blue-500
  retail: '#a855f7', // purple-500
  boutique: '#ec4899', // pink-500
  bakery: '#eab308', // yellow-500
  cafe: '#06b6d4', // cyan-500
  electronics: '#64748b', // slate-500
  liquor: '#ef4444', // red-500
  pet: '#84cc16', // lime-500
  gift: '#f43f5e', // rose-500
  other: '#94a3b8', // slate-400
  unknown: '#94a3b8', // slate-400
};

function normalizeCategory(raw?: string) {
  const v = (raw || '').trim().toLowerCase();
  if (!v) return 'unknown';
  // common normalizations
  if (v.includes('grocery')) return 'grocery';
  if (v.includes('restaurant')) return 'restaurant';
  if (v.includes('pharmacy') || v.includes('medical')) return 'pharmacy';
  if (v.includes('boutique')) return 'boutique';
  if (v.includes('bakery')) return 'bakery';
  if (v.includes('cafe')) return 'cafe';
  if (v.includes('electronic')) return 'electronics';
  if (v.includes('liquor')) return 'liquor';
  if (v.includes('pet')) return 'pet';
  if (v.includes('gift')) return 'gift';
  if (v.includes('retail')) return 'retail';
  return v;
}

function getCategoryColor(category?: string) {
  const key = normalizeCategory(category);
  return CATEGORY_COLORS[key] ?? CATEGORY_COLORS.unknown;
}

export default function MapCoveragePage() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    kycStatus: 'all',
    activeStatus: 'all',
    city: 'all',
  });
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const h3PolygonsRef = useRef<google.maps.Polygon[]>([]);

  useEffect(() => {
    async function fetchVendors() {
      setIsLoading(true);
      try {
        const result = await getVendorsForMap();
        if (result.vendors) {
          // Map the vendor data to include all needed fields
          const mappedVendors = result.vendors.map((vendor: any) => ({
            id: vendor.id,
            shopName: vendor.name,
            storeCategory: vendor.storeType,
            isActiveOnThru: vendor.isActiveOnThru,
            latitude: vendor.latitude,
            longitude: vendor.longitude,
            email: vendor.email,
            address: vendor.address,
            city: vendor.city,
            kycStatus: 'PENDING', // Default, can be enhanced later
          }));
          setVendors(mappedVendors);
        } else if (result.error) {
          console.error('Error fetching vendors:', result.error);
          toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load vendors' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchVendors();
  }, [toast]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current) return;
    
    // Don't wait for vendors - load map even if empty

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry'],
    });

    loader
      .load()
      .then((google) => {
        if (!mapRef.current) return;

        // Apply current filters to map rendering (pins + H3)
        const filteredForMap = vendors.filter((vendor) => {
          if (filters.category !== 'all' && normalizeCategory(vendor.storeCategory) !== normalizeCategory(filters.category)) return false;
          if (filters.kycStatus !== 'all' && vendor.kycStatus !== filters.kycStatus) return false;
          if (filters.activeStatus !== 'all') {
            const isActive = vendor.isActiveOnThru;
            if (filters.activeStatus === 'active' && !isActive) return false;
            if (filters.activeStatus === 'inactive' && isActive) return false;
          }
          if (filters.city !== 'all' && vendor.city && vendor.city !== filters.city) return false;
          return true;
        });

        const validVendors = filteredForMap.filter(
          (v) => v.latitude && v.longitude && v.latitude !== 0 && v.longitude !== 0
        );
        
        // Default center (Mumbai) if no vendors
        let centerLat = 19.0760;
        let centerLng = 72.8777;
        
        if (validVendors.length > 0) {
          centerLat = validVendors.reduce((sum, v) => sum + v.latitude, 0) / validVendors.length;
          centerLng = validVendors.reduce((sum, v) => sum + v.longitude, 0) / validVendors.length;
        } else if (vendors.length > 0) {
          toast({ title: 'Info', description: 'No vendors with valid locations found. Showing default map view.' });
        }

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: validVendors.length > 0 ? 12 : 10,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });

        mapInstanceRef.current = map;
        setIsMapLoaded(true);

        // Clear existing markers
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        // Add markers
        validVendors.forEach((vendor) => {
          const categoryColor = getCategoryColor(vendor.storeCategory);
          const isActive = Boolean(vendor.isActiveOnThru);

          const marker = new google.maps.Marker({
            position: { lat: vendor.latitude, lng: vendor.longitude },
            map,
            title: vendor.shopName,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              // Category color drives fill; inactive shops are faded for clarity
              fillColor: categoryColor,
              fillOpacity: 1,
              strokeColor: isActive ? '#ffffff' : '#ef4444',
              strokeWeight: isActive ? 2 : 3,
            },
            opacity: isActive ? 1 : 0.55,
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-weight: bold;">${vendor.shopName || 'N/A'}</h3>
                <p style="margin: 4px 0; color: #6b7280; font-size: 12px;"><strong>Category:</strong> ${vendor.storeCategory || 'N/A'}</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 12px;"><strong>KYC:</strong> ${vendor.kycStatus || 'PENDING'}</p>
                <p style="margin: 4px 0; color: #6b7280; font-size: 12px;"><strong>Status:</strong> ${vendor.isActiveOnThru ? 'Active' : 'Inactive'}</p>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          markersRef.current.push(marker);
        });

        // Fit bounds only if we have multiple valid vendors
        if (validVendors.length > 1) {
          const bounds = new google.maps.LatLngBounds();
          validVendors.forEach((vendor) => {
            bounds.extend({ lat: vendor.latitude, lng: vendor.longitude });
          });
          map.fitBounds(bounds);
        } else if (validVendors.length === 1) {
          // Center on single vendor
          map.setCenter({ lat: validVendors[0].latitude, lng: validVendors[0].longitude });
          map.setZoom(15);
        }

        // Function to get H3 resolution based on zoom level
        const getH3Resolution = (zoom: number): number => {
          if (zoom >= 15) return 10; // ~3.5km
          if (zoom >= 13) return 9;   // ~5km
          if (zoom >= 11) return 8;   // ~7km
          if (zoom >= 9) return 7;    // ~10km
          return 6; // ~14km for wider views
        };

        // Function to create H3 grid overlay
        const updateH3Grid = () => {
          if (!mapInstanceRef.current) return;

          // Clear existing polygons
          h3PolygonsRef.current.forEach((polygon) => polygon.setMap(null));
          h3PolygonsRef.current = [];

          const bounds = mapInstanceRef.current.getBounds();
          if (!bounds) return;

          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          const zoom = mapInstanceRef.current.getZoom() || 10;
          const resolution = getH3Resolution(zoom);

          // Get all H3 cells that cover the visible bounds
          const cells = new Set<string>();
          
          // Sample points across the bounds to find all relevant H3 cells
          const latStep = (ne.lat() - sw.lat()) / 20;
          const lngStep = (ne.lng() - sw.lng()) / 20;

          for (let lat = sw.lat(); lat <= ne.lat(); lat += latStep) {
            for (let lng = sw.lng(); lng <= ne.lng(); lng += lngStep) {
              try {
                const cell = latLngToCell(lat, lng, resolution);
                cells.add(cell);
              } catch (e) {
                console.warn('Error converting to H3 cell:', e);
              }
            }
          }

          // Count vendors in each cell
          const cellVendorCounts = new Map<string, number>();
          validVendors.forEach((vendor) => {
            try {
              const cell = latLngToCell(vendor.latitude, vendor.longitude, resolution);
              cellVendorCounts.set(cell, (cellVendorCounts.get(cell) || 0) + 1);
            } catch (e) {
              console.warn('Error converting vendor to H3 cell:', e);
            }
          });

          // Create polygons for each cell
          cells.forEach((cell) => {
            try {
              const boundary = cellToBoundary(cell); // Returns array of [lat, lng] pairs
              const count = cellVendorCounts.get(cell) || 0;

              // Determine color based on vendor count
              let fillColor = '#fee2e2'; // red-200 - Uncovered
              let strokeColor = '#dc2626'; // red-600
              let fillOpacity = 0.3;
              let strokeWeight = 1;

              if (count > 0) {
                if (count >= 5) {
                  fillColor = '#dcfce7'; // green-200 - Strong Coverage
                  strokeColor = '#16a34a'; // green-600
                  fillOpacity = 0.5;
                  strokeWeight = 2;
                } else if (count >= 3) {
                  fillColor = '#dbeafe'; // blue-200 - Medium Coverage
                  strokeColor = '#2563eb'; // blue-600
                  fillOpacity = 0.4;
                  strokeWeight = 1.5;
                } else {
                  fillColor = '#fef3c7'; // yellow-200 - Low Coverage
                  strokeColor = '#d97706'; // yellow-600
                  fillOpacity = 0.35;
                  strokeWeight = 1;
                }
              }

              const path = boundary.map((coord) => ({
                lat: coord[0], // cellToBoundary returns [lat, lng]
                lng: coord[1],
              }));

              const polygon = new google.maps.Polygon({
                paths: path,
                strokeColor,
                strokeOpacity: 0.6,
                strokeWeight,
                fillColor,
                fillOpacity,
                map: mapInstanceRef.current,
                zIndex: 1, // Behind markers
              });

              // Add info window on click
              const infoWindow = new google.maps.InfoWindow({
                content: `
                  <div style="padding: 8px; min-width: 150px;">
                    <h4 style="margin: 0 0 8px 0; font-weight: bold;">H3 Cell Coverage</h4>
                    <p style="margin: 4px 0; color: #6b7280; font-size: 12px;"><strong>Vendors:</strong> ${count}</p>
                    <p style="margin: 4px 0; color: #6b7280; font-size: 12px;"><strong>Resolution:</strong> ${resolution}</p>
                    <p style="margin: 4px 0; color: #6b7280; font-size: 10px; font-family: monospace;">${cell}</p>
                  </div>
                `,
              });

              polygon.addListener('click', () => {
                // Close all other info windows
                infoWindow.close();
                infoWindow.open(mapInstanceRef.current!, polygon);
              });

              h3PolygonsRef.current.push(polygon);
            } catch (e) {
              console.warn('Error creating H3 polygon:', e);
            }
          });
        };

        // Initial H3 grid
        updateH3Grid();

        // Update H3 grid on zoom and bounds changes
        const zoomListener = map.addListener('zoom_changed', updateH3Grid);
        const boundsListener = map.addListener('bounds_changed', updateH3Grid);
        const dragListener = map.addListener('dragend', updateH3Grid);

        // Store listeners for cleanup
        (map as any)._h3Listeners = [zoomListener, boundsListener, dragListener];
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load Google Maps' });
      });

    // Cleanup function
    return () => {
      if (mapInstanceRef.current && (mapInstanceRef.current as any)._h3Listeners) {
        const listeners = (mapInstanceRef.current as any)._h3Listeners;
        listeners.forEach((listener: google.maps.MapsEventListener) => {
          google.maps.event.removeListener(listener);
        });
      }
      h3PolygonsRef.current.forEach((polygon) => polygon.setMap(null));
      h3PolygonsRef.current = [];
    };
  }, [vendors, toast]);

  const filteredVendors = vendors.filter((vendor) => {
    if (filters.category !== 'all' && vendor.storeCategory !== filters.category) return false;
    if (filters.kycStatus !== 'all' && vendor.kycStatus !== filters.kycStatus) return false;
    if (filters.activeStatus !== 'all') {
      const isActive = vendor.isActiveOnThru;
      if (filters.activeStatus === 'active' && !isActive) return false;
      if (filters.activeStatus === 'inactive' && isActive) return false;
    }
    return true;
  });

  const categoryCounts = vendors.reduce((acc, vendor) => {
    const category = vendor.storeCategory || 'Unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Map / Coverage"
        description="Geographic coverage analysis and shop distribution"
        icon={MapPin}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Category</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="grocery">Grocery</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">KYC Status</Label>
              <Select
                value={filters.kycStatus}
                onValueChange={(value) => setFilters({ ...filters, kycStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Active Status</Label>
              <Select
                value={filters.activeStatus}
                onValueChange={(value) => setFilters({ ...filters, activeStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <Label className="mb-2 block">Coverage Legend</Label>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-200"></div>
                  <span>Uncovered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-200"></div>
                  <span>Low Coverage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-200"></div>
                  <span>Medium Coverage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-200"></div>
                  <span>Strong Coverage</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Area */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Shop Distribution Map</CardTitle>
            <CardDescription>
              {filteredVendors.length} shops displayed. Click markers for details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {!isMapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted z-10 rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              )}
              <div ref={mapRef} className="w-full h-[600px] rounded-lg border border-border" />
            </div>

            {/* Category Stats */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(categoryCounts).map(([category, count]) => (
                <div key={category} className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{category}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage Analysis</CardTitle>
          <CardDescription>
            H3 grid-based coverage layer showing vendor density by area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              The H3 hexagonal grid adapts to zoom levels and visually indicates coverage density:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Uncovered</strong> (Red): No vendors in the cell</li>
              <li><strong>Low Coverage</strong> (Yellow): 1-2 vendors</li>
              <li><strong>Medium Coverage</strong> (Blue): 3-4 vendors</li>
              <li><strong>Strong Coverage</strong> (Green): 5+ vendors</li>
            </ul>
            <p className="mt-2">
              Click on any hexagon cell to see vendor count and cell details. The grid resolution automatically adjusts based on zoom level.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
