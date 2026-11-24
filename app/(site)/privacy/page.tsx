import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const runtime = "edge";
export const metadata: Metadata = { title: "Privacy" };

// Starter text. Have it reviewed before launch.
export default function Privacy() {
  return (
    <div className="card prose" style={{ maxWidth: 760 }}>
      <h1>Privacy</h1>
      <p>{SITE_NAME} keeps what we collect to what the service needs: your email to sign in, the jobs you post, quotes and messages.</p>
      <ul>
        <li>Your email is never shown to other people.</li>
        <li>Your pickup address is shown only to the company you hire.</li>
        <li>A company’s phone number is shown only to a customer who hires them.</li>
        <li>Job photos and details are visible to approved companies in the job’s area.</li>
      </ul>
      <p>We don’t sell your information. To delete your account, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </div>
  );
}
