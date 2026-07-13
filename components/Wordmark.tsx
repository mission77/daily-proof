interface WordmarkProps {
  className?: string;
}

/**
 * "Daily" — sunrise gradient. "Proof" — foreground ink. Final dot — orange,
 * sitting on the text baseline (never vertically centered). The dot is the
 * first proof: the beginning, the first intentional action.
 */
export function Wordmark({ className = "text-2xl" }: WordmarkProps) {
  return (
    <span className={`font-display font-semibold tracking-tight leading-none ${className}`}>
      <span className="wordmark-daily">Daily</span>
      <span> Proof</span>
      <span className="wordmark-dot">.</span>
    </span>
  );
}
