"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // localStorage is only available client-side — this runs inside useEffect so it's safe
    const key = localStorage.getItem("uncover_api_key");
    if (key) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  // Render nothing — this page only exists to redirect
  return null;
}
