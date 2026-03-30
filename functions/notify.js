// Cloudflare Pages Function — POST /notify
// Captures RiskScent waitlist email and inserts into Supabase.
// Required environment variables (set in CF Pages dashboard):
//   SUPABASE_URL      — e.g. https://xxxx.supabase.co
//   SUPABASE_ANON_KEY — anon/public key from Supabase project settings

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS preflight handled by CF Pages automatically for same-origin.
  // Allow cross-origin if ever needed:
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://perilwatch.com',
  };

  try {
    const body = await request.formData();
    const email = (body.get('email') || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Valid email required.' }), { status: 400, headers });
    }

    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration.' }), { status: 500, headers });
    }

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/riskscent_waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const text = await res.text();
      // Duplicate email — treat as success so we don't leak whether email exists
      if (res.status === 409 || text.includes('duplicate') || text.includes('unique')) {
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
      }
      console.error('Supabase error:', res.status, text);
      return new Response(JSON.stringify({ error: 'Could not save. Try again.' }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });

  } catch (err) {
    console.error('notify function error:', err);
    return new Response(JSON.stringify({ error: 'Server error.' }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://perilwatch.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
