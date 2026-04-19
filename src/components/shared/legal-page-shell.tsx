import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type LegalSection = {
  title: string;
  body: string[];
};

export function LegalPageShell({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-5 pb-8 sm:px-6">
      <Link
        href="/biz/settings"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
      >
        <ChevronLeft className="h-4 w-4" />
        설정으로 돌아가기
      </Link>

      <header className="mt-5">
        <h1 className="text-[clamp(1.75rem,2vw+1rem,2.25rem)] font-extrabold leading-[1.15] tracking-[-0.04em] text-ink">
          {title}
        </h1>
        <p className="mt-3 text-[13.5px] font-medium leading-[1.7] text-muted-foreground">
          {description}
        </p>
      </header>

      <div className="mt-8 space-y-4">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-[22px] border border-border-soft bg-surface p-6"
          >
            <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-ink">
              {section.title}
            </h2>
            <div className="mt-3 space-y-3 text-[13.5px] leading-[1.7] text-muted-foreground">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
