import { NextResponse } from "next/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let email = "";

  try {
    const body = (await request.json()) as { email?: unknown };
    email = String(body.email || "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (!emailPattern.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const kitApiKey = process.env.KIT_API_KEY || process.env.KIT_API_SECRET;
  const kitFormId = process.env.KIT_FORM_ID;

  if (!kitApiKey || !kitFormId) {
    return NextResponse.json({ error: "Email signup is not configured yet." }, { status: 500 });
  }

  try {
    const kitResponse = await fetch(`https://api.convertkit.com/v3/forms/${kitFormId}/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        api_key: kitApiKey,
        email
      })
    });

    if (!kitResponse.ok) {
      return NextResponse.json({ error: "We could not add you right now. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "We could not add you right now. Please try again." }, { status: 502 });
  }
}
