"use client";

import { useEffect } from "react";

export function GoogleMapsDebug() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Log referrer information
    console.log('=== Google Maps Debug Info ===');
    console.log('Current URL:', window.location.href);
    console.log('Current Origin:', window.location.origin);
    console.log('Document Referrer:', document.referrer);
    console.log('Google Maps Available:', typeof window.google !== 'undefined');
    console.log('Google Maps Places Available:', typeof window.google?.maps?.places !== 'undefined');
    
    // Check API restrictions
    console.log('\n=== API Key Configuration Checklist ===');
    console.log('1. ✅ Application restrictions: Check if domain is allowed');
    console.log('   Required patterns:');
    console.log('   - https://thrulife.in/*');
    console.log('   - https://www.thrulife.in/*');
    console.log('\n2. ⚠️  API restrictions: Check if these APIs are enabled:');
    console.log('   - Maps JavaScript API (required)');
    console.log('   - Places API (required for autocomplete)');
    console.log('   - Geocoding API (optional, for fallback)');
    console.log('\n3. 🔍 Current domain:', window.location.hostname);
    console.log('   Make sure this exact domain is in the restrictions list');
    
    // Set up global authentication failure handler
    // This is called by Google Maps if there's an API key issue
    (window as any).gm_authFailure = () => {
      console.error('\n❌ Google Maps authentication failed');
      console.error('This could mean:');
      console.error('  1. API key is invalid or expired');
      console.error('  2. API key restrictions are blocking this domain');
      console.error('  3. Required APIs are not enabled (check API restrictions tab)');
      console.error('  4. Places API specifically might be blocked');
      console.error('Current domain:', window.location.hostname);
      console.error('\n💡 Solution:');
      console.error('  1. Go to Google Cloud Console → APIs & Services → Credentials');
      console.error('  2. Click on your API key');
      console.error('  3. Check "Application restrictions" → Add both domains');
      console.error('  4. Check "API restrictions" → Ensure "Maps JavaScript API" and "Places API" are allowed');
      console.error('  5. If using "Restrict key", make sure both APIs are in the allowed list');
    };
    
    // Check for API errors in console
    const originalError = console.error;
    console.error = (...args) => {
      // Use originalError to avoid infinite recursion
      try {
        const errorString = args.map(arg => 
          typeof arg === 'string' ? arg : String(arg)
        ).join(' ');
        
        if (errorString.includes('ApiTargetBlockedMapError')) {
          originalError('\n=== ApiTargetBlockedMapError Detected ===');
          originalError('⚠️  This error occurs when Places API tries to fetch suggestions');
          originalError('Current domain:', window.location.hostname);
          originalError('\n🔧 Troubleshooting steps:');
          originalError('  1. Verify API restrictions (not just application restrictions)');
          originalError('     - Go to API key settings → "API restrictions" tab');
          originalError('     - Ensure "Places API" is in the allowed list');
          originalError('  2. Verify application restrictions include:');
          originalError('     - https://thrulife.in/*');
          originalError('     - https://www.thrulife.in/*');
          originalError('  3. Wait 2-5 minutes after changes and hard refresh (Ctrl+Shift+R)');
          originalError('  4. Clear browser cache completely');
        }
      } catch (e) {
        // Fallback if there's any error in the check
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
      if (typeof window !== 'undefined') {
        delete (window as any).gm_authFailure;
      }
    };
  }, []);

  return null;
}
