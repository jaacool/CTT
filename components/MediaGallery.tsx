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

  const tabs: Array<{ key: MediaCategory; label: string; count: number; icon: JSX.Element }> = [
    {
      key: 'images',
      label: 'Bilder',
      count: mediaData.images.length,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      key: 'videos',
      label: 'Videos',
      count: mediaData.videos.length,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      key: 'files',
      label: 'Dateien',
      count: mediaData.files.length,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      key: 'links',
      label: 'Links',
      count: mediaData.links.length,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-overlay flex items-center justify-center">
            <svg className="w-5 h-5 text-glow-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-base text-text-primary">Medien-Galerie</div>
            <div className="text-xs text-text-secondary">
              {mediaData.images.length + mediaData.videos.length + mediaData.files.length + mediaData.links.length} Elemente
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <XIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-overlay/50">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'text-glow-purple border-b-2 border-glow-purple bg-glow-purple/10'
                : 'text-text-secondary hover:text-text-primary hover:bg-overlay'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.key
                ? 'bg-glow-purple/20 text-glow-purple'
                : 'bg-surface text-text-secondary'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Images Grid */}
        {activeTab === 'images' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {mediaData.images.length === 0 ? (
              <div className="col-span-full text-center py-12 text-text-secondary">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>Keine Bilder gefunden</p>
              </div>
            ) : (
              mediaData.images.map((item, index) => (
                <div
                  key={index}
                  className="group relative aspect-square bg-overlay rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-glow-purple transition-all"
                  onClick={() => setPreviewAttachment(item.attachment)}
                >
                  <img
                    src={item.attachment.url}
                    alt={item.attachment.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <div className="text-xs text-white truncate">{item.attachment.name}</div>
                    <div className="text-xs text-white/70">{formatTimestamp(item.message.timestamp)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Videos Grid */}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mediaData.videos.length === 0 ? (
              <div className="col-span-full text-center py-12 text-text-secondary">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p>Keine Videos gefunden</p>
              </div>
            ) : (
              mediaData.videos.map((item, index) => (
                <div key={index} className="bg-overlay rounded-lg overflow-hidden">
                  <video
                    src={item.attachment.url}
                    controls
                    className="w-full"
                  />
                  <div className="p-3 border-t border-border">
                    <div className="text-sm text-text-primary truncate">{item.attachment.name}</div>
                    <div className="text-xs text-text-secondary mt-1">
                      {formatTimestamp(item.message.timestamp)} • {formatFileSize(item.attachment.size)}
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      Von: {item.message.sender.name}
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
              <div className="text-center py-12 text-text-secondary">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p>Keine Dateien gefunden</p>
              </div>
            ) : (
              mediaData.files.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-overlay rounded-lg hover:bg-overlay/80 transition-colors"
                >
                  <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-glow-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary truncate">{item.attachment.name}</div>
                    <div className="text-xs text-text-secondary">
                      {formatFileSize(item.attachment.size)} • {formatTimestamp(item.message.timestamp)}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Von: {item.message.sender.name}
                    </div>
                  </div>
                  <a
                    href={item.attachment.url}
                    download={item.attachment.name}
                    className="flex-shrink-0 px-3 py-2 bg-glow-purple/20 hover:bg-glow-purple/30 text-glow-purple rounded-lg text-sm font-medium transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Download
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
              <div className="text-center py-12 text-text-secondary">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p>Keine Links gefunden</p>
              </div>
            ) : (
              mediaData.links.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-overlay rounded-lg hover:bg-overlay/80 transition-colors"
                >
                  <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-glow-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-glow-blue hover:underline truncate block"
                    >
                      {item.url}
                    </a>
                    <div className="text-xs text-text-secondary">
                      {formatTimestamp(item.message.timestamp)} • Von: {item.message.sender.name}
                    </div>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 px-3 py-2 bg-glow-blue/20 hover:bg-glow-blue/30 text-glow-blue rounded-lg text-sm font-medium transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Öffnen
                  </a>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewAttachment && isImageFile(previewAttachment.type) && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <button
            onClick={() => setPreviewAttachment(null)}
            className="absolute top-4 right-4 text-white hover:text-glow-purple transition-colors z-10"
          >
            <XIcon className="w-8 h-8" />
          </button>
          <div
            className="relative max-w-5xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
          >
            <img
              src={previewAttachment.url}
              alt={previewAttachment.name}
              className="max-w-full max-h-[90vh] object-contain transition-transform"
              style={{ transform: `scale(${previewZoom})` }}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 rounded-lg text-white text-sm">
              {previewAttachment.name} • Zoom: {Math.round(previewZoom * 100)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
