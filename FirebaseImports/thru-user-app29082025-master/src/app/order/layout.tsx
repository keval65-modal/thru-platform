'use client';

import * as React from 'react';
import Script from 'next/script';
import { OrderFlowProvider } from '@/contexts/OrderFlowContext';
import { OrderStepper } from '@/components/order/OrderStepper';
import { OrderCart } from '@/components/order/OrderCart';
import BottomNav from '@/components/layout/bottom-nav';

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  const [mapsReady, setMapsReady] = React.useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).initOrderMaps = () => setMapsReady(true);
    }
  }, []);

  return (
    <OrderFlowProvider>
      {apiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initOrderMaps`}
          strategy="afterInteractive"
        />
      )}
      <div className="min-h-screen bg-background pb-36">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40 px-4 py-2">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <span className="font-bold text-lg text-primary">Thru</span>
            <div className="flex-1">
              <OrderStepper />
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-4">{children}</main>
      </div>
      <OrderCart />
      <BottomNav />
    </OrderFlowProvider>
  );
}
