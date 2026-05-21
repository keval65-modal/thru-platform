
import React from 'react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BusinessCategory, CATEGORY_LABELS } from '@/types/kyc';

interface CategorySelectionProps {
  selectedCategories: BusinessCategory[];
  onToggle: (category: BusinessCategory) => void;
}

export function CategorySelection({ selectedCategories, onToggle }: CategorySelectionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">What do you sell?</h2>
        <p className="text-muted-foreground">Select all categories that apply to your business.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Object.values(BusinessCategory).map((category) => {
          const isSelected = selectedCategories.includes(category);
          return (
            <div key={category} className="relative flex items-start space-x-3 rounded-md border p-4 shadow-sm hover:bg-accent/5 transition-colors cursor-pointer"
                 onClick={() => onToggle(category)}
            >
              <Checkbox 
                id={category} 
                checked={isSelected}
                onCheckedChange={() => onToggle(category)}
                className="mt-1"
              />
              <div className="space-y-1 leading-none w-full">
                <Label
                  htmlFor={category}
                  className="font-medium cursor-pointer"
                >
                  {CATEGORY_LABELS[category]}
                </Label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
