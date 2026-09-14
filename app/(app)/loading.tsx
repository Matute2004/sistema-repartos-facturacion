/**
 * Skeleton global para todas las rutas dentro de (app).
 * Se muestra instantáneamente al navegar mientras el servidor procesa la página.
 * La estructura imita el layout típico: PageHeader + Card con tabla.
 */
export default function AppLoading() {
  return (
    <div className="animate-pulse">
      {/* PageHeader skeleton */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="h-7 w-48 rounded bg-zinc-200" />
          <div className="mt-2 h-4 w-72 rounded bg-zinc-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-lg bg-zinc-200" />
          <div className="h-9 w-28 rounded-lg bg-zinc-200" />
        </div>
      </div>

      {/* Card skeleton */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="p-5">
          {/* Table header */}
          <div className="mb-4 flex gap-4">
            <div className="h-4 w-24 rounded bg-zinc-100" />
            <div className="h-4 w-20 rounded bg-zinc-100" />
            <div className="h-4 w-32 rounded bg-zinc-100" />
            <div className="h-4 w-24 rounded bg-zinc-100" />
            <div className="h-4 w-16 rounded bg-zinc-100" />
          </div>
          {/* Table rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-t border-zinc-50 py-3"
            >
              <div className="h-4 w-32 rounded bg-zinc-100" />
              <div className="h-4 w-24 rounded bg-zinc-100" />
              <div className="h-4 w-40 rounded bg-zinc-100" />
              <div className="h-4 w-20 rounded bg-zinc-100" />
              <div className="h-4 w-16 rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
