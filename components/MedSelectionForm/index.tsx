import React, { Fragment } from 'react';
import { useMedSelectionForm } from '../../hooks/useMedSelectionForm';
import { MedicationFields } from './fields/MedicationFields';
import { AdministrationModal } from './fields/AdministrationModal';
import { DirectionsSection } from './fields/DirectionsSection';
import { AdditionalOptions } from './fields/AdditionalOptions';
import { MedSelectionFormProps } from '../../types/medSelectionTypes';

const MedSelectionForm: React.FC<MedSelectionFormProps> = (props) => {
  const medForm = useMedSelectionForm(props);

  return (
    <Fragment>
      <div className="find-medicine flex-fill h-100 overflowy-hidden flex-col">
        <MedicationFields
          takeMed={medForm.takeMed}
          setTakeMed={medForm.setTakeMed}
          doseMed={medForm.doseMed}
          setDoseMed={medForm.setDoseMed}
          splitDoseArrayOptions={medForm.splitDoseArrayOptions}
          onChangeSplitDoseFields={medForm.onChangeSplitDoseFields}
          addNewSplitDoseRecord={medForm.addNewSplitDoseRecord}
          onHandleDeleteSplitDoseRow={medForm.onHandleDeleteSplitDoseRow}
        />
        <DirectionsSection
          directions={medForm.directions}
          setDirections={medForm.setDirections}
          errorMessages={medForm.errorMessages}
        />
        <AdditionalOptions
          advanceChecks={medForm.advanceChecks}
          setAdvanceChecks={medForm.setAdvanceChecks}
          errorMessages={medForm.errorMessages}
        />
        <AdministrationModal
          open={medForm.addToAdminDrawer}
          onClose={() => medForm.setAddtoAdminDrawer(false)}
        />
      </div>
    </Fragment>
  );
};

export default MedSelectionForm;