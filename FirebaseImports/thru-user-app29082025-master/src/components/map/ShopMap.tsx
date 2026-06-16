"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ShopMarkerData, ShopCategory } from '@/types/map-types';
import { getHoursDisplayLine, getShopStatus } from '@/utils/operating-hours';
import { distanceKm, formatDistanceKm } from '@/lib/geo-utils';

interface ShopMapProps {
  shops: ShopMarkerData[];
  userLocation?: { latitude: number; longitude: number };
  onShopSelect?: (shop: ShopMarkerData) => void;
  className?: string;
}

// Category colors
const CATEGORY_COLORS = {
  cafe: '#8B4513',
  restaurant: '#FF6B35',
  medical: '#DC143C',
  grocery: '#32CD32',
  other: '#6B7280'
};

const THRU_LOGO_PNG_BASE64 =
  "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";

function escapeXmlAttr(input: string) {
  return input.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getCategoryIconPath(category: ShopCategory) {
  // Minimal vector icons (stroke-based) to keep markers crisp at small sizes.
  switch (category) {
    case ShopCategory.CAFE:
      // Cup
      return `<path d="M12 11h9v6a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3v-6Z" />
<path d="M21 12h2a2 2 0 0 1 0 4h-2" />
<path d="M13 21h8" />`;
    case ShopCategory.RESTAURANT:
      // Fork & knife
      return `<path d="M12 10v12" />
<path d="M10 10v5a2 2 0 0 0 2 2" />
<path d="M14 10v5a2 2 0 0 1-2 2" />
<path d="M19 10v12" />
<path d="M21 10v6a2 2 0 0 1-2 2h0" />`;
    case ShopCategory.MEDICAL:
      // Medical cross
      return `<path d="M16 9v14" />
<path d="M9 16h14" />
<path d="M12 12h8v8h-8z" fill="none" />`;
    case ShopCategory.GROCERY:
      // Cart
      return `<path d="M10 11h12l-1.2 6.5a2 2 0 0 1-2 1.5h-6.8a2 2 0 0 1-2-1.6L8.8 8H7" />
<path d="M12 22a1 1 0 1 0 0 .01" />
<path d="M19 22a1 1 0 1 0 0 .01" />`;
    default:
      // Simple building
      return `<path d="M12 21V9l4-2 4 2v12" />
<path d="M10 21h12" />
<path d="M14 12h1" /><path d="M17 12h1" />
<path d="M14 15h1" /><path d="M17 15h1" />`;
  }
}

function createShopMarkerSvg({
  category,
  isOpen,
  color,
}: {
  category: ShopCategory;
  isOpen: boolean;
  color: string;
}) {
  const opacity = isOpen ? 1 : 0.5;
  const iconPath = getCategoryIconPath(category);

  // Compact pin: circle + small pointer, with icon + Thru logo inside.
  // Designed to be readable without overwhelming the map.
  return `
<svg width="44" height="56" viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-opacity="0.25"/>
    </filter>
    <clipPath id="r">
      <rect x="11" y="27" width="22" height="10" rx="3" />
    </clipPath>
  </defs>
  <g filter="url(#s)" opacity="${opacity}">
    <path d="M22 54c6-8 15-18 15-28a15 15 0 1 0-30 0c0 10 9 20 15 28Z" fill="${escapeXmlAttr(color)}" stroke="#ffffff" stroke-width="2"/>
    <g transform="translate(0,0)">
      <g transform="translate(0,0)" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <g transform="translate(6,2)">
          ${iconPath}
        </g>
      </g>
      <rect x="11" y="27" width="22" height="10" rx="3" fill="#ffffff" opacity="0.95" />
      <g clip-path="url(#r)">
        <image href="data:image/png;base64,${THRU_LOGO_PNG_BASE64}" x="11" y="25" width="22" height="14" preserveAspectRatio="xMidYMid meet"/>
      </g>
    </g>
  </g>
</svg>
  `.trim();
}

// Category labels and colors for badges
const CATEGORY_INFO = {
  [ShopCategory.CAFE]: { label: 'Cafe', color: '#f59e0b' },
  [ShopCategory.RESTAURANT]: { label: 'Restaurant', color: '#f97316' },
  [ShopCategory.MEDICAL]: { label: 'Medical', color: '#dc2626' },
  [ShopCategory.GROCERY]: { label: 'Grocery', color: '#16a34a' },
  [ShopCategory.OTHER]: { label: 'Other', color: '#6b7280' }
};

// Generate HTML content for info window
function createInfoWindowContent(
  shop: ShopMarkerData,
  userLocation?: { latitude: number; longitude: number }
): string {
  const categoryInfo = CATEGORY_INFO[shop.category];
  const status = getShopStatus(shop.operatingHours);
  const hoursLine = getHoursDisplayLine(shop.operatingHours);
  const distanceLine =
    userLocation &&
    shop.location.latitude &&
    shop.location.longitude
      ? formatDistanceKm(distanceKm(userLocation, shop.location))
      : null;
  
  // Determine redirect URL - go to dedicated vendor ordering page
  const redirectUrl = `/vendor/${shop.id}`;
  
  return `
    <div style="padding: 12px; min-width: 280px; max-width: 320px; font-family: system-ui, -apple-system, sans-serif;">
      <!-- Header -->
      <div style="margin-bottom: 8px;">
        <div style="display: flex; align-items: start; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; line-height: 1.3;">${shop.name}</h3>
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; background-color: ${categoryInfo.color}20; color: ${categoryInfo.color}; white-space: nowrap;">
            ${categoryInfo.label}
          </span>
        </div>
        
        <!-- Status badge -->
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; ${status.isOpen ? 'background-color: #16a34a; color: white;' : 'background-color: #9ca3af; color: white;'}">
          ${status.isOpen ? 'Open Now' : 'Closed'}
        </span>
      </div>

      ${distanceLine ? `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; color: #111827; font-weight: 500;">
          <svg style="width: 16px; height: 16px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
          </svg>
          <span>${distanceLine}</span>
        </div>
      ` : ''}

      <!-- Product Images (if available) -->
      ${shop.images && shop.images.length > 0 ? `
        <div style="margin-bottom: 8px; display: flex; gap: 4px; overflow-x: auto;">
          ${shop.images.slice(0, 3).map((img: string) => `
            <img src="${img}" alt="Product" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; flex-shrink: 0;" />
          `).join('')}
        </div>
      ` : ''}

      <!-- Cuisine (for restaurants/cafes) -->
      ${shop.cuisine && (shop.category === ShopCategory.RESTAURANT || shop.category === ShopCategory.CAFE) ? `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; color: #4b5563;">
          <svg style="width: 16px; height: 16px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          <span>${shop.cuisine}</span>
        </div>
      ` : ''}

      <!-- Address -->
      ${shop.address ? `
        <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 8px; font-size: 13px; color: #4b5563;">
          <svg style="width: 16px; height: 16px; margin-top: 2px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <span style="line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${shop.address}</span>
        </div>
      ` : ''}

      <!-- Operating hours -->
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 13px; color: #4b5563;">
        <svg style="width: 16px; height: 16px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>${hoursLine}</span>
      </div>

      <!-- Action button -->
      <button 
        onclick="window.location.href='${redirectUrl}'"
        style="width: 100%; padding: 8px 16px; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: ${shop.isOpen ? 'pointer' : 'not-allowed'}; ${shop.isOpen ? 'background-color: #000; color: white;' : 'background-color: #e5e7eb; color: #9ca3af;'} display: flex; align-items: center; justify-content: center; gap: 8px;"
        ${!shop.isOpen ? 'disabled' : ''}
      >
        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        ${shop.isOpen ? 'Select & Order' : 'Closed'}
      </button>
    </div>
  `;
}

export function ShopMap({ shops, userLocation, onShopSelect, className = '' }: ShopMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Maps is loaded
    if (typeof window === 'undefined' || !window.google?.maps) {
      setError('Google Maps is not loaded');
      setIsLoading(false);
      return;
    }

    if (!mapRef.current) {
      setIsLoading(false);
      return;
    }

    try {
      // Determine initial center
      let center = { lat: 12.9716, lng: 77.5946 }; // Default: Bangalore
      
      if (userLocation) {
        center = { lat: userLocation.latitude, lng: userLocation.longitude };
      } else if (shops.length > 0) {
        center = { lat: shops[0].location.latitude, lng: shops[0].location.longitude };
      }

      // Initialize map
      const map = new google.maps.Map(mapRef.current, {
        zoom: 13,
        center,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      googleMapRef.current = map;

      // Create info window
      infoWindowRef.current = new google.maps.InfoWindow();

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add shop markers
      const bounds = new google.maps.LatLngBounds();

      shops.forEach((shop) => {
        const position = { lat: shop.location.latitude, lng: shop.location.longitude };
        
        // Get category color
        const color = CATEGORY_COLORS[shop.category] || CATEGORY_COLORS.other;
        const svg = createShopMarkerSvg({ category: shop.category, isOpen: shop.isOpen, color });

        const marker = new google.maps.Marker({
          position,
          map,
          title: shop.name,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
            scaledSize: new google.maps.Size(44, 56),
            anchor: new google.maps.Point(22, 54),
          },
          opacity: shop.isOpen ? 1 : 0.6
        });

        // Add click listener
        marker.addListener('click', () => {
          if (onShopSelect) {
            onShopSelect(shop);
          }

          // Set info window content as HTML string
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(createInfoWindowContent(shop, userLocation));
            infoWindowRef.current.open(map, marker);
          }
        });

        markersRef.current.push(marker);
        bounds.extend(position);
      });

      // Add user location marker if available
      if (userLocation) {
        const userMarker = new google.maps.Marker({
          position: { lat: userLocation.latitude, lng: userLocation.longitude },
          map,
          title: 'Your Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          zIndex: 1000
        });

        markersRef.current.push(userMarker);
        bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });
      }

      // Fit map to show all markers
      if (shops.length > 0 || userLocation) {
        map.fitBounds(bounds);
        
        // Add padding
        const padding = { top: 80, right: 50, bottom: 100, left: 50 };
        map.fitBounds(bounds, padding);
        
        // Ensure minimum zoom level
        const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
          const currentZoom = map.getZoom();
          if (currentZoom && currentZoom > 15) {
            map.setZoom(15);
          }
        });
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to load map');
      setIsLoading(false);
    }

    // Cleanup
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, [shops, userLocation, onShopSelect]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
