'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CategoryCards } from '@/components/order/CategoryCards';
import { GroceryListEditor } from '@/components/order/GroceryListEditor';
import { FoodDiscovery } from '@/components/order/FoodDiscovery';
import { MedicineOrderPanel } from '@/components/medicine/MedicineOrderPanel';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import type { OrderCategory } from '@/types/order-flow';
import { MEDICINE_ENABLED } from '@/types/order-flow';

export default function OrderNeedsPage() {
  const router = useRouter();
  const flow = useOrderFlow();
  const [active, setActive] = React.useState<OrderCategory | null>(
    flow.categories[0] ?? null
  );

  React.useEffect(() => {
    if (flow.categories.length && !active) {
      setActive(flow.categories[0]);
    }
  }, [flow.categories, active]);

  const canContinue =
    flow.categories.length > 0 &&
    (flow.categories.includes('food') ||
      flow.categories.includes('medicine') ||
      (flow.categories.includes('grocery') && flow.groceryItems.length > 0));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">What do you need?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a category — we&apos;ll handle the rest on your route.
        </p>
      </div>

      <CategoryCards
        selected={flow.categories}
        onToggle={flow.toggleCategory}
        activeCategory={active}
        onSelectActive={setActive}
      />

      {active === 'grocery' && flow.categories.includes('grocery') && (
        <GroceryListEditor />
      )}

      {active === 'food' && flow.categories.includes('food') && <FoodDiscovery />}

      {MEDICINE_ENABLED && active === 'medicine' && flow.categories.includes('medicine') && (
        <MedicineOrderPanel
          startCoords={flow.routeCoords?.start ?? null}
          destCoords={flow.routeCoords?.dest ?? null}
          tripStartLabel={flow.startLocationQuery}
          tripDestLabel={flow.destinationQuery}
        />
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-12 rounded-xl"
          onClick={() => router.push('/order/destination')}
        >
          Back
        </Button>
        <Button
          type="button"
          className="flex-1 h-12 rounded-xl font-semibold"
          disabled={!canContinue}
          onClick={() => router.push('/order/optimize')}
        >
          Find options
        </Button>
      </div>
    </div>
  );
}
