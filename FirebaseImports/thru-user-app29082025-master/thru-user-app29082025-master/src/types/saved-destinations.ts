export type SavedDestinationLabelType = 'home' | 'office' | 'gym' | 'other';

export type SavedDestination = {
  id: string;
  firebaseUid: string;
  labelType: SavedDestinationLabelType;
  customLabel: string | null;
  displayLabel: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DestinationTravelPattern = {
  id: string;
  firebaseUid: string;
  savedDestinationId: string | null;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  departureHour: number;
  departureMinute: number;
  dayOfWeek: number;
  isImmediate: boolean;
  occurrenceCount: number;
  lastUsedAt: string;
};

export const PRESET_DESTINATION_LABELS: {
  type: Exclude<SavedDestinationLabelType, 'other'>;
  title: string;
  emoji: string;
}[] = [
  { type: 'home', title: 'Home', emoji: '🏠' },
  { type: 'office', title: 'Office', emoji: '💼' },
  { type: 'gym', title: 'Gym', emoji: '🏋️' },
];

export function savedDestinationDisplayLabel(
  labelType: SavedDestinationLabelType,
  customLabel?: string | null
): string {
  if (labelType === 'other') return (customLabel || 'Other').trim();
  const preset = PRESET_DESTINATION_LABELS.find((p) => p.type === labelType);
  return preset?.title ?? labelType;
}
