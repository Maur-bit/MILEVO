'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

type ImageWithFallbackProps = Omit<ImageProps, 'onError'>;

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [hasFailed, setHasFailed] = useState(false);

  if (hasFailed) return null;

  return <Image {...props} alt={props.alt} onError={() => setHasFailed(true)} />;
}
