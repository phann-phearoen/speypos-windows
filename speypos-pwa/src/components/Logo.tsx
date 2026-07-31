import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'compact' | 'monomark' | 'text';
  size?: 'sm' | 'md' | 'lg';
  inverted?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 28, text: 'text-sm', gap: 'gap-2' },
  md: { icon: 36, text: 'text-lg', gap: 'gap-3' },
  lg: { icon: 52, text: 'text-2xl', gap: 'gap-4' },
};

function Monomark({ size, inverted }: { size: number; inverted?: boolean }) {
  const fillColor = inverted ? 'hsl(var(--pos-header-foreground))' : 'currentColor';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* TOP — 3 pills, right-aligned */}
      <rect x="28" y="14" width="13" height="11" rx="4" fill={fillColor} />
      <rect x="45" y="14" width="13" height="11" rx="4" fill={fillColor} />
      <rect x="62" y="14" width="10" height="11" rx="4" fill={fillColor} />
      {/* MIDDLE — centered bar */}
      <rect x="18" y="35" width="44" height="11" rx="4" fill={fillColor} />
      {/* BOTTOM — wide bar, left-aligned */}
      <rect x="12" y="56" width="56" height="11" rx="4" fill={fillColor} />
    </svg>
  );
}

export function Logo({ variant = 'full', size = 'md', inverted = false, className }: LogoProps) {
  const dimensions = sizeMap[size];

  if (variant === 'text') {
    return (
      <span
        className={cn(
          'font-mono font-medium tracking-widest uppercase',
          dimensions.text,
          inverted ? 'text-pos-header-foreground' : 'text-foreground',
          className
        )}
      >
        SPEYPOS
      </span>
    );
  }

  if (variant === 'monomark') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <Monomark size={dimensions.icon} inverted={inverted} />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center', dimensions.gap, className)}>
        <Monomark size={dimensions.icon} inverted={inverted} />
        <span
          className={cn(
            'font-semibold tracking-tight',
            dimensions.text,
            inverted ? 'text-pos-header-foreground' : 'text-foreground'
          )}
        >
          SP
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', dimensions.gap, className)}>
      <Monomark size={dimensions.icon} inverted={inverted} />
      <span
        className={cn(
          'font-semibold tracking-tight',
          dimensions.text,
          inverted ? 'text-pos-header-foreground' : 'text-foreground'
        )}
      >
        SpeyPOS
      </span>
    </div>
  );
}
