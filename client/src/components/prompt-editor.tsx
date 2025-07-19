import React, { useState, useRef, useEffect } from 'react';
import { Label } from './ui/label';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export default function PromptEditor({ 
  value, 
  onChange, 
  placeholder, 
  label,
  className = ""
}: PromptEditorProps) {
  const [beforeText, setBeforeText] = useState('');
  const [afterText, setAfterText] = useState('');
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  // Parse the value to extract before and after text
  useEffect(() => {
    const parts = value.split('{{first_name}}');
    if (parts.length >= 2) {
      setBeforeText(parts[0]);
      setAfterText(parts.slice(1).join('{{first_name}}')); // Handle multiple placeholders
    } else {
      // If no placeholder found, put all text in before
      setBeforeText(value);
      setAfterText('');
    }
  }, [value]);

  // Update parent when either input changes
  const updateValue = (newBefore: string, newAfter: string) => {
    const newValue = `${newBefore}{{first_name}}${newAfter}`;
    onChange(newValue);
  };

  const handleBeforeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBefore = e.target.value;
    setBeforeText(newBefore);
    updateValue(newBefore, afterText);
  };

  const handleAfterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAfter = e.target.value;
    setAfterText(newAfter);
    updateValue(beforeText, newAfter);
  };

  const handleBeforeKeyDown = (e: React.KeyboardEvent) => {
    // Move to after input when pressing right arrow at the end
    if (e.key === 'ArrowRight' && beforeInputRef.current) {
      const input = beforeInputRef.current;
      if (input.selectionStart === input.value.length) {
        e.preventDefault();
        afterInputRef.current?.focus();
        afterInputRef.current?.setSelectionRange(0, 0);
      }
    }
  };

  const handleAfterKeyDown = (e: React.KeyboardEvent) => {
    // Move to before input when pressing left arrow at the beginning
    if (e.key === 'ArrowLeft' && afterInputRef.current) {
      const input = afterInputRef.current;
      if (input.selectionStart === 0) {
        e.preventDefault();
        beforeInputRef.current?.focus();
        beforeInputRef.current?.setSelectionRange(beforeInputRef.current.value.length, beforeInputRef.current.value.length);
      }
    }
  };

  return (
    <div className={className}>
      {label && (
        <Label className="text-sm font-medium text-slate-700 mb-2 block">
          {label}
        </Label>
      )}
      <div className="relative border border-slate-300 rounded-md p-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors">
        <div className="flex flex-wrap items-center gap-1 min-h-[2.5rem]">
          {/* Before text input */}
          <input
            ref={beforeInputRef}
            type="text"
            value={beforeText}
            onChange={handleBeforeChange}
            onKeyDown={handleBeforeKeyDown}
            placeholder={beforeText === '' ? "Hi " : ""}
            className="border-none outline-none bg-transparent text-slate-900 placeholder-slate-400 min-w-[4ch] flex-shrink"
            style={{ 
              width: `${Math.max(beforeText.length || 4, 4)}ch`
            }}
          />
          
          {/* FIRST NAME chip */}
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-600 text-white whitespace-nowrap">
            FIRST NAME
          </span>
          
          {/* After text input */}
          <input
            ref={afterInputRef}
            type="text"
            value={afterText}
            onChange={handleAfterChange}
            onKeyDown={handleAfterKeyDown}
            placeholder={afterText === '' ? ", I'm Sarah from Mathify. I hope you're having a great day!" : ""}
            className="border-none outline-none bg-transparent text-slate-900 placeholder-slate-400 min-w-[4ch] flex-grow"
            style={{ 
              width: `${Math.max(afterText.length || 20, 20)}ch`
            }}
          />
        </div>
      </div>
      
      {/* Helper text */}
      <p className="mt-1 text-xs text-slate-500">
        The purple "FIRST NAME" will be automatically replaced with each contact's actual first name during calls.
      </p>
    </div>
  );
} 