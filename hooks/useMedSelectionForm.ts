import { useState } from 'react';
import { MedSelectionFormProps, SplitDoseOption } from '../types/medSelectionTypes';
import { setSplitDoseDirectionsFunction } from '../utils/medSelectionUtils';

export function useMedSelectionForm(props: MedSelectionFormProps) {
  const [takeMed, setTakeMed] = useState('');
  const [doseMed, setDoseMed] = useState('');
  const [directions, setDirections] = useState('');
  const [advanceChecks, setAdvanceChecks] = useState({ variableDose: false });
  const [errorMessages, setErrorMessages] = useState<any>({});
  const [splitDoseArrayOptions, setSplitDoseArrayOptions] = useState<SplitDoseOption[]>([{
    rowKey: 0,
    takeValue: "",
    frequencyCodeValue: "",
    doseRangeValue: "",
    isDoseRangeSelected: false,
    frequencyName: "",
    IsActive: true,
    SplitDoseID: null,
    doseRangeValueErrorMessage: null,
    frequencyCodeValueErrorMessage: null,
    takeValueErrorMessage: null
  }]);
  const [addToAdminDrawer, setAddtoAdminDrawer] = useState(false);

  // Handle split dose field changes
  const onChangeSplitDoseFields = (value: any, selectedRowKey: number, type: number) => {
    let splitDoseArrayOptionsCopy: SplitDoseOption[] = [...splitDoseArrayOptions];
    let findSplitDoseIndex: number = splitDoseArrayOptionsCopy.findIndex((record: SplitDoseOption) => record.rowKey === selectedRowKey);
    if (findSplitDoseIndex > -1) {
      const selectedSplitDoseRecord: SplitDoseOption = splitDoseArrayOptionsCopy[findSplitDoseIndex];
      if (type === 1) {
        selectedSplitDoseRecord.takeValue = value;
        selectedSplitDoseRecord.takeValueErrorMessage = parseFloat(value) === 0 ? "Dose cannot be zero." : null;
      } else if (type === 2) {
        selectedSplitDoseRecord.doseRangeValue = value;
        selectedSplitDoseRecord.doseRangeValueErrorMessage = parseFloat(value) === 0 ? "Dose range cannot be zero." : null;
      } else if (type === 3) {
        selectedSplitDoseRecord.isDoseRangeSelected = value;
        if (!value) {
          selectedSplitDoseRecord.doseRangeValue = "";
          selectedSplitDoseRecord.doseRangeValueErrorMessage = null;
        }
      } else if (type === 6) {
        selectedSplitDoseRecord.frequencyCodeValue = value;
        selectedSplitDoseRecord.frequencyCodeValueErrorMessage = null;
      }
    }
    const array = splitDoseArrayOptionsCopy.filter((record: SplitDoseOption) => record.IsActive).map((med) => {
      return setSplitDoseDirectionsFunction(med?.takeValue ?? "", med.isDoseRangeSelected, med.doseRangeValue, med.frequencyCodeValue, "mg", "Other");
    });
    let sig = array.filter(Boolean).join(' AND ');
    setDirections(sig);
    setSplitDoseArrayOptions([...splitDoseArrayOptionsCopy]);
  };

  const addNewSplitDoseRecord = () => {
    setSplitDoseArrayOptions(prevOptions => [
      ...prevOptions,
      {
        rowKey: Math.floor(Math.random() * 100000),
        takeValue: "",
        frequencyCodeValue: "",
        doseRangeValue: "",
        isDoseRangeSelected: false,
        frequencyName: "",
        IsActive: true,
        SplitDoseID: null,
        doseRangeValueErrorMessage: null,
        frequencyCodeValueErrorMessage: null,
        takeValueErrorMessage: null
      }
    ]);
  };

  const onHandleDeleteSplitDoseRow = (deleteRowKey: any) => {
    let splitDoseArrayOptionsCopy: SplitDoseOption[] = [...splitDoseArrayOptions];
    splitDoseArrayOptionsCopy = splitDoseArrayOptionsCopy.filter((record: SplitDoseOption) => record.rowKey !== deleteRowKey);
    const array = splitDoseArrayOptionsCopy.filter((record: SplitDoseOption) => record.IsActive).map((med) => {
      return setSplitDoseDirectionsFunction(med?.takeValue ?? "", med.isDoseRangeSelected, med.doseRangeValue, med.frequencyCodeValue, "mg", "Other");
    });
    let sig = array.filter(Boolean).join(' AND ');
    setDirections(sig);
    setSplitDoseArrayOptions([...splitDoseArrayOptionsCopy]);
  };

  return {
    takeMed,
    setTakeMed,
    doseMed,
    setDoseMed,
    directions,
    setDirections,
    advanceChecks,
    setAdvanceChecks,
    errorMessages,
    setErrorMessages,
    splitDoseArrayOptions,
    setSplitDoseArrayOptions,
    addToAdminDrawer,
    setAddtoAdminDrawer,
    onChangeSplitDoseFields,
    addNewSplitDoseRecord,
    onHandleDeleteSplitDoseRow
  };
}