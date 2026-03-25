import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateId } from "./constants";

// ─── Demo mode detection ──────────────────────────────────────────────────────
// When Supabase env vars are missing/placeholder, the app runs fully offline.

const PLACEHOLDER = "your_supabase_project_url";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && url !== PLACEHOLDER && url.startsWith("http");
}

// ─── Lazy singleton ───────────────────────────────────────────────────────────

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  _supabase = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _supabase;
}

// Convenience proxy — only resolves when Supabase IS configured
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ─── Auth helpers (with demo-mode fallback) ───────────────────────────────────

export interface AuthResult {
  data: { user: { id: string; email: string; user_metadata: Record<string, string>; created_at: string } | null };
  error: { message: string } | null;
}

/** Demo sign-up: creates a local-only user (no network needed) */
function demoSignUp(email: string, displayName: string): AuthResult {
  return {
    data: {
      user: {
        id: generateId(),
        email,
        user_metadata: { display_name: displayName },
        created_at: new Date().toISOString(),
      },
    },
    error: null,
  };
}

/** Demo sign-in: accepts any credentials (no network needed) */
function demoSignIn(email: string): AuthResult {
  return {
    data: {
      user: {
        id: generateId(),
        email,
        user_metadata: { display_name: email.split("@")[0] },
        created_at: new Date().toISOString(),
      },
    },
    error: null,
  };
}

export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return demoSignUp(email, displayName);

  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  return { data: { user: data.user as AuthResult["data"]["user"] }, error };
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return demoSignIn(email);

  const { data, error } = await getSupabase().auth.signInWithPassword({
    email,
    password,
  });
  return { data: { user: data.user as AuthResult["data"]["user"] }, error };
}

export async function signOut() {
  if (!isSupabaseConfigured()) return { error: null };
  const { error } = await getSupabase().auth.signOut();
  return { error };
}

export async function getSession() {
  if (!isSupabaseConfigured()) return { session: null, error: null };
  const { data, error } = await getSupabase().auth.getSession();
  return { session: data.session, error };
}

/**
 * Creates a new auth account for a household member without disturbing the
 * current user's session. In demo mode, returns a generated local UUID.
 */
export async function registerMemberAccount(
  email: string,
  password: string,
  displayName: string
): Promise<{ userId: string | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { userId: generateId(), error: null };
  }

  // Use a separate client instance (persistSession: false) so the signup
  // response does not overwrite the owner's active session in localStorage.
  const { createClient } = await import("@supabase/supabase-js");
  const ephemeral = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await ephemeral.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) return { userId: null, error: error.message };
  if (!data.user) return { userId: null, error: "Sign-up returned no user." };

  return { userId: data.user.id, error: null };
}
