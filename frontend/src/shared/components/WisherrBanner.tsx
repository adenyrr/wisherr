import React from 'react';

interface WisherrBannerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function WisherrBanner({ className = '', size = 'md' }: WisherrBannerProps) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16'
  };

  return (
    <img
      src="/wisherr-banner.png"
      alt="Wisherr"
      className={`${sizeClasses[size]} object-contain ${className}`}
    />
  );
}
