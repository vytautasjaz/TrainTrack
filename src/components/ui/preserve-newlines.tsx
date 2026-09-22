/** Keep author line breaks visible even under CSS line-clamp (-webkit-box). */
export function PreserveNewlines({ text }: { text: string }) {
  const lines = text.split(/\r?\n/)
  return (
    <>
      {lines.map((line, index) => (
        <span key={index}>
          {index > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </>
  )
}
