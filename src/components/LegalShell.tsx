import { ReactNode } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import CompassMark from "@/components/CompassMark";

interface Props {
  title: string;
  subtitle?: string;
  updated?: string;
  children: ReactNode;
}

const footerLinks: { label: string; to: string }[] = [
  { label: "About", to: "/about" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact", to: "/contact" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "Refunds", to: "/refunds" },
  { label: "Cookies", to: "/cookies" },
  { label: "Disclaimer", to: "/disclaimer" },
];

const LegalShell = ({ title, subtitle, updated, children }: Props) => (
  <div className="min-h-screen bg-background flex flex-col">
    <Navbar />
    <main className="flex-1 pt-28 pb-16 px-4 md:px-8">
      <article className="max-w-3xl mx-auto">
        <header className="mb-10 pb-6 border-b border-primary/10">
          <h1
            className="text-4xl md:text-5xl font-bold text-foreground mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-muted-foreground">{subtitle}</p>
          )}
          {updated && (
            <p className="text-xs uppercase tracking-[0.12em] text-foreground/40 mt-3">
              Last updated · {updated}
            </p>
          )}
        </header>
        <div className="prose prose-neutral max-w-none text-foreground/85 leading-relaxed [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground">
          {children}
        </div>
      </article>
    </main>
    <footer className="border-t border-primary/10 py-8 px-4 md:px-8 flex flex-wrap items-center justify-between gap-4 bg-card/40">
      <div className="flex items-center gap-2.5">
        <CompassMark size={24} id="legal-footer" />
        <span className="text-[11px] tracking-[0.12em] text-foreground/40 uppercase">
          Spectrum · Every School. Every Opportunity.
        </span>
      </div>
      <div className="flex flex-wrap gap-5">
        {footerLinks.map((l) => (
          <Link
            key={l.label}
            to={l.to}
            className="text-[11px] text-foreground/50 tracking-[0.08em] uppercase no-underline hover:text-primary transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </footer>
  </div>
);

export default LegalShell;
