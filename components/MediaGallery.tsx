import React, { useState, useMemo } from 'react';
import { ChatMessage, ChatAttachment } from '../types';
import { XIcon } from './Icons';
import { isImageFile, isVideoFile, isAudioFile } from '../utils/fileUpload';

interface MediaGalleryProps {
  messages: ChatMessage[];
  onClose: () => void;
}

type MediaCategory = 'images' | 'videos' | 'files' | 'links';

export const MediaGallery: React.FC<MediaGalleryProps> = ({ messages, onClose }) => {
  const [activeTab, setActiveTab] = useState<MediaCategory>('images');
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);

  // Extract all media from messages
  const mediaData = useMemo(() => {
    const images: Array<{ attachment: ChatAttachment; message: ChatMessage }> = [];
    const videos: Array<{ attachment: ChatAttachment; message: ChatMessage }> = [];
    const files: Array<{ attachment: ChatAttachment; message: ChatMessage }> = [];
    const links: Array<{ url: string; message: ChatMessage }> = [];

    messages.forEach(message => {
      // Extract attachments
      if (message.attachments && message.attachments.length > 0) {
        message.attachments.forEach(attachment => {
          if (isImageFile(attachment.type)) {
            images.push({ attachment, message });
          } else if (isVideoFile(attachment.type)) {
            videos.push({ attachment, message });
          } else {
            files.push({ attachment, message });
          }
        });
      }

      // Extract links from message content
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
      const matches = message.content.match(urlRegex);
      if (matches) {
        matches.forEach(url => {
          const href = url.match(/^https?:\/\//) ? url : `https://${url}`;
          links.push({ url: href, message });
        });
      }
    });

    return { images, videos, files, links };
  }, [messages]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!previewAttachment) return;
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newZoom = Math.min(Math.max(1, previewZoom + delta), 5);
    setPreviewZoom(newZoom);
  };

  const tabs: Array<{ key: MediaCategory; label: string }> = [
    { key: 'images', label: 'Bilder' },
    { key: 'videos', label: 'Videos' },
    { key: 'files', label: 'Dateien' },
    { key: 'links', label: 'Links' }
  ];

  return (
    <div className="relative flex flex-col h-full bg-background">
      {/* Tabs - Minimal design, text only */}
      <div className="flex border-b border-border/50 bg-surface/50 backdrop-blur-sm px-4 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-glow-purple'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Images Grid */}
        {activeTab === 'images' && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {mediaData.images.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-text-secondary">
                <div className="w-20 h-20 rounded-full bg-overlay/50 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm">Keine Bilder vorhanden</p>
              </div>
            ) : (
              mediaData.images.map((item, index) => (
                <div
                  key={index}
                  className="group relative aspect-square bg-surface rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-glow-purple/20"
                  onClick={() => setPreviewAttachment(item.attachment)}
                >
                  <img
                    src={item.attachment.url}
                    alt={item.attachment.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <div className="text-[10px] text-white font-medium truncate mb-0.5">{item.attachment.name}</div>
                      <div className="text-[9px] text-white/60">{formatTimestamp(item.message.timestamp)}</div>
                    </div>
                  </div>
                  {/* Hover indicator */}
                  <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Videos Grid */}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mediaData.videos.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-text-secondary">
                <div className="w-20 h-20 rounded-full bg-overlay/50 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm">Keine Videos vorhanden</p>
              </div>
            ) : (
              mediaData.videos.map((item, index) => (
                <div key={index} className="group bg-surface rounded-xl overflow-hidden hover:shadow-lg hover:shadow-glow-blue/10 transition-all">
                  <div className="relative bg-black">
                    <video
                      src={item.attachment.url}
                      controls
                      className="w-full aspect-video object-contain"
                    />
                  </div>
                  <div className="p-3">
                    <div className="text-sm text-text-primary font-medium truncate mb-1">{item.attachment.name}</div>
                    <div className="flex items-center space-x-2 text-xs text-text-secondary">
                      <span>{formatFileSize(item.attachment.size)}</span>
                      <span>•</span>
                      <span>{item.message.sender.name}</span>
                    </div>
                    <div className="text-[10px] text-text-secondary/60 mt-1">
                      {formatTimestamp(item.message.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Files List */}
        {activeTab === 'files' && (
          <div className="space-y-2">
            {mediaData.files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                <div className="w-20 h-20 rounded-full bg-overlay/50 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm">Keine Dateien vorhanden</p>
              </div>
            ) : (
              mediaData.files.map((item, index) => (
                <div
                  key={index}
                  className="group flex items-center space-x-3 p-3 bg-surface rounded-xl hover:bg-overlay transition-all hover:shadow-md"
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-glow-purple/20 to-glow-pink/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 text-glow-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary font-medium truncate">{item.attachment.name}</div>
                    <div className="flex items-center space-x-2 text-xs text-text-secondary mt-0.5">
                      <span>{formatFileSize(item.attachment.size)}</span>
                      <span>•</span>
                      <span>{item.message.sender.name}</span>
                    </div>
                    <div className="text-[10px] text-text-secondary/60 mt-0.5">
                      {formatTimestamp(item.message.timestamp)}
                    </div>
                  </div>
                  <a
                    href={item.attachment.url}
                    download={item.attachment.name}
                    className="flex-shrink-0 px-4 py-2 bg-glow-purple/10 hover:bg-glow-purple/20 text-glow-purple rounded-lg text-xs font-semibold transition-all hover:scale-105"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              ))
            )}
          </div>
        )}

        {/* Links List */}
        {activeTab === 'links' && (
          <div className="space-y-2">
            {mediaData.links.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                <div className="w-20 h-20 rounded-full bg-overlay/50 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <p className="text-sm">Keine Links vorhanden</p>
              </div>
            ) : (
              mediaData.links.map((item, index) => (
                <div
                  key={index}
                  className="group flex items-center space-x-3 p-3 bg-surface rounded-xl hover:bg-overlay transition-all hover:shadow-md"
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-glow-blue/20 to-glow-purple/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 text-glow-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-glow-blue hover:text-glow-purple font-medium truncate block transition-colors"
                    >
                      {item.url}
                    </a>
                    <div className="flex items-center space-x-2 text-xs text-text-secondary mt-0.5">
                      <span>{item.message.sender.name}</span>
                    </div>
                    <div className="text-[10px] text-text-secondary/60 mt-0.5">
                      {formatTimestamp(item.message.timestamp)}
                    </div>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-9 h-9 bg-glow-blue/10 hover:bg-glow-blue/20 text-glow-blue rounded-lg flex items-center justify-center transition-all hover:scale-105"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Image Preview Modal - Contained within chat window */}
      {previewAttachment && isImageFile(previewAttachment.type) && (
        <div
          className="absolute inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          {/* Top Bar with Close and Download */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex items-center space-x-2">
              <span className="text-white text-sm font-medium truncate max-w-md">{previewAttachment.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              {/* Download Button */}
              <a
                href={previewAttachment.url}
                download={previewAttachment.name}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all hover:scale-110"
                onClick={(e) => e.stopPropagation()}
                title="Herunterladen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
              {/* Close Button */}
              <button
                onClick={() => setPreviewAttachment(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all hover:scale-110"
                title="Schließen"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Image Container */}
          <div
            className="relative max-w-full max-h-full overflow-hidden flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
          >
            <img
              src={previewAttachment.url}
              alt={previewAttachment.name}
              className="max-w-full max-h-[calc(100vh-200px)] object-contain transition-transform duration-200"
              style={{ transform: `scale(${previewZoom})` }}
            />
          </div>
          
          {/* Bottom Bar with Zoom Info */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
            <div className="flex items-center space-x-2 text-white/80">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              <span className="text-xs font-mono">{Math.round(previewZoom * 100)}%</span>
              <span className="text-[10px] opacity-60">• Mausrad zum Zoomen</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
