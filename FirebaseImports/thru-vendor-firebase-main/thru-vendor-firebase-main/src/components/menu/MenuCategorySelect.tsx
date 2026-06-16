'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type MenuCategorySelectProps = {
  id?: string
  value: string
  categories: string[]
  onChange: (value: string) => void
  disabled?: boolean
}

export function MenuCategorySelect({
  id = 'category',
  value,
  categories,
  onChange,
  disabled = false,
}: MenuCategorySelectProps) {
  const listId = `${id}-suggestions`

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Category</Label>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type or pick a category"
        disabled={disabled}
        autoComplete="off"
      />
      <datalist id={listId}>
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      <p className="text-xs text-muted-foreground">
        Pick an existing category or type a new custom name.
      </p>
    </div>
  )
}
