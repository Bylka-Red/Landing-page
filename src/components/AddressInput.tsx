import React, { useState, useEffect, useRef } from 'react';

interface AddressInputProps {
  onAddressSelect: (address: string) => void;
}

export function AddressInput({ onAddressSelect }: AddressInputProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{properties: {label: string}}>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (value: string) => {
    if (value.length < 5) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`
      );
      if (!response.ok) {
        throw new Error('Erreur lors de la recherche d\'adresse');
      }
      const data = await response.json();
      setSuggestions(data.features || []);
      setIsOpen(true);
    } catch (error) {
      console.error('Erreur lors de la recherche d\'adresse:', error);
      setSuggestions([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    onAddressSelect('');
    fetchSuggestions(value);
  };

  const handleSelectAddress = (address: string) => {
    setInput(address);
    onAddressSelect(address);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <input
        type="text"
        value={input}
        onChange={handleInputChange}
        placeholder="Votre adresse"
        className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b8043] focus:border-transparent"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
              onClick={() => handleSelectAddress(suggestion.properties.label)}
            >
              {suggestion.properties.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}