'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FloatingCategoryTabs } from '@/components/order/FloatingCategoryTabs';
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
    if (flow.categories.length === 0) {
      setActive(null);
      return;
    }
    if (!active || !flow.categories.includes(active)) {
      setActive(flow.categories[0]);
    }
  }, [flow.categories, active]);

  const handleToggleCategory = (category: OrderCategory) => {
    flow.toggleCategory(category);
    setActive(category);
  };

  const canContinue =
    flow.categories.length > 0 &&
    (flow.categories.includes('food') ||
      flow.categories.includes('medicine') ||
      (flow.categories.includes('grocery') && flow.groceryItems.length > 0));

  return (
    <div className="space-y-4">
      <FloatingCategoryTabs
        selected={flow.categories}
        activeCategory={active}
        onToggle={handleToggleCategory}
        onSelectActive={setActive}
      />

      <div className="pt-2">
        <h2 className="text-2xl font-bold tracking-tight">What do you need?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add items and pick a stop on your route for each category.
        </p>
      </div>

      {flow.categories.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Tap a category above to get started.
        </p>
      )}

      {active === 'grocery' && flow.categories.includes('grocery') && <GroceryListEditor />}

      {active === 'food' && flow.categories.includes('food') && <FoodDiscovery />}

      {MEDICINE_ENABLED && active === 'medicine' && flow.categories.includes('medicine') && (
        <MedicineOrderPanel
          startCoords={flow.routeCoords?.start ?? null}
          destCoords={flow.routeCoords?.dest ?? null}
          tripStartLabel={flow.startLocationQuery}
          tripDestLabel={flow.destinationQuery}
        />
      )}

      <div className="flex gap-3 pt-4">
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
          onClick={() => router.push('/order/review')}
        >
          Continue to checkout
        </Button>
      </div>
    </div>
  );
}
