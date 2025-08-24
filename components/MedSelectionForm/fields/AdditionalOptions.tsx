import React from 'react';

type Props = {
  advanceChecks: any;
  setAdvanceChecks: (v: any) => void;
  errorMessages: any;
};

export const AdditionalOptions: React.FC<Props> = ({ advanceChecks, setAdvanceChecks, errorMessages }) => {
  return (
    <div>
      <h3>Additional Options</h3>
      <label>
        Variable Dose:
        <input
          type="checkbox"
          checked={!!advanceChecks.variableDose}
          onChange={e => setAdvanceChecks({ ...advanceChecks, variableDose: e.target.checked })}
        />
      </label>
      {errorMessages?.variableDose && <span style={{ color: "red" }}>{errorMessages.variableDose}</span>}
    </div>
  );
};
