'use client';

import React from 'react';

interface NewsletterPreviewProps {
  htmlContent: string;
}

export default function NewsletterPreview({ htmlContent }: NewsletterPreviewProps) {
  return (
    <div 
      className="newsletter-preview w-full h-full"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
} 