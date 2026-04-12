import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/biz/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        설정으로 돌아가기
      </Link>

      <header className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </header>

      <div className="mt-8 space-y-6">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-3xl border border-border bg-card p-6"
          >
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
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
