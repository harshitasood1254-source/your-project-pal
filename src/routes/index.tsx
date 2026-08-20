import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Snapping Turtle Media — Global Digital Marketing & Creative Studio" },
      {
        name: "description",
        content:
          "Snapping Turtle Media is a full-funnel creative and performance marketing studio in Dubai, Delhi-NCR and Singapore — strategy, content, CGI and code under one roof.",
      },
      {
        property: "og:title",
        content: "Snapping Turtle Media — Global Digital Marketing & Creative Studio",
      },
      {
        property: "og:description",
        content:
          "Full-funnel creative and performance marketing — strategy, content, CGI and code under one roof.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/site/index.html");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Loading Snapping Turtle Media…</p>
    </div>
  );
}
