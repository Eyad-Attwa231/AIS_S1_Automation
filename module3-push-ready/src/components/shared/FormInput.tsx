import React from 'react';

export interface FormInputProps {
  label?: string;
  name?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'time' | 'date';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  rows?: number;
  className?: string;
  autoComplete?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  rows = 3,
  className = '',
  autoComplete,
}) => {
  const isTextarea = type === 'textarea';

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-[#263445] flex items-center justify-between">
          <span>
            {label}
            {required && <span className="text-[#DC2626] ms-1">*</span>}
          </span>
          {error && <span className="text-[#DC2626] font-normal">{error}</span>}
        </label>
      )}

      {isTextarea ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={rows}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full bg-white border ${
            error ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
          } rounded-lg px-3.5 py-2 text-sm text-[#263445] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#267C83]/30 focus:border-[#267C83] transition-colors disabled:bg-[#F8FAFC] disabled:cursor-not-allowed`}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`w-full bg-white border ${
            error ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
          } rounded-lg px-3.5 py-2 text-sm text-[#263445] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#267C83]/30 focus:border-[#267C83] transition-colors disabled:bg-[#F8FAFC] disabled:cursor-not-allowed`}
        />
      )}

      {helperText && !error && (
        <p className="text-xs text-[#64748B] mt-0.5">{helperText}</p>
      )}
    </div>
  );
};

export default FormInput;
