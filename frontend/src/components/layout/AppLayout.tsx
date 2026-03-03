import type { ReactNode } from "react";

type AppLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AppLayout({ title, subtitle, children }: AppLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-2 text-slate-600">{subtitle}</p> : null}
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {children}
        </section>
      </div>
    </main>
  );
}
