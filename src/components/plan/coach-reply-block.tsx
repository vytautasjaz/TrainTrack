type CoachReplyBlockProps = {
  reply: string
  className?: string
}

export function CoachReplyBlock({ reply, className }: CoachReplyBlockProps) {
  return (
    <div className={className ?? 'mt-3 rounded-xl bg-brand-soft/60 px-3 py-2'}>
      <p className="text-xs font-medium text-brand">Coach reply</p>
      <p className="mt-1 text-sm leading-relaxed">&ldquo;{reply}&rdquo;</p>
    </div>
  )
}
