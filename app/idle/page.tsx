import type { Metadata } from "next";
import { IdleGame } from "./ui/idle-game";

export const metadata: Metadata = {
  title: "Fiordevalle | Idle RPG",
  description: "Explore Fiordevalle, cace criaturas e fortaleça seu refúgio.",
};

export default function IdlePage() {
  return <IdleGame />;
}
