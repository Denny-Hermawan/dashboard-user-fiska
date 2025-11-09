// components/ReceiptTemplateEditor.js
"use client";

import React, { useState, useCallback } from 'react';

// --- Ikon Baru (Material Design) ---
import {
  MdEdit,
  MdImage,
  MdTextFields,
  MdViewColumn,
  MdReceipt,
  MdContentCut
} from 'react-icons/md';
// --- Akhir Ikon ---


// --- Komponen Editor Elemen Template ---
const TemplateElementEditor = ({ element, onToggle, onEdit }) => {
  const { type, enabled = true, value, label } = element;

  let Icon = () => <MdTextFields className="w-4 h-4 text-gray-500" />;
  let title = value || type;
  if (type === 'logo') { Icon = () => <MdImage className="w-4 h-4 text-cyan-600" />; title = "Logo Toko"; }
  if (type === 'row') { Icon = () => <MdViewColumn className="w-4 h-4 text-cyan-600" />; title = `Baris: [${(element.cols || []).join(', ')}]`; }
  if (type === 'summary_line') { Icon = () => <MdReceipt className="w-4 h-4 text-cyan-600" />; title = `Summary: ${label}`; }
  if (type === 'horizontal_line') { Icon = () => <span className="text-gray-400">---</span>; title = `Garis (${element.char || '-'})`; }
  if (type === 'empty_line') { Icon = () => <span className="text-gray-400">...</span>; title = `Baris Kosong (${element.count || 1})`; }
  if (type === 'cut') { Icon = () => <MdContentCut className="w-4 h-4 text-red-600" />; title = "Potong Kertas"; }
  if (type === 'item_header') { Icon = () => <MdViewColumn className="w-4 h-4 text-cyan-600" />; title = "Header Item (Tabel)"; }
  if (type === 'item_body') { Icon = () => <MdViewColumn className="w-4 h-4 text-cyan-600" />; title = "Badan Item (Tabel)"; }
  
  const canEdit = type !== 'row' && type !== 'item_header' && type !== 'item_body' && type !== 'cut';

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2 pl-4 mb-2">
      <div className="flex items-center gap-3">
        <Icon />
        <span className="text-sm font-medium text-gray-700 truncate">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded text-gray-400 hover:text-cyan-700 hover:bg-cyan-50"
            title="Edit"
          >
            <MdEdit className="w-4 h-4" />
          </button>
        )}
        <div className="w-10">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-cyan-700 focus:ring-cyan-500"
          title={enabled ? "Aktif" : "Nonaktif"}
        />
        </div>
      </div>
    </div>
  );
};

// --- Komponen Modal Edit Elemen ---
const EditElementModal = ({ isOpen, onClose, element, onSave }) => {
  if (!isOpen) return null;

  // Siapkan state internal modal berdasarkan data elemen
  const [data, setData] = useState(element);
  const { type } = data;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(data);
    onClose();
  };

  const canEditAlign = type !== 'horizontal_line' && type !== 'empty_line' && type !== 'cut';
  const canEditStyle = type !== 'logo' && type !== 'horizontal_line' && type !== 'empty_line' && type !== 'cut';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Edit Elemen: {type}</h3>

        {/* Input Teks */}
        {(type === 'text' || type === 'data') && (
          <div>
            <label htmlFor="value" className="block text-sm font-medium text-gray-700">Value / Placeholder</label>
            <input
              type="text" name="value" id="value"
              value={data.value || ''} onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            />
          </div>
        )}

        {/* Input Summary */}
        {type === 'summary_line' && (
          <>
            <div>
              <label htmlFor="label" className="block text-sm font-medium text-gray-700">Label</label>
              <input
                type="text" name="label" id="label"
                value={data.label || ''} onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </div>
            <div>
              <label htmlFor="value" className="block text-sm font-medium text-gray-700">Value / Placeholder</label>
              <input
                type="text" name="value" id="value"
                value={data.value || ''} onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </div>
          </>
        )}
        
        {/* Pengaturan Tampilan */}
        {canEditAlign && (
          <div>
            <label htmlFor="align" className="block text-sm font-medium text-gray-700">Perataan</label>
            <select
              id="align" name="align"
              value={data.align || 'left'} onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        )}
        {canEditStyle && (
          <div>
            <label htmlFor="style" className="block text-sm font-medium text-gray-700">Gaya Teks</label>
            <select
              id="style" name="style"
              value={data.style || 'normal'} onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            >
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="large">Large</option>
              <option value="large_bold">Large Bold</option>
            </select>
          </div>
        )}

        {/* Tombol Aksi Modal */}
        <div className="mt-6 flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700">Batal</button>
          <button type="button" onClick={handleSave} className="flex-1 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">Simpan</button>
        </div>
      </div>
    </div>
  );
};

