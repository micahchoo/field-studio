/**
 * SendToCollectionModal - Stub Component
 * TODO: Recover or reimplement this component
 */
import React from 'react';

export interface SendToCollectionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  [key: string]: any;
}

export const SendToCollectionModal: React.FC<SendToCollectionModalProps> = ({ 
  isOpen = false, 
  onClose = () => {},
  ...props 
}) => {
  if (!isOpen) return null;
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)',
      padding: '20px', 
      background: 'white',
      border: '2px dashed #ccc', 
      borderRadius: '8px',
      zIndex: 1000
    }}>
      <h3>SendToCollectionModal (Stub)</h3>
      <p>This component needs to be recovered or reimplemented.</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
};
