export default function ProgressLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full min-w-0 max-w-[90rem] space-y-[var(--tt-space-section)]">
      {children}
    </div>
  )
}
