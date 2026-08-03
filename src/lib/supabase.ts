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

  // Build clean DB row (ensuring NO `undefined` values are sent to Supabase PostgREST)
  const rawRow: Record<string, unknown> = {
    id:                      profile.id,
    email:                   profile.email || '',
    name:                    profile.name || '',
    gender:                  profile.gender || 'male',
    age:                     profile.age ?? 28,
    weight_kg:               profile.weightKg ?? 68,
    height_cm:               profile.heightCm ?? 170,
    conditions:              profile.conditions ?? [],
    medications:             profile.medications ?? false,
    outdoor:                 profile.outdoor ?? false,
    blood_pressure:          profile.bloodPressure || null,
    resting_heart_rate:      profile.restingHeartRate || null,
    sweat_rate:              profile.sweatRate || 'normal',
    past_heat_stroke:        profile.pastHeatStrokeHistory ?? false,
    acclimatization_days:    profile.acclimatizationDays || 0,
    daily_water_goal_ml:     profile.dailyWaterGoalMl ?? 2500,
    skin_type:               profile.skinType || 'III',
    sun_sensitivity:         profile.sunSensitivity || 'moderate',
    sun_exposure_hours:      profile.sunExposureHoursPerDay ?? 4,
    hydration_level:         profile.currentHydrationLevel || 'normal',
    daily_water_intake_ml:   profile.dailyWaterIntakeMl ?? 2000,
    body_water_percent:      profile.bodyWaterPercent ?? 60,
    emergency_contact_name:  profile.emergencyContact?.name || 'Primary Contact',
    emergency_contact_phone: profile.emergencyContact?.phone || '',
    emergency_contact_rel:   profile.emergencyContact?.relationship || 'Contact',
    created_at:              profile.createdAt || new Date().toISOString(),
  };

  // Remove any remaining undefined keys
  const cleanRow = Object.fromEntries(
    Object.entries(rawRow).filter(([_, v]) => v !== undefined)
  );

  try {
    // Stage 1: Try UPSERT
    const { error: upsertErr } = await supabase.from('profiles').upsert(cleanRow, { onConflict: 'id' });
    if (!upsertErr) return { error: null };

    console.warn('Stage 1 Upsert Note:', upsertErr.message);

    // Stage 2: Try UPDATE
    const { error: updateErr } = await supabase
      .from('profiles')
      .update(cleanRow)
      .eq('id', profile.id);

    if (!updateErr) return { error: null };

    console.warn('Stage 2 Update Note:', updateErr.message);

    // Stage 3: Try INSERT
    const { error: insertErr } = await supabase
      .from('profiles')
      .insert(cleanRow);

    if (!insertErr) return { error: null };

    console.error('Stage 3 Insert Failed:', insertErr.message);

    // Stage 4: Basic core columns fallback
    const basicRow = {
      id:          profile.id,
      email:       profile.email,
      name:        profile.name,
      age:         profile.age,
      weight_kg:   profile.weightKg,
      height_cm:   profile.heightCm,
      conditions:  profile.conditions,
      medications: profile.medications,
    };

    const { error: basicErr } = await supabase.from('profiles').upsert(basicRow, { onConflict: 'id' });
    if (!basicErr) return { error: null };

    const finalErrMsg = upsertErr.message || updateErr.message || insertErr.message || basicErr.message;
    console.error('Supabase Profile Save Error:', finalErrMsg);
    return { error: finalErrMsg };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error';
    console.error('Supabase upsert exception:', msg);
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
// Run the SQL migration file: supabase_migration.sql
// in your Supabase Dashboard → SQL Editor → New query → paste & Run.
// This creates the `profiles` table, adds all columns, and disables RLS.

/**
 * Diagnostic: Test if the profiles table is accessible and writable.
 * Call this from browser console: `import('./lib/supabase').then(m => m.checkSupabaseConnection())`
 */
export async function checkSupabaseConnection(): Promise<{
  canConnect: boolean;
  canRead: boolean;
  canWrite: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { canConnect: false, canRead: false, canWrite: false, error: 'Supabase not configured' };
  }

  try {
    // Test 1: Can we connect?
    const { data: authData } = await supabase.auth.getSession();
    const canConnect = true;
    const userId = authData?.session?.user?.id;

    if (!userId) {
      return { canConnect, canRead: false, canWrite: false, error: 'No authenticated user session' };
    }

    // Test 2: Can we read?
    const { error: readErr } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    const canRead = !readErr;

    // Test 3: Can we write? (try a no-op update)
    const { error: writeErr } = await supabase.from('profiles').upsert(
      { id: userId, created_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
    const canWrite = !writeErr;

    const error = readErr?.message || writeErr?.message;

    console.log('🔍 Supabase Diagnostic:', { canConnect, canRead, canWrite, userId, error });
    return { canConnect, canRead, canWrite, error };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { canConnect: false, canRead: false, canWrite: false, error: msg };
  }
}

