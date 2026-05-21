"use client";

import Script from 'next/script';

export function GoogleMapsScript() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  // Add loading=async parameter as recommended by Google for better performance
  const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&v=weekly`;

  return (
    <Script
      id="google-maps-script"
      src={scriptUrl}
      strategy="afterInteractive"
      onError={(e) => {
        console.error('❌ Google Maps script failed to load:', e);
      }}
      onLoad={() => {
        console.log('✅ Google Maps script loaded successfully');
        if (typeof window !== 'undefined') {
          console.log('Current URL:', window.location.href);
          console.log('Referrer:', document.referrer);
          // Verify Maps API is actually available
          if (window.google?.maps) {
            console.log('✅ Google Maps API is available and ready');
          } else {
            console.warn('⚠️ Script loaded but window.google.maps is not available yet');
          }
        }
      }}
    />
  );
}
