import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

// ── Client ────────────────────────────────────────────────────────────────────
const REAL_SUPABASE_URL = 'https://yqltkmvunvrzlsizseau.supabase.co';
const REAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbHRrbXZ1bnZyemxzaXpzZWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzkzOTYsImV4cCI6MjEwMTE1NTM5Nn0.E5fgZVlx_XVxwhlufYEaXa2GRwyi01aZv1w0uwASzw4';

const SUPABASE_URL     = (import.meta.env.VITE_SUPABASE_URL as string)     || REAL_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || REAL_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = true;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── User profile (stored in Supabase `profiles` table + localStorage cache) ──
export interface UserProfile {
  id: string;                 // = auth.user.id
  email: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  age: number;
  weightKg: number;
  heightCm: number;
  conditions: string[];
  medications: boolean;
  outdoor: boolean;
  // Medical
  bloodPressure?: 'normal' | 'elevated' | 'high';
  restingHeartRate?: number;
  sweatRate?: 'low' | 'normal' | 'heavy';
  pastHeatStrokeHistory?: boolean;
  acclimatizationDays?: number;
  dailyWaterGoalMl?: number;
  // Sun & skin
  skinType?: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
  sunSensitivity?: 'very_sensitive' | 'moderate' | 'resistant';
  sunExposureHoursPerDay?: number;
  // Hydration
  currentHydrationLevel?: 'dehydrated' | 'normal' | 'well_hydrated';
  dailyWaterIntakeMl?: number;
  bodyWaterPercent?: number;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string;
}

// Keep UserSession as alias for backward compatibility with existing pages
export type UserSession = UserProfile;

// ── localStorage cache ────────────────────────────────────────────────────────
const PROFILE_KEY = 'heatwatch_user_profile';

export function getCachedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function cacheProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearCachedProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
}

// ── Backward-compatible aliases ───────────────────────────────────────────────
export const getStoredUserSession = getCachedProfile;
export const saveUserSession      = cacheProfile;
export const clearUserSession     = clearCachedProfile;

// ── Auth helpers ──────────────────────────────────────────────────────────────

/** Sign up with email + password. Returns the new Supabase User. */
export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { user: null, error: error.message };
    return { user: data.user, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    if (msg.includes('Failed to fetch')) {
      return { user: null, error: 'Cannot connect to Supabase backend. Please check internet connection.' };
    }
    return { user: null, error: msg };
  }
}

/** Sign in with email + password. */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    return { user: data.user, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    if (msg.includes('Failed to fetch')) {
      return { user: null, error: 'Cannot connect to Supabase backend. Please check internet connection.' };
    }
    return { user: null, error: msg };
  }
}

/** Sign out from Supabase and clear local cache. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  clearCachedProfile();
  // Clear all app-local flags
  [
    'heatwatch_onboarded',
    'heatwatch_welcome_seen',
    'heatwatch_temp_unit',
    'heatwatch_checkin_shown_date',
    'heatwatch_daily_checkin',
    'heatwatch_feedback',
  ].forEach((k) => localStorage.removeItem(k));
}

/** Send a password-reset email. */
export async function sendPasswordReset(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  return { error: error ? error.message : null };
}

// ── Profile DB helpers ────────────────────────────────────────────────────────

/**
 * Upsert profile into `profiles` table.
 * The table must exist in your Supabase project — see SQL below.
 */
