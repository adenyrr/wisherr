import React from 'react';

interface FooterProps {
  siteTitle?: string;
}

export default function Footer({ siteTitle = 'Wisherr' }: FooterProps) {
  return (
    <footer className="w-full py-4 px-6 border-t border-white/10 bg-gray-900/30">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className="text-gray-600">CC BY-NC</span>
          <span className="text-gray-700">•</span>
          <a
            href="https://github.com/adenyrr/wisherr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            wisherr
          </a>
          <span>by</span>
          <a
            href="https://github.com/adenyrr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            adenyrr
          </a>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <span>Instance par</span>
          <span className="text-white font-medium">{siteTitle}</span>
        </div>
      </div>
    </footer>
  );
}
