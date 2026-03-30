// Cloudflare Pages Function — POST /notify
// Captures RiskScent waitlist email and inserts into Supabase.
// Required environment variables (set in CF Pages dashboard):
//   SUPABASE_URL      — e.g. https://xxxx.supabase.co
//   SUPABASE_ANON_KEY — anon/public key from Supabase project settings

export async function onRequestPost(context) {
  const { request, env } = context;

  const isAjax = request.headers.get('Accept')?.includes('application/json');

  const jsonHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://perilwatch.com',
  };

  const redirect = (msg, isError = false) => {
    if (isAjax) {
      return new Response(
        JSON.stringify(isError ? { error: msg } : { ok: true }),
        { status: isError ? 400 : 200, headers: jsonHeaders }
      );
    }
    return Response.redirect(
      `https://perilwatch.com/?notify=${isError ? 'error' : 'ok'}`,
      303
    );
  };

  try {
    const body = await request.formData();
    const email = (body.get('email') || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return redirect('Valid email required.', true);
    }

    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      return redirect('Server misconfiguration.', true);
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
      if (res.status === 409 || text.includes('duplicate') || text.includes('unique')) {
        return redirect('ok');
      }
      console.error('Supabase error:', res.status, text);
      return redirect('Could not save. Try again.', true);
    }

    return redirect('ok');

  } catch (err) {
    console.error('notify function error:', err);
    return redirect('Server error.', true);
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
