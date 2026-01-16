import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LucideIcon from './LucideIcon';
import api from '../utils/api';

interface ScrapedData {
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  images: string[];
  brand: string | null;
  availability: string | null;
  url: string;
}

interface UrlImportDialogProps {
  wishlistId: number;
  open: boolean;
  onClose: () => void;
  onSuccess?: (item: any) => void;
}

export default function UrlImportDialog({ 
  wishlistId, 
  open, 
  onClose,
  onSuccess 
}: UrlImportDialogProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Editable fields
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customAttributes, setCustomAttributes] = useState<{ key: string; value: string }[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<number | null>(null);

  const resetForm = () => {
    setUrl('');
    setScrapedData(null);
    setEditedTitle('');
    setEditedDescription('');
    setEditedPrice('');
    setSelectedImage('');
    setQuantity(1);
    setCustomAttributes([]);
    setSelectedPriority(null);
    setError('');
  };

  const handleScrape = async () => {
    if (!url.trim()) {
      setError('Veuillez entrer une URL');
      return;
    }

    setScraping(true);
    setError('');
    setScrapedData(null);

    try {
      const res = await api.post('/scrape', { url: url.trim() });
      const data = res.data;
      setScrapedData(data);
      setEditedTitle(data.title || '');
      setEditedDescription(data.description || '');
      setEditedPrice(data.price ? String(data.price) : '');
      setSelectedImage(data.images?.[0] || '');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la récupération des informations');
    } finally {
      setScraping(false);
    }
  };

  const handleAddAttribute = () => {
    setCustomAttributes([...customAttributes, { key: '', value: '' }]);
  };

  const handleRemoveAttribute = (index: number) => {
    setCustomAttributes(customAttributes.filter((_, i) => i !== index));
  };

  const handleAttributeChange = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customAttributes];
    updated[index][field] = value;
    setCustomAttributes(updated);
  };

  const handleSave = async () => {
    if (!editedTitle.trim()) {
      setError('Le titre est requis');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Build custom attributes object
      const attrs: Record<string, string> = {};
      customAttributes.forEach(attr => {
        if (attr.key.trim() && attr.value.trim()) {
          attrs[attr.key.trim()] = attr.value.trim();
        }
      });

      const payload = {
        wishlist_id: wishlistId,
        name: editedTitle.trim(),
        description: editedDescription.trim() || null,
        url: url.trim() || null,
        image_url: selectedImage || null,
        price: editedPrice ? parseFloat(editedPrice) : null,
        quantity: quantity,
        priority_id: selectedPriority,
        custom_attributes: Object.keys(attrs).length > 0 ? attrs : null
      };

      const res = await api.post('/items', payload);
      onSuccess?.(res.data);
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'ajout de l\'article');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-gray-900 border border-white/10 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <LucideIcon name="link" size={20} className="text-blue-400" />
            {t('Importer depuis une URL')}
          </h2>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
          >
            <LucideIcon name="x" size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('URL du produit')}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.amazon.fr/dp/..."
                className="flex-1 px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                disabled={scraping || !!scrapedData}
              />
              {!scrapedData ? (
                <button
                  onClick={handleScrape}
                  disabled={scraping}
                  className="px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center gap-2"
                >
                  {scraping ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LucideIcon name="search" size={20} />
                  )}
                  {t('Récupérer')}
                </button>
              ) : (
                <button
                  onClick={resetForm}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                >
                  <LucideIcon name="refresh-cw" size={20} />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t('Sites supportés: Amazon, Cdiscount, Fnac, et la plupart des boutiques en ligne')}
            </p>
          </div>

          {/* Scraped Data Form */}
          {scrapedData && (
            <>
              {/* Image Selection */}
              {scrapedData.images && scrapedData.images.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Image')}
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {scrapedData.images.slice(0, 5).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(img)}
                        className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                          selectedImage === img
                            ? 'border-blue-500'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Option ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('Titre')} *
                </label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('Description')}
                </label>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Price & Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Prix')} ({scrapedData.currency || '€'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedPrice}
                    onChange={(e) => setEditedPrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Quantité')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('Priorité')}
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 1, label: '🔴 Essentiel', color: 'bg-red-500/20 text-red-400 border-red-500' },
                    { id: 2, label: '🟠 Important', color: 'bg-amber-500/20 text-amber-400 border-amber-500' },
                    { id: 3, label: '🟢 Sympa', color: 'bg-green-500/20 text-green-400 border-green-500' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPriority(selectedPriority === p.id ? null : p.id)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedPriority === p.id
                          ? p.color
                          : 'border-white/10 text-gray-400 hover:border-white/30'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Attributes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">
                    {t('Attributs personnalisés')}
                  </label>
                  <button
                    onClick={handleAddAttribute}
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <LucideIcon name="plus" size={16} />
                    {t('Ajouter')}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {t('Ex: Taille: M, Couleur: Bleu, Version: Collector')}
                </p>
                <div className="space-y-2">
                  {customAttributes.map((attr, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t('Attribut')}
                        value={attr.key}
                        onChange={(e) => handleAttributeChange(idx, 'key', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder={t('Valeur')}
                        value={attr.value}
                        onChange={(e) => handleAttributeChange(idx, 'value', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleRemoveAttribute(idx)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                      >
                        <LucideIcon name="trash-2" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brand & Availability Info */}
              {(scrapedData.brand || scrapedData.availability) && (
                <div className="flex gap-4 text-sm text-gray-400">
                  {scrapedData.brand && (
                    <span className="flex items-center gap-1">
                      <LucideIcon name="tag" size={14} />
                      {scrapedData.brand}
                    </span>
                  )}
                  {scrapedData.availability && (
                    <span className="flex items-center gap-1">
                      <LucideIcon name="package" size={14} />
                      {scrapedData.availability}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {scrapedData && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
            <button
              onClick={() => { resetForm(); onClose(); }}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              {t('Annuler')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LucideIcon name="plus" size={18} />
              )}
              {t('Ajouter à la liste')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
