// supabase/functions/garmin-sync/index.ts
// =====================================================================
// TriCoach — Garmin Sync Edge Function
// Authenticates with Garmin Connect, fetches daily health data,
// stores in garmin_data table.
//
// Endpoints:
//   POST { action: "save_credentials", email, password }
//   POST { action: "sync" }            — sync current user
//   POST { action: "sync_all" }        — cron: sync all users (service key)
//   POST { action: "disconnect" }      — remove credentials
//   POST { action: "status" }          — check connection status
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENCRYPTION_KEY = Deno.env.get("GARMIN_ENCRYPTION_KEY") || "tricoach-default-key-change-me";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Garmin Connect Authentication ───────────────────────────────────
// Garmin uses a multi-step SSO flow:
// 1. Get SSO login page + CSRF token
// 2. POST credentials to SSO
// 3. Extract service ticket from redirect
// 4. Exchange ticket for session on connect.garmin.com
// 5. Use session cookies for API calls

class GarminClient {
  private cookies: Map<string, string> = new Map();
  private baseUrl = "https://connect.garmin.com";
  private ssoUrl = "https://sso.garmin.com/sso";
  private userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  async login(email: string, password: string): Promise<boolean> {
    try {
      // Step 1: Get the SSO login page to obtain CSRF token and cookies
      const params = new URLSearchParams({
        clientId: "GarminConnect",
        consumeServiceTicket: "false",
        createAccountShown: "true",
        cssUrl: "https://static.garmincdn.com/com.garmin.connect/ui/css/gauth-custom-v1.2-min.css",
        displayNameShown: "false",
        embedWidget: "false",
        gauthHost: "https://sso.garmin.com/sso",
        generateExtraServiceTicket: "true",
        generateTwoExtraServiceTickets: "true",
        generateNoServiceTicket: "false",
        globalOptInChecked: "false",
        globalOptInShown: "true",
        id: "gauth-widget",
        initialFocus: "true",
        locale: "en_US",
        locationPromptShown: "true",
        mfaRequired: "false",
        mobile: "false",
        openCreateAccount: "false",
        privacyStatementUrl: "https://www.garmin.com/en-US/privacy/connect/",
        redirectAfterAccountCreationUrl: "https://connect.garmin.com/",
        redirectAfterAccountLoginUrl: "https://connect.garmin.com/modern/",
        rememberMeChecked: "false",
        rememberMeShown: "true",
        service: "https://connect.garmin.com/modern/",
        source: "https://connect.garmin.com/signin/",
        usernameShown: "false",
        webhost: "https://connect.garmin.com/modern/",
      });

      const loginPageUrl = `${this.ssoUrl}/signin?${params.toString()}`;
      const loginPage = await fetch(loginPageUrl, {
        headers: { "User-Agent": this.userAgent },
        redirect: "manual",
      });

      this.extractCookies(loginPage.headers);
      const html = await loginPage.text();

      // Extract _csrf token from the page
      const csrfMatch = html.match(/name="_csrf"\s+value="([^"]+)"/);
      const csrf = csrfMatch ? csrfMatch[1] : "";

      // Step 2: POST credentials
      const signinUrl = `${this.ssoUrl}/signin?${params.toString()}`;
      const formData = new URLSearchParams({
        username: email,
        password: password,
        embed: "false",
        _csrf: csrf,
      });

      const signinResp = await fetch(signinUrl, {
        method: "POST",
        headers: {
          "User-Agent": this.userAgent,
          "Content-Type": "application/x-www-form-urlencoded",
          "Origin": "https://sso.garmin.com",
          "Referer": loginPageUrl,
          "Cookie": this.cookieHeader(),
        },
        redirect: "manual",
        body: formData.toString(),
      });

      this.extractCookies(signinResp.headers);
      const signinHtml = await signinResp.text();

      // Step 3: Extract the service ticket from the response
      // Garmin returns it as a redirect URL or embedded in the response
      let ticket = "";

      // Check for ticket in response body (embedded in JS redirect)
      const ticketMatch = signinHtml.match(/ticket=([A-Za-z0-9\-]+)/);
      if (ticketMatch) {
        ticket = ticketMatch[1];
      }

      // Also check Location header for redirect
      if (!ticket) {
        const location = signinResp.headers.get("location") || "";
        const locTicket = location.match(/ticket=([A-Za-z0-9\-]+)/);
        if (locTicket) {
          ticket = locTicket[1];
        }
      }

      if (!ticket) {
        // Check if login failed (wrong credentials)
        if (signinHtml.includes("locked") || signinHtml.includes("Invalid")) {
          throw new Error("Invalid Garmin credentials — check email and password");
        }
        // Try alternative: sometimes Garmin returns a response_url
        const urlMatch = signinHtml.match(/response_url\s*=\s*"([^"]+)"/);
        if (urlMatch) {
          const respUrl = urlMatch[1].replace(/\\'/g, "'");
          const ticketFromUrl = respUrl.match(/ticket=([A-Za-z0-9\-]+)/);
          if (ticketFromUrl) ticket = ticketFromUrl[1];
        }
      }

      if (!ticket) {
        throw new Error("Could not extract Garmin SSO ticket — login may have failed");
      }

      // Step 4: Exchange ticket for session
      const exchangeUrl = `${this.baseUrl}/modern/?ticket=${ticket}`;
      const exchangeResp = await fetch(exchangeUrl, {
        headers: {
          "User-Agent": this.userAgent,
          "Cookie": this.cookieHeader(),
        },
        redirect: "manual",
      });
      this.extractCookies(exchangeResp.headers);

      // Follow any redirects manually
      let nextUrl = exchangeResp.headers.get("location");
      let attempts = 0;
      while (nextUrl && attempts < 5) {
        const followResp = await fetch(
          nextUrl.startsWith("http") ? nextUrl : `${this.baseUrl}${nextUrl}`,
          {
            headers: {
              "User-Agent": this.userAgent,
              "Cookie": this.cookieHeader(),
            },
            redirect: "manual",
          }
        );
        this.extractCookies(followResp.headers);
        nextUrl = followResp.headers.get("location");
        attempts++;
      }

      return true;
    } catch (err) {
      console.error("[GarminClient] Login error:", err);
      throw err;
    }
  }

  private extractCookies(headers: Headers) {
    const setCookies = headers.getSetCookie?.() || [];
    // Fallback for environments where getSetCookie isn't available
    const raw = headers.get("set-cookie");
    const cookieStrings = setCookies.length > 0
      ? setCookies
      : raw ? raw.split(/,(?=\s*\w+=)/) : [];

    for (const c of cookieStrings) {
      const match = c.match(/^([^=]+)=([^;]*)/);
      if (match) {
        this.cookies.set(match[1].trim(), match[2].trim());
      }
    }
  }

  private cookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  private async apiGet(path: string): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": this.userAgent,
        "Cookie": this.cookieHeader(),
        "NK": "NT",
        "Accept": "application/json",
      },
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Garmin API ${resp.status}: ${text.substring(0, 200)}`);
    }
    return resp.json();
  }

  // ── Data Fetchers ─────────────────────────────────────────────

  async getHRV(dateStr: string): Promise<{ hrv: number | null; hrv7: number | null }> {
    try {
      const data = await this.apiGet(`/proxy/hrv-service/hrv/${dateStr}`);
      const summary = data?.hrvSummary || data;
      const hrv = summary?.lastNightAvg || summary?.lastNight || null;
      const hrv7 = summary?.weeklyAvg || null;
      return {
        hrv: hrv && hrv > 0 ? Math.round(hrv) : null,
        hrv7: hrv7 && hrv7 > 0 ? Math.round(hrv7) : null,
      };
    } catch {
      return { hrv: null, hrv7: null };
    }
  }

  async getSleep(dateStr: string): Promise<{ sleepScore: number | null; sleepHrs: number | null }> {
    try {
      const data = await this.apiGet(`/proxy/wellness-service/wellness/dailySleepData/${dateStr}`);
      const dto = data?.dailySleepDTO || data;
      const score =
        dto?.sleepScores?.overall?.value ||
        dto?.sleepScores?.totalScore ||
        dto?.sleepScore ||
        null;
      const secs = dto?.sleepTimeSeconds || 0;
      const hrs = secs > 0 ? Math.round((secs / 3600) * 10) / 10 : null;
      return {
        sleepScore: score && score > 0 ? score : null,
        sleepHrs: hrs,
      };
    } catch {
      return { sleepScore: null, sleepHrs: null };
    }
  }

  async getRHR(dateStr: string): Promise<number | null> {
    try {
      const data = await this.apiGet(`/proxy/userstats-service/wellness/daily/${dateStr}`);
      const rhr =
        data?.restingHeartRate ||
        data?.allDayHR?.restingHeartRate ||
        data?.statisticsDTO?.restingHR ||
        null;
      return rhr && rhr > 0 ? Math.round(rhr) : null;
    } catch {
      // Fallback: try stats endpoint
      try {
        const stats = await this.apiGet(`/proxy/usersummary-service/usersummary/daily/${dateStr}`);
        const v = stats?.restingHeartRate || stats?.minHeartRate;
        return v && v > 0 ? Math.round(v) : null;
      } catch {
        return null;
      }
    }
  }

  async getStress(dateStr: string): Promise<number | null> {
    try {
      const data = await this.apiGet(`/proxy/usersummary-service/usersummary/daily/${dateStr}`);
      const stress = data?.overallStressLevel || data?.avgStressLevel || null;
      return stress && stress > 0 ? Math.round(stress) : null;
    } catch {
      return null;
    }
  }

  async getBodyBattery(dateStr: string): Promise<number | null> {
    try {
      const data = await this.apiGet(
        `/proxy/usersummary-service/usersummary/daily/${dateStr}`
      );
      return data?.bodyBatteryChargedValue || null;
    } catch {
      return null;
    }
  }

  // ── Main fetch: assemble all health data for a date ───────────
  async fetchDailyHealth(
    todayStr: string,
    yesterdayStr: string,
    twoDaysAgoStr: string
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    // HRV — try today, yesterday, 2 days ago (Garmin sync timing varies)
    for (const d of [todayStr, yesterdayStr, twoDaysAgoStr]) {
      const { hrv, hrv7 } = await this.getHRV(d);
      if (hrv) {
        result.hrv = hrv;
        if (hrv7) result.hrv7 = hrv7;
        break;
      }
    }

    // Sleep — try today then yesterday
    for (const d of [todayStr, yesterdayStr]) {
      const { sleepScore, sleepHrs } = await this.getSleep(d);
      if (sleepScore) {
        result.sleepScore = sleepScore;
        if (sleepHrs) result.sleepHrs = sleepHrs;
        break;
      }
    }

    // RHR — try today then yesterday
    for (const d of [todayStr, yesterdayStr]) {
      const rhr = await this.getRHR(d);
      if (rhr) {
        result.rhr = rhr;
        break;
      }
    }

    // Stress = yesterday (today's not complete)
    const stress = await this.getStress(yesterdayStr);
    if (stress) result.yesterdayStress = stress;

    // Body Battery (optional)
    const bb = await this.getBodyBattery(todayStr);
    if (bb) result.bodyBattery = bb;

    return result;
  }
}

// ── Helper: get date strings ──────────────────────────────────────
function getDateStrings() {
  // Use AEST (UTC+10) for date calculation
  const now = new Date();
  const aest = new Date(now.getTime() + 10 * 60 * 60 * 1000);
  const today = aest.toISOString().split("T")[0];
  const yesterday = new Date(aest.getTime() - 86400000).toISOString().split("T")[0];
  const twoDaysAgo = new Date(aest.getTime() - 2 * 86400000).toISOString().split("T")[0];
  return { today, yesterday, twoDaysAgo };
}

// ── Sync a single user ────────────────────────────────────────────
async function syncUser(
  supaAdmin: any,
  userId: string,
  garminEmail: string,
  garminPassword: string
): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const client = new GarminClient();
    await client.login(garminEmail, garminPassword);

    const { today, yesterday, twoDaysAgo } = getDateStrings();
    const healthData = await client.fetchDailyHealth(today, yesterday, twoDaysAgo);

    if (Object.keys(healthData).length === 0) {
      // Update last sync even if no data
      await supaAdmin
        .from("garmin_credentials")
        .update({ last_sync_at: new Date().toISOString(), sync_error: "No data available from Garmin" })
        .eq("id", userId);
      return { ok: true, data: null, error: "No data available" };
    }

    // Upsert into garmin_data
    const { error: dataError } = await supaAdmin.from("garmin_data").upsert(
      {
        user_id: userId,
        date: today,
        data: healthData,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    );

    if (dataError) {
      throw new Error(`Database error: ${dataError.message}`);
    }

    // Update credentials with last sync time
    await supaAdmin
      .from("garmin_credentials")
      .update({
        last_sync_at: new Date().toISOString(),
        sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return { ok: true, data: healthData };
  } catch (err: any) {
    const errorMsg = err.message || "Unknown error";
    // Update credentials with error
    await supaAdmin
      .from("garmin_credentials")
      .update({ sync_error: errorMsg, updated_at: new Date().toISOString() })
      .eq("id", userId);
    return { ok: false, error: errorMsg };
  }
}

// ── Main handler ──────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, email, password } = await req.json();
    const authHeader = req.headers.get("authorization") || "";

    // Create admin client (service role — bypasses RLS)
    const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // For user-specific actions, verify the JWT
    let userId: string | null = null;
    if (action !== "sync_all") {
      // Create user-scoped client to verify auth
      const supaUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
      } = await supaUser.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ ok: false, error: "Not authenticated" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    // ── Save credentials ─────────────────────────────────────────
    if (action === "save_credentials") {
      if (!email || !password) {
        return new Response(
          JSON.stringify({ ok: false, error: "Email and password required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Test login first before saving
      try {
        const testClient = new GarminClient();
        await testClient.login(email, password);
      } catch (loginErr: any) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Garmin login failed: ${loginErr.message}. Check your email and password.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Encrypt and store
      const { error } = await supaAdmin.rpc("encrypt_garmin_password", {
        plain_password: password,
        encryption_key: ENCRYPTION_KEY,
      });

      // We need to do this manually since the RPC just returns the encrypted bytes
      const { data: encData } = await supaAdmin.rpc("encrypt_garmin_password", {
        plain_password: password,
        encryption_key: ENCRYPTION_KEY,
      });

      // Upsert credentials
      const { error: upsertErr } = await supaAdmin.from("garmin_credentials").upsert({
        id: userId,
        email: email,
        password_enc: encData,
        connected_at: new Date().toISOString(),
        sync_error: null,
        updated_at: new Date().toISOString(),
      });

      if (upsertErr) {
        // Fallback: use raw SQL for pgcrypto encryption
        const { error: sqlErr } = await supaAdmin.rpc("exec_sql", {
          query: `INSERT INTO garmin_credentials (id, email, password_enc, connected_at, updated_at)
                  VALUES ($1, $2, pgp_sym_encrypt($3, $4), now(), now())
                  ON CONFLICT (id) DO UPDATE SET
                    email = $2,
                    password_enc = pgp_sym_encrypt($3, $4),
                    sync_error = NULL,
                    updated_at = now()`,
          params: [userId, email, password, ENCRYPTION_KEY],
        });

        // If RPC doesn't exist, try direct upsert with the raw password stored temporarily
        // and encrypt via a DB trigger or function
        if (sqlErr) {
          // Final fallback: store with base64 encoding (less secure but functional)
          const encoded = btoa(password);
          const { error: finalErr } = await supaAdmin
            .from("garmin_credentials")
            .upsert({
              id: userId,
              email: email,
              password_enc: encoded,
              connected_at: new Date().toISOString(),
              sync_error: null,
              updated_at: new Date().toISOString(),
            });
          if (finalErr) throw finalErr;
        }
      }

      // Immediately trigger a sync after saving credentials
      const { data: cred } = await supaAdmin
        .from("garmin_credentials")
        .select("email, password_enc")
        .eq("id", userId)
        .single();

      let syncResult = { ok: false, data: null as any };
      if (cred) {
        let decryptedPassword = password; // We still have it in memory
        syncResult = await syncUser(supaAdmin, userId!, email, decryptedPassword);
      }

      return new Response(
        JSON.stringify({
          ok: true,
          message: "Garmin connected successfully",
          sync: syncResult,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Sync current user ────────────────────────────────────────
    if (action === "sync") {
      // Get credentials
      const { data: cred, error: credErr } = await supaAdmin
        .from("garmin_credentials")
        .select("email, password_enc")
        .eq("id", userId)
        .single();

      if (credErr || !cred) {
        return new Response(
          JSON.stringify({ ok: false, error: "No Garmin credentials found. Connect Garmin first." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decrypt password
      let garminPassword: string;
      try {
        const { data: decrypted } = await supaAdmin.rpc("decrypt_garmin_password", {
          encrypted: cred.password_enc,
          encryption_key: ENCRYPTION_KEY,
        });
        garminPassword = decrypted;
      } catch {
        // Fallback: try base64 decode
        try {
          garminPassword = atob(cred.password_enc);
        } catch {
          garminPassword = cred.password_enc;
        }
      }

      const result = await syncUser(supaAdmin, userId!, cred.email, garminPassword);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Sync all users (cron job) ────────────────────────────────
    if (action === "sync_all") {
      // Verify this is called with service role key
      if (!authHeader.includes(SUPABASE_SERVICE_KEY)) {
        return new Response(
          JSON.stringify({ ok: false, error: "Service role required for sync_all" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: users, error: usersErr } = await supaAdmin
        .from("garmin_credentials")
        .select("id, email, password_enc");

      if (usersErr || !users) {
        return new Response(
          JSON.stringify({ ok: false, error: "Failed to fetch users" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const user of users) {
        let pw: string;
        try {
          const { data: decrypted } = await supaAdmin.rpc("decrypt_garmin_password", {
            encrypted: user.password_enc,
            encryption_key: ENCRYPTION_KEY,
          });
          pw = decrypted;
        } catch {
          try {
            pw = atob(user.password_enc);
          } catch {
            pw = user.password_enc;
          }
        }

        const r = await syncUser(supaAdmin, user.id, user.email, pw);
        results.push({ userId: user.id, ...r });

        // Small delay between users to avoid Garmin rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      return new Response(
        JSON.stringify({ ok: true, synced: results.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Disconnect ───────────────────────────────────────────────
    if (action === "disconnect") {
      await supaAdmin.from("garmin_credentials").delete().eq("id", userId);
      // Optionally keep historical data, just remove credentials
      return new Response(
        JSON.stringify({ ok: true, message: "Garmin disconnected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Status ───────────────────────────────────────────────────
    if (action === "status") {
      const { data: cred } = await supaAdmin
        .from("garmin_credentials")
        .select("email, connected_at, last_sync_at, sync_error")
        .eq("id", userId)
        .single();

      return new Response(
        JSON.stringify({
          ok: true,
          connected: !!cred,
          email: cred?.email || null,
          connectedAt: cred?.connected_at || null,
          lastSyncAt: cred?.last_sync_at || null,
          syncError: cred?.sync_error || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[garmin-sync] Error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
