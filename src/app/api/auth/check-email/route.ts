import { NextResponse } from "next/server";
import { emailIsRegistered } from "@/lib/supabase/admin";
import { validateEmail } from "@/lib/validateEmail";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const emailValidation = validateEmail(email);
    if (emailValidation) {
      return NextResponse.json({ error: emailValidation }, { status: 400 });
    }

    const exists = await emailIsRegistered(email);

    if (exists === null) {
      return NextResponse.json({ exists: null, checked: false });
    }

    return NextResponse.json({ exists, checked: true });
  } catch {
    return NextResponse.json({ exists: null, checked: false }, { status: 500 });
  }
}