import type { Metadata } from "next";
import { loadBrennerOperatorPalette } from "@/lib/operators";
import { OperatorsClient } from "./OperatorsClient";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Operators",
  description: "Reusable Brenner cognitive moves with anchored quotes and transcript links.",
};

export default async function OperatorsPage() {
  const operators = await loadBrennerOperatorPalette();
  return <OperatorsClient operators={operators} />;
}