// --- Komponen Editor Utama ---
export default function ReceiptTemplateEditor({ template, onChange }) {
  const [activeTemplateTab, setActiveTemplateTab] = useState('kasir'); // 'kasir', 'dapur', 'bar'
  const [modalData, setModalData] = useState(null); // { templateKey, sectionKey, index }

  const templateKeys = ['kasir', 'dapur', 'bar'];
  const sectionKeys = ['header', 'item_header', 'item_body', 'summary', 'footer'];

  // Handle saat switch di-toggle
  const handleToggle = useCallback((templateKey, sectionKey, index, isEnabled) => {
    // Buat salinan mendalam (deep copy) agar state React terdeteksi
    const newTemplate = JSON.parse(JSON.stringify(template));
    
    newTemplate[templateKey][sectionKey][index].enabled = isEnabled;
    onChange(newTemplate);
  }, [template, onChange]);

  // Handle saat edit modal disimpan
  const handleSaveModal = (updatedElementData) => {
    const { templateKey, sectionKey, index } = modalData;
    const newTemplate = JSON.parse(JSON.stringify(template));
    
    newTemplate[templateKey][sectionKey][index] = updatedElementData;
    onChange(newTemplate);
    setModalData(null); // Tutup modal
  };
  
  // Handle saat tombol edit diklik
  const handleEditClick = (templateKey, sectionKey, index, element) => {
    setModalData({ templateKey, sectionKey, index, element });
  };

  return (
    <div>
      {/* Tab Template (Kasir, Dapur, Bar) */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {templateKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTemplateTab(key)}
              className={`
                whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm capitalize
                ${activeTemplateTab === key
                  ? 'border-cyan-500 text-cyan-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {key}
            </button>
          ))}
        </nav>
      </div>

      {/* Konten Editor untuk Tab yang Aktif */}
      <div className="space-y-6">
        {sectionKeys.map((sectionKey) => {
          // 'item_body' adalah object, bukan array, jadi kita perlakukan khusus
          if (sectionKey === 'item_body') {
            return (
              <div key={sectionKey} className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 mb-3">{sectionKey.replace('_', ' ')}</h3>
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                  <p className="text-sm text-gray-500">
                    Tata letak item (Item Body) memiliki struktur kompleks dan tidak bisa di-edit di sini.
                  </p>
                </div>
              </div>
            );
          }

          // 'item_header', 'header', 'summary', 'footer' adalah array
          const elements = template[activeTemplateTab]?.[sectionKey] || [];
          
          return (
            <div key={sectionKey} className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 mb-3">{sectionKey.replace('_', ' ')}</h3>
              <div className="space-y-2">
                {elements.map((element, index) => (
                  <TemplateElementEditor
                    key={`${sectionKey}-${index}`} // Key harus unik
                    element={element}
                    onToggle={(isEnabled) => handleToggle(activeTemplateTab, sectionKey, index, isEnabled)}
                    onEdit={() => handleEditClick(activeTemplateTab, sectionKey, index, element)}
                  />
                ))}
                {elements.length === 0 && (
                  <p className="text-sm text-gray-400 italic">Tidak ada elemen di bagian ini.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Render Modal Edit */}
      <EditElementModal
        isOpen={!!modalData}
        onClose={() => setModalData(null)}
        element={modalData?.element}
        onSave={handleSaveModal}
      />
    </div>
  );
}