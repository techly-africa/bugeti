import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── isSupabaseConfigured ─────────────────────────────────────────────────────
// We test the function by manipulating process.env and re-importing the module.
// vi.resetModules() ensures we get a fresh import on each test.

describe("isSupabaseConfigured", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("returns false when env var is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const { isSupabaseConfigured } = await import("@/lib/supabase");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("returns false for the placeholder value", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "your_supabase_project_url";
    const { isSupabaseConfigured } = await import("@/lib/supabase");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("returns false for an empty string", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    const { isSupabaseConfigured } = await import("@/lib/supabase");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("returns false for a non-http string", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "ftp://something.supabase.co";
    const { isSupabaseConfigured } = await import("@/lib/supabase");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("returns true for a valid https URL", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcdef.supabase.co";
    const { isSupabaseConfigured } = await import("@/lib/supabase");
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("returns true for a valid http URL (local dev)", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    const { isSupabaseConfigured } = await import("@/lib/supabase");
    expect(isSupabaseConfigured()).toBe(true);
  });
});

// ─── Demo mode auth functions ─────────────────────────────────────────────────
// When Supabase is NOT configured, signIn/signUp use local demo logic.

describe("signUp — demo mode", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("returns a user object with the provided email", async () => {
    const { signUp } = await import("@/lib/supabase");
    const { data, error } = await signUp("test@example.com", "password123", "Test User");
    expect(error).toBeNull();
    expect(data.user).not.toBeNull();
    expect(data.user?.email).toBe("test@example.com");
  });

  it("stores the display_name in user_metadata", async () => {
    const { signUp } = await import("@/lib/supabase");
    const { data } = await signUp("a@b.com", "pw123456", "Alice");
    expect(data.user?.user_metadata?.display_name).toBe("Alice");
  });

  it("returns the same user ID for the same email (stable demo ID)", async () => {
    const { signUp } = await import("@/lib/supabase");
    const r1 = await signUp("stable@demo.com", "pw123456", "Name");
    const r2 = await signUp("stable@demo.com", "pw123456", "Name");
    expect(r1.data.user?.id).toBe(r2.data.user?.id);
  });

  it("returns different IDs for different emails", async () => {
    const { signUp } = await import("@/lib/supabase");
    const r1 = await signUp("alice@demo.com", "pw123456", "Alice");
    const r2 = await signUp("bob@demo.com", "pw123456", "Bob");
    expect(r1.data.user?.id).not.toBe(r2.data.user?.id);
  });

  it("includes a created_at timestamp string", async () => {
    const { signUp } = await import("@/lib/supabase");
    const { data } = await signUp("x@y.com", "pw123456", "X");
    expect(typeof data.user?.created_at).toBe("string");
    expect(data.user?.created_at.length).toBeGreaterThan(0);
  });
});

describe("signIn — demo mode", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("accepts any email/password and returns a user", async () => {
    const { signIn } = await import("@/lib/supabase");
    const { data, error } = await signIn("anyone@demo.com", "anypassword");
    expect(error).toBeNull();
    expect(data.user).not.toBeNull();
    expect(data.user?.email).toBe("anyone@demo.com");
  });

  it("derives display_name from the email prefix", async () => {
    const { signIn } = await import("@/lib/supabase");
    const { data } = await signIn("john.doe@example.com", "pw");
    expect(data.user?.user_metadata?.display_name).toBe("john.doe");
  });

  it("returns same ID as signUp for the same email", async () => {
    const { signIn, signUp } = await import("@/lib/supabase");
    const { data: signUpData } = await signUp("match@demo.com", "pw123456", "Match");
    const { data: signInData } = await signIn("match@demo.com", "pw123456");
    expect(signUpData.user?.id).toBe(signInData.user?.id);
  });

  it("ID is case-insensitive for the same email", async () => {
    const { signIn } = await import("@/lib/supabase");
    const r1 = await signIn("User@Demo.COM", "pw");
    const r2 = await signIn("user@demo.com", "pw");
    expect(r1.data.user?.id).toBe(r2.data.user?.id);
  });
});

describe("signOut — demo mode", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("resolves with no error", async () => {
    const { signOut } = await import("@/lib/supabase");
    const { error } = await signOut();
    expect(error).toBeNull();
  });
});

describe("resetPassword — demo mode", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("resolves with no error", async () => {
    const { resetPassword } = await import("@/lib/supabase");
    const { error } = await resetPassword("user@example.com", "https://app/reset");
    expect(error).toBeNull();
  });
});

describe("updatePassword — demo mode", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("resolves with no error", async () => {
    const { updatePassword } = await import("@/lib/supabase");
    const { error } = await updatePassword("newpassword123");
    expect(error).toBeNull();
  });
});

describe("getSession — demo mode", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("returns null session and no error", async () => {
    const { getSession } = await import("@/lib/supabase");
    const { session, error } = await getSession();
    expect(session).toBeNull();
    expect(error).toBeNull();
  });
});
