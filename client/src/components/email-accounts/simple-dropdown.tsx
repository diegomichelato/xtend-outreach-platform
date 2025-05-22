import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DropdownItem {
  id: number;
  label: string;
  value: string;
  metadata?: React.ReactNode;
}

interface SimpleDropdownProps {
  items: DropdownItem[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  placeholder?: string;
}

export function SimpleDropdown({
  items,
  selectedValues,
  onChange,
  placeholder = "Select items..."
}: SimpleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleItem = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Simple button-like dropdown trigger */}
      <button 
        type="button"
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded shadow-sm flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          {selectedValues.length > 0 
            ? `${selectedValues.length} item(s) selected` 
            : placeholder}
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 border rounded bg-white shadow-md max-h-60 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="border-b border-gray-100 last:border-b-0"
            >
              <div className="p-3 hover:bg-gray-50">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(item.value)}
                    onChange={() => toggleItem(item.value)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div>{item.label}</div>
                    {item.metadata && <div>{item.metadata}</div>}
                  </div>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}