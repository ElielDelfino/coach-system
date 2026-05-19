import { useState, useRef } from 'react';

function ImageUpload({ label, onUpload, preview, accept = 'image/*', maxMB = 15 }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    if (file.size > maxMB * 1024 * 1024) {
      alert(`Arquivo muito grande. Máximo ${maxMB}MB.`);
      return;
    }
    setLoading(true);
    try {
      await onUpload(file);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
        ${dragging ? 'border-brand bg-brand/5' : 'border-surface-border hover:border-zinc-600'}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      {loading ? (
        <p className="text-zinc-400 text-sm">Enviando...</p>
      ) : preview ? (
        <img src={preview} alt="preview" className="w-full max-h-48 object-cover rounded-lg" />
      ) : (
        <div>
          <p className="text-zinc-400 text-sm font-medium">{label}</p>
          <p className="text-zinc-600 text-xs mt-1">Arraste ou clique para selecionar</p>
          <p className="text-zinc-700 text-xs mt-0.5">Máx. {maxMB}MB</p>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
