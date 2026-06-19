'use client';

import * as React from 'react';
import { Bookmark, BookmarkPlus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  PRESET_DESTINATION_LABELS,
  type SavedDestination,
  type SavedDestinationLabelType,
} from '@/types/saved-destinations';

type LocationDraft = {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string | null;
};

type Props = {
  firebaseUid: string | null;
  destinations: SavedDestination[];
  loading?: boolean;
  /** Current destination field (for save-as flow) */
  destinationDraft: LocationDraft | null;
  onApplyDestination: (destination: SavedDestination) => void;
  onSaveDestination: (input: {
    labelType: SavedDestinationLabelType;
    customLabel?: string;
    address: string;
    latitude: number;
    longitude: number;
    placeId?: string | null;
  }) => Promise<SavedDestination>;
  onDeleteDestination: (id: string) => Promise<void>;
};

export function SavedDestinationsPanel({
  firebaseUid,
  destinations,
  loading,
  destinationDraft,
  onApplyDestination,
  onSaveDestination,
  onDeleteDestination,
}: Props) {
  const { toast } = useToast();
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [saveLabelType, setSaveLabelType] = React.useState<SavedDestinationLabelType>('home');
  const [customLabel, setCustomLabel] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const presetMap = React.useMemo(() => {
    const map = new Map<string, SavedDestination>();
    for (const dest of destinations) {
      if (dest.labelType !== 'other') map.set(dest.labelType, dest);
    }
    return map;
  }, [destinations]);

  const otherDestinations = destinations.filter((d) => d.labelType === 'other');

  const openSaveDialog = (labelType: SavedDestinationLabelType) => {
    if (!firebaseUid) {
      toast({
        title: 'Sign in required',
        description: 'Log in to save destinations to your account.',
        variant: 'destructive',
      });
      return;
    }
    if (!destinationDraft) {
      toast({
        title: 'Choose a destination first',
        description: 'Search or pick a destination on the map, then save it.',
        variant: 'destructive',
      });
      return;
    }
    setSaveLabelType(labelType);
    setCustomLabel('');
    setSaveDialogOpen(true);
  };

  const handleSave = async () => {
    if (!destinationDraft) return;
    if (saveLabelType === 'other' && !customLabel.trim()) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter a name for this place.' });
      return;
    }

    setSaving(true);
    try {
      await onSaveDestination({
        labelType: saveLabelType,
        customLabel: saveLabelType === 'other' ? customLabel.trim() : undefined,
        address: destinationDraft.address,
        latitude: destinationDraft.latitude,
        longitude: destinationDraft.longitude,
        placeId: destinationDraft.placeId,
      });
      toast({
        title: 'Destination saved',
        description: 'You can tap it anytime to fill your route.',
      });
      setSaveDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground font-medium">Saved places</Label>
        {destinationDraft && firebaseUid && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs"
            onClick={() => openSaveDialog('other')}
          >
            <BookmarkPlus className="mr-1 h-3 w-3" />
            Save destination
          </Button>
        )}
      </div>

      {!firebaseUid ? (
        <p className="text-xs text-muted-foreground">
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => { window.location.href = '/login'; }}
          >
            Sign in
          </button>{' '}
          to save Home, Office, Gym and custom places.
        </p>
      ) : loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading saved places…
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {PRESET_DESTINATION_LABELS.map((preset) => {
            const saved = presetMap.get(preset.type);
            return (
              <div key={preset.type} className="flex items-center gap-1">
                <Button
                  type="button"
                  variant={saved ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-7 rounded-lg px-2 text-xs"
                  onClick={() => {
                    if (saved) onApplyDestination(saved);
                    else openSaveDialog(preset.type);
                  }}
                >
                  <span className="mr-1">{preset.emoji}</span>
                  {preset.title}
                  {saved && <Bookmark className="h-3 w-3 ml-1 fill-current" />}
                </Button>
                {saved && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteDestination(saved.id)}
                    aria-label={`Remove ${preset.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}

          {otherDestinations.map((dest) => (
            <div key={dest.id} className="flex items-center gap-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 max-w-[130px] truncate rounded-lg px-2 text-xs"
                onClick={() => onApplyDestination(dest)}
                title={dest.address}
              >
                <Badge variant="outline" className="mr-1 text-[10px] px-1 py-0">
                  Other
                </Badge>
                {dest.displayLabel}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDeleteDestination(dest.id)}
                aria-label={`Remove ${dest.displayLabel}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 rounded-lg px-2 text-xs"
            onClick={() => openSaveDialog('other')}
          >
            + Other
          </Button>
        </div>
      )}

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save destination</DialogTitle>
            <DialogDescription>
              {destinationDraft?.address || 'Current destination will be saved to your account.'}
            </DialogDescription>
          </DialogHeader>

          {saveLabelType === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="custom-dest-name">Custom name</Label>
              <Input
                id="custom-dest-name"
                placeholder="e.g. Parents house, Cricket ground"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save as {saveLabelType === 'other' ? 'Other' : saveLabelType.charAt(0).toUpperCase() + saveLabelType.slice(1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
