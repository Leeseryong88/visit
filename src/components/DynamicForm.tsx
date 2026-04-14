import React from 'react';
import { FormField } from '../types';
import { Input, Label } from './ui/Button';
import { cn } from '../lib/utils';
import { Camera, FileUp, X } from 'lucide-react';

interface DynamicFormProps {
  fields: FormField[];
  values: Record<string, any>;
  onChange: (id: string, value: any) => void;
  errors?: Record<string, string>;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ fields, values, onChange, errors }) => {
  const handleFileChange = (id: string, file: File | null) => {
    if (!file) {
      onChange(id, null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimensions
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.7 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        onChange(id, dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <Label htmlFor={field.id} className={cn(field.required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
            {field.label}
          </Label>
          
          {field.type === 'textarea' ? (
            <textarea
              id={field.id}
              className={cn(
                'flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
                errors?.[field.id] && 'border-red-500'
              )}
              placeholder={field.placeholder}
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              required={field.required}
            />
          ) : field.type === 'file' ? (
            <div className="space-y-2">
              {!values[field.id] ? (
                <div className="flex gap-2">
                  <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                    <FileUp className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500">파일 선택 / 사진 촬영</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              ) : (
                <div className="relative inline-block">
                  <img 
                    src={values[field.id]} 
                    alt="Uploaded" 
                    className="h-32 w-32 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => onChange(field.id, null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ) : field.type === 'select' ? (
            <select
              id={field.id}
              className={cn(
                'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
                errors?.[field.id] && 'border-red-500'
              )}
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              required={field.required}
            >
              <option value="">선택해 주세요</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : field.type === 'radio' ? (
            <div className="flex flex-wrap gap-4 pt-1">
              {field.options?.map((opt) => (
                <label key={opt} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.id}
                    value={opt}
                    checked={values[field.id] === opt}
                    onChange={(e) => onChange(field.id, e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    required={field.required}
                  />
                  <span className="text-sm text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
          ) : field.type === 'checkbox' ? (
            <div className="flex flex-wrap gap-4 pt-1">
              {field.options?.map((opt) => (
                <label key={opt} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={opt}
                    checked={(values[field.id] || []).includes(opt)}
                    onChange={(e) => {
                      const current = values[field.id] || [];
                      const next = e.target.checked
                        ? [...current, opt]
                        : current.filter((v: string) => v !== opt);
                      onChange(field.id, next);
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
          ) : (
            <Input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder}
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              className={cn(errors?.[field.id] && 'border-red-500')}
              required={field.required}
            />
          )}
          
          {errors?.[field.id] && (
            <p className="text-xs text-red-500 mt-1">{errors[field.id]}</p>
          )}
        </div>
      ))}
    </div>
  );
};
