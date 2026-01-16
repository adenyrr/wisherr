import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LucideIcon from './LucideIcon';

type Item = {
  id: number;
  name: string;
  description?: string;
  url?: string;
  image_url?: string;
  price?: number;
};

function decodeHtml(html?: string) {
  if (!html) return '';
  const doc = document.createElement('div');
  doc.innerHTML = html;
  return doc.textContent || doc.innerText || '';
}

function cleanDescription(s?: string) {
  if (!s) return '';
  let text = decodeHtml(s).trim();
  // remove trailing site references like ` : Amazon.com.be: High-tech` or similar
  text = text.replace(/\s*:\s*([A-Za-z0-9.-]+\.[A-Za-z]{2,})[:\s\w-]*$/i, '');
  // normalise whitespace
  text = text.replace(/\s+/g, ' ');
  return text;
}

export default function ItemCard({ item, onEdit, onDelete }: { item: Item; onEdit?: (i: Item) => void; onDelete?: (id: number) => void }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const desc = cleanDescription(item.description);
  const truncated = desc.length > 180 ? desc.slice(0, 177).trimEnd() + '…' : desc;

  return (
    <>
      <div
        className="flex gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[140px] cursor-pointer bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20 hover:bg-white/90 dark:hover:bg-gray-800/90"
        onClick={() => setDialogOpen(true)}
      >
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-30 h-24 object-cover rounded flex-shrink-0" />
        ) : (
          <div className="w-30 h-24 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
            <LucideIcon name="image" size={28} />
          </div>
        )}

        <div className="flex-1 flex flex-col justify-between p-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">{item.price != null ? `${item.price} €` : ''}</span>
          </div>

          <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${expanded ? '' : 'line-clamp-3'}`}>
            {expanded ? desc : truncated}
          </p>

          <div className="flex justify-end mt-2">
            {desc && desc.length > 180 && (
              <button aria-label="expand description" className="p-1" onClick={(e) => { e.stopPropagation(); setExpanded(x => !x); }}>
                <LucideIcon name={expanded ? 'chevrons-down' : 'chevrons-right'} size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDialogOpen(false)}>
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{item.name}</h2>
            </div>
            <div className="p-6 overflow-y-auto">
              {item.image_url && <img src={item.image_url} alt={item.name} className="w-full max-h-60 object-cover rounded-lg mb-4 shadow-lg" />}
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{desc || item.url}</p>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              {onEdit && <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md" onClick={() => { onEdit(item); setDialogOpen(false); }}>{t('Edit') || 'Edit'}</button>}
              {onDelete && <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md" onClick={() => { onDelete(item.id); setDialogOpen(false); }}>{t('Delete') || 'Delete'}</button>}
              <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md" onClick={() => setDialogOpen(false)}>{t('Close') || 'Close'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
