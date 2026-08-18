export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-background p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="tabular mt-2 text-h1">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
