"use client";

import { useEffect, useState } from "react";

const sections = [
  ["overview", "Overview"],
  ["growth", "Growth"],
  ["velocity", "Velocity"],
  ["sources", "Sources"],
  ["delivery", "Delivery health"],
  ["activity", "Activity"],
  ["subscribers", "Subscribers"],
  ["milestones", "Milestones"],
  ["audience-snapshot", "Audience snapshot"]
] as const;

export function AdminSectionNav() {
  const [active, setActive] = useState<(typeof sections)[number][0]>("overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id as (typeof sections)[number][0]);
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.2, 0.6] }
    );

    for (const [id] of sections) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Dashboard sections" className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:sticky lg:top-24 lg:overflow-visible">
      <ul className="flex min-w-max gap-1 p-1 lg:min-w-0 lg:flex-col lg:p-0">
        {sections.map(([id, label], index) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={active === id ? "location" : undefined}
              className={`group flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-[#a67c35]/45 lg:w-full ${
                active === id
                  ? "border-[#d5c29f] bg-[#f2e8d8] text-[#0b1d33]"
                  : "border-transparent text-muted hover:border-line hover:bg-[#fbf8f2] hover:text-[#0b1d33]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[9px] ${active === id ? "border-[#a67c35] text-[#8b692f]" : "border-line text-muted"}`}
              >
                {index + 1}
              </span>
              <span>{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
