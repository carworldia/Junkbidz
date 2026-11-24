export const money = (n: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: Number(n) % 1 ? 2 : 0 }).format(Number(n));

export type Job = {
  id: string;
  customer_id: string;
  title: string;
  item_types: string[];
  load_size: string;
  access: string;
  hazardous: "no" | "yes" | "unsure";
  description: string;
  photos: string[];
  zip: string;
  city: string | null;
  pickup_date: string | null;
  pickup_window: string;
  budget: number | null;
  status: "open" | "hired" | "completed" | "cancelled";
  created_at: string;
};

export type Lead = Pick<Job, "id" | "title" | "item_types" | "load_size" | "access" | "hazardous" | "photos" | "zip" | "city" | "pickup_date" | "pickup_window" | "budget" | "created_at"> & {
  miles: number | null; quotes: number; my_quote_status: string | null;
};

export type QuoteRound = {
  by: "hauler" | "customer";
  action: "quote" | "counter" | "accept" | "decline" | "withdraw";
  price: number;
  message: string | null;
  at: string;
};

export type QuoteRow = {
  id: string;
  job_id: string;
  job_title: string;
  job_status: Job["status"];
  hauler_id: string;
  customer_id: string;
  business_name: string | null;
  hauler_avatar_url: string | null;
  hauler_phone: string | null;
  insured: boolean;
  rating: number | null;
  reviews: number;
  miles: number | null;
  rounds: QuoteRound[];
  status: "submitted" | "countered" | "accepted" | "declined" | "withdrawn";
  created_at: string;
  updated_at: string;
};

export type HaulerProfile = {
  user_id: string;
  business_name: string;
  description: string | null;
  item_types: string[];
  takes_hazardous: boolean;
  insured: boolean;
  zip: string;
  radius_miles: number;
  phone: string;
  avatar_url: string | null;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type InboxRow = {
  id: string;
  job_id: string;
  job_title: string;
  job_status: string;
  job_photo: string | null;
  other_name: string;
  other_avatar_url: string | null;
  i_am: "customer" | "hauler";
  last_body: string | null;
  last_at: string | null;
  last_sender_id: string | null;
  unread_count: number;
  updated_at: string;
};

export const lastPrice = (q: Pick<QuoteRow, "rounds">) => q.rounds[q.rounds.length - 1]?.price ?? 0;

// Is it my turn to answer this quote?
export const quoteWaitingOn = (q: Pick<QuoteRow, "status" | "rounds" | "hauler_id" | "customer_id">, me: string) => {
  if (!["submitted", "countered"].includes(q.status)) return false;
  const last = q.rounds[q.rounds.length - 1];
  if (!last) return false;
  if (q.customer_id === me) return last.by === "hauler";
  if (q.hauler_id === me) return last.by === "customer";
  return false;
};
