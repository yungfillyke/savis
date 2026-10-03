// Jobs / bookings — Supabase first, localStorage fallback for offline/demo

import { createClient } from "@/lib/supabase/client";

export type BookingStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "completed";

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
  };
}

/** Load all jobs (newest first). Tries Supabase, falls back to local. */
export async function fetchBookings(): Promise<Booking[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

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

  // Try Supabase insert
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
      const retry = await supabase.from("jobs").insert(baseInsert).select("*").single();
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

  // Local fallback
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
  status: BookingStatus
): Promise<void> {
  // Always update local first for snappy UI
  const list = fromLocal().map((b) =>
    b.id === id ? { ...b, status } : b
  );
  // If id not in local, still try remote
  if (list.some((b) => b.id === id)) {
    saveLocal(list);
  } else {
    // rebuild from any local + mark
    saveLocal(
      fromLocal().map((b) => (b.id === id ? { ...b, status } : b))
    );
  }

  try {
    const supabase = createClient();
    await supabase.from("jobs").update({ status }).eq("id", id);
    // Refresh local from server when possible
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      saveLocal(data.map(rowToBooking));
    }
  } catch {
    /* local already updated */
  }
}

export function getOpenRequests(): Booking[] {
  return fromLocal().filter((b) => b.status === "requested");
}

export function getAcceptedJobs(): Booking[] {
  return fromLocal().filter((b) => b.status === "accepted");
}

/** Pull latest from server into local cache */
export async function syncBookings(): Promise<Booking[]> {
  const remote = await fetchBookings();
  if (remote.length > 0 || fromLocal().length === 0) {
    // Prefer remote when available
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
