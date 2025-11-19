import React, { useState, useEffect } from 'react';
import { ExternalLinkIcon } from './Icons';

interface LinkPreviewProps {
  url: string;
}

interface PreviewData {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(false);

        // Für Google Drive Links - spezielle Behandlung
        if (url.includes('drive.google.com')) {
          const fileId = extractGoogleDriveFileId(url);
          if (fileId) {
            setPreview({
              title: 'Google Drive Datei',
              description: 'Klicken Sie hier, um die Datei in Google Drive zu öffnen',
              image: `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
              favicon: 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png',
              siteName: 'Google Drive',
            });
            setLoading(false);
            return;
          }
        }

        // Für andere URLs - versuche Open Graph Daten zu holen
        // Da wir im Browser sind und CORS-Probleme haben, zeigen wir eine einfache Preview
        const domain = new URL(url).hostname;
        setPreview({
          title: domain,
          description: url,
          favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
          siteName: domain,
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching link preview:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  const extractGoogleDriveFileId = (url: string): string | null => {
    // Verschiedene Google Drive URL Formate
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/folders\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  if (loading) {
    return (
      <div className="mt-2 p-3 bg-overlay rounded-lg border border-border animate-pulse">
        <div className="h-4 bg-surface rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-surface rounded w-1/2"></div>
      </div>
    );
  }

  if (error || !preview) {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block p-3 bg-overlay rounded-lg border border-border hover:bg-surface transition-colors group"
    >
      <div className="flex items-start space-x-3">
        {preview.image && (
          <img
            src={preview.image}
            alt={preview.title}
            className="w-20 h-20 object-cover rounded flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            {preview.favicon && (
              <img
                src={preview.favicon}
                alt=""
                className="w-4 h-4 flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            {preview.siteName && (
              <span className="text-xs text-text-secondary">{preview.siteName}</span>
            )}
            <ExternalLinkIcon className="w-3 h-3 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {preview.title && (
            <h4 className="font-semibold text-text-primary text-sm mb-1 line-clamp-2">
              {preview.title}
            </h4>
          )}
          {preview.description && (
            <p className="text-xs text-text-secondary line-clamp-2">
              {preview.description}
            </p>
          )}
        </div>
      </div>
    </a>
  );
};
