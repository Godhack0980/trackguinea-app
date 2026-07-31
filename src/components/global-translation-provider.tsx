"use client";

import React from "react";
import "@/lib/i18n";
import { useDomTranslation } from "@/lib/translations";

export default function GlobalTranslationProvider({ children }: { children: React.ReactNode }) {
  useDomTranslation();
  return <>{children}</>;
}
