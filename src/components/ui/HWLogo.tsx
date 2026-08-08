import React from 'react';

interface HWLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function HWLogo({ size = 36, className = '', style }: HWLogoProps) {
  const fontSize = Math.round(size * 0.46);
  const borderRadius = Math.round(size * 0.28);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius,
        background: '#000000',
        border: '1.5px solid rgba(255, 255, 255, 0.28)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 900,
        fontSize,
        letterSpacing: '-0.04em',
        color: '#FFFFFF',
        flexShrink: 0,
        userSelect: 'none',
        ...style,
      }}
    >
      HW
    </div>
  );
}
