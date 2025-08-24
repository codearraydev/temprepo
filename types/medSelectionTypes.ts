export interface SplitDoseOption {
  rowKey: number;
  takeValue: string;
  takeValueErrorMessage: null | string;
  frequencyCodeValue: string;
  frequencyCodeValueErrorMessage: null | string;
  doseRangeValue: string;
  doseRangeValueErrorMessage: null | string;
  isDoseRangeSelected: boolean;
  frequencyName: string;
  IsActive: boolean;
  SplitDoseID: null | string;
}

export interface MedSelectionFormProps {
  addMed?: any;
  setAddMed?: any;
  setSelectMedicine?: any;
  setAddPrescription?: any;
  medicationAddEditData?: any;
  selectedMedicine?: any;
  isSAmodal?: any;
  setIsSAmodal?: any;
  isFromMDRInformation?: boolean;
  hideItem: boolean;
  generateScriptSc?: boolean;
  isFromGenerateScriptForm?: boolean;
  isSAFormDrawerOpen?: boolean;
  setstopMedRecord?: any;
}