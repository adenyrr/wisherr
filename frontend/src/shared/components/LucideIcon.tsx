import React from 'react';
import * as LucideIcons from 'lucide-react';

type LucideIconProps = {
  name: string;
  size?: number;
  stroke?: number;
  color?: string;
  className?: string;
};

export default function LucideIcon({ name, size = 18, stroke = 2, color = 'currentColor', className }: LucideIconProps) {
  // Convert kebab-case or snake_case to PascalCase for Lucide icon names
  const pascalName = name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  const IconComponent = (LucideIcons as any)[pascalName];

  if (!IconComponent) {
    console.warn(`Lucide icon "${name}" not found. Using fallback.`);
    // Fallback to a generic icon
    const FallbackIcon = LucideIcons.Circle;
    return <FallbackIcon size={size} strokeWidth={stroke} color={color} className={className} />;
  }

  return <IconComponent size={size} strokeWidth={stroke} color={color} className={className} />;
}
