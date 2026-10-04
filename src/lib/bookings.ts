// Jobs / bookings — Supabase is the source of truth; localStorage is only a UI cache

import { createClient } from "@/lib/supabase/client";

export type BookingStatus =
  | "requested"
  | "quote_pending"
  | "accepted"
  | "en_route"
  | "in_progress"
  | "completed"
  | "declined"
  | "cancelled"
  | "rescheduled";

export type Booking = {
  id: string;
  providerId: string;
  providerName: string;
  skill: string;
  description: string;
  location: string;
  urgency: string;
  rate: number;
  status: BookingStatus;
  createdAt: string;
  consumerName?: string;
  consumerId?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  scheduledFor?: string;
};

const LOCAL_KEY = "savis_bookings";

function fromLocal(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocal(list: Booking[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("savis-bookings-updated"));
}

function rowToBooking(row: Record<string, unknown>): Booking {
  return {
    id: String(row.id),
    providerId: String(row.provider_id || ""),
    providerName: String(row.provider_name || ""),
    skill: String(row.skill || ""),
    description: String(row.description || ""),
    location: String(row.location || ""),
    urgency: String(row.urgency || "today"),
    rate: Number(row.rate) || 0,
    status: (row.status as BookingStatus) || "requested",
    createdAt: String(row.created_at || new Date().toISOString()),
    consumerId: row.consumer_id ? String(row.consumer_id) : undefined,
    latitude: row.latitude == null ? undefined : Number(row.latitude),
    longitude: row.longitude == null ? undefined : Number(row.longitude),
    locationAccuracy: row.location_accuracy == null ? undefined : Number(row.location_accuracy),
    scheduledFor: row.scheduled_for ? String(row.scheduled_for) : undefined,
  };
}

/** Load jobs from Supabase (newest first). Errors are returned to the caller. */
export async function fetchBookings(scope: "all" | "consumer" = "all"): Promise<Booking[]> {
  const supabase = createClient();
  let query = supabase.from("jobs").select("*").order("created_at", { ascending: false });

  if (scope === "consumer") {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) return [];
    query = query.eq("consumer_id", user.id);
  }

  const { data, error } = await query;
  if (error) throw error;

  const bookings = (data || []).map(rowToBooking);
  saveLocal(bookings);
  return bookings;
}

export function getBookings(): Booking[] {
  return fromLocal();
}

export async function addBooking(
  booking: Omit<Booking, "id" | "createdAt" | "status">
): Promise<Booking> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("You must be signed in to create a booking.");

  const baseInsert = {
    consumer_id: user.id,
    provider_id: booking.providerId,
    provider_name: booking.providerName,
    skill: booking.skill,
    description: booking.description,
    location: booking.location,
    urgency: booking.urgency,
    rate: booking.rate,
    status: "requested",
    scheduled_for: booking.scheduledFor ?? null,
  };

  const first = await supabase
    .from("jobs")
    .insert({
      ...baseInsert,
      latitude: booking.latitude ?? null,
      longitude: booking.longitude ?? null,
      location_accuracy: booking.locationAccuracy ?? null,
    })
    .select("*")
    .single();

  let data = first.data;
  let error = first.error;

  if (error) {
    const retry = await supabase.from("jobs").insert(baseInsert).select("*").single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  if (!data) throw new Error("SAVIS did not return the created booking.");

  const created = rowToBooking(data);
  const list = fromLocal().filter((item) => item.id !== created.id);
  list.unshift(created);
  saveLocal(list);
  return created;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  note?: string,
  location?: { latitude?: number; longitude?: number }
): Promise<void> {
  const previous = fromLocal();
  const optimistic = previous.map((b) => b.id === id ? { ...b, status } : b);
  saveLocal(optimistic);

  try {
    const supabase = createClient();
    const { error } = await supabase.rpc("transition_job", {
      p_job_id: id,
      p_next_status: status,
      p_note: note ?? null,
      p_latitude: location?.latitude ?? null,
      p_longitude: location?.longitude ?? null,
    });
    if (error) throw error;

    const { data, error: fetchError } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (fetchError) throw fetchError;
    saveLocal((data || []).map(rowToBooking));
  } catch (error) {
    saveLocal(previous);
    throw error;
  }
}

/** Read cached open requests; syncBookings must run first to refresh this cache. */
export function getOpenRequests(): Booking[] {
  return fromLocal().filter((b) => b.status === "requested");
}

export function getAcceptedJobs(): Booking[] {
  return fromLocal().filter((b) => b.status === "accepted");
}

/** Pull latest jobs from Supabase into the UI cache. */
export async function syncBookings(): Promise<Booking[]> {
  return fetchBookings("all");
}

export async function syncConsumerBookings(): Promise<Booking[]> {
  return fetchBookings("consumer");
}
