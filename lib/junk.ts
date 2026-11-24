// Job options. The ids are stored in the database (and checked there), so only change the labels.

export const ITEM_TYPES = [
  { id: "furniture", label: "Furniture", hint: "Couches, beds, tables" },
  { id: "appliances", label: "Appliances", hint: "Fridges, washers, stoves" },
  { id: "electronics", label: "Electronics", hint: "TVs, computers" },
  { id: "mattresses", label: "Mattresses", hint: "Mattresses, box springs" },
  { id: "yard", label: "Yard waste", hint: "Branches, brush, soil" },
  { id: "construction", label: "Construction debris", hint: "Drywall, wood, tile" },
  { id: "household", label: "Household junk", hint: "Bags, boxes, clutter" },
  { id: "cleanout", label: "Full cleanout", hint: "Garage, basement, estate" },
  { id: "hot_tub", label: "Hot tub / shed", hint: "Large items to take apart" },
  { id: "metal", label: "Scrap metal", hint: "Bikes, grills, metal" },
  { id: "other", label: "Something else", hint: "Tell them in the details" },
] as const;
export type ItemType = (typeof ITEM_TYPES)[number]["id"];

export const LOAD_SIZES = [
  { id: "single", label: "One item", hint: "A couch, a fridge" },
  { id: "small", label: "Small load", hint: "Fits in a pickup bed" },
  { id: "half", label: "Half truck", hint: "A room's worth" },
  { id: "full", label: "Full truck", hint: "A garage or basement" },
  { id: "multiple", label: "More than a truck", hint: "Whole house or big project" },
] as const;

export const ACCESS = [
  { id: "curbside", label: "Curbside / driveway" },
  { id: "garage", label: "In the garage" },
  { id: "ground_floor", label: "Inside, ground floor" },
  { id: "upstairs", label: "Inside, upstairs or basement" },
] as const;

export const HAZARDOUS = [
  { id: "no", label: "No" },
  { id: "yes", label: "Yes" },
  { id: "unsure", label: "Not sure" },
] as const;

export const WINDOWS = [
  { id: "flexible", label: "Any time" },
  { id: "morning", label: "Morning (8–11)" },
  { id: "midday", label: "Midday (11–2)" },
  { id: "afternoon", label: "Afternoon (2–5)" },
  { id: "evening", label: "Evening (5–8)" },
] as const;

export const RADII = [10, 25, 50, 75, 100] as const;

const find = (list: readonly { id: string; label: string }[], id: string | null | undefined) =>
  list.find((x) => x.id === id)?.label ?? id ?? "";
export const itemLabel = (id: string) => find(ITEM_TYPES, id);
export const itemsLabel = (ids: string[]) => ids.map(itemLabel).join(", ");
export const loadLabel = (id: string) => find(LOAD_SIZES, id);
export const accessLabel = (id: string) => find(ACCESS, id);
export const windowLabel = (id: string) => find(WINDOWS, id);
export const hazardLabel = (id: string) => (id === "yes" ? "Has hazardous items" : id === "unsure" ? "May have hazardous items" : "No hazardous items");

export const autoTitle = (ids: string[]) =>
  ids.length === 0 ? "Junk removal" : ids.length === 1 ? `${itemLabel(ids[0])} removal` : `${itemLabel(ids[0])} + ${ids.length - 1} more`;

export const JOB_STATUS: Record<string, string> = {
  open: "Getting quotes", hired: "Hired", completed: "Done", cancelled: "Cancelled",
};
export const QUOTE_STATUS: Record<string, string> = {
  submitted: "New quote", countered: "You countered", accepted: "Hired", declined: "Closed", withdrawn: "Withdrawn",
};

export const pickupLabel = (date: string | null, win: string) => {
  const d = date ? new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(date)) : "Any day";
  return `${d} · ${windowLabel(win)}`;
};

export const awayLabel = (miles: number | null | undefined) =>
  miles == null ? null : miles < 1 ? "under 1 mi away" : `${Math.round(miles)} mi away`;
