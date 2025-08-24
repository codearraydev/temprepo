import React from 'react';
import { SplitDoseOption } from '../../../types/medSelectionTypes';

type Props = {
  takeMed: string;
  setTakeMed: (val: string) => void;
  doseMed: string;
  setDoseMed: (val: string) => void;
  splitDoseArrayOptions: SplitDoseOption[];
  onChangeSplitDoseFields: (value: any, selectedRowKey: number, type: number) => void;
  addNewSplitDoseRecord: () => void;
  onHandleDeleteSplitDoseRow: (rowKey: number) => void;
};

export const MedicationFields: React.FC<Props> = ({
  takeMed,
  setTakeMed,
  doseMed,
  setDoseMed,
  splitDoseArrayOptions,
  onChangeSplitDoseFields,
  addNewSplitDoseRecord,
  onHandleDeleteSplitDoseRow
}) => {
  return (
    <div>
      <h3>Medication</h3>
      <input
        type="number"
        placeholder="Dose"
        value={takeMed}
        onChange={e => setTakeMed(e.target.value)}
      />
      <input
        type="number"
        placeholder="Dose Range"
        value={doseMed}
        onChange={e => setDoseMed(e.target.value)}
      />
      <div>
        <h4>Split Dose Options</h4>
        {splitDoseArrayOptions.map((record, idx) => (
          <div key={record.rowKey} style={{ border: "1px solid #ccc", margin: 8, padding: 8 }}>
            <input
              type="number"
              placeholder="Take"
              value={record.takeValue}
              onChange={e => onChangeSplitDoseFields(e.target.value, record.rowKey, 1)}
            />
            <input
              type="number"
              placeholder="Dose Range"
              value={record.doseRangeValue}
              onChange={e => onChangeSplitDoseFields(e.target.value, record.rowKey, 2)}
            />
            <label>
              Dose Range?
              <input
                type="checkbox"
                checked={record.isDoseRangeSelected}
                onChange={e => onChangeSplitDoseFields(e.target.checked, record.rowKey, 3)}
              />
            </label>
            <input
              type="text"
              placeholder="Frequency Code"
              value={record.frequencyCodeValue}
              onChange={e => onChangeSplitDoseFields(e.target.value, record.rowKey, 6)}
            />
            <button onClick={() => onHandleDeleteSplitDoseRow(record.rowKey)}>Delete</button>
            {idx === splitDoseArrayOptions.length - 1 && <button onClick={addNewSplitDoseRecord}>AND</button>}
          </div>
        ))}
      </div>
    </div>
  );
};
