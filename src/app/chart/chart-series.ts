// Shared contract: see nimbalyst-local/plans/drag-and-drop-metrics-builder.md
export interface ChartSeries {
  label: string;
  points: { t: number; v: number }[]; // t = unix ms
}
