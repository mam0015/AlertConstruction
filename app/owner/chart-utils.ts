export function smoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return points.length ? `M ${points[0].x} ${points[0].y}` : "";
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    const controlStartX = current.x + (next.x - previous.x) / 6;
    const controlStartY = current.y + (next.y - previous.y) / 6;
    const controlEndX = next.x - (after.x - current.x) / 6;
    const controlEndY = next.y - (after.y - current.y) / 6;
    path += ` C ${controlStartX.toFixed(1)} ${controlStartY.toFixed(1)}, ${controlEndX.toFixed(1)} ${controlEndY.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }
  return path;
}

export const categoryColors: Record<string, string> = {
  "Customer payment": "#f5c42e",
  "Progress payment": "#d4ad52",
  "Invoice": "#e2c07a",
  "Materials": "#689fd6",
  "Trade payment": "#64b885",
  "Labour": "#d08b58",
  "Plumbing": "#7aa8cf",
  "Electrical": "#c98fd0",
  "Equipment": "#8a8378",
  "Permits": "#d97878",
  "Other": "#778797",
};

export function colorForCategory(category: string) {
  return categoryColors[category] ?? "#778797";
}
