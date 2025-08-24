import { SplitDoseOption } from '../types/medSelectionTypes';

export function getAllowedCheckboxText(selectedFrequency: string, selectedDays: string[]): string {
  const singleAllowedFrequencies = ["1", "17", "18", "19", "27", "5", "9", "27", "29", "30", "32", '36'];
  const dailyFrequencies = ["1", "2", "3", "4", "16", "7", "12", "13", "14"];
  const weeklyFrequencies = ["21", "22"];

  if (!selectedFrequency) return "";

  if (singleAllowedFrequencies.includes(selectedFrequency)) {
    return "You are allowed to select any one time slot based on the selected frequency";
  }

  if (dailyFrequencies.includes(selectedFrequency)) {
    const allowed = selectedFrequency === '16' ? 5 :
      selectedFrequency === '7' ? 6 :
        selectedFrequency === '12' ? 4 :
          selectedFrequency === '13' ? 3 :
            selectedFrequency === '14' ? 2
              : parseInt(selectedFrequency, 10);
    return `You are allowed to select up to ${allowed} time slot based on the frequency`;
  }

  if (weeklyFrequencies.includes(selectedFrequency)) {
    const daysCount = selectedDays.length || 0;
    return `You are allowed to select 1 time slot for each selected day. (${daysCount} day${daysCount > 1 ? "s" : ""} selected)`;
  }

  if (selectedFrequency === "27") {
    return "You are allowed to select any one time slot every two weeks";
  }

  if (["10", "11", "15"].includes(selectedFrequency)) {
    return "This time slot is fixed for the selected frequency";
  }

  return "";
}

export function setSplitDoseDirectionsFunction(
  takeMed: string,
  isDoseRangeSelected: boolean,
  doseRangeValue: string,
  frequencyMed: string,
  doseUnit: string,
  OtherDoseUnit: string
): string {
  // Example logic, extend as needed
  let tk = takeMed ?? '';
  let frq = frequencyMed;
  let unit = doseUnit === "Other" ? OtherDoseUnit : doseUnit;
  let sig = '';
  if (isDoseRangeSelected && takeMed && doseRangeValue) {
    tk = `${takeMed} to ${doseRangeValue}`;
  }
  sig = `${tk} ${unit} ${frq}`;
  return sig;
}