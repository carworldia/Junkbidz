import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const runtime = "edge";
export default function Page() {
  return <Suspense><AuthForm mode="login" /></Suspense>;
}
