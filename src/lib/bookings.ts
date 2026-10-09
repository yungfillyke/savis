// Jobs / bookings — Supabase first, localStorage fallback for offline/demo

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
    locationAccuracy:
      row.location_accuracy == null ? undefined : Number(row.location_accuracy),
    scheduledFor: row.scheduled_for ? String(row.scheduled_for) : undefined,
  };
}

/** Load all jobs (newest first). Tries Supabase, falls back to local. */
export async function fetchBookings(
  scope: "all" | "consumer" = "all"
): Promise<Booking[]> {
  try {
    const supabase = createClient();
    let query = supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (scope === "consumer") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      query = query.eq("consumer_id", user.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (data) return data.map(rowToBooking);
  } catch {
    // table missing or network — use local
  }
  return fromLocal();
}

export function getBookings(): Booking[] {
  return fromLocal();
}

export async function addBooking(
  booking: Omit<Booking, "id" | "createdAt" | "status">
): Promise<Booking> {
  const supabase = createClient();
  let consumerId: string | undefined;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    consumerId = user?.id;
  } catch {
    /* ignore */
  }

  try {
    const baseInsert = {
      consumer_id: consumerId || null,
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

    let { data, error } = await supabase
      .from("jobs")
      .insert({
        ...baseInsert,
        latitude: booking.latitude ?? null,
        longitude: booking.longitude ?? null,
        location_accuracy: booking.locationAccuracy ?? null,
      })
      .select("*")
      .single();

    if (error) {
      const retry = await supabase
        .from("jobs")
        .insert(baseInsert)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (!error && data) {
      const b = rowToBooking(data);
      const list = fromLocal();
      list.unshift(b);
      saveLocal(list);
      return b;
    }
  } catch {
    /* fall through to local */
  }

  const local: Booking = {
    ...booking,
    id: Date.now().toString(),
    status: "requested",
    createdAt: new Date().toISOString(),
    consumerId,
  };
  const list = fromLocal();
  list.unshift(local);
  saveLocal(list);
  return local;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  note?: string,
  location?: { latitude?: number; longitude?: number }
): Promise<void> {
  const optimistic = fromLocal().map((b) =>
    b.id === id ? { ...b, status } : b
  );
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

    const { data } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) saveLocal(data.map(rowToBooking));
  } catch {
    // Demo/offline fallback: retain the optimistic local state.
  }
}

export function getOpenRequests(): Booking[] {
  return fromLocal().filter(
    (b) => b.status === "requested" || b.status === "quote_pending"
  );
}

export function getAcceptedJobs(): Booking[] {
  return fromLocal().filter((b) =>
    ["accepted", "en_route", "in_progress"].includes(b.status)
  );
}

/** Pull latest from server into local cache */
export async function syncBookings(): Promise<Booking[]> {
  const remote = await fetchBookings("all");
  if (remote.length > 0 || fromLocal().length === 0) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        saveLocal(data.map(rowToBooking));
        return data.map(rowToBooking);
      }
    } catch {
      /* keep local */
    }
  }
  return fromLocal();
}

export async function syncConsumerBookings(): Promise<Booking[]> {
  const remote = await fetchBookings("consumer");
  saveLocal(remote);
  return remote;
}
