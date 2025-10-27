import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [shouldPortal, setShouldPortal] = useState(false);
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

    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    // Close dropdown when modal scrolls
    const modalBody = triggerRef.current?.closest('.modal-body');
    if (modalBody) {
      modalBody.addEventListener('scroll', handleScroll);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (modalBody) {
        modalBody.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isOpen]);

  // Check if should use portal and calculate position
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const trigger = triggerRef.current;
      const modalBody = trigger.closest('.modal-body');

      if (modalBody) {
        setShouldPortal(true);

        const updatePosition = () => {
          const triggerRect = trigger.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;

          const spaceBelow = viewportHeight - triggerRect.bottom - 16;
          const spaceAbove = triggerRect.top - 16;

          const style = {
            position: 'fixed',
            left: `${Math.min(triggerRect.left, viewportWidth - triggerRect.width - 16)}px`,
            width: `${triggerRect.width}px`,
            maxWidth: `${triggerRect.width}px`,
            zIndex: 10000
          };

          if (spaceBelow >= 200 || spaceBelow > spaceAbove) {
            style.top = `${triggerRect.bottom + 8}px`;
            style.bottom = 'auto';
            style.maxHeight = `${Math.min(320, spaceBelow)}px`;
          } else {
            style.top = 'auto';
            style.bottom = `${viewportHeight - triggerRect.top + 8}px`;
            style.maxHeight = `${Math.min(320, spaceAbove)}px`;
          }

          setDropdownStyle(style);
        };

        updatePosition();

        const handleUpdate = () => updatePosition();
        window.addEventListener('scroll', handleUpdate, true);
        window.addEventListener('resize', handleUpdate);

        return () => {
          window.removeEventListener('scroll', handleUpdate, true);
          window.removeEventListener('resize', handleUpdate);
        };
      } else {
        setShouldPortal(false);
        setDropdownStyle({});
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Only prevent body scroll if not inside a modal
      const modal = triggerRef.current?.closest('.modal-content');
      if (!modal) {
        document.body.style.overflow = 'hidden';
      }
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
    <div className={`custom-select-wrapper ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}>
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

      {isOpen && !shouldPortal && (
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

      {isOpen && shouldPortal && createPortal(
        <>
          <div className="custom-select-backdrop" onClick={() => setIsOpen(false)} />
          <div ref={dropdownRef} className="custom-select-dropdown portaled" style={dropdownStyle}>
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
        </>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
