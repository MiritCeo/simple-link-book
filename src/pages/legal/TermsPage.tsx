import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageTransition } from "@/components/motion";

export default function TermsPage() {
  return (
    <PageTransition className="min-h-screen bg-white font-[Inter,system-ui,sans-serif] text-neutral-900">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <Link
            to="/aplikacja"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 transition hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Aplikacja Honly
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Regulamin</h1>
        <p className="mt-6 leading-relaxed text-neutral-600">
          Pełna treść regulaminu serwisu Honly jest w przygotowaniu. W sprawach związanych z zasadami korzystania z
          aplikacji napisz na{" "}
          <a href="mailto:rodo@honly.app.pl" className="font-medium text-primary underline underline-offset-2">
            rodo@honly.app.pl
          </a>
          .
        </p>
      </article>
    </PageTransition>
  );
}
