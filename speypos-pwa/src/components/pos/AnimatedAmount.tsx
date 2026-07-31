import { useEffect, useMemo, useState } from 'react';

interface AnimatedAmountProps {
  value: number;
  formatValue: (value: number) => string;
  className?: string;
  digitDurationMs?: number;
}

const DIGITS = '0123456789'.split('');

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();

    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  return prefersReducedMotion;
}

function isDigit(char: string) {
  return char >= '0' && char <= '9';
}

function AnimatedDigit({
  digit,
  durationMs,
  reducedMotion,
}: {
  digit: number;
  durationMs: number;
  reducedMotion: boolean;
}) {
  const [renderedDigit, setRenderedDigit] = useState(digit);

  useEffect(() => {
    if (reducedMotion) {
      setRenderedDigit(digit);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setRenderedDigit(digit);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [digit, reducedMotion]);

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-[1em] w-[0.62em] overflow-hidden align-baseline justify-center"
    >
      <span
        className={`flex flex-col items-center ${!reducedMotion ? 'transition-transform ease-in-out' : ''}`}
        style={{
          transform: `translateY(-${renderedDigit * 100}%)`,
          transitionDuration: `${durationMs}ms`,
          willChange: reducedMotion ? 'auto' : 'transform',
        }}
      >
        {DIGITS.map((currentDigit) => (
          <span
            key={currentDigit}
            className="block h-[1em] w-full text-center tabular-nums leading-[1em]"
          >
            {currentDigit}
          </span>
        ))}
      </span>
    </span>
  );
}

export function AnimatedAmount({
  value,
  formatValue,
  className,
  digitDurationMs = 400,
}: AnimatedAmountProps) {
  const reducedMotion = usePrefersReducedMotion();
  const formattedValue = useMemo(() => formatValue(value), [formatValue, value]);
  const characters = useMemo(() => Array.from(formattedValue), [formattedValue]);

  return (
    <span
      className={`inline-flex items-baseline justify-end whitespace-nowrap tabular-nums ${className || ''}`}
      aria-label={formattedValue}
    >
      {characters.map((character, index) =>
        isDigit(character) ? (
          <AnimatedDigit
            key={index}
            digit={Number(character)}
            durationMs={digitDurationMs}
            reducedMotion={reducedMotion}
          />
        ) : (
          <span
            key={index}
            aria-hidden="true"
            className="inline-flex h-[1em] items-baseline leading-[1em]"
          >
            {character}
          </span>
        )
      )}
    </span>
  );
}