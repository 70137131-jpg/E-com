/** Single-column prose, 65ch measure (PRD 6.7). */
export default function StaticLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page section">
      <article className="prose-page mx-auto max-w-[65ch]">{children}</article>
    </div>
  );
}
