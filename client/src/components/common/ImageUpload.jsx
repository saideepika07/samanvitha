import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

export function ImageUpload({
  label = 'Item Photograph / Preview',
  value,
  onChange,
  error,
  helperText = 'Upload a clear photograph of the items (PNG, JPEG, or WebP up to 5MB).',
  required = false,
  className = '',
}) {
  const [dragActive, setDragActive] = useState(false);
  const [internalError, setInternalError] = useState('');
  const fileInputRef = useRef(null);

  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const validateAndProcessFile = (file) => {
    setInternalError('');

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setInternalError('Invalid file type. Please upload a PNG, JPEG, or WebP image.');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setInternalError('File is too large. Image size must not exceed 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result); // Base64 data URL for mock preview & storage
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setInternalError('');
  };

  const displayedError = error || internalError;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center justify-between">
          <span>
            {label}
            {required && <span className="text-terracotta-500 ml-1" aria-hidden="true">*</span>}
          </span>
        </span>
      )}

      {value ? (
        <div className="relative rounded-2xl border border-sand-300 overflow-hidden bg-sand-100 group max-h-64 flex items-center justify-center p-2">
          <img
            src={value}
            alt="Donation preview"
            className="max-h-56 w-auto object-contain rounded-xl shadow-soft-sm"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-3 right-3 min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 bg-charcoal-900/80 text-white rounded-full hover:bg-red-600 transition-colors shadow-soft cursor-pointer focus-visible:outline-white"
            title="Remove image"
            aria-label="Remove uploaded image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 bg-sand-50/50 hover:bg-sand-100/60 ${
            dragActive
              ? 'border-sage-600 bg-sage-50/50'
              : displayedError
              ? 'border-red-300 hover:border-red-400'
              : 'border-sand-300 hover:border-sage-400'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload item image"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
          <div className="w-12 h-12 rounded-2xl bg-sand-200/70 text-charcoal-600 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6 text-sage-700" />
          </div>
          <p className="text-sm font-semibold text-charcoal-900 text-center">
            Click to upload or drag and drop photo
          </p>
          <p className="text-xs text-charcoal-500 mt-1 text-center">
            PNG, JPG, or WebP (max 5MB)
          </p>
        </div>
      )}

      {displayedError ? (
        <p className="text-xs text-red-600 font-medium flex items-center gap-1" role="alert">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{displayedError}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-charcoal-500">{helperText}</p>
      ) : null}
    </div>
  );
}

export default ImageUpload;
