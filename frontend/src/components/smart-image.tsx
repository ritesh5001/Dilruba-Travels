"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

// next/image with a branded fallback, so a missing remote photo never shows a broken image.
export function SmartImage({ alt, className, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--color-amber),transparent_55%),linear-gradient(135deg,var(--color-flame),var(--color-brand)_55%,#5b0d10)] ${className ?? ""}`}
      />
    );
  }

  return <Image alt={alt} className={className} onError={() => setFailed(true)} {...props} />;
}
