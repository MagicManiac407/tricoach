// supabase/functions/strava-sync/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getUserIdFromToken(authHeader: string): string | null {
  try {
    const token = authHeader.replace("Bearer ", "").trim();
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub || null;
  } catch { return null; }
}

function formatActivity(act: any): Record<string, any> {
  const date = act.start_date_local?.split("T")[0] || "";
  const sport = act.type === "Ride" || act.type === "VirtualRide" ? "Bike"
    : act.type === "Swim" ? "Swim"
    : act.type === "Run" || act.type === "VirtualRun" ? "Run"
    : act.type;
  const dk = Math.round((act.distance / 1000) * 1000) / 1000;
  const mm = Math.round(act.moving_time / 60 * 10) / 10;
  const hr = act.average_heartrate ? Math.round(act.average_heartrate) : null;
  let ef = "moderate";
  if (hr) { if (hr < 145) ef = "easy"; else if (hr >= 173) ef = "hard"; }
  const result: Record<string, any> = { id: act.id, d: date, n: act.name, s: sport, dk, mm, ef };
  if (hr) result.hr = hr;
  if (sport === "Run" && dk > 0 && mm > 0) result.p = Math.round((mm / dk) * 1000) / 1000;
  if (sport === "Swim" && dk > 0 && mm > 0) result.sp = Math.round((mm / (dk * 10)) * 1000) / 1000;
  if (act.weighted_average_watts) result.w = Math.round(act.weighted_average_watts);
  if (act.average_watts) result.aw = Math.round(act.average_watts);
  if (act.type === "VirtualRide") result.vr = true;
  if (act.suffer_score) result.tl = act.suffer_score;
  return result;
}

async function refreshAccessToken(refreshToken: string) {
  try {
    const resp = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = await resp.json();
    return data.access_token ? data : null;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, code } = body;
    const authHeader = req.headers.get("authorization") || "";

    const userId = getUserIdFromToken(authHeader);
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid or missing token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── Exchange OAuth code for tokens ──────────────────────────
    if (action === "exchange_token") {
      if (!code) return new Response(JSON.stringify({ ok: false, error: "No code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

      const tokenResp = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenResp.json();
      if (!tokenData.access_token) {
        return new Response(JSON.stringify({ ok: false, error: tokenData.message || "Token exchange failed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const athlete = tokenData.athlete || {};

      // Upsert athlete profile — creates row if it doesn't exist
      const { error: upsertErr } = await supaAdmin.from("athlete_profiles").upsert({
        id: userId,
        strava_connected: true,
        display_name: `${athlete.firstname || ""} ${athlete.lastname || ""}`.trim() || "Athlete",
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_token_expires_at: tokenData.expires_at,
        strava_athlete_id: athlete.id?.toString(),
        strava_athlete_name: `${athlete.firstname || ""} ${athlete.lastname || ""}`.trim(),
        strava_athlete_pic: athlete.profile_medium || athlete.profile || null,
        strava_last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

      if (upsertErr) {
        console.error("Upsert error:", upsertErr);
        return new Response(JSON.stringify({ ok: false, error: "DB error: " + upsertErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Immediately fetch and return activities so frontend has data right away
      const after = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000); // 90 days on first connect
      const activitiesResp = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );
      let activities: any[] = [];
      if (activitiesResp.ok) {
        const raw = await activitiesResp.json();
        activities = raw.map(formatActivity);
      }

      return new Response(JSON.stringify({ ok: true, athlete_name: athlete.firstname, activities, count: activities.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Sync activities ─────────────────────────────────────────
    if (action === "sync_activities") {
      const { data: profile, error: profileErr } = await supaAdmin
        .from("athlete_profiles")
        .select("strava_access_token, strava_refresh_token, strava_token_expires_at, strava_connected")
        .eq("id", userId).single();

      // If no profile or not connected — return ok silently (not an error)
      if (profileErr || !profile?.strava_connected) {
        return new Response(JSON.stringify({ ok: true, activities: [], count: 0, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = profile.strava_access_token;
      if (Date.now() / 1000 > (profile.strava_token_expires_at || 0) - 300) {
        const refreshed = await refreshAccessToken(profile.strava_refresh_token);
        if (refreshed) {
          accessToken = refreshed.access_token;
          await supaAdmin.from("athlete_profiles").update({
            strava_access_token: refreshed.access_token,
            strava_refresh_token: refreshed.refresh_token,
            strava_token_expires_at: refreshed.expires_at,
          }).eq("id", userId);
        } else {
          return new Response(JSON.stringify({ ok: false, error: "Token refresh failed — please reconnect Strava" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const after = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
      const activitiesResp = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!activitiesResp.ok) {
        return new Response(JSON.stringify({ ok: false, error: `Strava API error: ${activitiesResp.status}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const stravaActivities = await activitiesResp.json();
      const formatted = stravaActivities.map(formatActivity);

      await supaAdmin.from("athlete_profiles").update({
        strava_last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", userId);

      return new Response(JSON.stringify({ ok: true, activities: formatted, count: formatted.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Disconnect ──────────────────────────────────────────────
    if (action === "disconnect") {
      await supaAdmin.from("athlete_profiles").update({
        strava_connected: false,
        strava_access_token: null,
        strava_refresh_token: null,
        strava_token_expires_at: null,
        updated_at: new Date().toISOString(),
      }).eq("id", userId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Status ──────────────────────────────────────────────────
    if (action === "status") {
      const { data: profile } = await supaAdmin
        .from("athlete_profiles")
        .select("strava_connected, strava_athlete_name, strava_athlete_pic, strava_last_sync")
        .eq("id", userId).single();
      return new Response(JSON.stringify({ ok: true, ...(profile || {}) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[strava-sync] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
