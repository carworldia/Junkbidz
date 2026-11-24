"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LogoMark from "./LogoMark";

function friendly(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox for the link.";
  if (m.includes("already registered") || m.includes("already been registered")) return "That email already has an account. Log in instead.";
  if (m.includes("password should be") || m.includes("weak password")) return "Please choose a stronger password (at least 8 characters).";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many tries. Please wait a minute and try again.";
  return msg;
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setInfo("");
    const supabase = createClient();
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(friendly(error.message));
      else if (!data.session) setInfo("Check your email for a link to confirm your account.");
      else { router.push(next); router.refresh(); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(friendly(error.message));
      else { router.push(next); router.refresh(); }
    }
    setBusy(false);
  }

  const q = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <form className="card form narrow auth-card" onSubmit={submit}>
      <span className="auth-mark"><LogoMark size={44} /></span>
      <h1>{mode === "login" ? "Log in" : "Create your account"}</h1>
      <p className="auth-sub">{mode === "login" ? "Welcome back." : "Free. Post a job and get quotes from local junk removal companies."}</p>
      <label>Email
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>Password
        <input type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {mode === "signup" && <p className="mute" style={{ margin: 0 }}>Run a junk removal company? Sign up here too, then join as a company.</p>}
      {error && <div className="err">{error}</div>}
      {info && <div className="note">{info}</div>}
      <button disabled={busy}>{busy ? "…" : mode === "login" ? "Log in" : "Create account"}</button>
      <span className="mute">
        {mode === "login" ? <>New here? <Link href={`/signup${q}`}>Create an account</Link></> : <>Have an account? <Link href={`/login${q}`}>Log in</Link></>}
      </span>
    </form>
  );
}
