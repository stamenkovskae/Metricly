/** Stable URL id for a preset, derived from its name ("Busiest endpoints" -> "busiest-endpoints"). */
export const recipeId = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
