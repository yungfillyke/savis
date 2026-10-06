"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AccountMenu from "@/components/AccountMenu";
import Logo from "@/components/Logo";
import LangToggle from "@/components/LangToggle";
import { t, getLang, setLang, type Lang } from "@/lib/i18n";
import { distanceKm, getSavedLocation, requestCurrentLocation, type UserLocation } from "@/lib/location";
import { syncConsumerBookings, type Booking } from "@/lib/bookings";
import SavisMap, { type SavisMapProvider } from "@/components/SavisMap";
import { getOrCreateConversation, listConversations, sendMessage, subscribeToConversations, type Conversation } from "@/lib/messaging";
import SavisOnboarding from "@/components/SavisOnboarding";

type Profile = { full_name: string | null; role: string | null; email: string | null };

type Provider = {
  id: string;
  name: string;
  skill: string;
  area: string;
  km: number;
  rate: number;
  rating: number;
  reviews: number;
  icon: string;
  available: string;
  tags: string[];
  latitude?: number;
  longitude?: number;
  verified?: boolean;
  verificationLevel?: "blue" | "gold" | "black";
  bio?: string;
  avatarUrl?: string;
};

const CATEGORIES = [
  ["all", "All", "✨"], ["Plumbing", "Plumbing", "🔧"], ["Electrical", "Electrical", "⚡"],
  ["Masonry", "Masonry", "🧱"], ["Mechanics", "Mechanics", "🚗"], ["Cleaning", "Cleaning", "🧹"],
  ["Carpentry", "Carpentry", "🪚"], ["Welding", "Welding", "🔥"], ["Tailoring", "Tailoring", "🧵"],
  ["Painting", "Painting", "🎨"], ["Hardware", "Hardware", "🏪"], ["Quantity Surveying", "QS", "📐"],
  ["Architecture", "Architecture", "🏛️"], ["Legal", "Legal", "⚖️"], ["Accounting", "Accounting", "🧾"],
  ["Engineering", "Engineering", "⚙️"], ["Photography", "Photo", "📷"],
];

/** Homepage category strip — matches design mockup labels */
const HOME_CATEGORIES = [
  ["Plumbing", "Wrench", "🔧"],
  ["Hardware", "Goods & Suppliers", "📦"],
  ["Masonry", "Construction", "🧱"],
  ["Mechanics", "Repairs & Maintenance", "⚙️"],
  ["Electrical", "Electrical", "⚡"],
];
