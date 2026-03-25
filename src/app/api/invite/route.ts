import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendInviteEmail } from "@/lib/sendgrid";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin credentials not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, displayName, householdId, householdName, invitedBy } =
      await req.json();

    if (!email || !householdId || !householdName || !invitedBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the caller is an authenticated Supabase user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const jwt = authHeader.slice(7);

    const admin = getAdminClient();
    const { data: callerData, error: callerError } = await admin.auth.getUser(jwt);
    if (callerError || !callerData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Confirm the caller is a member of the household they're inviting to
    const { data: membership } = await admin
      .from("household_members")
      .select("id")
      .eq("household_id", householdId)
      .eq("user_id", callerData.user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate the invite link — Supabase emails it, but we redirect through
    // our own SendGrid template for consistent branding.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8090";
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { display_name: displayName ?? email.split("@")[0] },
        redirectTo: `${appUrl}/auth`,
      },
    });

    if (linkError || !linkData.properties?.action_link) {
      console.error("[invite] generateLink error:", linkError);
      return NextResponse.json({ error: "Failed to generate invite link" }, { status: 500 });
    }

    const inviteUrl = linkData.properties.action_link;
    const userId = linkData.user.id;

    // Send branded invite email via SendGrid
    try {
      await sendInviteEmail(email, invitedBy, householdName, inviteUrl);
    } catch (emailErr) {
      // In dev / demo: log the link so it can be used without email configured
      if (process.env.NODE_ENV === "development") {
        console.log(`[invite] Invite URL for ${email}: ${inviteUrl}`);
      } else {
        throw emailErr;
      }
    }

    return NextResponse.json({ userId });
  } catch (err) {
    console.error("[invite]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
