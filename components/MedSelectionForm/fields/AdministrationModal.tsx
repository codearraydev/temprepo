import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

export const AdministrationModal: React.FC<Props> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div style={{ background: "#fff", border: "2px solid #333", padding: 20, position: "fixed", top: 100, left: "20%", width: "60%", zIndex: 99 }}>
      <h3>Administration Modal</h3>
      <button onClick={onClose}>Close</button>
      {/* Add admin controls here */}
    </div>
  );
};