export async function upsertProfile(profile: UserProfile): Promise<{ error: string | null }> {
  // Always update local cache immediately so data is never lost
  cacheProfile(profile);

  if (!isSupabaseConfigured) {
    return { error: null };
  }

  // Flatten emergencyContact for DB storage
  const row = {
    id:                      profile.id,
    email:                   profile.email,
    name:                    profile.name,
    gender:                  profile.gender,
    age:                     profile.age,
    weight_kg:               profile.weightKg,
    height_cm:               profile.heightCm,
    conditions:              profile.conditions,
    medications:             profile.medications,
    outdoor:                 profile.outdoor,
    blood_pressure:          profile.bloodPressure,
    resting_heart_rate:      profile.restingHeartRate,
    sweat_rate:              profile.sweatRate,
    past_heat_stroke:        profile.pastHeatStrokeHistory,
    acclimatization_days:    profile.acclimatizationDays,
    daily_water_goal_ml:     profile.dailyWaterGoalMl,
    skin_type:               profile.skinType,
    sun_sensitivity:         profile.sunSensitivity,
    sun_exposure_hours:      profile.sunExposureHoursPerDay,
    hydration_level:         profile.currentHydrationLevel,
    daily_water_intake_ml:   profile.dailyWaterIntakeMl,
    body_water_percent:      profile.bodyWaterPercent,
    emergency_contact_name:  profile.emergencyContact?.name ?? 'Emergency Contact',
    emergency_contact_phone: profile.emergencyContact?.phone ?? '',
    emergency_contact_rel:   profile.emergencyContact?.relationship ?? 'Contact',
    created_at:              profile.createdAt || new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
    if (!error) return { error: null };

    console.warn('Supabase full upsert warning:', error.message);

    // Fallback 1: Explicit UPDATE query for existing user record
    const { error: updateErr } = await supabase
      .from('profiles')
      .update(row)
      .eq('id', profile.id);

    if (!updateErr) return { error: null };

    // Fallback 2: Core basic columns update
    const basicRow = {
      age:         profile.age,
      weight_kg:   profile.weightKg,
      height_cm:   profile.heightCm,
      conditions:  profile.conditions,
      medications: profile.medications,
    };

    const { error: basicErr } = await supabase
      .from('profiles')
      .update(basicRow)
      .eq('id', profile.id);

    if (!basicErr) return { error: null };

    console.warn('Supabase profile save error:', error.message || updateErr?.message || basicErr?.message);
    return { error: error.message || updateErr?.message || basicErr?.message || 'Database update rejected by Supabase RLS' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error';
    console.warn('Supabase upsert exception:', msg);
    return { error: msg };
  }
}

/**
 * Fetch profile from `profiles` table by user id.
 * Falls back to localStorage cache if offline.
 */
export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) {
    const cached = getCachedProfile();
    return cached?.id === userId ? cached : null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetchProfile note:', error.message);
    }

    if (!data) {
      const cached = getCachedProfile();
      return cached?.id === userId ? cached : null;
    }

    const profile: UserProfile = {
      id:                    data.id,
      email:                 data.email || '',
      name:                  data.name || '',
      gender:                data.gender,
      age:                   data.age ?? 28,
      weightKg:              data.weight_kg ?? 68,
      heightCm:              data.height_cm ?? 170,
      conditions:            data.conditions ?? [],
      medications:           data.medications ?? false,
      outdoor:               data.outdoor ?? false,
      bloodPressure:         data.blood_pressure,
      restingHeartRate:      data.resting_heart_rate,
      sweatRate:             data.sweat_rate,
      pastHeatStrokeHistory: data.past_heat_stroke,
      acclimatizationDays:   data.acclimatization_days,
      dailyWaterGoalMl:      data.daily_water_goal_ml,
      skinType:              data.skin_type,
      sunSensitivity:        data.sun_sensitivity,
      sunExposureHoursPerDay:data.sun_exposure_hours,
      currentHydrationLevel: data.hydration_level,
      dailyWaterIntakeMl:    data.daily_water_intake_ml,
      bodyWaterPercent:      data.body_water_percent,
      emergencyContact: {
        name:         data.emergency_contact_name  ?? 'Emergency Contact',
        phone:        data.emergency_contact_phone ?? '',
        relationship: data.emergency_contact_rel   ?? 'Contact',
      },
      createdAt: data.created_at || new Date().toISOString(),
    };

    cacheProfile(profile);
    return profile;
  } catch (e: unknown) {
    console.warn('fetchProfile exception:', e);
    const cached = getCachedProfile();
    return cached?.id === userId ? cached : null;
  }
}

// ── SQL for Supabase dashboard ────────────────────────────────────────────────
// Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query):
//
// create table if not exists public.profiles (
//   id                      uuid primary key references auth.users(id) on delete cascade,
//   email                   text,
//   name                    text,
//   age                     int,
//   weight_kg               numeric,
//   height_cm               numeric,
//   conditions              text[],
//   medications             boolean default false,
//   outdoor                 boolean default false,
//   blood_pressure          text,
//   resting_heart_rate      int,
//   sweat_rate              text,
//   past_heat_stroke        boolean,
//   acclimatization_days    int,
//   daily_water_goal_ml     int,
//   skin_type               text,
//   sun_sensitivity         text,
//   sun_exposure_hours      numeric,
//   hydration_level         text,
//   daily_water_intake_ml   int,
//   body_water_percent      numeric,
//   emergency_contact_name  text,
//   emergency_contact_phone text,
//   emergency_contact_rel   text,
//   created_at              timestamptz default now()
// );
//
// -- Row-level security: users can only read/write their own row
// alter table public.profiles enable row level security;
//
// create policy "Users can view own profile"
//   on public.profiles for select
//   using (auth.uid() = id);
//
// create policy "Users can insert own profile"
//   on public.profiles for insert
//   with check (auth.uid() = id);
//
// create policy "Users can update own profile"
//   on public.profiles for update
//   using (auth.uid() = id);
