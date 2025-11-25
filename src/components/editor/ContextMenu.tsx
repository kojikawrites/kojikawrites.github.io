/** @jsxImportSource react */
/**
 * ContextMenu Component - DEV ONLY
 * Standalone context menu that works without Keystatic React context
 * Automatically excluded from production builds via tree-shaking
 */
import React, { useEffect, useRef, useState } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
  shortcut?: string;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  visible: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  onClose,
  visible,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [submenuOpen, setSubmenuOpen] = useState<number | null>(null);

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!menuRef.current || !visible) return;

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Adjust horizontal position
    if (x + menuRect.width > viewportWidth) {
      adjustedX = viewportWidth - menuRect.width - 10;
    }

    // Adjust vertical position
    if (y + menuRect.height > viewportHeight) {
      adjustedY = viewportHeight - menuRect.height - 10;
    }

    setPosition({ x: Math.max(10, adjustedX), y: Math.max(10, adjustedY) });
  }, [x, y, visible]);

  // Handle click outside to close
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const validItems = items.filter(item => !item.separator && !item.disabled);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => {
            const nextIndex = prev + 1;
            return nextIndex >= validItems.length ? 0 : nextIndex;
          });
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => {
            const prevIndex = prev - 1;
            return prevIndex < 0 ? validItems.length - 1 : prevIndex;
          });
          break;

        case 'ArrowRight':
          if (selectedIndex >= 0 && validItems[selectedIndex]?.submenu) {
            setSubmenuOpen(selectedIndex);
          }
          break;

        case 'ArrowLeft':
          setSubmenuOpen(null);
          break;

        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && validItems[selectedIndex]?.onClick) {
            validItems[selectedIndex].onClick?.();
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, selectedIndex, items, onClose]);

  if (!visible) return null;

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled || item.separator) return;

    if (item.submenu) {
      // Toggle submenu
      const itemIndex = items.findIndex(i => i === item);
      setSubmenuOpen(submenuOpen === itemIndex ? null : itemIndex);
    } else if (item.onClick) {
      item.onClick();
      onClose();
    }
  };

  const handleItemHover = (index: number) => {
    setSelectedIndex(index);
    const item = items[index];
    if (item?.submenu) {
      setSubmenuOpen(index);
    } else {
      setSubmenuOpen(null);
    }
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 10000,
      }}
    >
      <div className="context-menu-content">
        {items.map((item, index) => {
          if (item.separator) {
            return <div key={`separator-${index}`} className="context-menu-separator" />;
          }

          const isSelected = selectedIndex === index;
          const hasSubmenu = !!item.submenu;

          return (
            <div
              key={index}
              className={`context-menu-item ${isSelected ? 'selected' : ''} ${
                item.disabled ? 'disabled' : ''
              }`}
              onClick={() => handleItemClick(item)}
              onMouseEnter={() => handleItemHover(index)}
            >
              {item.icon && <span className="context-menu-icon">{item.icon}</span>}
              <span className="context-menu-label">{item.label}</span>
              {item.shortcut && (
                <span className="context-menu-shortcut">{item.shortcut}</span>
              )}
              {hasSubmenu && <span className="context-menu-arrow">▶</span>}

              {/* Submenu */}
              {hasSubmenu && submenuOpen === index && item.submenu && (
                <div className="context-submenu">
                  <ContextMenu
                    x={position.x + (menuRef.current?.offsetWidth || 0)}
                    y={position.y + index * 32}
                    items={item.submenu}
                    onClose={onClose}
                    visible={true}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContextMenu;