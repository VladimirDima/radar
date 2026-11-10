import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { lastRun, unseenCount } from "@/lib/queries";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Radar",
  description: "Events and opportunities from accounts you watch",
};

function formatRunTime(iso: string): string {
  try {
    const normalized = iso.includes("T")
      ? iso
      : iso.replace(" ", "T") + (iso.endsWith("Z") ? "" : "Z");
    return new Date(normalized).toLocaleString("en-GB", {
      timeZone: "Europe/Copenhagen",
    });
  } catch {
    return iso;
  }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const unseen = unseenCount();
  const run = lastRun();

  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="site-header">
            <h1 className="brand">Radar</h1>
            <Nav unseen={unseen} />
            {run ? (
              <p
                className={`last-run${run.status === "error" ? " error" : ""}`}
                title={run.status === "error" ? run.error ?? undefined : undefined}
              >
                Last run {formatRunTime(run.started_at)} · {run.status}
                {run.posts_fetched != null
                  ? ` · ${run.posts_fetched} posts`
                  : ""}
                {run.items_created != null
                  ? ` · ${run.items_created} items`
                  : ""}
              </p>
            ) : (
              <p className="last-run">No runs yet</p>
            )}
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
