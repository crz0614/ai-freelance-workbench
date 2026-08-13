import type { Metadata } from "next";
import "./globals.css";
import "./functional.css";
export const metadata: Metadata = { title:"Freelance OS — AI Opportunity Workbench", description:"Privacy-safe AI workflow for opportunity discovery, ranking and grounded proposals." };
export default function RootLayout({ children }:{ children:React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
