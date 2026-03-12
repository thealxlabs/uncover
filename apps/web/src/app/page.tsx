"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const key = localStorage.getItem("uncover_api_key");
    if (key) router.push("/dashboard");
    else router.push("/login");
  }, [router]);

  return null;
}
