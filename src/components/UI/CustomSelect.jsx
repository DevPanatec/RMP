import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from '../Icons';
import './CustomSelect.css';

const CustomSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Seleccionar...",
  searchable = true,
  label,
  required = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchTerm('');
    }
  };

  return (
    <div className={`custom-select-wrapper ${disabled ? 'disabled' : ''}`}>
      {label && (
        <label className="custom-select-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      
      <div 
        ref={triggerRef}
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={toggleDropdown}
      >
        <span className={`select-value ${!selectedOption ? 'placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={18} 
          className={`select-arrow ${isOpen ? 'rotated' : ''}`} 
        />
      </div>

      {isOpen && (
        <>
          <div className="custom-select-backdrop" onClick={() => setIsOpen(false)} />
          <div ref={dropdownRef} className="custom-select-dropdown">
            {searchable && (
              <div className="select-search">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            <div className="select-options">
              {filteredOptions.length === 0 ? (
                <div className="select-option empty">
                  No se encontraron resultados
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`select-option ${option.value === value ? 'selected' : ''}`}
                    onClick={() => handleSelect(option)}
                  >
                    <span className="option-label">{option.label}</span>
                    {option.value === value && (
                      <Check size={16} className="check-icon" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomSelect;
