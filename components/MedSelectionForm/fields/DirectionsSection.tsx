import React from 'react';

type Props = {
  directions: string;
  setDirections: (val: string) => void;
  errorMessages: any;
};

export const DirectionsSection: React.FC<Props> = ({ directions, setDirections, errorMessages }) => {
  return (
    <div>
      <h3>Directions</h3>
      <textarea
        value={directions}
        onChange={e => setDirections(e.target.value)}
        placeholder="Directions"
        rows={4}
        style={{ width: "100%" }}
      />
      {errorMessages?.directions && <span style={{ color: "red" }}>{errorMessages.directions}</span>}
    </div>
  );
};
