// components/ReceiptTemplateEditor.js
"use client";

import React, { useState, useCallback } from 'react';

// --- Ikon ---
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
);
const LogoIcon = () => (
  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 00-2.828 0L6 16" /></svg>
);
const TextIcon = () => (
  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
);
const RowIcon = () => (
  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2m8-3v13m0-13a2 2 0 012 2v9a2 2 0 01-2 2h-2a2 2 0 01-2-2V7a2 2 0 012-2h2z" /></svg>
);
const SummaryIcon = () => (
  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m-6 4h6m-6 4h6M6 21h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
);
const CutIcon = () => (
  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121M12 12l2.879 2.879M12 12l-2.879-2.879M3 3v.01M3 7v.01M3 11v.01M3 15v.01M3 19v.01M7 3v.01M11 3v.01M15 3v.01M19 3v.01" /></svg>
);
// --- Akhir Ikon ---


// --- Komponen Editor Elemen Template ---
const TemplateElementEditor = ({ element, onToggle, onEdit }) => {
  const { type, enabled = true, value, label } = element;

  let Icon = TextIcon;
  let title = value || type;
  if (type === 'logo') { Icon = LogoIcon; title = "Logo Toko"; }
  if (type === 'row') { Icon = RowIcon; title = `Baris: [${(element.cols || []).join(', ')}]`; }
  if (type === 'summary_line') { Icon = SummaryIcon; title = `Summary: ${label}`; }
  if (type === 'horizontal_line') { Icon = () => <span className="text-gray-400">---</span>; title = `Garis (${element.char || '-'})`; }
  if (type === 'empty_line') { Icon = () => <span className="text-gray-400">...</span>; title = `Baris Kosong (${element.count || 1})`; }
  if (type === 'cut') { Icon = CutIcon; title = "Potong Kertas"; }
  if (type === 'item_header') { Icon = RowIcon; title = "Header Item (Tabel)"; }
  if (type === 'item_body') { Icon = RowIcon; title = "Badan Item (Tabel)"; }
  
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
            className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
            title="Edit"
          >
            <EditIcon />
          </button>
        )}
        <div className="w-10">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900"
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
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900"
              />
            </div>
            <div>
              <label htmlFor="value" className="block text-sm font-medium text-gray-700">Value / Placeholder</label>
              <input
                type="text" name="value" id="value"
                value={data.value || ''} onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900"
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900"
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900"
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
          <button type="button" onClick={handleSave} className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Simpan</button>
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
                  ? 'border-indigo-500 text-indigo-600'
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