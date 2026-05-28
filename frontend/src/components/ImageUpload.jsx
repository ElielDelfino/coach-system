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
      className={`relative border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors overflow-hidden
        ${dragging ? 'border-brand bg-brand/5' : preview ? 'border-brand/40' : 'border-surface-border hover:border-zinc-600'}`}
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
        <div className="aspect-[3/4] w-full flex items-center justify-center">
          <p className="text-zinc-400 text-sm">Enviando...</p>
        </div>
      ) : preview ? (
        <div className="relative aspect-[3/4] w-full">
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute bottom-1.5 left-1.5 text-[10px] uppercase tracking-widest font-black
            bg-brand text-[#0A0A0E] px-2 py-0.5 rounded-full">
            Trocar
          </span>
        </div>
      ) : (
        <div className="aspect-[3/4] w-full flex flex-col items-center justify-center p-3">
          <div className="text-2xl mb-1.5 text-zinc-600">+</div>
          <p className="text-zinc-400 text-xs font-bold leading-tight">{label}</p>
          <p className="text-zinc-700 text-[10px] mt-1.5">Máx. {maxMB}MB</p>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
