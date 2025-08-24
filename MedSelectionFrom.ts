import React, { useState, useEffect, Fragment, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { Skeleton, Spin, DatePicker, Divider, Space, Input, notification, Select, Popconfirm, Dropdown } from 'antd';
import { MButton, MInput, MSelect, MCollapse, MTextArea, MDate, MModal, MPopConfirm, MTable, MTime, MSwitch, MRadioGroup, } from 'components'
import { appServices } from '../../../shared/redux/actions/appServices'
import { useAppSelector, UseMarApi } from 'shared'
import { MARDateFormat, MARDateFormatforAPI } from 'shared/utils/DateFormat';
import { SystemAlert } from 'components/Elements/SystemAlert';
import parse from 'html-react-parser';
import MInputNumber from 'components/Elements/MInputNumber';
import { DrawerContainer } from 'layouts';
import Calculator from '../Drawers/Calculator';
import debounce from 'lodash/debounce'
import dayjs, { Dayjs } from 'dayjs';
import { GetFrequencyDescription, autoChangeDoseUnit, autoChoosePackageType, autoSelectDoseUnit, autoSelectTakeLabel, calculateInitialDispensingQuantity, calculateMedicineQuantity, calculateMedicineQuantityNew, checkIsQuantityRequired, isAutoCalculateQuantityAllowed } from './MedicationFunctions';
import { FaRecordVinyl } from 'react-icons/fa';
import { useQuery } from 'hooks/useMarQuery';
import GenerateScriptForm from './GenerateScriptForm';
import useMARPermissions from 'shared/permissions/useMARPermissions';
import MRangePicker from 'components/Elements/MRangePicker'
import MCheckbox from 'components/Elements/MCheckbox'
import { calculateAge, getSubscriptionPlans, toWordsConvert } from 'shared/hooks/loginTypeFunctions';
import { debug } from 'console';
import { useLocation } from 'react-router-dom';
const { Option } = Select;
const { TextArea } = Input;
interface pharmaciesInterface {
    allPharmacies: any | null;
    isAllPharmaciesLoading: boolean;
    isAllPharmaciesError: boolean;
}
interface temporaryDirectionsFieldinterface {
    directions: string
    takeMed: string
    doseMed: string
    isDoseRange: boolean,
    frequency: string
    doseUnit: string
    doseUnitOtherValue: string
}
interface MedSelectionFormProps {
    addMed?: any
    setAddMed?: any,
    setSelectMedicine?: any,
    setAddPrescription?: any,
    medicationAddEditData?: any
    selectedMedicine?: any
    isSAmodal?: any,
    setIsSAmodal?: any
    isFromMDRInformation?: boolean
    hideItem: boolean
    generateScriptSc?: boolean
    isFromGenerateScriptForm?: boolean
    isSAFormDrawerOpen?: boolean
    setstopMedRecord?: any
    // duplicateMedicationDatasource?: any
}
const daysOptions = [
    { value: "1", label: "Day/s" },
    { value: "2", label: "Week/s" },
    { value: "3", label: "Month/s" },
]

interface SplitDoseOption {
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
    SplitDoseID: null | string
}

const options = [
    {
        label: "Generic Subsitution Allowed",
        isSelected: true,
        id: 1
    },
    {
        label: "Frequently Dispensed",
        isSelected: false,
        id: 2

    },
    {
        label: "Use Generic Name or Label",
        isSelected: false,
        id: 3

    },
    {
        label: "Private Funded",
        isSelected: false,
        id: 4

    },
    {
        label: "Unusual Dose or Quantitiy",
        isSelected: false,
        id: 5

    },
    {
        label: "Variable Dose",
        isSelected: false,
        id: 6

    },
    {
        label: "Initial Dispensing Period",
        isSelected: false,
        id: 7

    },
    {
        label: "Confidential",
        isSelected: false,
        id: 8

    },
    {
        label: "Pharmacy LTC Assesment",
        isSelected: false,
        id: 9

    },
    {
        label: "Patient Consent",
        isSelected: true,
        id: 10

    },
    {
        label: "Long Term",
        isSelected: false,
        id: 11

    },
    {
        label: "Blister Pack",
        isSelected: false,
        id: 12

    },
    {
        label: "Compassionate Supply",
        isSelected: false,
        id: 13

    },
    {
        label: "Prescribed",
        isSelected: false,
        id: 14

    },
    // {
    //     label: "Recommended",
    //     isSelected: false,
    //     id: 15

    // },
]
interface requiredFieldsObjInterface {
    isTakeRequired: boolean
    isDoseRangeIsRequired: boolean
    isQuantityRequired: boolean,
    isTakeDisabled: boolean
    isDirectionRequired: boolean
    isDurationDisabled: boolean
    isDurationRequired: boolean
    isRouteRequired: boolean
    isDoseUnitDisabled: boolean
    isFrequencyDisabled: boolean
    isPRNMedicineDisabled: boolean
    isMaxDosePerHourDisabled: boolean
    isIndicationDisabled: boolean
}
const MedSelectionForm: React.FC<MedSelectionFormProps> = ({ setstopMedRecord = () => { }, setSelectMedicine = () => { },
    isFromGenerateScriptForm = false,
    ...props }) => {
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
    }])
    const location = useLocation()
    const { isMedicationDetailLoading } = useAppSelector(
        (state: any) => state.GetMedication
    );
    const { isMedicineAllergysLoading } = useAppSelector(
        (state: any) => state.GetMedicineAllergy
    );
    const { isGotCommonSubstanceLoading }: any = useAppSelector((state) => state.GetCommonSubstance);

    const { GetNZFFocusAlertResponse, isNZFFocusAlertsResponseLoading } =
        useAppSelector((state: any) => state.GetNZFFocusAlert);
    const { SpecialAuthorityFormData, isGetSpecialAuthorityFormLoading } =
        useAppSelector((state: any) => state.GetSpecialAuthorityForm);
    const [isDirectionManuallyEntered, setIsDirectionManuallyEntered] = useState(false)
    const [isSCIDExistModalOpen, setIsSCIDExistModalOpen] = useState(false)
    const [isRenewButtonShown, setIsRenewButtonShown] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState('');
    let subscriptionPlans: any = getSubscriptionPlans()
    let isISPRXLite = !subscriptionPlans.isISPRXPlus;
    const { stopMedicine, isStoppingMedicine }: any = useAppSelector((state) => state.StopMedicine)
    const { isCheckedAlreadyPrescribedMedicineLoading, checkedAlreadyPrescribedMedicine } = useAppSelector((state: any) => state.CheckAlreadyprescribeMedicine)
    const { AddProviderIndicationsList, isAddProviderIndicationsListLoading } = useAppSelector((state: any) => state.AddProviderIndications)
    const [generateScript, setGenerateScript] = useState<boolean>(false);
    const [isGenerateScriptSaveButtonClicked, setIsGenerateScriptSaveButtonClicked] = useState<boolean>(false)
    const [isLongTermMedication, setIsLongTermMedication] = useState<boolean>(true)
    const [addToAdmin, setAddtoAdmin] = useState<boolean>(false)
    const [addToAdminDrawer, setAddtoAdminDrawer] = useState<boolean>(false)
    const [saveAdministration, setSaveAdministration] = useState<boolean>(false)
    const [patientSARecordId, setPatientSARecordId] = useState<any>(null)
    const dispatch = useDispatch()
    const currentDate = new Date()
    const [checkedButtonCount, setCheckedButtonCount] = useState(0)
    const query = useQuery()
    const [currentPrescriberID, setCurrentPrescriberID] = useState(null);
    const [medicineSelectedArrayOptions, setMedicineSelectedArrayOptions] = useState<any[]>([])

    let patientID = query.get('patientid');
    const claimsData: any = sessionStorage.getItem('userData')
    const profileID = JSON.parse(claimsData)
    const [isQuantityUnitDisabled, setIsQuantityUnitDisabled] = useState(false)
    const [isAddToChartClicked, setIsAddToChartClicked] = useState<boolean>(false)
    const [isAddToChartAndGenerateScriptClicked, setIsAddToChartAndGenerateScriptClicked] = useState<boolean>(false)
    const [isMedicineSwitched, setIsMedicineSwitched] = useState<boolean>(false)
    const [medicineStartDate, setMedicineStartDate] = useState<Dayjs | null>(null);
    const [medicineInsertedDate, setMedicineInsertedDate] = useState<Dayjs | null>(dayjs());
    const [medicineStartTime, setMedicineStartTime] = useState<Dayjs | null>(null);
    const [medicineEndDate, setMedicineEndDate] = useState<Dayjs | null>(null);
    const [medicineEndTime, setMedicineEndTime] = useState<Dayjs | null>(null);
    const { PatientDatail }: any = useAppSelector((state) => state.PatientDatail)
    const { isSavingRecord, saveMedicine }: any = useAppSelector((state) => state.SaveMedicine)
    const [savingTypeObject, setSavingTypeObject] = useState<any>({
        isSave: false,
        isEmailToPharmacy: false,
        isEmailToPatient: false,
        isPrint: false
    })
    const { gotCommonSubstanceFromChartMedication, gotCommonSubstanceFromReactivationMed, gotCommonSubstanceFromMedHistory }: any = useAppSelector((state) => state.GetCommonSubstance);
    const { allMedicationForEdit, isAllMedicationForEditLoading }: any = useAppSelector((state) => state.GetMedicationForEdit)
    const { allPharmacies }: pharmaciesInterface = useAppSelector((state) => state.GetAllPharmacies);
    const { SpecialAuthorityFormSecondData, isGetSpecialAuthoritySecondFormLoading } = useAppSelector((state: any) => state.GetSpecialAuthorityFormSecond)
    const { medicationDetailsAddEditData, isMedicationDetailsAddEditLoading } = useAppSelector((state: any) => state.GetMedicationDetailsForAddEdit)
    const { getMedicationAdvanceSearchDetail, isMedicationAdvanceSearchDetailLoading }: any = useAppSelector((state) => state.MedicationAdvanceSearch)
    const [firsTime, setFirsTime] = useState<boolean>(true)
    const [PRNIndicationObject, setPRNIndicationObject] = useState<any>({
        value: null,
        label: "",
        isFromFrontEnd: false
    })
    const [openDropdown, setOpenDropdown] = useState<boolean>(false)
    const permissions = useMARPermissions();
    const [dropDownNewItem, setDropDownNewItem] = useState<string>("")
    const [maxDosePer24Hour, setMaxDosePer24Hour] = useState<string>("")
    const [maxDosePer24HourUnit, setMaxDosePer24HourUnit] = useState<string>("")
    const [variableDoseMessage, setVariableDoseMessage] = useState('Unchecking Free-text directions will clear directions, Take and Frequency, Are you sure you want to proceed?')
    const { indicationType, isIndicationTypeLoading }: any = useAppSelector((state) => state.GetIndicationTypeLookup)
    const [indicationTypes, setIndicationTypes] = useState<any[]>([]);
    const [chatToPharmacist, setchatToPharmacist] = useState<string>("")
    const [requiredFieldsObj, setRequiredFieldsObj] = useState<requiredFieldsObjInterface>({
        isTakeRequired: true,
        isDoseRangeIsRequired: true,
        isQuantityRequired: false,
        isTakeDisabled: false,
        isDirectionRequired: false,
        isDurationDisabled: false,
        isDurationRequired: true,
        isRouteRequired: true,
        isDoseUnitDisabled: false,
        isFrequencyDisabled: false,
        isPRNMedicineDisabled: false,
        isMaxDosePerHourDisabled: true,
        isIndicationDisabled: true,
    })
    const [selectedMedcineRecords, setSelectedMedcineRecords] = useState<any[]>([])
    const [isFreeTextDirections, setIsFreeTextDirections] = useState<boolean>(false)
    const [temporaryDirectionsFieldObject, setTemporaryDirectionsFieldObject] = useState<temporaryDirectionsFieldinterface>({
        directions: "",
        takeMed: "",
        doseMed: "",
        isDoseRange: false,
        frequency: "",
        doseUnit: "",
        doseUnitOtherValue: "",
    })
    const [tempSplitDoseArrayOptions, setTempSplitDoseArrayOptions] = useState<SplitDoseOption[]>([{
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
    }])
    const { isFromPackSizeDrawer, isFromHistoryPageAddToChart, isGenerateScriptClickedWithoutMed, duplicatedMedicationsArrayOptions }: any = useAppSelector((state) => state.GlobalStateContainer)
    const { sARequestandResponseDataSecond, isSARequestandResponseSecondLoading } = useAppSelector((state: any) => state.SARequestandResponseSecond);
    const [patientPharmacyID, setPatientPharmacyID] = useState<string | null>(null)
    const [strengthLabel, setStrengthLabel] = useState('Strength')
    const [takeLabel, setTakeLabel] = useState('')
    const [takeMed, setTakeMed] = useState<any>('')
    const [doseMed, setDoseMed] = useState<any>('')
    const [unitMed, setUnitMed] = useState('')
    const [doseUnit, setDoseUnit] = useState<any>('')
    const [doseUnitOtherValue, setDoseUnitOtherValue] = useState('')
    const [doseUnitOption, setDoseUnitOption] = useState<any>([])
    const [doseRange, setDoseRange] = useState(false)
    const [frequencyMed, setFrequencyMed] = useState('')
    const [durationMed, setDurationMed] = useState('')
    const [daysMed, setDaysMed] = useState('1')
    const [isGettingAutoPopulatedDuration, setIsGettingAutoPopulatedDuration] = useState<boolean>(false)
    const [quantityMed, setQuantityMed] = useState<any>('')
    const [isQuantiyRequired, setIsQuantityRequired] = useState<boolean>(false)
    const [isQuantityDisable, setIsQuantityDisable] = useState<boolean>(false)
    const [isDurationDisable, setIsDurationDisable] = useState<boolean>(false)
    const [packageMed, setPackageMed] = useState('')
    const [routeMed, setRouteMed] = useState('')
    const [routeMedText, setRouteMedText] = useState('')
    const [directions, setDirections] = useState<string>('')
    const [additionalDirections, setAdditionalDirections] = useState<string>('')
    const [repeats, setReapets] = useState<string>('')
    const [currnetPrescriberID, setCurrnetPrescriberID] = useState('')
    const [allPharmaciesData, setAllPharmaciesData] = useState<any[]>([]);
    const [selectedPharmacyID, setSelectedPharmacyID] = useState<any>(null)
    const [IsBlisterPack, setIsBlisterPack] = useState(false)
    const [isPRNMedicine, setisPRNMedicine] = useState(false)
    const [IsLongTerm, setIsLongTerm] = useState(false)
    const [isAddToMedicationChart, setIsAddToMedicationChart] = useState(true)
    const [updatedSAFormHTML, setUpdatedSAFormHTML] = useState('');
    const [isParkSARequest, setIsParkSARequest] = useState(false)
    const [isSAmodal, setIsSAmodal] = useState(false);
    const [saFormNumberMed, setSAFormNumberMed] = useState('')
    const [saStatusMed, setSAStatusMed] = useState('')
    const [saStatusIDMed, setSaStatusIDMed] = useState('')
    const [expiryDate, setExpiryDate] = useState<any>('')
    const [SAExpiry, setSAExpiry] = useState(false)
    const [isExpired, setIsExpired] = useState(false);
    const [isSARenewButton, setIsSARenewButton] = useState<boolean>(true)
    const [saValidation, setSaValidation] = useState<boolean>(false)
    const [specialistNameValidation, setSpecialistNameValidation] = useState<boolean>(false)
    const [proceedWithoutSA, setProceedWithoutSA] = useState<boolean>(false)
    const [saCheckExpire, setSaCheckExpire] = useState<boolean>(false)
    const [strengthIDMed, setStrengthIDMed] = useState('')
    const [SaApprovalNumberMed, setSaApprovalNumberMed] = useState('')
    const [isRecomemended, setIsRescommended] = useState(false)
    const [proceedWithoutRecommendation, setProceedWithoutRecommendation] = useState(false)
    const [specialistName, setSpecialistName] = useState('')
    const [recommendationDate, setRecommendationDate] = useState<any>(null)
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
    const [isVisiblePharmic, setIsVisiblePharmic] = useState<boolean>(false)
    const [isMedicationUpdateOnly, setIsMedicationUpdateOnly] = useState(false)
    const [strengthID, setStrengthID] = useState<any>()
    const [prescribeThroughEdit, setPrescribeThroughEdit] = useState<boolean>(false)
    // const [formName, setFormName] = useState<string>('')
    const [slelectedMed, setSelectedMed] = useState<any>({})
    const [activeKey, setActiveKey] = useState<number>(0)
    const [medicationArray, setMedicationArray] = useState({
        frequencyArray: [],
        routeArray: [],
        providerListArray: [],
        packageArray: ([] as any[]),
        saStatusArray: [],
        buttonArray: [...options]
    })
    const [isMedicineFoundModalOpen, setIsMedicineFoundModalOpen] = useState<boolean>(false)
    const [advanceChecks, setAdvanceChecks] = useState<any>({
        privatePharmacistsOnly: '',
        prescribingReason: '',
        gsAllowed: true,
        frequentlyDispensed: false,
        useGenericName: false,
        privateFunded: false,
        unusualDose: false,
        variableDose: false,
        initDispensingPeriod: false,
        confidential: false,
        ltcAssessment: false,
        patientConsent: true,
        compassionateSupply: false,
        prescribedExternally: false,
        isRecomemended: false,
        initialDispensingPeriodVal: null,
        trialType: '1',
        initialDispensingQuantity: null,
        trialPeriodReason: '',
        freqDispensedPeriod: null,
        freqDispensedType: '1'
    })
    const [textAreaText, setTextAreaText] = useState<any>({
        messageToPharmacist: "",
        pharmacyAddress: "",
        mailSubject: "",
    })
    useEffect(() => {
        if (SpecialAuthorityFormSecondData !== null) {
            if (SpecialAuthorityFormSecondData !== 1) {
                let parser = new DOMParser();
                let doc = parser.parseFromString(SpecialAuthorityFormSecondData.formHTML, 'text/html');
                const checkboxes = doc.querySelectorAll("input[type='checkbox']");

                const formDataArray = Array.isArray(SpecialAuthorityFormSecondData.formdata)
                    ? SpecialAuthorityFormSecondData.formdata
                    : [];

                checkboxes.forEach((checkbox, index) => {
                    const value = checkbox.getAttribute('value');
                    const formDataEntry = formDataArray[index];

                    if (
                        formDataEntry &&
                        decodeURIComponent(formDataEntry.CriteriaName) === value &&
                        formDataEntry.CriteriaValue === 'true'
                    ) {
                        checkbox.setAttribute('checked', 'checked');
                    } else {
                        checkbox.removeAttribute('checked');
                    }
                });
                setUpdatedSAFormHTML(doc.body.innerHTML);
            }
        }
    }, [SpecialAuthorityFormSecondData]);
    useEffect(() => {
        if (sARequestandResponseDataSecond !== null) {
            dispatch(appServices.sARequestandResponseDataSecondClear(""))
            setUpdatedSAFormHTML("")
            setPatientSARecordId(sARequestandResponseDataSecond.dataMessage.patientSARecordId)
            setSAStatusMed(
                sARequestandResponseDataSecond.dataMessage.responseStatusID !== null &&
                    sARequestandResponseDataSecond.dataMessage.responseStatusID !== undefined &&
                    sARequestandResponseDataSecond.dataMessage.responseStatusID !== "" ?
                    sARequestandResponseDataSecond.dataMessage.responseStatusID.toString() : ""
            )
            setErrorMessages({ ...errorMessages, SAStatusError: "", SANumberError: "", SAExpiryError: null })
            setSAFormNumberMed(sARequestandResponseDataSecond.dataMessage.approvalNumber !== null &&
                sARequestandResponseDataSecond.dataMessage.approvalNumber !== undefined &&
                sARequestandResponseDataSecond.dataMessage.approvalNumber !== "" ?
                sARequestandResponseDataSecond.dataMessage.approvalNumber : "")
            setSAExpiry(sARequestandResponseDataSecond.dataMessage.isLifeTime)
            setExpiryDate(
                sARequestandResponseDataSecond.dataMessage.expiryDate !== null &&
                    sARequestandResponseDataSecond.dataMessage.expiryDate !== undefined &&
                    sARequestandResponseDataSecond.dataMessage.expiryDate !== "" ?
                    dayjs(sARequestandResponseDataSecond.dataMessage.expiryDate) : ""
            )
            setIsParkSARequest(false)
            props.setIsSAmodal(false);
            if (isParkSARequest) {

                if (sARequestandResponseDataSecond.dataMessage.status) {
                    props.setIsSAmodal(false);
                    SystemAlert('success', sARequestandResponseDataSecond.dataMessage.message)
                } else {
                    SystemAlert('error', sARequestandResponseDataSecond.dataMessage.message)
                }
            } else {
                let { approvalNumber, expiryDate, isLifeTime, status, saAcknowledgement, message } = sARequestandResponseDataSecond.dataMessage;
                if (saAcknowledgement == null && !isParkSARequest) {
                    SystemAlert("error", message)
                    return;
                }
                if (!status) {
                    if (!saAcknowledgement?.transactionHeader || saAcknowledgement == null) {
                        if (message?.includes("A third-party server is not responding.")) {
                            message = "The MOH special authority service is currently unavailable. please try again later";
                        }
                        SystemAlert("error", message)
                        return;
                    }
                } else {
                    if (!isParkSARequest) {

                    }
                    else {
                        SystemAlert("success", message)
                        return
                    }
                }
                if (!isParkSARequest) {
                    if (!status) {
                        const rejectionDetails = saAcknowledgement?.rejectionDetails || [];
                        const uniqueRejectionCodes = [...new Set(rejectionDetails.map(x => x.rejectionCode))];
                        notification["error"]({
                            duration: 10,
                            message: 'Notification',
                            description: (
                                <div>
                                    <h4>Special Authority Response</h4>
                                    <table>
                                        <thead>
                                            <tr><th colSpan={2}>Response Details</th></tr>
                                            <tr><th>Status:</th><td>{saAcknowledgement?.transactionHeader?.status}</td></tr>
                                            <tr><th>Reference #:</th><td>{saAcknowledgement?.acknowledgement?.messageControlID}</td></tr>
                                            {!status && uniqueRejectionCodes.map((code) => {
                                                return rejectionDetails
                                                    .filter(item => item.rejectionCode === code)
                                                    .map((item, idx) => (
                                                        <React.Fragment key={`${code}-${idx}`}>
                                                            <tr>
                                                                <th>Rejection Reason:</th>
                                                                <td>{item.rejectionReason}</td>
                                                            </tr>
                                                            <tr>
                                                                <th>Rejection Explanation:</th>
                                                                <td>{item.rejectionExplanation}</td>
                                                            </tr>
                                                            <tr>
                                                                <th>Recommended Action:</th>
                                                                <td>{item.rejectionAction}</td>
                                                            </tr>
                                                            <tr>
                                                                <th>Rejection Code:</th>
                                                                <td>{item.rejectionCode}</td>
                                                            </tr>
                                                        </React.Fragment>
                                                    ));
                                            })}
                                            {approvalNumber && <tr><th>Approval Number:</th><td>{approvalNumber}</td></tr>}
                                            {expiryDate && !isLifeTime && <tr><th>Expiry Date:</th><td>{dayjs(expiryDate).format('DD/MM/YYYY')}</td></tr>}
                                        </thead>
                                    </table>
                                </div>
                            ),
                            placement: 'top',
                            className: "custom-notification",
                        });
                    } else {
                        notification["success"]({
                            message: 'Notification',
                            description: (
                                <div>
                                    <h4>Special Authority Response</h4>
                                    <table>
                                        <thead>
                                            <tr><th colSpan={2}>Response Details</th></tr>
                                            <tr><th>Status:</th><td>{saAcknowledgement?.transactionHeader?.status}</td></tr>
                                            <tr><th>Reference #:</th><td>{saAcknowledgement?.acknowledgement?.messageControlID}</td></tr>
                                            {approvalNumber && <tr><th>Approval Number:</th><td>{approvalNumber}</td></tr>}
                                            {saAcknowledgement?.applicationType && <tr><th>Approval Type:</th><td>{saAcknowledgement?.applicationType}</td></tr>}
                                            {expiryDate && !isLifeTime && <tr><th>Expiry Date:</th><td>{dayjs(expiryDate).format('DD/MM/YYYY')}</td></tr>}
                                        </thead>
                                    </table>
                                </div>
                            ),
                            placement: 'top',
                            className: "custom-notification",
                        });
                    }
                }
                let APIPayload = {
                    patientID: patientID
                }
                dispatch(appServices.GetMedicineSAInfo(APIPayload))
            }
            dispatch(appServices.sARequestandResponseDataSecondClear(""))
        }
    }, [sARequestandResponseDataSecond])
    const [emailsIDs, setEmailsIDs] = useState<any>({
        PatientEmail: "",
        PharmacyEmail: "",
        pEmailCheckBox: false
    })
    const [selectedItem, setselectedItem] = useState("")
    const [pharmcyName, setPharmacyName] = useState("");

    const [prevState, setPrevState] = useState<any>({
        take: '',
        frequency: '',
        toTake: '',
        doseUnit: '',
        isdoseRange: false,
        directions: "",
    })

    const [errorMessages, setErrorMessages] = useState<any>({})
    const { allOnHeldMedList, isAllOnHeldMedListLoading }: any = useAppSelector((state) => state.GetOnHeldMedList)



    //Medicine Administration
    const [dTo, setdateTo] = useState<any>(null)
    const [dFrom, setdateFrom] = useState<Dayjs | null>(dayjs())
    const [showDue, setShowDue] = useState<number | null>(null)
    const [showOverDue, setShowOverDue] = useState<number | null>(null)
    const [adminDirections, setAdminDirections] = useState<string>('')
    const [adminAdditionalDirections, setAdditionalAdminDirections] = useState<string>('')
    const [adminErrors, setAdminErrors] = useState<any>(null)
    const [allowedChecks, setAllowedChecks] = useState(0);
    const [selectedDays, setSelectedDays] = useState([]); // for weekly
    const [daysDropdownOpen, setDaysDropdownOpen] = useState(false);
    const [saveAdminData, setSaveAdminData] = useState(false);


    const dateFromFun = dFrom => {
        setdateFrom(dFrom);
    };
    const dateToFun = dTo => {
        setdateTo(dTo);
    }

    const getAllowedCheckboxText = (selectedFrequency, selectedDays) => {
        const singleAllowedFrequencies = ["1", "17", "18", "19", "27", "5", "9", "27", "29", "30", "32", '36'];
        const dailyFrequencies = ["1", "2", "3", "4", "16", , '7', '12', '13', '14'];
        const weeklyFrequencies = ["21", "22"];

        if (!selectedFrequency) return "";

        if (singleAllowedFrequencies.includes(selectedFrequency)) {
            return "You are allowed to select any one time slot based on the selected frequency";
        }

        if (dailyFrequencies.includes(selectedFrequency)) {
            const allowed = selectedFrequency === '16' ? parseInt('5') :
                selectedFrequency === '7' ? parseInt('6') :
                    selectedFrequency === '12' ? parseInt('4') :
                        selectedFrequency === '13' ? parseInt('3') :
                            selectedFrequency === '14' ? parseInt('2')
                                : parseInt(selectedFrequency);
            return `You are allowed to select up to ${allowed} time slot based on the frequency`;
        }

        if (weeklyFrequencies.includes(selectedFrequency)) {
            const daysCount = selectedDays.length || 0;
            // if (daysCount === 0) {
            //     return `Please select the day(s) of the week first`;
            // }
            return `You are allowed to select 1 time slot for each selected day. (${daysCount} day${daysCount > 1 ? "s" : ""} selected)`;
        }

        if (selectedFrequency === "27") {
            return "You are allowed to select any one time slot every two weeks";
        }



        if (selectedFrequency === "10" || selectedFrequency === "11" || selectedFrequency === "15") {
            return "This time slot is fixed for the selected frequency";
        }

        return "";
    };


    const handleAdminCancel = () => {
        setdateFrom(medicineStartDate)
        setAdminDirections(directions)
        setSaveAdminData(false)
        setAdditionalAdminDirections(additionalDirections)
        setdateTo(null)
        setShowDue(null)
        setShowOverDue(null)
        setAddtoAdmin(false)
        setSelectedDays([])
        setvariableDoseArray([{
            id: 1,
            doses: [
                { doseId: 1, checked: false, From: "00:00", To: "06:30", isDisabled: false },
                { doseId: 2, checked: false, From: "06:30", To: "09:00", isDisabled: false },
                { doseId: 3, checked: false, From: "09:00", To: "11:30", isDisabled: false },
                { doseId: 4, checked: false, From: "11:30", To: "13:30", isDisabled: false },
                { doseId: 5, checked: false, From: "13:30", To: "15:00", isDisabled: false },
                { doseId: 6, checked: false, From: "15:00", To: "17:00", isDisabled: false },
                { doseId: 7, checked: false, From: "17:00", To: "19:00", isDisabled: false },
                { doseId: 8, checked: false, From: "19:00", To: "21:00", isDisabled: false },
                { doseId: 9, checked: false, From: "21:00", To: "00:00", isDisabled: false },
            ]
        }])
        setAddtoAdminDrawer(false)
        setAdminErrors(null)




    }


    const autoCheckSpecialFrequency = (frequencyCode) => {
        // Clone your doses array
        const doses = [...variableDoseArray[0].doses];

        // Clear all checks first
        const clearedDoses = doses.map(dose => ({
            ...dose,
            checked: false,
            isDisabled: false
        }));

        let matchTime: any = null;

        if (frequencyCode === "15") {
            // in the morning → From: "06:30"
            matchTime = "06:30";
        } else if (frequencyCode === "10") {
            // at midday → From: "13:30"
            matchTime = "11:30";
        } else if (frequencyCode === "11") {
            // at night → From: "21:00"
            matchTime = "19:00";
        }

        const updatedDoses = clearedDoses.map(dose => {
            if (dose.From === matchTime) {
                return {
                    ...dose,
                    checked: true,
                    isDisabled: false // keep it enabled
                };
            } else {
                return {
                    ...dose,
                    checked: false,
                    isDisabled: true // disable other options
                };
            }
        });
        setvariableDoseArray([{ ...variableDoseArray[0], doses: updatedDoses }]);
    };
    const clearAllDoses = () => {
        const cleared = variableDoseArray[0].doses.map(dose => ({
            ...dose,
            checked: false,
            isDisabled: false
        }));
        setvariableDoseArray([{ ...variableDoseArray[0], doses: cleared }]);
    };

    const handleFrequencyChange = (value) => {
        if (["1", "2", "3", "4", "7", "16", "12", "13", "14"].includes(value)) {
            if (value === "16") {
                setAllowedChecks(parseInt('5'));
            }
            else if (value === "7") {
                setAllowedChecks(parseInt('6'));
            }
            else if (value === "12") {
                setAllowedChecks(parseInt('4'));
            }
            else if (value === "13") {
                setAllowedChecks(parseInt('3'));
            }
            else if (value === "14") {
                setAllowedChecks(parseInt('2'));
            }
            else {
                setAllowedChecks(parseInt(value));
            }
            setSelectedDays([]);

        } else if (value === "5" || "9" || "17" || "18" || "19" || "21" || "22" || "27" || "29" || "30" || "32" || "36") {
            setAllowedChecks(1);
        }
        else {
            setAllowedChecks(0);
            setSelectedDays([])
        }


        if (["10", "11", "15"].includes(value)) {
            autoCheckSpecialFrequency(value)
        }
        // else {
        //     clearAllDoses();
        // }
    };

    useEffect(() => {
        if (frequencyMed) {
            handleFrequencyChange(frequencyMed)
        }
    }, [frequencyMed])
    //function for each option handling  : code by Nadra
    const handleDropdownClick = (time: string) => {
        const newBlisterPackState = true; // explicitly turning it ON on option select
        setIsBlisterPack(newBlisterPackState);

        let sig = additionalDirections || '';
        sig = sig.replace(/please blister pack( in the \w+)?\./gi, '').trim();

        const updatedSig = `${sig} please blister pack in the ${time.toLowerCase()}.`.trim();

        setAdditionalDirections(updatedSig);
        setAdditionalAdminDirections(updatedSig);
    };
    // static array for blister pack : code by Nadra
    const items: any[] = [
        {
            label: 'Morning',
            key: '1',
            onClick: () => handleDropdownClick('Morning'),
        },
        {
            label: 'Midday',
            key: '2',
            onClick: () => handleDropdownClick('Midday'),
        },
        {
            label: 'Evening',
            key: '3',
            onClick: () => handleDropdownClick('Evening'),
        },
        {
            label: 'End of the Day',
            key: '4',
            onClick: () => handleDropdownClick('End of the Day'),
        },
    ];
    const handleNumberInput = (min, max, setState, state, event) => {
        let value = event.target.value;
        let sanitizedValue = value.replace(/[^\d.]/g, '');
        const decimalParts = sanitizedValue.split('.');
        if (decimalParts.length > 1) {
            const integerPart = decimalParts[0];
            let decimalPart = decimalParts[1].slice(0, 3);
            sanitizedValue = `${integerPart}.${decimalPart}`;
        }

        if (sanitizedValue === '') {
            setState('');
            return;
        }

        // Check for multiple decimal points
        const decimalCount = sanitizedValue.split('.').length - 1;
        if (decimalCount > 1) {
            setState(state);
            return;
        }

        const floatValue = parseFloat(sanitizedValue);
        if (isNaN(floatValue)) {
            setState(state);
            return;
        }

        if (floatValue > max) {
            setState(state);
            return;
        }
        if (floatValue < min) {
            setState(state);
            return;
        } else {
            setState(sanitizedValue);
            return;
        }
    };
    const handleChange = (numberEntered, dayNo, doseID, min, max) => {
        let sanitizedValue = numberEntered.replace(/[^\d.]/g, '');
        if (numberEntered) {
            const decimalParts = sanitizedValue.split('.');
            if (decimalParts.length > 1) {
                const integerPart = decimalParts[0];
                let decimalPart = decimalParts[1].slice(0, 3);
                sanitizedValue = `${integerPart}.${decimalPart}`;
            }
            if (sanitizedValue === '') {
                return;
            }
            const decimalCount = sanitizedValue.split('.').length - 1;
            if (decimalCount > 1) {
                return;
            }

            const floatValue = parseFloat(sanitizedValue);
            if (isNaN(floatValue)) {
                return;
            }

            if (floatValue > max) {
                return;
            }
            if (floatValue < min) {
                return;
            }
        }
        const timeWithDosesArray: any[] = variableDoseArray;

        let dayIndex = timeWithDosesArray.findIndex((day) => day?.id == dayNo)
        let foundTime = time.find((selectedTime) => selectedTime?.timeId == doseID)
        if (dayIndex == -1) {
            timeWithDosesArray.push({ dayId: dayNo, doses: [] })
            dayIndex = timeWithDosesArray.length - 1
        }
        if (dayIndex > -1) {
            let doseIndex = timeWithDosesArray[dayIndex].doses.findIndex((dose) => dose?.doseId == doseID)
            if (doseIndex > -1) {
                timeWithDosesArray[dayIndex].doses[doseIndex].Dose = sanitizedValue
                timeWithDosesArray[dayIndex].doses[doseIndex].Time = foundTime?.From
            } else {
                timeWithDosesArray[dayIndex].doses.push({
                    doseId: doseID, Dose: sanitizedValue,
                    Time: foundTime?.From
                })
            }
        }
    };





    const handleCheckBoxChange = (index, checked, doseID) => {
        setAdminErrors({ ...adminErrors, timeCell: '' });

        const doses = [...variableDoseArray[0].doses];

        // Update clicked checkbox first
        doses[index].checked = checked;

        // Count how many are checked AFTER this change
        const totalChecked = doses.filter(d => d.checked).length;

        // 👇 Set limit: these frequencies always allow only 1
        const singleAllowedFrequencies = ["1", "17", "18", "19", "21", "22", "27", "29", "30", "32", "36",];

        let effectiveAllowed = allowedChecks;

        if (singleAllowedFrequencies.includes(frequencyMed)) {
            effectiveAllowed = 1;
        } else if (["21", "22"].includes(frequencyMed)) {
            // These should still respect days if relevant
            effectiveAllowed = selectedDays.length * 1; // 1 per day
        }

        // If over limit, roll back the new check
        if (effectiveAllowed && totalChecked > effectiveAllowed) {
            doses[index].checked = false;
            setAdminErrors({
                ...adminErrors,
                timeCell: `You can only select ${effectiveAllowed} time(s).`
            });
        }

        // Recount because we may have rolled back
        const finalChecked = doses.filter(d => d.checked).length;

        // Disable or enable others accordingly
        const updatedDoses = doses.map(dose => {
            if (dose.checked) {
                return { ...dose, isDisabled: false };
            } else if (effectiveAllowed && finalChecked >= effectiveAllowed) {
                return { ...dose, isDisabled: true };
            } else {
                return { ...dose, isDisabled: false };
            }
        });
        const newArray = [{ ...variableDoseArray[0], doses: updatedDoses }];
        setvariableDoseArray(newArray);
    };





    const [variableDoseArray, setvariableDoseArray] = useState<any>([{
        id: 1,
        doses: [
            { doseId: 1, checked: false, From: "00:00", To: "06:30", isDisabled: false },
            { doseId: 2, checked: false, From: "06:30", To: "09:00", isDisabled: false },
            { doseId: 3, checked: false, From: "09:00", To: "11:30", isDisabled: false },
            { doseId: 4, checked: false, From: "11:30", To: "13:30", isDisabled: false },
            { doseId: 5, checked: false, From: "13:30", To: "15:00", isDisabled: false },
            { doseId: 6, checked: false, From: "15:00", To: "17:00", isDisabled: false },
            { doseId: 7, checked: false, From: "17:00", To: "19:00", isDisabled: false },
            { doseId: 8, checked: false, From: "19:00", To: "21:00", isDisabled: false },
            { doseId: 9, checked: false, From: "21:00", To: "00:00", isDisabled: false },
        ]
    }])


    const time = [
        {
            timeId: 1,
            From: "00:00",
            To: "06:30"
        },
        {
            timeId: 2,
            From: "06:30",
            To: "09:00"
        },
        {
            timeId: 3,
            From: "09:00",
            To: "11:30"
        },
        {
            timeId: 4,
            From: "11:30",
            To: "13:30"
        },
        {
            timeId: 5,
            From: "13:30",
            To: "15:00"
        },
        {
            timeId: 6,
            From: "15:00",
            To: "17:00"
        },
        {
            timeId: 7,
            From: "17:00",
            To: "19:00"
        },
        {
            timeId: 8,
            From: "19:00",
            To: "21:00"
        },
        {
            timeId: 9,
            From: "21:00",
            To: "00:00"
        },
    ]




    useEffect(() => {
        dispatch(
            appServices.GetAllPharmacies({
                Name: '',
                SearchType: 1,
                Type: "pharm",
            })
        );
        dispatch(appServices.GetIndicationTypeLookup(null))

    }, [])
    useEffect(() => {
        if (AddProviderIndicationsList) {
            dispatch(appServices.GetIndicationTypeLookup(null))
        }
    }, [AddProviderIndicationsList])

    useEffect(() => {
        if (stopMedicine) {
            saveMedicineFun(isGenerateScriptSaveButtonClicked)
        }
        dispatch(appServices.clearGetMedicineStopped(""))
    }, [stopMedicine])

    useEffect(() => {
        if (allPharmacies != null) {
            setAllPharmaciesData((allPharmacies || []).map((pharm) => {
                return {
                    value: pharm.pharmacyID,
                    label: pharm.name + " (" + pharm?.address + ")"
                }
            }));
        }
        if (PatientDatail) {
            setSelectedPharmacyID(PatientDatail?.PharmacyID ? PatientDatail?.PharmacyID : null)
            // setSelectedPharmacyID(PatientDatail?.PharmacyHPI ? PatientDatail?.PharmacyHPI : null)
        }


    }, [allPharmacies, PatientDatail]);
    // useEffect(() => {
    //     if (checkedAlreadyPrescribedMedicine !== null) {
    //         if (checkedAlreadyPrescribedMedicine.isExist) {
    //             setIsMedicineFoundModalOpen(true)
    //         } else {
    //             saveMedicineFun(isGenerateScriptSaveButtonClicked)
    //         }
    //     }
    // }, [checkedAlreadyPrescribedMedicine])
    // const CalculateDispenseQuantity = (initialDispensingPeriodVal: string) => {

    //     let isTrial = advanceChecks.initDispensingPeriod
    //     let trialPeriod = initialDispensingPeriodVal
    //     let trialPeriodType = advanceChecks.trialType
    //     let DispdurationDay: any = parseInt(trialPeriod)
    //     let formDesc = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form
    //     var quantity: any = 0

    //     if (isTrial && DispdurationDay > 0) {
    //         if (quantityMed == "") {
    //             setAdvanceChecks({ ...advanceChecks, initialDispensingQuantity: '' })
    //         } else {
    //             if (!isAutoCalculateQuantityAllowed(formDesc)) return;

    //             if (frequencyMed === '23' || frequencyMed === '8') {
    //                 return;
    //             }

    //             let take = doseRange ? doseMed : takeMed
    //             let calculatedQuantity = parseFloat(quantityMed);
    //             let durationType = trialPeriodType
    //             if (advanceChecks.variableDose) {
    //                 setAdvanceChecks({ ...advanceChecks, initialDispensingQuantity: '' })
    //             } else {
    //                 if (trialPeriodType == daysMed && trialPeriod == durationMed) {
    //                     setAdvanceChecks({ ...advanceChecks, initialDispensingQuantity: quantityMed })
    //                 } else {
    //                     if (!isNaN(takeMed)) {
    //                         let foundFrequencyName: any = medicationArray?.frequencyArray.find((item: any) => item.value == frequencyMed)
    //                         let frequencyVal = foundFrequencyName ? foundFrequencyName.label : ""
    //                         let feq = ""
    //                         let frequencyFactor = 0; // Default factor for cases not covered in the switch
    //                         switch (Number(frequencyMed)) {
    //                             case 1:
    //                                 frequencyFactor = 1;
    //                                 break;
    //                             case 2:
    //                                 frequencyFactor = 2;
    //                                 break;
    //                             case 3:
    //                                 frequencyFactor = 3;
    //                                 break;
    //                             case 4:
    //                                 frequencyFactor = 4;
    //                                 break;
    //                             case 5:
    //                                 frequencyFactor = 0.5;
    //                                 break;
    //                             case 6:
    //                                 frequencyFactor = 1;
    //                                 break;

    //                             case 7:
    //                                 frequencyFactor = 6;
    //                                 break;
    //                             case 8:
    //                                 frequencyFactor = 1;
    //                                 break;
    //                             case 9:
    //                                 frequencyFactor = 1;
    //                                 break;
    //                             case 10:
    //                                 frequencyFactor = 1;
    //                                 break;
    //                             case 11:
    //                                 frequencyFactor = 1;
    //                                 break;
    //                             case 12:
    //                                 frequencyFactor = 4;
    //                                 break;
    //                             case 13:
    //                                 frequencyFactor = 3;
    //                                 break;
    //                             case 14:
    //                                 frequencyFactor = 2;
    //                                 break;
    //                             case 15:
    //                                 frequencyFactor = 1;
    //                                 break;
    //                             case 16:
    //                                 frequencyFactor = 5;
    //                                 break;

    //                             case 17:
    //                                 frequencyFactor = 0.141;
    //                                 break;
    //                             case 18:
    //                                 frequencyFactor = 0.0333333333333333;
    //                                 break;

    //                             case 19:
    //                                 frequencyFactor = 0.0027397260273973;
    //                                 break;

    //                             case 21:
    //                                 frequencyFactor = 0.285;
    //                                 break;
    //                             case 22:
    //                                 frequencyFactor = 0.427;
    //                                 break;
    //                             case 27:
    //                                 frequencyFactor = 0.066;
    //                                 break;
    //                             case 24:
    //                                 frequencyFactor = 24;
    //                                 break;
    //                             case 25:
    //                                 frequencyFactor = 12;
    //                                 break;

    //                             case 26:
    //                                 frequencyFactor = 8;
    //                                 break;

    //                             case 29:
    //                                 frequencyFactor = 1 / 90;
    //                                 break;
    //                             case 30:
    //                                 frequencyFactor = 1 / 3;
    //                                 break;
    //                             case 31:
    //                                 frequencyFactor = 0.0476;
    //                                 break;
    //                             case 32:
    //                                 frequencyFactor = 0.0357;
    //                                 break;

    //                             default:
    //                                 frequencyFactor = 1;
    //                                 break;
    //                         }
    //                         if (durationType == "2") {
    //                             DispdurationDay = parseFloat(DispdurationDay) * 7;
    //                         }
    //                         else if (durationType == "3") {
    //                             DispdurationDay = parseFloat(DispdurationDay) * 30;
    //                         }

    //                         if (frequencyFactor === 0.5) {
    //                             if (DispdurationDay !== 1) {
    //                                 if (DispdurationDay % 2 > 0) {
    //                                     DispdurationDay = (DispdurationDay / 2 + 0.5)
    //                                     frequencyFactor = 1
    //                                 }
    //                             }
    //                         }

    //                         if (frequencyMed == '29' || frequencyMed == "30") {
    //                             if (frequencyMed == '29') {
    //                                 if (DispdurationDay < 90) {
    //                                     quantity = 1
    //                                 } else {
    //                                     quantity = parseFloat((take * DispdurationDay).toString()) / 90;
    //                                 }
    //                             } else {
    //                                 if (DispdurationDay < 3) {
    //                                     quantity = 1
    //                                 } else {
    //                                     quantity = parseFloat(((take * DispdurationDay) / 3).toString())
    //                                 }
    //                             }
    //                         } else {
    //                             quantity = parseFloat((take * DispdurationDay * frequencyFactor).toString())
    //                         }
    //                         if (quantity.toString().indexOf('.') != -1) {
    //                             if (frequencyMed == "30") {

    //                                 if (take % 2 === 0) {

    //                                     quantity = 2 * Math.round(quantity / 2);
    //                                 }
    //                                 else {
    //                                     quantity = 2 * Math.ceil(quantity / 2) + 1;
    //                                 }
    //                             }
    //                             else {
    //                                 quantity = Math.ceil(Number(quantity.toString().substring(0, (quantity.toString().indexOf('.')))))
    //                                 quantity = Math.ceil(Number((quantity) + 1))
    //                             }
    //                         }
    //                         if (formDesc.toLowerCase().indexOf("inject") >= 0 || take < 0) {
    //                             quantity = 0
    //                             setAdvanceChecks({ ...advanceChecks, initialDispensingQuantity: "" })
    //                         }
    //                         else {
    //                             let dduration: any = durationMed
    //                             let ddurationType = daysMed
    //                             if (ddurationType == "2") {
    //                                 dduration = parseFloat(dduration) * 7
    //                             } else if (ddurationType == "3") {
    //                                 dduration = parseFloat(dduration) * 30
    //                             }
    //                             if (parseInt(DispdurationDay) > parseInt(dduration)) {
    //                                 setAdvanceChecks({ ...advanceChecks, initialDispensingQuantity: "" })
    //                                 SystemAlert("warning", "Initial dispensing period cannot be greater than actual duration.");
    //                                 return
    //                             } else {
    //                                 setAdvanceChecks({ ...advanceChecks, initialDispensingQuantity: quantity })
    //                             }
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     } else {
    //         if (parseInt(DispdurationDay) == 0) {
    //             setAdvanceChecks({ ...advanceChecks, initialDispensingQuantity: "" })
    //             SystemAlert("warning", "Initial dispense period cannot be zero.");
    //         }
    //     }



    // };

    // useEffect(() => {
    //     if (takeMed || advanceChecks.initialDispensingPeriodVal || advanceChecks.trialType || frequencyMed || doseRange || !doseRange || doseMed) {
    //         let quantity = calculateInitialDispensingQuantity(takeMed, advanceChecks.initialDispensingPeriodVal, advanceChecks.trialType, frequencyMed, doseRange, doseMed)
    //         if (!isNaN(quantity))
    //             setAdvanceChecks({
    //                 ...advanceChecks,
    //                 initialDispensingQuantity: quantity

    //             })
    //     }

    // }, [advanceChecks.initialDispensingPeriodVal, takeMed, frequencyMed, advanceChecks.trialType, doseRange, doseMed])
    useEffect(() => {
        if (isVisiblePharmic) {
            let data = {
                "ProductSCTID": props.selectedMedicine?.ProductSCTID || props.selectedMedicine?.sctid || props.selectedMedicine?.SCTID,
                "Type": 0
            };
            dispatch(appServices?.MedicationAdvanceSearch(data))
        }
    }, [isVisiblePharmic])





    const checkRequiredFieldsForPRNFrequency = () => {
        if (frequencyMed === '6') {
            setRequiredFieldsObj({ ...requiredFieldsObj, isDirectionRequired: true, isTakeDisabled: true, isTakeRequired: false, })
            setTakeMed("");
        } else if (medicationDetailsAddEditData !== null && medicationDetailsAddEditData.length > 0) {
            let form = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form ?? ""
            if (requiredFieldsObj.isTakeDisabled || form.trim().toLowerCase().includes("ointment")) {
                if (doseRange) {
                    setRequiredFieldsObj({
                        ...requiredFieldsObj,
                        isDirectionRequired: false,
                        isMaxDosePerHourDisabled: frequencyMed == "8" ? true : !isPRNMedicine ? true : false,
                        isIndicationDisabled: frequencyMed == "8" ? true : !isPRNMedicine ? true : false,
                        // isTakeDisabled: form.trim().toLowerCase().includes("cream") ? true : form.trim().toLowerCase().includes("ointment") ? true : false,
                        // isTakeRequired: form.trim().toLowerCase().includes("cream") ? false : form.trim().toLowerCase().includes("ointment") ? false : true,
                        isDoseRangeIsRequired: form.trim().toLowerCase().includes("ointment") ? true : false,
                    })
                } else {
                    setRequiredFieldsObj({
                        ...requiredFieldsObj,
                        isDirectionRequired: false,
                        isMaxDosePerHourDisabled: frequencyMed == "8" ? true : !isPRNMedicine ? true : false,
                        isIndicationDisabled: frequencyMed == "8" ? true : !isPRNMedicine ? true : false,
                        // isTakeDisabled: form.trim().toLowerCase().includes("cream") ? true : form.trim().toLowerCase().includes("ointment") ? true : false,
                        // isTakeRequired: form.trim().toLowerCase().includes("cream") ? false : form.trim().toLowerCase().includes("ointment") ? false : true,
                        isDoseRangeIsRequired: form.trim().toLowerCase().includes("ointment") ? true : false,
                    })
                }
            } else {
                setRequiredFieldsObj({
                    ...requiredFieldsObj,
                    isMaxDosePerHourDisabled: frequencyMed == "8" ? true : !isPRNMedicine ? true : false,
                    isIndicationDisabled: frequencyMed == "8" ? true : !isPRNMedicine ? true : false,
                })
            }
        }
    }
    const ShowValidationSigns = (medicineDuration, medicineQuantity) => {
        setRequiredFieldsObj({ ...requiredFieldsObj, isDurationRequired: true, isQuantityRequired: false })
        const medicationList = medicationDetailsAddEditData[0]?.lstPatientMedication;
        // Handle the first control (ctrl1)
        if (medicineDuration === '') {
            if (medicineQuantity === '' || medicineQuantity == 0 || medicineQuantity === null) {
                if (isPRNMedicine) {
                    if (medicationList && medicationList.filter(item => item.classification !== null).some(item => item.classification.includes("Class A") || item.classification.includes("Class B"))) {
                        setRequiredFieldsObj({ ...requiredFieldsObj, isDurationDisabled: true, isDurationRequired: false })
                        // isDurationDisable = true
                        // isDurationRequired = false
                        // setTxtDurationDisabled(true);
                        // setDdlDurationDisabled(true);
                    }
                } else {
                    if (medicationList && medicationList.filter(item => item.classification !== null).some(item => item.classification.includes("Class A") || item.classification.includes("Class B"))) {
                        setRequiredFieldsObj({ ...requiredFieldsObj, isDurationDisabled: false, isDurationRequired: true })
                        // isDurationDisable = false
                        // isDurationRequired = true
                        // setTxtDurationDisabled(false);
                        // setDdlDurationDisabled(false);
                    } else {
                        setRequiredFieldsObj({ ...requiredFieldsObj, isDurationRequired: true, isDurationDisabled: false })
                        // isDurationDisable = false
                        // isDurationRequired = true

                        // setCtrl1Error('*');
                    }
                }
            } else {
                // Reset errors if ctrl2 has a value
                // setCtrl1Error('');
                // setCtrl2Error('');
                setRequiredFieldsObj({ ...requiredFieldsObj, isDurationRequired: false, })
                // isDurationRequired = false
                // isDurationDisable = true
            }
        }

        // Handle the second control (ctrl2)
        if (medicineQuantity === '' || medicineQuantity == 0 || medicineQuantity === null) {
            if (medicationList && medicationList.filter(item => item.classification !== null).some(item => item.classification.includes("Class A") || item.classification.includes("Class B"))) {
                setRequiredFieldsObj({ ...requiredFieldsObj, isDurationRequired: false, isDurationDisabled: true, isQuantityRequired: true })
                // isDurationRequired = false
                // isDurationDisable = true
                // isQuantityRequired = true
                // setCtrl2Error('*');
                // setCtrl1Error('');
                // setTxtDurationDisabled(true);
                // setDdlDurationDisabled(true);
            } else {
                if (medicineDuration === '') {
                    // isQuantityRequired = true
                    setRequiredFieldsObj({ ...requiredFieldsObj, isQuantityRequired: true })
                    // setCtrl2Error('*');
                } else {
                    if (frequencyMed === '8') {
                        // Case when open from Single Page Prescription
                        return; // Quantity will have to be entered by the user if "STAT" is in frequency
                    } else {
                        // setCtrl2Error('');
                        // isQuantityRequired = false
                        setRequiredFieldsObj({ ...requiredFieldsObj, isQuantityRequired: false, })
                    }
                }
            }
        }
    };



    const setQuantityDurationRequiredAttributes = (ctrl: any) => {
        if (ctrl == null) {
            ShowValidationSigns(durationMed, quantityMed);
        }
        else if (ctrl !== null && ctrl.id == 'duration') {
            ShowValidationSigns(ctrl.durationMed, ctrl.quantityMed);
        }
        else if (ctrl !== null && ctrl.id == 'quantity') {
            ShowValidationSigns(ctrl.durationMed, ctrl.quantityMed);
        }
        // let form = medicationDetailsAddEditData !== null ? medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form : ''
        // if (!takeMed && form.toLowerCase().includes("ointment") || form.toLowerCase().includes("cream")) {
        //     setRequiredFieldsObj({ ...requiredFieldsObj, isTakeRequired: false })
        // } else if (!takeMed) {
        //     setRequiredFieldsObj({ ...requiredFieldsObj, isTakeRequired: true })
        // }
        // if (requiredFieldsObj.isTakeRequired && takeMed == "") {
        //     if (doseRange) {
        //         setRequiredFieldsObj({ ...requiredFieldsObj, isTakeRequired: true, isDoseRangeIsRequired: true })
        //     } else {
        //         setRequiredFieldsObj({ ...requiredFieldsObj, isTakeRequired: true })

        //     }
        // }
        // else if (takeMed != '') {
        //     if (doseRange) {
        //         setRequiredFieldsObj({ ...requiredFieldsObj, isTakeRequired: false, isDoseRangeIsRequired: false })
        //     } else {
        //         setRequiredFieldsObj({ ...requiredFieldsObj, isTakeRequired: false })
        //     }
        // }
        // if (requiredFieldsObj.isRouteRequired && routeMed == "") {
        //     setRequiredFieldsObj({ ...requiredFieldsObj, isRouteRequired: false })
        // }

    }

    useEffect(() => {
        if (medicationDetailsAddEditData !== null) {
            setQuantityDurationRequiredAttributes(null)
            setIsMedicineSwitched(false)
        }
    }, [medicationDetailsAddEditData])
    const chkPRNChange = (isPRNChange: boolean) => {
        setisPRNMedicine(isPRNChange)
        setMaxDosePer24Hour('')
        setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed == "8" ? "" : frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNChange,
            "", maxDosePer24HourUnit, medicineStartDate, medicineEndDate
        )

        if (medicationDetailsAddEditData !== null && medicationDetailsAddEditData.length > 0) {
            if (isPRNChange) {
                if (frequencyMed == "8") {
                    setFrequencyMed("")
                }
                const medicationList = medicationDetailsAddEditData[0]?.lstPatientMedication;
                if (medicationList && medicationList.filter(item => item.classification !== null).some(item => item.classification.includes("Class A") || item.classification.includes("Class B"))) {
                    setRequiredFieldsObj({ ...requiredFieldsObj, isDirectionRequired: true, isMaxDosePerHourDisabled: false, isIndicationDisabled: false, isDurationDisabled: true, isDurationRequired: false })
                    setDurationMed("")
                    setDoseMed("")
                    setDoseRange(false)
                } else {
                    setRequiredFieldsObj({ ...requiredFieldsObj, isMaxDosePerHourDisabled: false, isIndicationDisabled: false, })
                }
            } else {
                const medicationList = medicationDetailsAddEditData[0]?.lstPatientMedication;
                if (medicationList && medicationList.filter(item => item.classification !== null).some(item => item.classification.includes("Class A") || item.classification.includes("Class B"))) {
                    setRequiredFieldsObj({ ...requiredFieldsObj, isDirectionRequired: false, isMaxDosePerHourDisabled: true, isIndicationDisabled: true, isDurationDisabled: true, isDurationRequired: false })
                    setDurationMed("")
                    setDoseMed("")
                    setDoseRange(false)
                } else {
                    setRequiredFieldsObj({ ...requiredFieldsObj, isMaxDosePerHourDisabled: true, isIndicationDisabled: true, })
                }
            }
        }
    }


    useEffect(() => {
        if (frequencyMed !== "") {
            checkRequiredFieldsForPRNFrequency()
        }
    }, [frequencyMed])

    useEffect(() => {
        if (medicationDetailsAddEditData) {
            setSAStatusMed(
                medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.saStatusID !== null &&
                    medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.saStatusID !== "" &&
                    medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.saStatusID !== undefined ?
                    medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.saStatusID.toString() : ""
            )

            setSAFormNumberMed(
                medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.saNumber !== null &&
                    medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.saNumber !== "" &&
                    medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.saNumber !== undefined ?
                    medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.saNumber.toString() : ""
            )
            if (medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.isSAExpiryLifeTime === false) {
                setExpiryDate(
                    medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.expiryDate !== null &&
                        medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.expiryDate !== "" &&
                        medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.expiryDate !== undefined ?
                        dayjs(medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.expiryDate) : ""
                )

                setSAExpiry(false)
            } else if (medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.isSAExpiryLifeTime === true) {
                setSAExpiry(medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.isSAExpiryLifeTime)
                setExpiryDate('')
            }

            const medication = medicationDetailsAddEditData[0]?.lstPatientMedication[0];
            const expiryDateRaw = medication?.expiryDate;
            const isSAExpiryLifeTime = medication?.isSAExpiryLifeTime;
            const patientSAFormRecordID = medication?.patientSARecordID
            const SANumber = medication?.saNumber
            const SAExpiryDate = expiryDateRaw
                ? dayjs(expiryDateRaw).format("YYYY-MM-DD")
                : null;

            const todayDate = dayjs().format("YYYY-MM-DD");
            const isBefore = SAExpiryDate
                ? dayjs(SAExpiryDate).isBefore(dayjs(todayDate))
                : false;
            if (isBefore && (isSAExpiryLifeTime === false || isSAExpiryLifeTime == null)) {
                setIsExpired(true);
            } else {
                setIsExpired(false);
            }
            if (props?.selectedMedicine?.isFromMDRInformationEdit != true && props?.selectedMedicine?.isFromMDRInformation !== true) {
                if ((SANumber !== null && SANumber !== undefined && SANumber !== "") && (isSAExpiryLifeTime)) {
                    setIsRenewButtonShown(false)
                } else if ((SANumber !== null && SANumber !== undefined && SANumber !== "") && (!isSAExpiryLifeTime) && (!isBefore)) {
                    setIsRenewButtonShown(false)
                }
                if ((expiryDateRaw === null || expiryDateRaw === undefined || expiryDateRaw === "") && (isSAExpiryLifeTime === null || isSAExpiryLifeTime === false || isSAExpiryLifeTime === undefined || isSAExpiryLifeTime === "")) {
                    setIsSARenewButton(false)
                }
            }
            setPatientSARecordId(patientSAFormRecordID !== null && patientSAFormRecordID !== undefined && patientSAFormRecordID !== "" ?
                patientSAFormRecordID : null
            )

            let form = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form

            const frequencyList = medicationDetailsAddEditData[0]?.lstMedicineFrequency || []

            const filteredList = isISPRXLite
                ? frequencyList.filter((item: any) => !item.text.includes("short"))
                : frequencyList;

            const freqData = filteredList.map(freq => ({
                "value": freq?.value?.toString(),
                "label": freq?.text
            }))

            const routeData = (medicationDetailsAddEditData[0]?.lstMedicineRoute || []).map(route => ({
                "value": route?.value.toString(),
                "label": route?.text
            }))
            const providerListData = (medicationDetailsAddEditData[0]?.lstProviderList || []).map(provider => ({
                "value": provider?.providerID,
                "label": provider?.fullName
            }))
            const packsize = (medicationDetailsAddEditData[0]?.lstMedicinePackages || []).map(Package => ({
                "value": Package?.medicinePackSizeID,
                "label": Package?.packSize,
                "subsidized": Package?.subsidized
            }))
            const saStatus = (medicationDetailsAddEditData[0]?.lstMedicineSAStatus || []).map(Status => ({
                "value": Status?.saStatusID.toString(),
                "label": Status?.text
            }))

            let packageextraunit = autoChoosePackageType(form)
            let newPack = [{ value: "0", label: packageextraunit }, ...packsize]
            if (isFromPackSizeDrawer) {
                newPack = [...packsize]
            }
            // let newPack.push({value:(packsize.length+1),label:packageextraunit})
            //[...packageextraunit]
            // packsize()
            let packSizeUnit = ""
            let octansMedsID = null
            let uom = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.uom
            let unitOfMeasure = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.unitOfMeasure
            let unitOfMeasure_OriginalPack = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.unitOfMeasure_OriginalPack
            let medicinePackSizeID = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.medicinePackSizeID
            let medicinePackSize = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.medicinePackSize

            if (octansMedsID != null && octansMedsID != '' && (medicinePackSizeID == '' || medicinePackSizeID != null || medicinePackSizeID == 0) && (uom != null && uom != '')) {
                packSizeUnit = medicinePackSize;
            }
            else if (octansMedsID != null && octansMedsID != '' && (unitOfMeasure_OriginalPack == true || unitOfMeasure_OriginalPack == 'True')) {
                packSizeUnit = ' OP';
            }
            else if (octansMedsID != null && octansMedsID != '') {
                packSizeUnit = ' ' + unitOfMeasure + ' ';
            } else if (packSizeUnit == "") {
                packSizeUnit = autoChoosePackageType(form)
            }

            let arrayForPackSize: any[] = newPack
            if (form.toLowerCase().indexOf("cream") >= 0) {
                if (medicinePackSize === 'Grams') {
                    setPackageMed("0")
                }
            }
            else if (arrayForPackSize.length == 1) {
                setPackageMed(arrayForPackSize[0].value)
                setIsQuantityUnitDisabled(true)
            } else {
                setPackageMed(packSizeUnit)
            }
            setMedicationArray({
                ...medicationArray,
                frequencyArray: freqData,
                routeArray: routeData,
                providerListArray: providerListData,
                packageArray: packageextraunit
                    ? [
                        ...newPack,
                        { value: "-1", label: "Dose(s)" },
                        ...(form.toLowerCase().indexOf("cream") >= 0 ? [{ value: "0", label: "Grams" }] : []),
                        ...(form.toLowerCase().indexOf("inject") >= 0 ? [{ value: "0", label: "1 syringe" }] : [])
                    ]
                    : [
                        ...packsize,
                        { value: "-1", label: "Dose(s)" },
                        ...(form.toLowerCase().indexOf("cream") >= 0 ? [{ value: "0", label: "Grams" }] : []),
                        ...(form.toLowerCase().indexOf("inject") >= 0 ? [{ value: "0", label: "1 syringe" }] : [])
                    ],
                saStatusArray: saStatus

            })
            // setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText,freqData, IsBlisterPack, doseUnit, isPRNMedicine)

            setTakeLabelFunction()
            setStrengthID(medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.strengthID)
            setStrengthIDMed(medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.strength?.toString())
            const unit = autoSelectDoseUnit(form, medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.isInsulin)
            const tempDoseUnitArrayOptions: any[] = [...medicationDetailsAddEditData[0]?.lstMedicineUnitOfMeasure.filter((record: any) => record.uom !== "Other").map((item, index) => {
                return (
                    {
                        "value": item?.uom,
                        "label": item?.uom
                    }
                )
            })]

            if (!tempDoseUnitArrayOptions.some((record: any) => record.value === unit) && unit !== null && unit !== undefined && unit !== "") {
                tempDoseUnitArrayOptions.push({
                    value: unit,
                    label: unit
                });
            }
            const unitsArray: any[] = [
                ...tempDoseUnitArrayOptions,
                { value: "Other", label: "Other" }
            ];

            const reorderedUnits = unit !== null && unit !== undefined && unit !== "" ? [
                ...unitsArray.filter(u => u.label.toLowerCase().includes(unit.toLowerCase())),
                ...unitsArray.filter(u => !u.label.toLowerCase().includes(unit.toLowerCase()))
            ] : unitsArray;

            setDoseUnitOption(reorderedUnits);
            if ((props?.selectedMedicine?.isFromMDRInformationEdit != true && props?.selectedMedicine?.isFromMDRInformation !== true) || props?.selectedMedicine?.isAddedFromApplication == true) {
                if (!props?.selectedMedicine?.Form?.toLowerCase().startsWith("oral liquid:")) {
                    setDoseUnit(unit);
                    setMaxDosePer24HourUnit(unit);
                }
            }
            setIsRescommended(
                medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.isRecomRequired !== null &&
                    medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.isRecomRequired !== "" &&
                    medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.isRecomRequired !== undefined ?
                    medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.isRecomRequired : false
            )
            setIsMedicationUpdateOnly(medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.rxNotprinted)
            setSelectedMed(medicationDetailsAddEditData[0]?.lstPatientMedication[0])
            if (medicationDetailsAddEditData[0]?.lstMedicineRoute?.length == 1) {
                setRouteMed(medicationDetailsAddEditData[0]?.lstMedicineRoute[0]?.value.toString())
                setRouteMedText(medicationDetailsAddEditData[0]?.lstMedicineRoute[0]?.text)
            }
            setCurrnetPrescriberID(profileID?.claimsData?.profileID)
            setDaysMed('1')
            setPrescribeThroughEdit(false)
            // setPackageMed('0')
        }
    }, [medicationDetailsAddEditData])



    // useEffect(() => {
    //     if (props?.isFromMDRInformation !== true && props?.selectedMedicine && props.addMed) {
    //         if (props.selectedMedicine?.medId) {
    //             let data = {
    //                 "MDRMedId": props.selectedMedicine?.medId?.toString(),
    //                 "ActiveMedID": props.selectedMedicine?.activeMedID?.toString()
    //             }
    //             dispatch(appServices?.GetMedicationForEdit(data))

    //         } else {
    //             let data = {

    //                 "MedicineID": props.selectedMedicine?.Id?.toString() || props.selectedMedicine?.medId?.toString(),
    //                 "PatientID": PatientDatail?.PatientID,
    //                 "SCTID": props?.selectedMedicine?.ProductSCTID || props?.selectedMedicine?.sctid || props?.selectedMedicine?.SCTID
    //             }

    //             dispatch(appServices?.GetMedicationDetailsForAddEdit(data))
    //         }

    //     }

    // }, [props.addMed])



    // useEffect(() => {
    //     const claimsData: any = sessionStorage.getItem('userData')
    //     const practiceInfo = JSON.parse(claimsData)
    //     setCurrnetPrescriberID(practiceInfo?.claimsData?.profileID)
    // }, [])


    useEffect(() => {
        // let form: any = props.selectedMedicine?.Form
        // let form = props.selectedMedicine?.Form ? props.selectedMedicine?.Form :
        //     medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form ? medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form : ""
        let form = props?.isFromMDRInformation === true ? props.selectedMedicine?.Form ? props.selectedMedicine?.Form :
            allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.form ? allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.form : "" :
            medicationDetailsAddEditData !== null ? medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form ? medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form :
                props.selectedMedicine?.Form :
                props.selectedMedicine?.Form
        if (takeMed || durationMed || daysMed || frequencyMed || doseRange || !doseRange || doseMed)
            if (
                ((form)?.includes("drop")) ||
                ((form)?.includes("inhale")) ||
                ((form)?.includes("spray")) ||
                ((form)?.includes("cream")) ||
                ((form)?.includes("ointment")) ||
                ((form)?.includes("solution")) ||
                ((form)?.includes("topical")) ||
                ((form)?.includes("inhalation")) ||
                // ((form)?.includes("oral")) || 
                ((form)?.includes("inject"))
            ) {
                if (((form)?.includes("inject") && doseUnit == "" && props.selectedMedicine?.isFromMDRInformation !== true) || props?.selectedMedicine?.isAddedFromApplication == true) {
                    const tempDoseUnitArrayOptions: any[] = [...doseUnitOption];

                    if (!tempDoseUnitArrayOptions.some((record: any) => record.value === "Unit")) {
                        const newOption = { value: "Unit", label: "Unit" };

                        const insertIndex = tempDoseUnitArrayOptions.length > 0
                            ? tempDoseUnitArrayOptions.length - 1
                            : 0;

                        tempDoseUnitArrayOptions.splice(insertIndex, 0, newOption);
                    }
                    const unit: any = "Unit";
                    const unitsArray: any[] = [
                        ...tempDoseUnitArrayOptions,
                    ];

                    const reorderedUnits = unit !== null && unit !== undefined && unit !== "" ? [
                        ...unitsArray.filter(u => u.label.toLowerCase().includes(unit.toLowerCase())),
                        ...unitsArray.filter(u => !u.label.toLowerCase().includes(unit.toLowerCase()))
                    ] : unitsArray;

                    setDoseUnitOption(reorderedUnits);
                    setDoseUnit('Unit')
                    setMaxDosePer24HourUnit('Unit')
                }

                // setQuantityMed(null)
                setIsDurationDisable(false)
            }
            else {
                let doseUnitValue = doseUnit !== null && doseUnit !== undefined && doseUnit !== "" ? doseUnit.toLowerCase() : ""
                let foundFrequencyName: any = medicationArray?.frequencyArray.find((item: any) => item.value == frequencyMed)
                if (
                    (doseUnitValue == "mg") ||
                    (
                        ((form !== null && form !== undefined) && (form.includes("capsule") || form.includes("tablet"))) &&
                        ((doseUnitValue == "microgram") || (doseUnitValue == "kg") || (doseUnitValue == "l"))
                    )
                    &&
                    (strengthIDMed !== undefined)
                ) {
                    let splittedStrength = parseFloat(strengthIDMed.split(" ")[0])
                    if (
                        (
                            (props?.selectedMedicine?.isFromMDRInformation && allMedicationForEdit?.mdrMedicineData?.[0]?.IsSplitDose == null) ||
                            allMedicationForEdit?.mdrMedicineData?.[0]?.IsSplitDose
                        ) && permissions?.SaveSplitDose ||
                        (allMedicationForEdit == null && permissions?.SaveSplitDose)
                    ) {
                        let calQuantity: number = 0;

                        splitDoseArrayOptions.filter((record: SplitDoseOption) => record.IsActive).forEach((record: SplitDoseOption) => {
                            const foundFrequency: any = medicationArray?.frequencyArray.find(
                                (item: any) => item.value === record.frequencyCodeValue
                            );

                            const frequencyLabel = foundFrequency ? foundFrequency.label : "";

                            const result = doseUnit === "Other"
                                ? undefined
                                : calculateMedicineQuantityNew(
                                    record.takeValue,
                                    durationMed,
                                    daysMed,
                                    record.frequencyCodeValue,
                                    record.isDoseRangeSelected,
                                    record.doseRangeValue,
                                    form,
                                    frequencyLabel,
                                    maxDosePer24Hour,
                                    doseUnit
                                );

                            if (result && !isDurationDisable && splittedStrength !== 0) {
                                const quantity = result.medicineQuantity / splittedStrength;
                                const roundedQty = Math.round(quantity);

                                if (roundedQty > 0) {
                                    calQuantity += roundedQty;
                                }
                            }
                        });

                        setErrorMessages({ ...errorMessages, quantity: '' })
                        setQuantityMed(Math.round(calQuantity) == 0 ? "" : Math.round(calQuantity))
                    } else {

                        let result = doseUnit === "Other" ? undefined : calculateMedicineQuantityNew(takeMed, durationMed, daysMed, frequencyMed, doseRange, doseMed, form, foundFrequencyName ? foundFrequencyName.label : "", maxDosePer24Hour, doseUnit);
                        let quantityObj;
                        if (result) {
                            quantityObj = result;
                        } else {
                            quantityObj = undefined;
                        }
                        if (quantityObj) {
                            const quantity = quantityObj.medicineQuantity / splittedStrength
                            if (!isDurationDisable) {
                                setQuantityMed(Math.round(quantity) == 0 ? "" : Math.round(quantity))
                                setErrorMessages({ ...errorMessages, quantity: '' })

                            }
                        }
                    }
                } else {
                    if (
                        (
                            (props?.selectedMedicine?.isFromMDRInformation && allMedicationForEdit?.mdrMedicineData?.[0]?.IsSplitDose == null) ||
                            allMedicationForEdit?.mdrMedicineData?.[0]?.IsSplitDose
                        ) && permissions?.SaveSplitDose ||
                        (allMedicationForEdit == null && permissions?.SaveSplitDose)
                    ) {
                        let calQuantity: 0 = 0;

                        splitDoseArrayOptions.filter((record: SplitDoseOption) => record.IsActive).forEach((record: SplitDoseOption) => {
                            const foundFrequencyNameByCode: any = medicationArray?.frequencyArray.find(
                                (item: any) => item.value === record.frequencyCodeValue
                            );

                            const result = doseUnit === "Other"
                                ? undefined
                                : calculateMedicineQuantityNew(
                                    record.takeValue,
                                    durationMed,
                                    daysMed,
                                    record.frequencyCodeValue,
                                    record.isDoseRangeSelected,
                                    record.doseRangeValue,
                                    form,
                                    foundFrequencyNameByCode?.label || "",
                                    maxDosePer24Hour,
                                    doseUnit
                                );

                            if (result && !isDurationDisable) {
                                const roundedQty = Math.round(result.medicineQuantity || 0);
                                calQuantity += roundedQty;
                            }
                        });
                        setErrorMessages({ ...errorMessages, quantity: '' })
                        setQuantityMed(Math.round(calQuantity) == 0 ? "" : Math.round(calQuantity))
                    } else {
                        let result = doseUnit === "Other" ? undefined : calculateMedicineQuantityNew(takeMed, durationMed, daysMed, frequencyMed, doseRange, doseMed, form, foundFrequencyName ? foundFrequencyName.label : "", maxDosePer24Hour, doseUnit);
                        let quantityObj;
                        if (result) {
                            quantityObj = result;
                        } else {
                            quantityObj = undefined;  // or set a default value if needed
                        }
                        if (quantityObj) {
                            if (!isDurationDisable) {
                                setQuantityMed(Math.round(quantityObj.medicineQuantity) != 0 ? Math.round(quantityObj.medicineQuantity) : '')
                                setErrorMessages({ ...errorMessages, quantity: '' })
                            }
                        }
                    }
                }
            }
    }, [takeMed, splitDoseArrayOptions, durationMed, daysMed, doseUnit, frequencyMed, doseRange, doseMed, maxDosePer24Hour])

    // working_here

    useEffect(() => {
        if (advanceChecks.initDispensingPeriod) {
            let form = props?.isFromMDRInformation === true ? props.selectedMedicine?.Form ? props.selectedMedicine?.Form :
                allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.form ? allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.form : "" :
                medicationDetailsAddEditData !== null ? medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form ? medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form :
                    props.selectedMedicine?.Form :
                    props.selectedMedicine?.Form
            if (takeMed || advanceChecks.trialType || frequencyMed || doseRange || !doseRange || doseMed) {
                let doseUnitValue = doseUnit !== null && doseUnit !== undefined && doseUnit !== "" ? doseUnit.toLowerCase() : ""
                let foundFrequencyName: any = medicationArray?.frequencyArray.find((item: any) => item.value == frequencyMed)
                if (
                    (doseUnitValue == "mg") ||
                    (
                        ((form !== null && form !== undefined) && (form.includes("capsule") || form.includes("tablet"))) &&
                        ((doseUnitValue == "microgram") || (doseUnitValue == "kg") || (doseUnitValue == "l"))
                    )
                    &&
                    (strengthIDMed !== undefined)
                ) {
                    let splittedStrength = parseFloat(strengthIDMed.split(" ")[0])
                    let result = doseUnit === "Other" ? undefined : calculateMedicineQuantityNew(takeMed, advanceChecks.initialDispensingPeriodVal, advanceChecks.trialType, frequencyMed, doseRange, doseMed, form, foundFrequencyName ? foundFrequencyName.label : "", maxDosePer24Hour, doseUnit);
                    let quantityObj;
                    if (result) {
                        quantityObj = result;
                    } else {
                        quantityObj = undefined;
                    }
                    if (quantityObj) {
                        const quantity = quantityObj.medicineQuantity / splittedStrength
                        if (!isDurationDisable) {
                            setAdvanceChecks({
                                ...advanceChecks,
                                initialDispensingQuantity: Math.round(quantity) == 0 ? "" : Math.round(quantity)
                            })
                            if (Number(Math.round(quantity) == 0 ? "" : Math.round(quantity)) > Number(quantityMed) && (quantityMed !== "" && quantityMed !== undefined && quantityMed !== null)) {
                                setErrorMessages({ ...errorMessages, initialDispensingQuantity: 'Quantiy must be less than actual quantity' })
                            } else {
                                setErrorMessages({ ...errorMessages, initialDispensingQuantity: '' })
                            }
                        }
                    }
                } else {
                    let result = doseUnit === "Other" ? undefined : calculateMedicineQuantityNew(takeMed, advanceChecks.initialDispensingPeriodVal, advanceChecks.trialType, frequencyMed, doseRange, doseMed, form, foundFrequencyName ? foundFrequencyName.label : "", maxDosePer24Hour, doseUnit);
                    let quantityObj;
                    if (result) {
                        quantityObj = result;
                    } else {
                        quantityObj = undefined;
                    }
                    if (quantityObj) {
                        if (!isDurationDisable) {
                            setAdvanceChecks({
                                ...advanceChecks,
                                initialDispensingQuantity: Math.round(quantityObj.medicineQuantity) != 0 ? Math.round(quantityObj.medicineQuantity) : ''
                            })
                            if (Number(Math.round(quantityObj.medicineQuantity) != 0 ? Math.round(quantityObj.medicineQuantity) : '') > Number(quantityMed) && (quantityMed !== "" && quantityMed !== undefined && quantityMed !== null)) {
                                setErrorMessages({ ...errorMessages, initialDispensingQuantity: 'Quantiy must be less than actual quantity' })
                            } else {
                                setErrorMessages({ ...errorMessages, initialDispensingQuantity: '' })
                            }
                        }
                    }
                }
            }
        }
    }, [takeMed, advanceChecks.initialDispensingPeriodVal, advanceChecks.initDispensingPeriod, advanceChecks.trialType, doseUnit, frequencyMed, doseRange, doseMed, maxDosePer24Hour])

    useEffect(() => {
        if (((durationMed == "" || durationMed == null) && (quantityMed == "" || quantityMed == null))) {
            setIsQuantityDisable(false)
            setIsDurationDisable(false)

        }
    }, [durationMed, quantityMed])
    const getAutoPopulateDuaration = async (quantityEntered, frequencyID, takeOfMed) => {
        try {
            setIsDurationDisable(true)
            setIsGettingAutoPopulatedDuration(true)
            const response = await UseMarApi(`AutoPopulateDuaration?Quantity=${quantityEntered}
                &FreqencyID=${frequencyID}
                &Take=${takeOfMed}`, 'get', null, true);
            if (response?.status?.includes("SUCCESS")) {
                setIsGettingAutoPopulatedDuration(false)
                // setDurationMed(response.dataMessage.duration)
                // setErrorMessages({ ...errorMessages, duration: '' })
                // setDaysMed(`${response.dataMessage.durationType}`)
            } else {
                SystemAlert("error", response.errorMessage)
                setIsGettingAutoPopulatedDuration(false)
                // setDurationMed("")
                // setDaysMed("")
            }
        } catch (error) {
            setIsGettingAutoPopulatedDuration(false)
            // setDurationMed("")
            // setDaysMed("")

        }
    }
    useEffect(() => {
        if (!generateScript) {
            setSelectedMedcineRecords([])
            setMedicineSelectedArrayOptions([])
            //   setSelectedRows({})
            setTextAreaText({
                messageToPharmacist: "",
                pharmacyAddress: "",
                mailSubject: "",
            })
            setErrorMessages({})
            setEmailsIDs({
                PatientEmail: "",
                PharmacyEmail: "",
            })
            setselectedItem("")
            setCurrentPrescriberID(null)
            setPatientPharmacyID(null)
            //   setPharmacyName("")
        }
    }, [generateScript])

    const debouncedGetAutoPopulateDuration = useCallback(
        debounce((quantityEntered: string) => {
            if (frequencyMed !== "" && takeMed !== "" && quantityEntered !== "") {
                // getAutoPopulateDuaration(quantityEntered, frequencyMed, takeMed);
            }
        }, 1000), [frequencyMed, takeMed]
    );

    useEffect(() => {
        if (quantityMed !== 0 && !isQuantityDisable)
            debouncedGetAutoPopulateDuration(quantityMed);
    }, [quantityMed, debouncedGetAutoPopulateDuration]);



    const setDirectionsFunction = (takeMed, PRNIndicationObject, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange,
        quantityMed, unitMed, routeMedText, medicationArray, IsBlisterPack, doseUnit, isPRNMedicine
        , maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate
    ) => {

        let tk = takeMed !== null ? takeMed : '';
        let indicat = PRNIndicationObject ?? ""
        let frq = frequencyMed;
        frq = GetFrequencyDescription(frq)
        let frm = medicationDetailsAddEditData !== null ? medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form ?? "" : ""
        let formID = medicationDetailsAddEditData !== null ? medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.formID : ""
        let isInsulin = medicationDetailsAddEditData !== null ? medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.isInsulin : ""
        let unit = doseUnit == "Other" ? doseUnitOtherValue : doseUnit;
        let formSuppVal = formID ? formID.toString() : ''
        let form = '';
        let sig = '';

        if (frq.toLowerCase().includes('select')) {
            frq = '';
        }

        // Check if the form is set correctly
        if (formSuppVal === '26' || formSuppVal === '35' || formSuppVal === '49' || formSuppVal === '267' || formSuppVal === '74') {
            form = 'Insert';
        } else {
            form = takeLabel.replaceAll(":", "");
        }

        if (tk.includes('.')) {
            if (!form.toLowerCase().includes('inject')) {
                tk = tk.replace(/^0+|0+$/g, '');
                const [preceedingDigit, proceedingDigit] = tk.split('.');
                if (preceedingDigit === '' && proceedingDigit !== '5' && proceedingDigit !== '50') {
                    tk = '0.' + proceedingDigit;
                }
                if (proceedingDigit === '0' && preceedingDigit !== '') {
                    tk = preceedingDigit;
                }
                if (doseRange) {
                    if (takeMed && doseMed) {
                        tk = `${takeMed} to ${doseMed}`;
                    }
                } else {
                    tk = `${takeMed}`
                }
            } else {
                if (doseRange) {
                    if (takeMed && doseMed) {
                        tk = `${takeMed} to ${doseMed}`;
                    }
                }
            }
        } else {
            if (doseRange) {
                if (takeMed && doseMed) {
                    tk = `${takeMed} to ${doseMed}`;
                }
            }
        }

        if (frm.toLowerCase().includes('tablet')) {
            frm = 'tablet';
        } else if (frm.toLowerCase().includes('inhal') || frm.toLowerCase().includes('spray')) {
            frm = 'puff';
        } else if (frm.toLowerCase().includes('suppositor')) {
            frm = 'supp(s)';
        } else if (frm.toLowerCase().includes('oral')) {
            frm = '';
        } else if (frm.toLowerCase().includes('liquid')) {
            frm = 'mL';
        } else if (frm.toLowerCase().includes('inject')) {
            frm = isInsulin ? 'Unit' : '';
        } else if (frm.toLowerCase().includes('capsule')) {
            frm = 'capsule';
        } else if (frm.toLowerCase().includes('powder')) {
            frm = 'g';
        } else if (frm.toLowerCase().includes('test: strip')) {
            frm = 'OP';
        } else {
            frm = '';
        }

        if (doseRange && parseFloat(doseMed) > 1 && frm) {
            frm = `${frm}s`;
        } else {
            if (parseFloat(takeMed) > 1 && frm) {
                frm = `${frm}s`;
            }
        }
        if (tk.length > 0) {
            if (!frm.toLowerCase().includes('ampoule')) {
                tk = toWordsConvert(tk)
            }
        }
        if (requiredFieldsObj.isTakeDisabled) {
            if (formSuppVal === "99") {
                sig = `${form} ${tk} into each nostril ${frq}`;
            } else {
                sig = `${form} ${tk} ${frq}`;
            }
        } else {
            if (unit == "") {
                unit = ""
            } else {
                unit = unit + '';
            }
            if (formSuppVal === "99") {
                sig = `${form} ${tk} ${unit} into each nostril ${frq}`;
            } else {
                sig = `${form} ${tk} ${unit} ${frq}`;
            }
        }
        if (isPRNMedicine) {
            sig = `${sig} when required`;
        }
        if (indicat) {
            sig = `${sig} for ${indicat}`;
        }
        // if (IsBlisterPack) {
        //     if (!sig.includes('please blister pack.')) {
        //         sig = `${sig} please blister pack.`;
        //     }
        // }
        if (maxDosePer24Hour !== "" && maxDosePer24HourUnit !== "") {
            sig = `${sig} but do not ${form} more than ${maxDosePer24Hour} ${maxDosePer24HourUnit == "Other" ? doseUnitOtherValue : maxDosePer24HourUnit} in total within 24 hours.`;
        }
        if (!isDirectionManuallyEntered && !isFreeTextDirections) {
            setDirections(sig);
            setAdminDirections(sig)
        }
    };

    const setAdditionalDirectionsFunction = (medicineStartDate, medicineEndDate) => {
        // let sig = additionalDirections || "";
        // const dateFormat = 'DD/MM/YYYY';

        // if (medicineStartDate) {
        //     const formattedStart = dayjs(medicineStartDate).format(dateFormat);
        //     if (sig.includes('Start:')) {
        //         sig = sig.replace(/Start:\s*\d{2}\/\d{2}\/\d{4}/, `Start: ${formattedStart}`);
        //     } else {
        //         sig = `${sig} Start: ${formattedStart}`.trim();
        //     }
        // }

        // if (medicineEndDate) {
        //     const formattedStop = dayjs(medicineEndDate).format(dateFormat);
        //     if (sig.includes('Stop:')) {
        //         sig = sig.replace(/Stop:\s*\d{2}\/\d{2}\/\d{4}/, `Stop: ${formattedStop}`);
        //     } else {
        //         sig = `${sig} Stop: ${formattedStop}`.trim();
        //     }
        // }
        // sig = sig.replace(/\s{2,}/g, ' ').trim();

        // setAdditionalDirections(sig);
        // setAdditionalAdminDirections(sig)
    };


    useEffect(() => {
        if (medicineStartDate !== null || medicineEndDate !== null) {
            if (!isISPRXLite) {
                setAdditionalDirectionsFunction(medicineStartDate, medicineEndDate)
            }
        }
    }, [medicineStartDate, medicineEndDate])



    useEffect(() => {
        if (isFreeTextDirections) {
            setTemporaryDirectionsFieldObject({
                directions: directions,
                frequency: frequencyMed,
                takeMed: takeMed,
                doseMed: doseMed,
                isDoseRange: doseRange,
                doseUnit: doseUnit,
                doseUnitOtherValue: doseUnitOtherValue
            })
            setDoseUnit("")
            setDirections("")
            setTakeMed("")
            setDoseMed("")
            setDoseRange(false)
            setFrequencyMed("23")
            setDoseUnitOtherValue("")
            setTempSplitDoseArrayOptions(splitDoseArrayOptions)
            setSplitDoseArrayOptions(splitDoseArrayOptions.map((record: SplitDoseOption) => {
                return {
                    ...record,
                    takeValue: "",
                    doseRangeValue: "",
                    isDoseRangeSelected: false,
                    frequencyCodeValue: "23",
                    frequencyCodeValueErrorMessage: null,
                    doseRangeValueErrorMessage: null,
                    takeValueErrorMessage: null
                }
            }))
        } else {
            setTempSplitDoseArrayOptions([])
            setSplitDoseArrayOptions(tempSplitDoseArrayOptions)
            setTemporaryDirectionsFieldObject({
                directions: "",
                frequency: "",
                takeMed: "",
                doseMed: "",
                doseUnit: "",
                isDoseRange: false,
                doseUnitOtherValue: ""
            })
            setDirections(temporaryDirectionsFieldObject.directions)
            setAdminDirections(temporaryDirectionsFieldObject.directions)
            setTakeMed(temporaryDirectionsFieldObject.takeMed)
            setDoseMed(temporaryDirectionsFieldObject.doseMed)
            setDoseRange(temporaryDirectionsFieldObject.isDoseRange)
            setFrequencyMed(temporaryDirectionsFieldObject.frequency)
            setDoseUnit(temporaryDirectionsFieldObject.doseUnit)
            setDoseUnitOtherValue(temporaryDirectionsFieldObject.doseUnitOtherValue)

        }
    }, [isFreeTextDirections])

    const setTakeLabelFunction = () => {
        let frm = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form ?? ""
        let formID = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.formID.toString()
        let isInsulin = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.isInsulin
        let unitOfMeasure = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.unitOfMeasure
        let uom = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.uom
        let octansMedsID = null
        let nzF_ID = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.nzF_ID
        let form = formID;
        let formDesc = frm

        let unit = '';

        if (formDesc.toLowerCase().includes('inhal') || formDesc.toLowerCase().includes('spray')) {
            unit = 'puff(s)';
        } else if (formDesc.toLowerCase().includes('tablet')) {
            unit = 'tablet';
        } else if (formDesc.toLowerCase().includes('patch')) {
            unit = 'patch';
        } else if (formDesc.toLowerCase().includes('suppositor')) {
            unit = 'supp(s)';
        } else if (formDesc.toLowerCase().includes('drop')) {
            unit = 'drop(s)';
        } else if (formDesc.toLowerCase().includes('cream')) {
            unit = '';
        } else if (formDesc.toLowerCase().includes('oral')) {
            unit = '';
        } else if (formDesc.toLowerCase().includes('liquid')) {
            unit = 'mL';
        } else if (formDesc.toLowerCase().includes('inject')) {
            if (isInsulin) {
                unit = 'Unit';
            } else {
                unit = '';
            }
        } else if (formDesc.toLowerCase().includes('capsule')) {
            unit = 'capsule';
        } else if (formDesc.toLowerCase().includes('lotion')) {
            unit = '';
        } else if (formDesc.toLowerCase().includes('application')) {
            unit = '';
        } else if (formDesc.toLowerCase().includes('powder')) {
            unit = 'g';
        } else if (formDesc.toLowerCase().includes('test: strip')) {
            unit = 'test strips';
        } else {
            unit = '';
        }
        var strUSEFrmIDs = "144,150,159,161,164,169,170,176,186,191,198,199,200,204,205,162,163,187,152,183,192";
        var strInsertFrmIDs = "22,23,74,132,257,258,259,31,40,324";
        if (form === '0') {
            form = "Take"
        } else if (form == "4" || form == "31" || form == "33" || form == "256" || form == "141" || form == "312" || form == "118" || form == "248" || formDesc.toLowerCase().indexOf("cream") >= 0 || formDesc.toLowerCase().indexOf("lotion") >= 0) {
            if ((form == "33") && (formDesc.toLowerCase().indexOf("patch") >= 0)) {
                form = 'Apply:';
            } else {
                if ((form == "4") || (form == "31") || (form == "118") || formDesc.toLowerCase().indexOf("lotion") >= 0) {
                    form = 'Apply:';
                    setRequiredFieldsObj({ ...requiredFieldsObj, isDoseUnitDisabled: true, isTakeDisabled: true, isTakeRequired: false })
                    unit = '';
                    setStrengthLabel('% of Strength')
                    setDoseUnit('')
                    setMaxDosePer24HourUnit('')
                }
                else {
                    setRequiredFieldsObj({ ...requiredFieldsObj, isDoseUnitDisabled: false, isTakeDisabled: false, isTakeRequired: true })
                    form = 'Apply:';
                    unit = '';
                    setStrengthLabel('% of Strength')
                    setDoseUnit('')
                    setMaxDosePer24HourUnit('')
                }
            }
        }
        else if (form == "25" || form == "16" || form == "17" || form == "30" || form == "41" || form == "42" || form == "66" || form == "72" || form == "79" || form == "80" ||
            form == "85" || form == "104" || form == "110" || form == "115" || form == "116" || form == "154" || form == "225" || form == "226" || form == "231" || form == "250" ||
            form == "251" || form == "252" || form == "147" || formDesc.toLowerCase().indexOf("drop") >= 0 ||
            form == "85" || strUSEFrmIDs.split(',').indexOf(form) > -1) {
            form = 'Use:';
        }

        else if (form == "19" ||
            form == "20" || form == "54" || form == "55" || form == "71" || form == "83" || form == "84" ||
            form == "105" || form == "108" || form == "129" || form == "130" || form == "131" ||
            form == "242" || form == "243" || form == "244" || form == "245" || form == "274" || formDesc.toLowerCase().indexOf("inject") >= 0) {
            form = 'Inject:';
        }
        else if (form == "67" || form == "81" || form == "109" || form == "119" || form == "271" || formDesc.toLowerCase().indexOf("ointment") >= 0) {

            form = 'Apply:';
            setRequiredFieldsObj({ ...requiredFieldsObj, isDoseUnitDisabled: true, isTakeDisabled: true, isTakeRequired: false })
            unit = '';
            setStrengthLabel('% of Strength')
            setDoseUnit('')
            setMaxDosePer24HourUnit('')
        }
        else if (form == "120" || form == "142") {
            // ISPRX-344 implemented
            form = 'Apply:';

        }
        else if (form == "91" || form == "121" || form == "172" || form == "201" || form == "263" || form == "264" || form == "315" || formDesc.toLowerCase().indexOf("inhal") >= 0) {
            form = 'Inhale:';
        }
        else if (form == "99") {
            form = 'Spray:';
        }


        else if (form == "35" || form == "26" || form == "49" || form == "267" || strInsertFrmIDs.split(',').indexOf(form) > -1) {
            form = "Insert";
        }

        else if (form == "10" || form == "113" || formDesc.toLowerCase().indexOf("application") > 0) {
            form = "Apply:";
            setRequiredFieldsObj({ ...requiredFieldsObj, isDoseUnitDisabled: true, isTakeDisabled: true, isTakeRequired: false })
            unit = '';
            setStrengthLabel('% of Strength')
            setDoseUnit('')
            setMaxDosePer24HourUnit('')
        }
        else {
            form = 'Take:';
        }
        if (!octansMedsID && (unitOfMeasure == null || unitOfMeasure == '') && (uom != null && uom != '')) {
            unit = uom;
        }
        else if (octansMedsID != null && octansMedsID != '') {
            unit = unitOfMeasure;
        }
        if (nzF_ID == 'nzf_6649') {
            form = 'Dissolve:';
        }
        if (props?.selectedMedicine?.isFromMDRInformationEdit == true || props?.selectedMedicine?.isAddedFromApplication == true) {
            setDoseUnit(unit)
            setMaxDosePer24HourUnit(unit)
        }
        setTakeLabel(form)
    }

    const SetDurationType: any = (isDurationType: boolean, enteredDuration: string) => {
        let str: any = '';
        let durationType = parseInt(isDurationType ? daysMed : advanceChecks.trialType);
        let duration = parseInt(enteredDuration)

        if (durationType === 1 || durationType === 0) {
            if (duration < 7) {
                if (isDurationType) {
                    setDaysMed("1");
                    setDurationMed(duration.toString());
                } else {
                    return {
                        daysMed: "1",
                        durationMed: duration.toString()
                    }
                }
            }
            else if (((duration - 5) % 30 > 25 || (duration + 4) % 30 < 5) && duration % 7 !== 0 && duration > 25) {
                str = ((duration - 5) % 30 < 5 ? Math.floor((duration - 5) / 30) : Math.ceil((duration - 5) / 30));
                if (isDurationType) {
                    setDaysMed("3");
                    setDurationMed(str.toString());
                } else {
                    return {
                        daysMed: "3",
                        durationMed: str.toString()
                    }
                }
            }
            else if (duration > 7 && duration <= 30 && duration % 7 !== 0) {
                if (isDurationType) {
                    setDaysMed("1");
                    setDurationMed(duration.toString());
                } else {
                    return {
                        daysMed: "1",
                        durationMed: duration.toString()
                    }
                }
            }
            else if (duration >= 7 && duration <= 28 && duration % 7 === 0) {
                if (isDurationType) {
                    setDaysMed("2");
                    setDurationMed((duration / 7).toString());
                } else {
                    return {
                        daysMed: "2",
                        durationMed: (duration / 7).toString()
                    }
                }
            }
            else if (duration >= 28 && duration % 7 === 0) {
                if (isDurationType) {
                    setDaysMed("2");
                    setDurationMed((duration / 7).toString());
                } else {
                    return {
                        daysMed: "2",
                        durationMed: (duration / 7).toString()
                    }
                }
            }
            else if (duration >= 28 && duration % 7 === 0 && (duration % 7) % 4 === 0) {
                if (isDurationType) {
                    setDaysMed("3");
                    setDurationMed(((duration / 7) / 4).toString());
                } else {
                    return {
                        daysMed: "3",
                        durationMed: ((duration / 7) / 4).toString()
                    }
                }
            }
            else if (duration > 0) {
                if (isDurationType) {
                    setDaysMed("1");
                    setDurationMed(duration.toString());
                } else {
                    return {
                        daysMed: "1",
                        durationMed: duration.toString()
                    }
                }
            }
        }
    }


    useEffect(() => {
        if (frequencyMed == '6') {
            setTakeMed('')
            if (doseRange) {
                setDoseMed('')
            }
            if (advanceChecks.variableDose) {
                setDirections('')
                setAdminDirections('')
            }
        }

    }, [frequencyMed, advanceChecks.variableDose])


    const ValidateFields = (isSaveButtonClicked: boolean) => {
        let errorObject: any = {}
        let isSplitDoseEnabled: boolean = permissions?.SaveSplitDose === true ? true : false

        if (isSplitDoseEnabled) {
            const updateSplitDoseArrayOptions: SplitDoseOption[] = splitDoseArrayOptions.filter((record: SplitDoseOption) => record.IsActive).map((record: SplitDoseOption) => {
                let updatedItem: SplitDoseOption = { ...record };
                if (requiredFieldsObj.isTakeRequired && record.takeValue == "" && !isFreeTextDirections) {
                    updatedItem.takeValueErrorMessage = 'Dose is required.';
                } else if (requiredFieldsObj.isTakeRequired && record.takeValue !== "" && !isFreeTextDirections && parseFloat(record.takeValue) == 0) {
                    updatedItem.takeValueErrorMessage = 'Dose cannot be zero or empty.';
                } else {
                    updatedItem.takeValueErrorMessage = null;
                }

                if (!record.frequencyCodeValue) {
                    updatedItem.frequencyCodeValueErrorMessage = "Frequncy is required."
                } else {
                    updatedItem.frequencyCodeValueErrorMessage = null;
                }

                if (requiredFieldsObj.isDoseRangeIsRequired && record.doseRangeValue == "" && record.isDoseRangeSelected) {
                    updatedItem.doseRangeValueErrorMessage = 'Dose range is required.';
                } else if (requiredFieldsObj.isDoseRangeIsRequired && record.doseRangeValue !== "" && parseFloat(record.doseRangeValue) == 0) {
                    updatedItem.doseRangeValueErrorMessage = 'Dose range cannot be zero or empty.';
                } else {
                    updatedItem.doseRangeValueErrorMessage = null;
                }

                return updatedItem
            })
            if (updateSplitDoseArrayOptions.some((item: SplitDoseOption) => item.doseRangeValueErrorMessage !== null ||
                item.frequencyCodeValueErrorMessage !== null || item.takeValueErrorMessage !== null)) {
                setSplitDoseArrayOptions([...updateSplitDoseArrayOptions])
                return
            }
        }
        if (!isSplitDoseEnabled && !takeMed && frequencyMed != "6" && requiredFieldsObj.isTakeRequired && !isFreeTextDirections) {
            errorObject["dose"] = "Dose is required."
        }
        if (((parseFloat(takeMed) > parseFloat(maxDosePer24Hour)) && isPRNMedicine && (maxDosePer24Hour !== "" && maxDosePer24Hour !== undefined && maxDosePer24Hour !== null))) {
            errorObject["dose"] = "The dose must be less than the max dose."
        }
        if (doseRange) {
            if (!doseMed && requiredFieldsObj.isDoseRangeIsRequired) {
                errorObject["doseRange"] = "Range is required."
            }
        }
        if (!isSplitDoseEnabled && doseUnit === "Other" && doseUnitOtherValue.trim() == "") {
            errorObject["doseUnitOtherValueError"] = "Other dose is required."
        }
        if (!isSplitDoseEnabled && !frequencyMed) {
            errorObject["frequency"] = "Frequncy is required."
        }
        if (parseFloat(repeats) === 0) {
            errorObject["repeatsError"] = "Repeats cannot be zero."
        }
        if (medicineStartDate == null) {
            errorObject["startDateError"] = "Start date is required."
        }
        if (medicineStartTime == null) {
            errorObject["startTimeError"] = "Start time is required."
        }
        // if (medicineEndDate == null) {
        //     errorObject["endDateError"] = "End date is required."
        // }
        if (medicineEndDate !== null && medicineEndTime == null) {
            errorObject["endTimeError"] = "End time is required."
        }
        if (directions.trim() === "" && !isFreeTextDirections) {
            errorObject["directions"] = "Directions are required."
        }
        if (!isSaveButtonClicked && !props.hideItem && selectedPharmacyID === null && !isISPRXLite) {
            errorObject["pharmacy"] = "Pharmacy is required."
        }
        if (routeMed === "") {
            errorObject["route"] = "Route is required."
        }
        if (!isSaveButtonClicked && requiredFieldsObj.isDurationRequired && !props.hideItem && !durationMed.trim()) {
            errorObject["duration"] = "Period to Supply is required."
        }
        if (!isSaveButtonClicked && requiredFieldsObj.isQuantityRequired && !props.hideItem) {
            if (!isSaveButtonClicked && !quantityMed && requiredFieldsObj.isQuantityRequired) {
                errorObject["quantity"] = "Quantity to Supply is required."
            }
        }
        if (!currnetPrescriberID && !isSaveButtonClicked) {
            errorObject["prescriber"] = "Prescriber is required."
        }
        if (advanceChecks.frequentlyDispensed && !advanceChecks.freqDispensedPeriod) {
            errorObject["freqDispensedPeriod"] = "Frequently dispensing period is required."
        }
        if (advanceChecks.initDispensingPeriod && !advanceChecks.initialDispensingPeriodVal) {
            errorObject["initDispensingPeriod"] = "Initial Dispensing period is required."
        }
        if (advanceChecks.initDispensingPeriod && advanceChecks.initialDispensingPeriodVal !== "") {
            if (((advanceChecks.trialType === daysMed) && (Number(advanceChecks.initialDispensingPeriodVal) > Number(durationMed)) && (durationMed !== null && durationMed !== undefined && durationMed !== ""))) {
                errorObject["initDispensingPeriod"] = 'Initial dispensing period should not be greater than actual duration'
            }
        }
        if (advanceChecks.initDispensingPeriod && advanceChecks.initialDispensingPeriodVal !== "") {
            if ((Number(advanceChecks.initialDispensingQuantity) > Number(quantityMed) && (quantityMed !== null && quantityMed !== undefined && quantityMed !== ""))) {
                errorObject["initialDispensingQuantity"] = 'Quantiy must be less than actual quantity'
            }
        }
        if (((allMedicationForEdit?.mdrMedicineData[0]?.SAFORMNO !== null &&
            allMedicationForEdit?.mdrMedicineData[0]?.SAFORMNO !== "" &&
            allMedicationForEdit?.mdrMedicineData[0]?.SAFORMNO !== undefined) || (props.selectedMedicine?.SAFormID || props.selectedMedicine.saFormID))) {
            // if (!SAExpiry && ((expiryDate == "" || expiryDate == null || expiryDate == undefined) && (saFormNumberMed !== "" && saFormNumberMed !== null && saFormNumberMed !== undefined))) {
            //     errorObject["SAExpiryError"] = "SA expiry is required."
            // } else {
            //     const today = dayjs().format("YYYY-MM-DD")
            //     const diffDate = dayjs(expiryDate).format("YYYY-MM-DD")
            //     const date1 = dayjs(diffDate);
            //     const date2 = dayjs(today);
            //     const diffInDays = date2.diff(date1, 'day');
            //     if (diffInDays > 0) {
            //         errorObject["SAExpiryError"] = `Expiry date cannot be earlier than today.`
            //     }
            // }
            // if (saFormNumberMed == "" || saFormNumberMed == null || saFormNumberMed == undefined) {
            //     errorObject["SANumberError"] = "SA number is required."
            // }
            // if (saStatusMed == "" || saStatusMed == null || saStatusMed == undefined) {
            //     errorObject["SAStatusError"] = "SA status is required."
            // }
            // if ((isRecomemended && (specialistName == "" || specialistName == null || specialistName == undefined))) {
            //     errorObject["SASpecialistNameError"] = "Specialist name is required."
            // }
            // if ((isRecomemended && (recommendationDate == "" || recommendationDate == null || recommendationDate == undefined))) {
            //     errorObject["SARecommendationDateError"] = "Recommendation Date is required."
            // }
        }
        if (((doseUnit == null || doseUnit == undefined || doseUnit == "") && !isFreeTextDirections && requiredFieldsObj.isDoseUnitDisabled === false)) {
            errorObject["doseunitError"] = "Dose unit is required."
        }
        if (parseFloat(takeMed) === 0) {
            errorObject["dose"] = "Dose cannot be zero"
        }
        if (doseRange) {
            if (parseFloat(doseMed) === 0) {
                errorObject["doseRange"] = "Dose cannot be zero"
            }
            if (parseFloat(doseMed) <= parseFloat(takeMed)) {
                errorObject["doseRange"] = "Dose Range must greater than Dose"
            }
        }
        if (parseFloat(durationMed) === 0 && !props.hideItem) {
            errorObject["duration"] = "Period to Supply cannot be zero."
        }
        if (parseFloat(maxDosePer24Hour) === 0) {
            errorObject["maxDose"] = "Max dose cannot be zero."
        }
        if (parseFloat(quantityMed) === 0 && !props.hideItem) {
            errorObject["quantity"] = "Quantity to Supply cannot be zero ."
        }
        if (
            (errorObject?.initDispensingPeriod !== null && errorObject?.initDispensingPeriod !== undefined) ||
            (errorObject?.initialDispensingQuantity !== null && errorObject?.initialDispensingQuantity !== undefined) ||
            (errorObject?.freqDispensedPeriod !== null && errorObject?.freqDispensedPeriod !== undefined)
        ) {
            setActiveKey(1)
        }
        setErrorMessages(errorObject)
        if (Object.keys(errorObject).length > 0)
            return
        if (slelectedMed?.saFormID && slelectedMed?.saFormID != "NoSARequired" && !proceedWithoutSA) {
            let currentDate: Dayjs = dayjs().startOf('day');
            let expiryDateVal: Dayjs | null = expiryDate !== null && expiryDate !== "" && expiryDate !== undefined ? dayjs(expiryDate).startOf('day') : null;
            if (!saFormNumberMed && !SAExpiry && !expiryDate) {
                setSaValidation(true)
                return
            }
            // else if (saFormNumberMed && expiryDate && !SAExpiry && expiryDateVal && expiryDateVal.isBefore(currentDate)) {
            //     setSaCheckExpire(true);
            //     return
            // }
            else {
                setProceedWithoutSA(true)
                return
            }
        }
        if (isRecomemended && (specialistName == "" || specialistName == null || specialistName == undefined) && !proceedWithoutRecommendation) {
            setSpecialistNameValidation(true)
            return
        }
        setErrorMessages(errorObject)
        return Object.keys(errorObject).length === 0

    }
    useEffect(() => {
        if (proceedWithoutSA) {
            if ((props.isFromMDRInformation === true
                && props.selectedMedicine
                && props?.selectedMedicine?.isFromUseExistingMedicationDrawer !== true
                && props?.selectedMedicine?.isFromUseExistingMedicationMDRDrawer !== true) || props.selectedMedicine?.isFromMDRInformationEdit) {
                if (ValidateFields(isGenerateScriptSaveButtonClicked)) {
                    let onStopdata: any = {
                        "OtherReason": 'medicine data updated',
                        "Reason": "other",
                        "StartDate": MARDateFormatforAPI(dayjs()),
                        "Comment": "medicine data updated by user",
                        "PatientID": (PatientDatail as any)?.PatientID,
                        "MedId": props.selectedMedicine?.medId,
                        "MedinineName": props.selectedMedicine?.medicineName || props.selectedMedicine?.medicineDisplayName,
                        StopOnlyInactivemed: true,
                        ActiveMedId: props?.selectedMedicine?.activeMedID
                    }
                    // dispatch(appServices.StopMedicine(onStopdata))
                    if (props.selectedMedicine?.isFromMDRInformationEdit !== true && props.selectedMedicine?.isFromMDRInformation !== true)
                        dispatch(appServices.StopMedicine(onStopdata))
                    else
                        saveMedicineFun(isGenerateScriptSaveButtonClicked)
                }
            } else {
                saveMedicineFun(isGenerateScriptSaveButtonClicked)
            }
        }
    }, [proceedWithoutSA])
    useEffect(() => {
        if (proceedWithoutRecommendation) {
            if (!props.selectedMedicine?.isFromMDRInformationEdit
                || (props.isFromMDRInformation === true &&
                    props.selectedMedicine &&
                    props?.selectedMedicine?.isFromUseExistingMedicationDrawer !== true &&
                    props?.selectedMedicine?.isFromUseExistingMedicationMDRDrawer !== true)) {
                if (ValidateFields(isGenerateScriptSaveButtonClicked)) {
                    let onStopdata: any = {
                        "OtherReason": 'medicine data updated',
                        "Reason": "other",
                        "StartDate": MARDateFormatforAPI(dayjs()),
                        "Comment": "medicine data updated by user",
                        "PatientID": (PatientDatail as any)?.PatientID,
                        "MedId": props.selectedMedicine?.medId,
                        "MedinineName": props.selectedMedicine?.medicineName || props.selectedMedicine?.medicineDisplayName,
                        StopOnlyInactivemed: true,
                        ActiveMedId: props?.selectedMedicine?.activeMedID
                    }
                    if (props.selectedMedicine?.isFromMDRInformationEdit !== true && props.selectedMedicine?.isFromMDRInformation !== true)
                        dispatch(appServices.StopMedicine(onStopdata))
                    else
                        saveMedicineFun(isGenerateScriptSaveButtonClicked)
                }
            } else {
                saveMedicineFun(isGenerateScriptSaveButtonClicked)
            }
        }
    }, [proceedWithoutRecommendation])

    // useEffect(() => {
    //     if (indicationType != null) {
    //         setIndicationTypes(indicationType.map((indication) => {
    //             return {
    //                 value: indication?.IndicationId.toString(),
    //                 label: indication?.IndicationType,
    //                 isFromFronEnd: false
    //             }
    //         }))
    //     }
    // }, [indicationType])

    // useEffect(() => {
    //     if (addToAdmin) {
    //         setAddtoAdminDrawer(true)
    //     }
    // }, [addToAdmin])

    useEffect(() => {
        if (indicationType != null) {
            const uniqueMap = new Map();

            indicationType.forEach((indication) => {
                const value = indication?.IndicationId?.toString();
                const label = indication?.IndicationType;

                // Use value or label as unique key to avoid duplicates
                if (!uniqueMap.has(value) && ![...uniqueMap.values()].includes(label)) {
                    uniqueMap.set(value, label);
                }
            });

            const array = Array.from(uniqueMap.entries()).map(([value, label]) => ({
                value,
                label,
                isFromFronEnd: false,
            }));
            setIndicationTypes(array);
            const findObj = array?.find(data => data?.label?.toLowerCase()?.trim() === PRNIndicationObject?.label?.toLowerCase()?.trim())
            setPRNIndicationObject({
                value: findObj?.value,
                label: findObj?.label,
                isFromFrontEnd: true
            });

        }
    }, [indicationType]);
    useEffect(() => {
        setIsGenerateScriptSaveButtonClicked(isGenerateScriptClickedWithoutMed)
    }, [isGenerateScriptClickedWithoutMed])

    const saveMedicineFun = async (isGenerateScript: boolean, isSaveFromAdministration: any = undefined) => {
        setIsGenerateScriptSaveButtonClicked(isGenerateScript)
        let btnArray = medicationArray?.buttonArray
        let isSplitDoseEnabled: boolean = ((((props?.selectedMedicine?.isFromMDRInformation == true && allMedicationForEdit?.mdrMedicineData?.[0]?.IsSplitDose == null) ||
            (allMedicationForEdit?.mdrMedicineData?.[0]?.IsSplitDose)) && permissions?.SaveSplitDose) ||
            (allMedicationForEdit == null && permissions?.SaveSplitDose))
        const splitDoseArrayOptionsCopy: any[] = isSplitDoseEnabled ? splitDoseArrayOptions : [1]

        dispatch(appServices.setReactivatingMedicineFrequency(frequencyMed === "41" ? "Short Term" : isPRNMedicine ? "PRN" : frequencyMed == "8" ? "Stat" : "Regular"))
        let data: any =
        {
            "GeneratePrescrption": false,
            "IsSentToNZeps": true,
            // "IsMedicineActivated": props?.selectedMedicine?.isFromReactivationMedicine === true ? true : false,
            "IsReusedFromExistingList": props?.selectedMedicine?.isFromReactivationMedicine === true ||
                props?.selectedMedicine?.isFromMDRInformationEdit === true ||
                Array.isArray(duplicatedMedicationsArrayOptions) && duplicatedMedicationsArrayOptions.length > 0 &&
                Boolean(duplicatedMedicationsArrayOptions[0]?.ActiveMedID) ? true : false,
            "MedicineTitration": [],
            "IsAdministrationRequire": addToAdmin,
            "AdministrationFrequency": frequencyMed === "41" ? 'Short Term' : isPRNMedicine ? 'PRN' : frequencyMed == "8" ? "STAT" : "Regular",
            "AdministrationStartDate": dFrom ? dayjs(dFrom).format('YYYY-MM-DD') : null,
            "AdministrationEndDates": dTo ? dayjs(dTo).format('YYYY-MM-DD') : null,
            // "Days": variableDoseArray?.map((day) => {
            //     return {
            //         DayTime: selectedDays,
            //         DoseTimes: day.doses.filter((record: any) => record.checked).map((dose) => {
            //             return {
            //                 Dose: takeMed,
            //                 Time: dose?.From
            //             }
            //         })
            //     }
            // }),
            "Days": selectedDays?.length > 0 ? selectedDays?.map((selectedDay) => {
                return {
                    DayName: selectedDay,
                    DoseTimes: (isPRNMedicine || frequencyMed === '23' || frequencyMed === '8') ? [
                        {
                            "Dose": takeMed,
                            "Time": "00:00"
                        }
                    ] :
                        variableDoseArray[0].doses
                            .filter(record => record.checked)
                            .map(dose => ({
                                Dose: takeMed,
                                Time: dose?.From
                            }))
                };
            }) : variableDoseArray?.map((day) => {
                return {
                    DayTime: null,
                    DoseTimes: (isPRNMedicine || frequencyMed === '23' || frequencyMed === '8') ? [
                        {
                            "Dose": takeMed,
                            "Time": "00:00"
                        }
                    ] : day.doses.filter((record: any) => record.checked).map((dose) => {
                        return {
                            Dose: takeMed,
                            Time: dose?.From
                        }
                    })
                }
            }),
            "ShowDue": showDue,
            "ShowOverDue": showOverDue,
            "IsForEditAndActiveMed": props.generateScriptSc ? false : props?.isFromMDRInformation === true ? true : false,
            "IsMedicationActive": props.generateScriptSc ? true : props?.isFromMDRInformation === true ? true : isAddToMedicationChart,
            // "IsReusedFromExistingList": (props?.selectedMedicine?.isFromReactivationMedicine === true || props?.selectedMedicine?.isFromUseExistingMedicationDrawer === true || props?.selectedMedicine?.isFromUseExistingMedicationMDRDrawer === true) ? true : null,
            "MedicationModels": [
                {
                    "Doses": splitDoseArrayOptionsCopy.map((record: SplitDoseOption) => {
                        const isSplit = isSplitDoseEnabled;

                        const frequencyCode = isSplit ? record.frequencyCodeValue : frequencyMed;
                        const frequencyName =
                            frequencyCode === "41"
                                ? isSplit
                                    ? "Short Term"
                                    : "Short Course"
                                : isPRNMedicine
                                    ? "PRN"
                                    : frequencyCode === "8"
                                        ? "Stat"
                                        : "Regular";

                        // const doseRange = isSplit
                        //     ? record.doseRangeValue || null
                        //     : doseMed || null;

                        const obj: any = {
                            TAKE: isSplit ? (record.takeValue || null) : (takeMed || null),
                            TAKEUNIT: doseUnit,
                            FREQUENCYCODE: frequencyCode,
                            DoseRange: isSplit ? (record.doseRangeValue || null) : (doseMed || null),
                            IsDoseRange: isSplit ? record.isDoseRangeSelected : doseRange,
                            frequencyName: frequencyName,
                            IsActive: record.IsActive,
                        };

                        if (record.SplitDoseID !== null) {
                            obj.SplitDoseID = record.SplitDoseID;
                        }

                        return obj;
                    }),
                    "PATIENTID": PatientDatail?.PatientID,
                    "ActiveMedID": allMedicationForEdit?.mdrMedicineData[0]?.ActiveMedID ? allMedicationForEdit?.mdrMedicineData[0]?.ActiveMedID : Array.isArray(duplicatedMedicationsArrayOptions) && duplicatedMedicationsArrayOptions.length > 0 ? duplicatedMedicationsArrayOptions[0]?.ActiveMedID : null,
                    "MedicineID": slelectedMed?.medicineID,
                    "SCTID": props.selectedMedicine?.ProductSCTID || props?.selectedMedicine?.sctid || props?.selectedMedicine?.SCTID,
                    // "TAKE": takeMed || null,
                    // "TAKEUNIT": doseUnit,
                    // "FREQUENCYCODE": frequencyMed,
                    "DURATION": durationMed !== "" && durationMed !== null ? durationMed : 0,
                    "DURATIONTYPE": daysMed == "" ? null : daysMed,
                    "STARTDATE": medicineInsertedDate !== null ? dayjs(medicineInsertedDate).format("YYYY-MM-DD") : "",
                    "ISSAEXPIRYLIFETIME": SAExpiry,
                    "EXPIRYDATE": expiryDate ? dayjs(expiryDate).format("YYYY-MM-DD") : null,
                    "ISGENERICSUBSTITUTION": advanceChecks.gsAllowed,
                    "INITIALDISPENSEPERIOD": advanceChecks.freqDispensedPeriod || 0, // Frequent dispensing input value
                    "INITIALDISPENSEPERIODTYPE": advanceChecks.freqDispensedType, // Frequent dispensing input type
                    "ISPRESCRIBED": btnArray?.length > 0 && btnArray[13]?.isSelected,
                    "QUANTITY": quantityMed || 0,
                    "QUANTITYUNIT": packageMed.toString(),
                    "DIRECTIONS": directions,
                    "AdditionalDirections": additionalDirections,
                    "ROUTECODE": routeMed.toString(),
                    "ReconMedID": props.selectedMedicine?.medId,
                    "SAFORMNO": ((allMedicationForEdit?.mdrMedicineData[0]?.SAFORMNO !== null &&
                        allMedicationForEdit?.mdrMedicineData[0]?.SAFORMNO !== "" &&
                        allMedicationForEdit?.mdrMedicineData[0]?.SAFORMNO !== undefined && allMedicationForEdit?.mdrMedicineData[0]?.SAFORMNO) || (props.selectedMedicine?.SAFormID || props.selectedMedicine.saFormID)),
                    "SASTATUS": saStatusMed ? saStatusMed.toString() : null,
                    // "SAAPROVALNUMBER": SaApprovalNumberMed,
                    "SAAPROVALNUMBER": saFormNumberMed,
                    "PHARMACODE": props.selectedMedicine?.Pharmacode || props.selectedMedicine?.pharmaCode || allMedicationForEdit?.mdrMedicineData[0]?.PHARMACODE,
                    "ISREPEAT": false,
                    "STRENGHTID": strengthID?.toString(),
                    "MedicineName": null,
                    "IsBlisterPack": IsBlisterPack,
                    "IsUseGenericNamelabel": advanceChecks.useGenericName,
                    "IsUnusualDoseQuantity": advanceChecks.unusualDose,
                    "IsPrivateFunded": advanceChecks.privateFunded,
                    "IsCompassionateSupply": advanceChecks.compassionateSupply,
                    "PrivatePharmacistsOnly": props.generateScriptSc ? chatToPharmacist : advanceChecks.privatePharmacistsOnly,
                    "FormName": props?.isFromMDRInformation === true ? props.selectedMedicine?.Form ? props.selectedMedicine?.Form :
                        allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.form ? allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.form : "" :
                        medicationDetailsAddEditData !== null ? medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form ? medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form :
                            props.selectedMedicine?.Form :
                            props.selectedMedicine?.Form,
                    "SAStatusID": saStatusIDMed ? saStatusIDMed : null,
                    "Recommended_IsRecommended": advanceChecks.isRecomemended,
                    "Recommended_SpecialistName": specialistName,
                    "Recommended_RecomendationDate": recommendationDate ? dayjs(recommendationDate).format("YYYY-MM-DD") : '0001-01-01',
                    "CurrentPrescriberID": currnetPrescriberID,
                    "IsLongTerm": IsLongTerm,
                    "IsFrequentlyDispensed": advanceChecks.frequentlyDispensed, // Button Frequent Dispensed
                    "IsVariableDose": advanceChecks.variableDose,
                    "IsConfidential": advanceChecks.confidential !== null ? advanceChecks.confidential : false,
                    "IsPharmacyLTCAssessment": advanceChecks.ltcAssessment,
                    "IsPatientConsent": advanceChecks.patientConsent,
                    "ISINITIALDISPENSEPERIOD": advanceChecks.initDispensingPeriod, // initial dispensing period button
                    "INITIALDISPENSEPERIODQuantity": advanceChecks.initialDispensingQuantity || 0,
                    "INITIALDISPENSEPERIODTrialPeriodReason": advanceChecks.trialPeriodReason,
                    "PharmacyID": selectedPharmacyID,
                    // "DoseRange": doseMed ? doseMed : null,
                    // "IsDoseRange": doseRange,
                    "IsTrial": advanceChecks.initDispensingPeriod, // initial dispensing period button
                    "TrialPeriod": !advanceChecks.initialDispensingPeriodVal ? 0 : advanceChecks.initialDispensingPeriodVal,
                    "TrialType": advanceChecks.trialType || 0,
                    "IsRemindMeDispense": false,
                    "RemindMeDispenseDays": null,
                    "Repeats": repeats !== "" && repeats !== null ? Number(repeats) : 0,
                    "RxNotprinted": isMedicationUpdateOnly,
                    "ControlledDrugValue": (props.selectedMedicine?.IsControlledDrug || allMedicationForEdit?.mdrMedicineData[0]?.iscontroldrug) ? 'C' : null,
                    "SuppliedBy": '',
                    "TitrationStartDate": medicineStartDate !== null && medicineStartTime !== null ? `${dayjs(medicineStartDate).format('YYYY-MM-DD')}${dayjs(medicineStartTime).format('THH:mm:ss')}` : '',
                    "TitrationEndDate": medicineEndDate !== null && medicineEndTime !== null ? `${dayjs(medicineEndDate).format('YYYY-MM-DD')}${dayjs(medicineEndTime).format('THH:mm:ss')}` : `${dayjs().add(7, "days").format('YYYY-MM-DDTHH:mm:ss')}`,
                    "DoseTime": medicineStartTime !== null ? [
                        { Time: dayjs(medicineStartTime).format('hh:mm') }
                    ] : [],
                    "IsShortTerm": frequencyMed === "41",
                    // "frequencyName": frequencyMed === "41" ? "Short Course" : isPRNMedicine ? "PRN" : frequencyMed == "8" ? "Stat" : "Regular",
                    'IndicationType': PRNIndicationObject.label !== null ? PRNIndicationObject.label : '',
                    'IndicationID': PRNIndicationObject.value !== null ? PRNIndicationObject.value : null,
                    "MedicineStartDate": medicineStartDate !== null ? `${dayjs(medicineStartDate).format('YYYY-MM-DD')}${dayjs(medicineStartTime).format('THH:mm:ss')}` : null,
                    "MedicineEndDate": medicineEndDate !== null ? `${dayjs(medicineEndDate).format('YYYY-MM-DD')}${dayjs(medicineEndTime).format('THH:mm:ss')}` : null,
                    "maxdoseperday": maxDosePer24Hour !== null && maxDosePer24Hour !== "" && maxDosePer24Hour !== undefined ? parseFloat(maxDosePer24Hour) : 0,
                    "IsPrn": isPRNMedicine,
                    "MedicinePrescribingReason": advanceChecks.prescribingReason,
                    IsOtherDose: doseUnit === "Other",
                    Otherdoseunit: doseUnitOtherValue,
                    IsFreeTextDirections: isFreeTextDirections,
                    MedicationUUID: allMedicationForEdit?.mdrMedicineData[0]?.ActiveMEd_UUID || null,
                    // ParentActiveMedID: props.selectedMedicine?.parentActiveMedID || allMedicationForEdit?.mdrMedicineData[0]?.ParentActiveMedID || null,
                    ParentActiveMedID: allMedicationForEdit?.mdrMedicineData[0]?.ActiveMedID ? allMedicationForEdit?.mdrMedicineData[0]?.ActiveMedID : Array.isArray(duplicatedMedicationsArrayOptions) && duplicatedMedicationsArrayOptions.length > 0 ? duplicatedMedicationsArrayOptions[0]?.ActiveMedID : null,
                    PatientSARecordID: patientSARecordId,
                    IsCommonSubstance: props.selectedMedicine?.isCommonSubstance == true ? true : (gotCommonSubstanceFromChartMedication?.substanceDataset || gotCommonSubstanceFromReactivationMed?.substanceDataset || gotCommonSubstanceFromMedHistory?.substanceDataset || []).length ? true : false
                }
            ]
        }
        if (ValidateFields(!isGenerateScript)) {
            if (props.generateScriptSc) {
                // if (addToAdmin && !isSaveFromAdministration) {
                //     setAddtoAdminDrawer(true)
                // }
                // else {
                //     dispatch(appServices.SaveMedicine(data))
                // }
                dispatch(appServices.SaveMedicine(data))
            } else {
                if (checkedAlreadyPrescribedMedicine == null && props?.isFromMDRInformation !== true) {
                    dispatch(appServices.SaveMedicine(data))


                } else {

                    // if (addToAdmin && !isSaveFromAdministration) {
                    //     setAddtoAdminDrawer(true)
                    // }
                    // else {
                    //     dispatch(appServices.SaveMedicine(data))
                    // }
                    dispatch(appServices.SaveMedicine(data))

                }
            }
        }

    }
    const onSubmitSAForm = async (isParked: boolean) => {
        setIsParkSARequest(isParked)
        let base64Data = btoa(unescape(encodeURIComponent(SpecialAuthorityFormSecondData?.formHTML)));
        let checkBoxArray: any = [];
        let markedCheckbox = document
            .getElementById("SAForm1")
            ?.querySelectorAll("input");
        markedCheckbox &&
            markedCheckbox.forEach((element, index) => {
                let arrrayObject = {};
                if (element.type === "checkbox") {
                    arrrayObject["Question"] = element.value;
                    arrrayObject["Answer"] = element.checked;
                    arrrayObject["ID"] = index + 1;
                    checkBoxArray.push(arrrayObject);
                } else {
                    if (element.value) {
                        arrrayObject["Question"] =
                            element?.previousElementSibling?.innerHTML;
                        arrrayObject["Answer"] = element.value;
                    } else {
                        arrrayObject["Question"] =
                            element?.previousElementSibling?.innerHTML;
                        arrrayObject["Answer"] = "";
                    }

                    arrrayObject["ID"] = index + 1;
                    checkBoxArray.push(arrrayObject);
                }
            });
        const userData: any = sessionStorage.getItem('userData')
        const parsedUserData = userData !== null ? JSON.parse(userData) : null
        const claimsData = parsedUserData !== null ? parsedUserData.claimsData : null
        const providerID: any = claimsData !== null ? claimsData.profileID : null
        let raw = {
            Questionnaire: checkBoxArray.map((item) => ({
                Question: encodeURIComponent(item?.Question),
                Answer: item?.Answer.toString(),
                ID: item?.ID?.toString(),
            })),
            MedicineID: props.selectedMedicine?.Id?.toString() || allMedicationForEdit?.mdrMedicineData[0]?.MedicineID,
            PatientID: PatientDatail?.PatientID,
            SAForm: allMedicationForEdit?.mdrMedicineData[0]?.SAFORMNO || props.selectedMedicine?.SAFormID || props.selectedMedicine.saFormID,

            AppointmentID: "nsqy815j8lLMJzUR1YTxE4Uz1AyN8PdHxCxY6E59zlA=",
            SCTID: props.selectedMedicine?.ProductSCTID || props?.selectedMedicine?.sctid || props?.selectedMedicine?.SCTID,
            MedicineName: props?.selectedMedicine?.MedicineName || props?.selectedMedicine?.medicineName || allMedicationForEdit?.mdrMedicineData[0]?.MedicineDisplayName,
            PatientSARecordID: SpecialAuthorityFormSecondData?.patientSARecordID || "0",
            ProviderID: providerID,
            IsParked: isParked,
            FormHTML: base64Data,
            PatientName: PatientDatail?.FullName,
            NHI: PatientDatail?.NHI,
            DOB: PatientDatail?.DateOfBirth,
        };
        dispatch(appServices.SARequestandResponseSecond(raw));
    };
    useEffect(() => {

        if (allMedicationForEdit && allMedicationForEdit?.mdrMedicineData && allMedicationForEdit?.mdrMedicineData.length && !isFromHistoryPageAddToChart) {
            const splitDossesArray: any[] = (allMedicationForEdit?.mdrMedicineData[0]?.SplitDoses !== null && allMedicationForEdit?.mdrMedicineData[0]?.SplitDoses !== undefined && allMedicationForEdit?.mdrMedicineData[0]?.SplitDoses !== "") ?
                JSON.parse(allMedicationForEdit?.mdrMedicineData[0].SplitDoses) :
                []

            if (props?.selectedMedicine?.isFromMDRInformation !== true) {
                setSplitDoseArrayOptions(
                    [{
                        Dose: allMedicationForEdit?.mdrMedicineData[0]?.TAKE != 0 ? allMedicationForEdit?.mdrMedicineData[0]?.TAKE : '',
                        FrequencyID: allMedicationForEdit?.mdrMedicineData[0]?.FREQUENCYCODE?.toString(),
                        IsDoseRange: allMedicationForEdit?.mdrMedicineData[0]?.IsDoseRange !== undefined &&
                            allMedicationForEdit?.mdrMedicineData[0]?.IsDoseRange !== "" &&
                            allMedicationForEdit?.mdrMedicineData[0]?.IsDoseRange !== null ?
                            allMedicationForEdit?.mdrMedicineData[0]?.IsDoseRange : false,
                        MaxDose: allMedicationForEdit?.mdrMedicineData[0]?.DoseRange !== undefined &&
                            allMedicationForEdit?.mdrMedicineData[0]?.DoseRange !== "" &&
                            allMedicationForEdit?.mdrMedicineData[0]?.DoseRange != 0 &&
                            allMedicationForEdit?.mdrMedicineData[0]?.DoseRange !== null ?
                            allMedicationForEdit?.mdrMedicineData[0]?.DoseRange.toString() : '',
                        SplitDoseID: null

                    }, ...splitDossesArray].map((record: any,) => {
                        return {
                            rowKey: Math.floor(Math.random() * 100000),
                            takeValue: record.Dose,
                            doseUnitValue: "",
                            frequencyCodeValue: record?.FrequencyID?.toString(),
                            doseRangeValue: record.MaxDose,
                            isDoseRangeSelected: record.IsDoseRange,
                            frequencyName: "",
                            doseUnitOtherValue: "",
                            IsActive: true,
                            SplitDoseID: record.SplitDoseID,
                            doseRangeValueErrorMessage: null,
                            frequencyCodeValueErrorMessage: null,
                            takeValueErrorMessage: null
                        }
                    }))
            }
            setIsBlisterPack(allMedicationForEdit?.mdrMedicineData[0].IsBlisterPack)
            setIsLongTerm(allMedicationForEdit?.mdrMedicineData[0].IsLongTerm)
            setchatToPharmacist(allMedicationForEdit?.mdrMedicineData[0].PrivatePharmacistsOnly)
            let form = allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.form
            let formID = allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.formID.toString()
            let IsInsuline = allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.isInsulin
            setSelectedMed(allMedicationForEdit?.lookups[0]?.lstPatientMedication[0])
            // const label = autoSelectTakeLabel(form, formID)
            // setTakeLabel(label)
            // setPRNIndicationObject(allMedicationForEdit?.mdrMedicineData[0]?.IndicationType)
            setIsFreeTextDirections(allMedicationForEdit?.mdrMedicineData[0]?.IsFreeTextDirections !== null &&
                allMedicationForEdit?.mdrMedicineData[0]?.IsFreeTextDirections !== "" &&
                allMedicationForEdit?.mdrMedicineData[0]?.IsFreeTextDirections !== undefined ?
                allMedicationForEdit?.mdrMedicineData[0]?.IsFreeTextDirections : false
            )
            setMedicineStartDate(allMedicationForEdit?.mdrMedicineData[0]?.MedStartDateTime !== null &&
                allMedicationForEdit?.mdrMedicineData[0]?.MedStartDateTime !== "" &&
                props?.selectedMedicine?.isFromReactivationMedicine !== true &&
                allMedicationForEdit?.mdrMedicineData[0]?.MedStartDateTime !== undefined ?
                dayjs(allMedicationForEdit?.mdrMedicineData[0]?.MedStartDateTime) : dayjs())
            // setdateFrom(allMedicationForEdit?.mdrMedicineData[0]?.MedStartDateTime !== null &&
            //     allMedicationForEdit?.mdrMedicineData[0]?.MedStartDateTime !== "" &&
            //     props?.selectedMedicine.isFromReactivationMedicine !== true &&
            //     allMedicationForEdit?.mdrMedicineData[0]?.MedStartDateTime !== undefined ?
            //     dayjs(allMedicationForEdit?.mdrMedicineData[0]?.MedStartDateTime) : dayjs())
            setMedicineStartTime(allMedicationForEdit?.mdrMedicineData[0]?.MedStartDateTime !== null &&
                allMedicationForEdit?.mdrMedicineData[0]?.MedStartDateTime !== "" &&
                props?.selectedMedicine.isFromReactivationMedicine !== true &&
                allMedicationForEdit?.mdrMedicineData[0]?.MedStartDateTime !== undefined ?
                dayjs(new Date(allMedicationForEdit?.mdrMedicineData[0]?.MedStartDateTime)) : dayjs())
            setMedicineEndDate(allMedicationForEdit?.mdrMedicineData[0]?.MedEndDateTime !== null &&
                allMedicationForEdit?.mdrMedicineData[0]?.MedEndDateTime !== "" &&
                props?.selectedMedicine.isFromReactivationMedicine !== true &&
                allMedicationForEdit?.mdrMedicineData[0]?.MedEndDateTime !== undefined ?
                dayjs(allMedicationForEdit?.mdrMedicineData[0]?.MedEndDateTime) : null)
            setMedicineEndTime(allMedicationForEdit?.mdrMedicineData[0]?.MedEndDateTime !== null &&
                allMedicationForEdit?.mdrMedicineData[0]?.MedEndDateTime !== "" &&
                props?.selectedMedicine.isFromReactivationMedicine !== true &&
                allMedicationForEdit?.mdrMedicineData[0]?.MedEndDateTime !== undefined ?
                dayjs(new Date(allMedicationForEdit?.mdrMedicineData[0]?.MedEndDateTime)) : null)
            setQuantityMed(allMedicationForEdit?.mdrMedicineData[0]?.QUANTITY != 0 ? allMedicationForEdit?.mdrMedicineData[0]?.QUANTITY : '')
            if (props?.selectedMedicine?.isFromMDRInformation !== true ||
                props?.selectedMedicine?.isAddedFromApplication == true ||
                allMedicationForEdit?.mdrMedicineData[0]?.IsAddedFromVTLRxSystem == true
            ) {
                setPRNIndicationObject({
                    value: allMedicationForEdit?.mdrMedicineData[0]?.IndicationID,
                    label: allMedicationForEdit?.mdrMedicineData[0]?.IndicationType,
                    isFromFrontEnd: false
                })
                setDirections(isFromHistoryPageAddToChart ? "" : allMedicationForEdit?.mdrMedicineData[0]?.DIRECTIONS)
                setAdditionalDirections(
                    allMedicationForEdit?.mdrMedicineData[0]?.MedEndDateTime !== null &&
                        allMedicationForEdit?.mdrMedicineData[0]?.MedEndDateTime !== "" &&
                        props?.selectedMedicine.isFromReactivationMedicine !== true &&
                        allMedicationForEdit?.mdrMedicineData[0]?.MedEndDateTime !== undefined ?
                        (allMedicationForEdit?.mdrMedicineData[0]?.AdditionalDirections || "").replace(/Stop:\s*\d{2}\/\d{2}\/\d{4}/, ``) :
                        allMedicationForEdit?.mdrMedicineData[0]?.AdditionalDirections
                )
                setAdminDirections(isFromHistoryPageAddToChart ? "" : allMedicationForEdit?.mdrMedicineData[0]?.DIRECTIONS)
                setAdditionalAdminDirections(allMedicationForEdit?.mdrMedicineData[0]?.AdditionalDirection)
                setTakeMed(allMedicationForEdit?.mdrMedicineData[0]?.TAKE != 0 ? allMedicationForEdit?.mdrMedicineData[0]?.TAKE : '')
                setDoseMed(allMedicationForEdit?.mdrMedicineData[0]?.DoseRange !== undefined &&
                    allMedicationForEdit?.mdrMedicineData[0]?.DoseRange !== "" &&
                    allMedicationForEdit?.mdrMedicineData[0]?.DoseRange != 0 &&
                    allMedicationForEdit?.mdrMedicineData[0]?.DoseRange !== null ?
                    allMedicationForEdit?.mdrMedicineData[0]?.DoseRange.toString() : ''
                )
                setMaxDosePer24Hour(allMedicationForEdit?.mdrMedicineData[0]?.maxdose !== undefined &&
                    allMedicationForEdit?.mdrMedicineData[0]?.maxdose !== "" &&
                    allMedicationForEdit?.mdrMedicineData[0]?.maxdose != 0 &&
                    allMedicationForEdit?.mdrMedicineData[0]?.maxdose !== null ?
                    allMedicationForEdit?.mdrMedicineData[0]?.maxdose.toString() : ''
                )
                setisPRNMedicine(allMedicationForEdit?.mdrMedicineData[0]?.ISPrn !== undefined &&
                    allMedicationForEdit?.mdrMedicineData[0]?.ISPrn !== "" &&
                    allMedicationForEdit?.mdrMedicineData[0]?.ISPrn !== null ?
                    allMedicationForEdit?.mdrMedicineData[0]?.ISPrn : false
                )
                setIsLongTermMedication(allMedicationForEdit?.mdrMedicineData[0]?.IsShortTerm !== undefined &&
                    allMedicationForEdit?.mdrMedicineData[0]?.IsShortTerm !== "" &&
                    allMedicationForEdit?.mdrMedicineData[0]?.IsShortTerm !== null ?
                    !allMedicationForEdit?.mdrMedicineData[0]?.IsShortTerm : true
                )
                setDoseRange(allMedicationForEdit?.mdrMedicineData[0]?.IsDoseRange !== undefined &&
                    allMedicationForEdit?.mdrMedicineData[0]?.IsDoseRange !== "" &&
                    allMedicationForEdit?.mdrMedicineData[0]?.IsDoseRange !== null ?
                    allMedicationForEdit?.mdrMedicineData[0]?.IsDoseRange : false
                )
                setRouteMed(allMedicationForEdit?.mdrMedicineData[0]?.ChangedRouteID !== null &&
                    allMedicationForEdit?.mdrMedicineData[0]?.ChangedRouteID !== undefined ? allMedicationForEdit?.mdrMedicineData[0]?.ChangedRouteID.toString() : "")
                setRouteMedText(allMedicationForEdit?.mdrMedicineData[0]?.ChangedRoute)
                setFrequencyMed(allMedicationForEdit?.mdrMedicineData[0]?.FREQUENCYCODE?.toString())

            }
            setDurationMed(allMedicationForEdit?.mdrMedicineData[0]?.DURATION != 0 ? allMedicationForEdit?.mdrMedicineData[0]?.DURATION : "")
            setDaysMed(allMedicationForEdit?.mdrMedicineData[0]?.DURATIONTYPE !== null ? allMedicationForEdit?.mdrMedicineData[0]?.DURATIONTYPE?.toString() : "1")
            if (allMedicationForEdit?.mdrMedicineData[0]?.ChangedRouteID === "0" || allMedicationForEdit?.mdrMedicineData[0]?.ChangedRouteID === null || allMedicationForEdit?.mdrMedicineData[0]?.ChangedRouteID === "") {
                if (allMedicationForEdit?.lookups[0]?.lstMedicineRoute.length && props?.selectedMedicine?.isFromMDRInformation != true) {
                    setRouteMed(allMedicationForEdit?.lookups[0]?.lstMedicineRoute[0]?.value.toString())
                    setRouteMedText(allMedicationForEdit?.lookups[0]?.lstMedicineRoute[0]?.text)
                }
            } else {
                if (props?.selectedMedicine?.isFromMDRInformation != true) {
                    setRouteMed(allMedicationForEdit?.mdrMedicineData[0]?.ChangedRouteID.toString())
                    setRouteMedText(allMedicationForEdit?.mdrMedicineData[0]?.ChangedRoute)
                }
            }
            setAdvanceChecks({
                ...advanceChecks,
                privatePharmacistsOnly: allMedicationForEdit?.mdrMedicineData[0].PrivatePharmacistsOnly,
                prescribingReason: allMedicationForEdit?.mdrMedicineData[0].PrescribingReason,

                // prescribingReason: '',
                gsAllowed: true,
                frequentlyDispensed: allMedicationForEdit?.mdrMedicineData[0]?.IsFrequentlyDispensed,
                useGenericName: allMedicationForEdit?.mdrMedicineData[0]?.IsUseGenericNamelabel,
                privateFunded: allMedicationForEdit?.mdrMedicineData[0]?.IsPrivateFunded,
                unusualDose: allMedicationForEdit?.mdrMedicineData[0]?.IsUnusualDoseQuantity,
                variableDose: allMedicationForEdit?.mdrMedicineData[0]?.IsVariableDose,
                initDispensingPeriod: allMedicationForEdit?.mdrMedicineData[0]?.ISINITIALDISPENSEPERIOD,
                confidential: allMedicationForEdit?.mdrMedicineData[0]?.IsConfidential,
                ltcAssessment: allMedicationForEdit?.mdrMedicineData[0]?.IsPharmacyLTCAssessment,
                patientConsent: allMedicationForEdit?.mdrMedicineData[0]?.IsPatientConsent,
                compassionateSupply: allMedicationForEdit?.mdrMedicineData[0]?.IsCompassionateSupply,
                prescribedExternally: allMedicationForEdit?.mdrMedicineData[0]?.ISPRESCRIBED,
                // isRecomemended: false,
                initialDispensingPeriodVal: allMedicationForEdit?.mdrMedicineData[0]?.TrialPeriodValue != 0 ? allMedicationForEdit?.mdrMedicineData[0]?.TrialPeriodValue : null,
                // trialType: '1',
                initialDispensingQuantity: allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIODQuantity != 0 ? allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIODQuantity : null,
                trialPeriodReason: allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIODTrialPeriodReason,
                freqDispensedPeriod: allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIOD != 0 ? allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIOD : null,
                freqDispensedType: allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIOD !== null &&
                    allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIOD !== undefined &&
                    allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIOD !== "" ? allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIODTYPE.toString() : '1'
            })

            setSAFormNumberMed(allMedicationForEdit?.mdrMedicineData[0]?.SAAPROVALNUMBER)
            setSAStatusMed(
                allMedicationForEdit?.mdrMedicineData[0]?.SAStatusID !== null &&
                    allMedicationForEdit?.mdrMedicineData[0]?.SAStatusID !== "" &&
                    allMedicationForEdit?.mdrMedicineData[0]?.SAStatusID !== undefined ?
                    allMedicationForEdit?.mdrMedicineData[0]?.SAStatusID.toString() : ""
            )
            setSaStatusIDMed(allMedicationForEdit?.mdrMedicineData[0]?.SAStatusID)
            setSpecialistName(allMedicationForEdit?.mdrMedicineData[0]?.RecommendedbyProviderID)
            setSAExpiry(allMedicationForEdit?.mdrMedicineData[0]?.ISSAEXPIRYLIFETIME)
            setRecommendationDate(
                allMedicationForEdit?.mdrMedicineData[0]?.Recommended_RecomendationDate !== null &&
                    allMedicationForEdit?.mdrMedicineData[0]?.Recommended_RecomendationDate !== "" &&
                    allMedicationForEdit?.mdrMedicineData[0]?.Recommended_RecomendationDate !== undefined ?
                    dayjs(allMedicationForEdit?.mdrMedicineData[0]?.Recommended_RecomendationDate) : null
            )
            if (allMedicationForEdit?.mdrMedicineData[0]?.ISSAEXPIRYLIFETIME === false) {
                setExpiryDate(
                    allMedicationForEdit?.mdrMedicineData[0]?.SAExpriry !== null &&
                        allMedicationForEdit?.mdrMedicineData[0]?.SAExpriry !== "" &&
                        allMedicationForEdit?.mdrMedicineData[0]?.SAExpriry !== undefined ?
                        dayjs(allMedicationForEdit?.mdrMedicineData[0]?.SAExpriry) : ""
                )
                setSAExpiry(false)
            } else if (allMedicationForEdit?.mdrMedicineData[0]?.ISSAEXPIRYLIFETIME === true) {
                setSAExpiry(allMedicationForEdit?.mdrMedicineData[0]?.ISSAEXPIRYLIFETIME)
                setExpiryDate('')
                setIsExpired(false)
            }
            const medication = allMedicationForEdit?.mdrMedicineData[0];

            const expiryDateRaw = medication?.SAExpriry;
            const isSAExpiryLifeTime = medication?.ISSAEXPIRYLIFETIME;
            const patientSAFormRecordID = medication?.patientSARecordID
            const SANumber = medication?.SAAPROVALNUMBER
            const SAExpiryDate = expiryDateRaw
                ? dayjs(expiryDateRaw).format("YYYY-MM-DD")
                : null;

            const todayDate = dayjs().format("YYYY-MM-DD");
            const isBefore = SAExpiryDate
                ? dayjs(SAExpiryDate).isBefore(dayjs(todayDate))
                : false;

            if ((SANumber !== null && SANumber !== undefined && SANumber !== "") && (isSAExpiryLifeTime)) {
                setIsRenewButtonShown(false)
            } else if ((SANumber !== null && SANumber !== undefined && SANumber !== "") && (!isSAExpiryLifeTime) && (!isBefore)) {
                setIsRenewButtonShown(false)
            }
            if ((expiryDateRaw === null || expiryDateRaw === undefined || expiryDateRaw === "") && (isSAExpiryLifeTime === null || isSAExpiryLifeTime === false || isSAExpiryLifeTime === undefined || isSAExpiryLifeTime === "")) {
                setIsSARenewButton(false)
            }

            setPatientSARecordId(patientSAFormRecordID !== null && patientSAFormRecordID !== undefined && patientSAFormRecordID !== "" ?
                patientSAFormRecordID : null
            )

            setIsExpired(allMedicationForEdit?.mdrMedicineData[0]?.IsSAExpired !== null &&
                allMedicationForEdit?.mdrMedicineData[0]?.IsSAExpired !== "" &&
                allMedicationForEdit?.mdrMedicineData[0]?.IsSAExpired !== undefined ? allMedicationForEdit?.mdrMedicineData[0]?.IsSAExpired : false);
            setSaApprovalNumberMed(allMedicationForEdit?.mdrMedicineData[0]?.SAAPROVALNUMBER)
            // setStrengthIDMed(allMedicationForEdit?.mdrMedicineData[0]?.STRENGHTID)
            setReapets(allMedicationForEdit?.mdrMedicineData[0]?.ISREPEAT != 0 ? allMedicationForEdit?.mdrMedicineData[0]?.ISREPEAT : '')
            const unit = autoSelectDoseUnit(form, IsInsuline)
            if (props?.selectedMedicine?.isFromMDRInformationEdit == true || props?.selectedMedicine?.isFromMDRInformation == true || props.generateScriptSc == true) {

                if (props?.selectedMedicine?.isFromMDRInformation !== true || props?.selectedMedicine?.isAddedFromApplication == true) {
                    setDoseUnit(allMedicationForEdit?.mdrMedicineData[0]?.doseunit)
                    setDoseUnitOtherValue(allMedicationForEdit?.mdrMedicineData[0]?.doseunit === "Other" ?
                        allMedicationForEdit?.mdrMedicineData[0]?.OtherDoseUnit !== null &&
                            allMedicationForEdit?.mdrMedicineData[0]?.OtherDoseUnit !== "" &&
                            allMedicationForEdit?.mdrMedicineData[0]?.OtherDoseUnit !== undefined ?
                            allMedicationForEdit?.mdrMedicineData[0]?.OtherDoseUnit : ""
                        : "")
                    setMaxDosePer24HourUnit(allMedicationForEdit?.mdrMedicineData[0]?.doseunit)
                }
            } else {
                setDoseUnit(unit)
                setMaxDosePer24HourUnit(unit)
            }
            let packMed = autoChoosePackageType(form)
            if (props.selectedMedicine?.isFromMDRInformationEdit == true) {
                setPackageMed(allMedicationForEdit?.mdrMedicineData[0]?.QUANTITYUNIT)
            }
            else
                setPackageMed(packMed)
            setPrescribeThroughEdit(true)
            const units: any[] = allMedicationForEdit?.lookups[0]?.lstMedicineUnitOfMeasure || [];

            const tempDoseUnitArrayOptions: any[] = [...units.filter((record: any) => record.uom !== "Other").map((item, index) => {
                return {
                    value: item?.uom,
                    label: item?.uom
                };
            })]
            if (!tempDoseUnitArrayOptions.some((record: any) => record.value === unit) && unit !== null && unit !== undefined && unit !== "") {
                tempDoseUnitArrayOptions.push({
                    value: unit,
                    label: unit
                });
            }
            const unitsArray: any[] = [
                ...tempDoseUnitArrayOptions,
                { value: "Other", label: "Other" }
            ];

            const reorderedUnits = unit !== null && unit !== undefined && unit !== "" ? [
                ...unitsArray.filter(u => u.label.toLowerCase().includes(unit.toLowerCase())),
                ...unitsArray.filter(u => !u.label.toLowerCase().includes(unit.toLowerCase()))
            ] : unitsArray;

            setDoseUnitOption(reorderedUnits);
            // setIsMedicationUpdateOnly(allMedicationForEdit?.mdrMedicineData[0]?.)
            // medicationArray?.packageArray && medicationArray?.packageArray.length ? medicationArray?.packageArray.find(pack => pack.value === packageMed).label : "",
            // setPackageMed('0')

            // setDaysMed('1')

            // if (firsTime) {
            //     setDirections(allMedicationForEdit?.mdrMedicineData[0]?.DIRECTIONS)

            //     setFirsTime(false)
            // }
        }
        if (allMedicationForEdit && allMedicationForEdit?.lookups && allMedicationForEdit?.lookups.length && !isFromHistoryPageAddToChart) {

            const frequencyList = allMedicationForEdit?.lookups[0]?.lstMedicineFrequency || []

            const filteredList = isISPRXLite
                ? frequencyList.filter((item: any) => !item.text.includes("short"))
                : frequencyList;

            const freqData = filteredList.map(freq => ({
                "value": freq?.value,
                "label": freq?.text
            }))

            const routeData = (allMedicationForEdit?.lookups[0]?.lstMedicineRoute || []).map(route => ({
                "value": route?.value.toString(),
                "label": route?.text
            }))
            const providerListData = (allMedicationForEdit?.lookups[0]?.lstProviderList || []).map(provider => ({
                "value": provider?.providerID,
                "label": provider?.fullName
            }))
            const packsize = (allMedicationForEdit?.lookups[0]?.lstMedicinePackages || []).map(Package => ({
                "value": Package?.medicinePackSizeID,
                "label": Package?.packSize,
                "subsidized": Package?.subsidized
            }))
            const saStatus = (allMedicationForEdit?.lookups[0]?.lstMedicineSAStatus || []).map(Status => ({
                "value": Status?.saStatusID.toString(),
                "label": Status?.text
            }))

            let packageextraunit = autoChoosePackageType(allMedicationForEdit?.mdrMedicineData[0]?.FormName)
            let newPack = [{ value: "0", label: packageextraunit }, ...packsize]
            // setSaDetail(medicationDetailsAddEditData)
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            let freq = freqData.sort(function (a, b) { Number(a.value) - Number(b.value) })
            let form = medicationDetailsAddEditData !== null ? medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form : ""
            setMedicationArray({
                ...medicationArray,
                frequencyArray: freq,
                routeArray: routeData,
                providerListArray: providerListData,
                packageArray: packageextraunit
                    ? [
                        ...newPack,
                        { value: "-1", label: "Dose(s)" },
                        ...(form.toLowerCase().indexOf("cream") >= 0 ? [{ value: "0", label: "Grams" }] : []),
                        ...(form.toLowerCase().indexOf("inject") >= 0 ? [{ value: "0", label: "1 syringe" }] : [])

                    ]
                    : [
                        ...packsize,
                        { value: "-1", label: "Dose(s)" },
                        ...(form.toLowerCase().indexOf("cream") >= 0 ? [{ value: "0", label: "Grams" }] : []),
                        ...(form.toLowerCase().indexOf("inject") >= 0 ? [{ value: "0", label: "1 syringe" }] : [])

                    ],
                saStatusArray: saStatus

            })
            setIsRescommended(
                allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.isRecomRequired !== null &&
                    allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.isRecomRequired !== "" &&
                    allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.isRecomRequired !== undefined ?
                    allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.isRecomRequired : false
            )
            setStrengthIDMed(allMedicationForEdit?.lookups[0]?.lstPatientMedication[0]?.strength?.toString())
            // setIsBlisterPack(allMedicationForEdit?.lookups[0]?.lstPatientMedication[0].isBlisterPack)
            // setIsLongTerm(allMedicationForEdit?.lookups[0]?.lstPatientMedication[0].isLongTerm)
            setSaveAdminData(subscriptionPlans.hasOwnProperty("Administration") ? allMedicationForEdit?.mdrMedicineData[0]?.HasAdministration : false)
            setAddtoAdmin(subscriptionPlans.hasOwnProperty("Administration") ? allMedicationForEdit?.mdrMedicineData[0]?.HasAdministration : false)
            setShowDue(allMedicationForEdit?.mdrMedicineData[0]?.AdministrationShowDueInMinutes)
            setShowOverDue(allMedicationForEdit?.mdrMedicineData[0]?.AdministrationShowOverDueAfterMinutes)
            const start = allMedicationForEdit?.mdrMedicineData[0]?.AdministrationStartDate;
            const end = allMedicationForEdit?.mdrMedicineData[0]?.AdministrationEndDate;
            if (start && end) {
                setdateFrom(dayjs(start));
                setdateTo(dayjs(end))
            }
            const timeString = allMedicationForEdit?.mdrMedicineData[0]?.AdministrationTimes;
            // handleFrequencyChange(allMedicationForEdit?.mdrMedicineData[0]?.FREQUENCYCODE?.toString())
            // if (timeString) {
            //     const selectedTimes = timeString.split(',').map(t => t.trim());
            //     const updatedArray = variableDoseArray?.map((item: any) => ({
            //         ...item,
            //         doses: item.doses.map((dose: any) => ({
            //             ...dose,
            //             checked: selectedTimes.includes(dose.From),
            //         }))
            //     }));
            //     setvariableDoseArray(updatedArray);
            // }

            if (timeString) {
                const selectedTimes = timeString.split(',').map(t => t.trim());

                const updatedArray = variableDoseArray?.map((item: any) => ({
                    ...item,
                    doses: item.doses.map((dose: any) => {
                        const isChecked = selectedTimes.includes(dose.From);
                        return {
                            ...dose,
                            checked: isChecked,
                            isDisabled: !isChecked
                        };
                    })
                }));

                setvariableDoseArray(updatedArray);
            }


            if (props.generateScriptSc) {
                setchatToPharmacist(allMedicationForEdit?.mdrMedicineData[0]?.PrivatePharmacistsOnly)
            }
            if (allMedicationForEdit?.mdrMedicineData.length && allMedicationForEdit?.mdrMedicineData !== null) {
                if (allMedicationForEdit?.mdrMedicineData[0]?.IsVariableDose === true) {
                    onHandeVariableDoseClicked()
                }
                setReapets(allMedicationForEdit?.mdrMedicineData[0]?.ISREPEAT != 0 ? allMedicationForEdit?.mdrMedicineData[0]?.ISREPEAT : '')
                setAdvanceChecks({
                    ...advanceChecks,
                    privatePharmacistsOnly: allMedicationForEdit?.mdrMedicineData[0].PrivatePharmacistsOnly,
                    prescribingReason: allMedicationForEdit?.mdrMedicineData[0].PrescribingReason,

                    // prescribingReason: '',
                    gsAllowed: true,
                    frequentlyDispensed: allMedicationForEdit?.mdrMedicineData[0]?.IsFrequentlyDispensed,
                    useGenericName: allMedicationForEdit?.mdrMedicineData[0]?.IsUseGenericNamelabel,
                    privateFunded: allMedicationForEdit?.mdrMedicineData[0]?.IsPrivateFunded,
                    unusualDose: allMedicationForEdit?.mdrMedicineData[0]?.IsUnusualDoseQuantity,
                    variableDose: allMedicationForEdit?.mdrMedicineData[0]?.IsVariableDose,
                    initDispensingPeriod: allMedicationForEdit?.mdrMedicineData[0]?.ISINITIALDISPENSEPERIOD,
                    confidential: allMedicationForEdit?.mdrMedicineData[0]?.IsConfidential,
                    ltcAssessment: allMedicationForEdit?.mdrMedicineData[0]?.IsPharmacyLTCAssessment,
                    patientConsent: allMedicationForEdit?.mdrMedicineData[0]?.IsPatientConsent,
                    compassionateSupply: allMedicationForEdit?.mdrMedicineData[0]?.IsCompassionateSupply,
                    prescribedExternally: allMedicationForEdit?.mdrMedicineData[0]?.ISPRESCRIBED,
                    // isRecomemended: false,
                    initialDispensingPeriodVal: allMedicationForEdit?.mdrMedicineData[0]?.TrialPeriodValue != 0 ? allMedicationForEdit?.mdrMedicineData[0]?.TrialPeriodValue : null,
                    // trialType: '1',
                    initialDispensingQuantity: allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIODQuantity != 0 ? allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIODQuantity : null,
                    trialPeriodReason: allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIODTrialPeriodReason,
                    freqDispensedPeriod: allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIOD != 0 ? allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIOD : null,
                    freqDispensedType: allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIODTYPE !== null &&
                        allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIODTYPE !== undefined &&
                        allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIODTYPE !== "" ? allMedicationForEdit?.mdrMedicineData[0]?.INITIALDISPENSEPERIODTYPE.toString() : '1'

                })
            }
            // if (firsTime) {
            //     setDirections(allMedicationForEdit?.mdrMedicineData[0]?.DIRECTIONS)

            //     setFirsTime(false)
            // }
        }


    }, [allMedicationForEdit && allMedicationForEdit?.mdrMedicineData])

    useEffect(() => {
        return () => {
            dispatch(appServices?.clearMedicationDetailsAddEdit(null))
            dispatch(appServices.gettingAllMedicationForEditClear(null))
        }
    }, [])

    const ValidateFieldsFun = () => {
        let errorObject: any = {}
        // if( !takeMed || doseRange && !doseMed || !frequencyMed || !durationMed || isQuantiyRequired && !quantityMed || !currnetPrescriberID  )

        if (selectedItem === "1" && !emailsIDs.PharmacyEmail) {
            errorObject["pharEmail"] = "Pharmacy email is required"
        }
        if (selectedItem === "2" && !emailsIDs.PatientEmail) {
            errorObject["patEmail"] = "Patient email is required"
        }
        if (selectedItem === "1" && !textAreaText.mailSubject) {
            errorObject["subject"] = "Subject is required"
        }
        if (selectedItem === "1" && !patientPharmacyID) {
            errorObject["pharmacyname"] = "Pharmacy name is required"
        }
        setErrorMessages(errorObject)
        return Object.keys(errorObject).length === 0
    }


    useEffect(() => {
        if (allPharmacies != null && patientPharmacyID) {
            const foundPharmacy = allPharmacies.find(pharm => pharm.pharmacyID === patientPharmacyID);

            if (foundPharmacy) {
                setPharmacyName(`${foundPharmacy.name} (${foundPharmacy?.address})`);
            }
        }
    }, [allPharmacies, patientPharmacyID]);
    useEffect(() => {
        if (props.selectedMedicine) {
            dispatch(appServices.setPayloadForSaveAndGenerateScript({
                SCTID: props?.selectedMedicine?.ProductSCTID || props?.selectedMedicine?.sctid,
                MedicineID: props?.selectedMedicine?.Id || props?.selectedMedicine?.MedicineID,
            }))
        }
    }, [props?.selectedMedicine])

    useEffect(() => {
        if (saveMedicine) {
            if (saveMedicine?.status === 'SUCCESS') {
                dispatch(appServices.checkingAlreadyprescribeMedicineVTwoClear(""))
                dispatch(appServices.gettingCommonSubstanceClear(""))
                dispatch(appServices.gettingAssociatedMedicineTypeClear(""))
                dispatch(appServices.setDuplicatedMedicationsArrayOptions([]));
                dispatch(appServices.setIsGenerateScriptClickedWithoutMed(false))
                setIsAddToChartClicked(false)
                setIsAddToChartAndGenerateScriptClicked(false)
                if (isGenerateScriptSaveButtonClicked) {
                    dispatch(appServices.setPayloadForSaveAndGenerateScript({
                        SCTID: props?.selectedMedicine?.ProductSCTID || props?.selectedMedicine?.sctid,
                        MedicineID: props?.selectedMedicine?.Id || props?.selectedMedicine?.MedicineID,
                        reconMedID: saveMedicine.dataMessage.reconMedID,
                        activeMedID: saveMedicine.dataMessage.activeMedID,
                        isSaveAndGenerateScriptEnable: true,
                    }))
                }
                let APIPayload = {
                    patientID: patientID
                }
                dispatch(appServices.GetMedicineSAInfo(APIPayload))
                dispatch(appServices.checkingAlreadyprescribeMedicineClear(""))
                let PatientID = PatientDatail?.PatientID
                let patientData = {
                    NHI: "",
                    PatientID: PatientDatail?.PatientID,
                };
                props?.setAddMed(false)
                props?.setAddPrescription(false)
                setSelectMedicine(false)
                dispatch(appServices.clearMedicineData(null))
                dispatch(appServices.PatientDatail(patientData))
                if (location.pathname === "/med-query") {
                    dispatch(appServices.GetMedicineDetail({
                        PatientID: PatientID,
                        PageNo: 1,
                        PageSize: 20,
                        MedicineName: '',
                        Dose: '',
                        Frequency: '',
                        DispenseStatus: '',
                        MedStatus: '',
                        RouteID: '',
                        RefreshMDRQuery: ""
                    }))
                }
                dispatch(appServices.clearMedicineDetailPayload(""))
                // if (!isGenerateScriptSaveButtonClicked)
                // dispatch(appServices.saveMedicineClear(null))
                dispatch(appServices.gettingOnHeldMedListClear(null))
                setTakeMed('')
                setDurationMed('')
                setPackageMed('')
                setMaxDosePer24HourUnit('')
                setSAStatusMed('')
                setisPRNMedicine(false)
                setIsDurationDisable(false)
                setIsQuantityDisable(false)
                // gettingOnHeldMedListClear()

            }

        }

    }, [saveMedicine])
    const handleInputChange = (e) => {
        const inputValue = e.target.value;
        if (inputValue.length > 50) {
            setErrorMessage("Indication cannot be longer than 50 characters.");
        } else {
            setErrorMessage('');
            setDropDownNewItem(inputValue);
        }
    };
    const addItem = () => {
        if (dropDownNewItem.trim() === "") {
            setErrorMessage("Please enter an indication.");
            return;
        }

        if (dropDownNewItem.length > 50) {
            setErrorMessage("Indication cannot be longer than 50 characters.");
            return;
        }
        // Check if the indication already exists
        const isDuplicate = indicationType?.some(
            (item) => item?.IndicationType?.toLowerCase()?.trim() === dropDownNewItem?.toLowerCase()?.trim()
        );

        if (isDuplicate) {
            setErrorMessage("This indication already exists.");
            return;
        }

        dispatch(appServices.AddProviderIndications({
            IndictionID: dropDownNewItem
        }));
        setPRNIndicationObject({
            value: '',
            label: dropDownNewItem,
            isFromFrontEnd: true
        });

        setDropDownNewItem('');
        setOpenDropdown(false)
    };
    const buttonOnchange = (id) => {
        setMedicationArray(prevArray => ({
            ...prevArray,
            buttonArray: prevArray.buttonArray.map((data, i) => {
                if (data.id === id) {
                    return {
                        ...data,
                        isSelected: !data.isSelected
                    };
                }
                // }
                // if (data.id === id && data.isSelected) {
                //     return {
                //         ...data,
                //         isSelected: false
                //     };
                // }
                // else if (data.id === id && !data.isSelected) {
                //     return {
                //         ...data,
                //         isSelected: true
                //     };
                // }
                return data;
            })
        }));


        if (id === 8) {
            setMedicationArray(prevArray => ({
                ...prevArray,
                buttonArray: prevArray.buttonArray.map((data, i) => {

                    if (data.id === 10 && data.isSelected) {


                        return {
                            ...data,
                            isSelected: !data.isSelected
                        };
                    }

                    return data;
                })
            }));

        }
        if (id === 10) {
            setMedicationArray(prevArray => ({
                ...prevArray,
                buttonArray: prevArray.buttonArray.map((data, i) => {

                    if (data.id === 8 && data.isSelected) {


                        return {
                            ...data,
                            isSelected: !data.isSelected
                        };
                    }

                    return data;
                })
            }));


        }


        // if(id===8)
        // {
        //     medicationArray.buttonArray.f
        // }
    }
    const clearFields = () => {
        setTakeMed('')
        setDoseMed('')
        setUnitMed('')
        setFrequencyMed('')
        setDurationMed('')
        setDaysMed('')
        setQuantityMed('')
        setDirections('')
        setPackageMed('')
        setMaxDosePer24HourUnit('')
        setRouteMed('')
        setCurrnetPrescriberID('')
        setSAStatusMed('')
        setSAFormNumberMed('')
        setSaApprovalNumberMed('')
        setSaStatusIDMed('')
    }
    const [current, setCurrent] = useState<any>(1)
    const [pageSize, setPageSize] = useState<any>(10)
    const columns = [
        {
            title: 'Medicine Name',
            dataIndex: 'MedicineName',
            key: 'MedicineName',
        },
        {
            title: 'Pharmacode',
            dataIndex: 'pharmacode',
            key: 'pharmacode',
        },
        {
            title: 'Subsidy',
            dataIndex: 'subsidy',
            key: 'subsidy',
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
        },
    ]
    const onHandeVariableDoseClicked = () => {
        setAdvanceChecks({
            ...advanceChecks,
            variableDose: true
        })
        setPrevState({
            take: takeMed,
            frequency: frequencyMed,
            toTake: doseMed,
            doseUnit: doseUnit,
            isdoseRange: doseRange,
            directions: directions,

        })
        setFrequencyMed('23')
        setRequiredFieldsObj({
            ...requiredFieldsObj, isFrequencyDisabled: true, isDirectionRequired: true,
            isPRNMedicineDisabled: true, isTakeDisabled: true, isTakeRequired: false, isDoseUnitDisabled: true,
        })
        setDoseMed("")
        setDoseUnit('')
        setMaxDosePer24HourUnit('')
        setDirections("")
        setTakeMed("")
    }
    const onVariableDoseBootBoxConfirm = () => {
        setRequiredFieldsObj({
            ...requiredFieldsObj, isFrequencyDisabled: false, isDirectionRequired: true,
            isPRNMedicineDisabled: false, isTakeDisabled: false, isTakeRequired: true, isDoseUnitDisabled: false
        })
        setDirections("")
        setAdminDirections("")
        setTakeMed("")
        setDoseRange(prevState.isdoseRange)
        setDoseMed("")
        setDoseUnit(prevState.doseUnit)
        setMaxDosePer24HourUnit(prevState.doseUnit)
        setFrequencyMed("")
    }
    const checkingunchecking = (isFreeText = false) => {
        setAdvanceChecks({
            ...advanceChecks,
            variableDose: true
        })
        if (!isFreeText) {
            setPrevState({
                take: takeMed,
                frequency: frequencyMed,
                toTake: doseMed,
                doseUnit: doseUnit,
                isdoseRange: doseRange,
                directions: directions,
            })
        }
        setDoseMed('')
        setTakeMed("")
        setRequiredFieldsObj({
            ...requiredFieldsObj, isTakeRequired: false, isTakeDisabled: true,
            isDoseUnitDisabled: true, isDoseRangeIsRequired: false,
            isFrequencyDisabled: true, isDirectionRequired: true
        })
        setFrequencyMed("23")
    }
    const onVariableDoseBootBoxCancel = () => {
        if (prevState.directions !== "") {
            setDirections(prevState.directions)
            setAdminDirections(prevState.directions)
            checkingunchecking()
        } else {
            setAdvanceChecks({
                ...advanceChecks,
                variableDose: true
            })
        }
    }
    // const disableFromDate = (current: Dayjs) => {
    //     if (medicineEndDate !== null) {
    //         return current && current < dayjs(medicineEndDate).startOf('day')
    //     } else {
    //         return false
    //     }
    // }
    const disableToDate = (current: Dayjs) => {
        if (medicineStartDate !== null) {
            return current && current < dayjs(medicineStartDate).endOf('day')
        } else {
            return false
        }
    }
    const addToChartMedicatioFunc = () => {
        if (props.selectedMedicine?.isFromMDRInformationEdit !== true) {
            saveMedicineFun(isGenerateScriptClickedWithoutMed ? isGenerateScriptClickedWithoutMed : false)
        }
        else if ((props.isFromMDRInformation === true
            && props.selectedMedicine
            && props?.selectedMedicine?.isFromReactivationMedicine !== true
            && props?.selectedMedicine?.isFromUseExistingMedicationDrawer !== true
            && props?.selectedMedicine?.isFromUseExistingMedicationMDRDrawer !== true)
        ) {
            if (ValidateFields(isGenerateScriptClickedWithoutMed ? isGenerateScriptClickedWithoutMed : false)) {
                let SCTID: any = props.selectedMedicine?.ProductSCTID || props?.selectedMedicine?.sctid || props?.selectedMedicine?.SCTID
                let isAddedFromApplication: any = props?.selectedMedicine?.isAddedFromApplication
                if ((SCTID === null || SCTID === undefined || SCTID == "") && isAddedFromApplication === false) {
                    SystemAlert("warning", "There is invalid data from source, please search and map the medication. ")
                    return
                }
                let onStopdata: any = {
                    "OtherReason": 'medicine data updated',
                    "Reason": "other",
                    "StartDate": MARDateFormatforAPI(dayjs()),
                    "Comment": "medicine data updated by user",
                    "PatientID": (PatientDatail as any)?.PatientID,
                    "MedId": props.selectedMedicine?.medId,
                    "MedinineName": props.selectedMedicine?.medicineName || props.selectedMedicine?.medicineDisplayName,
                    StopOnlyInactivemed: true,
                    ActiveMedId: props?.selectedMedicine?.activeMedID
                }
                // dispatch(appServices.StopMedicine(onStopdata))
                if (props.selectedMedicine?.isFromMDRInformationEdit !== true && props.selectedMedicine?.isFromMDRInformation !== true)
                    dispatch(appServices.StopMedicine(onStopdata))
                else
                    saveMedicineFun(isGenerateScriptClickedWithoutMed ? isGenerateScriptClickedWithoutMed : false)
            }
        } else {
            saveMedicineFun(isGenerateScriptClickedWithoutMed ? isGenerateScriptClickedWithoutMed : false)
        }
    }
    useEffect(() => {
        let count = [
            advanceChecks.gsAllowed,
            advanceChecks.frequentlyDispensed,
            advanceChecks.useGenericName,
            advanceChecks.privateFunded,
            advanceChecks.unusualDose,
            advanceChecks.variableDose,
            advanceChecks.initDispensingPeriod,
            advanceChecks.patientConsent,
            advanceChecks.ltcAssessment,
            advanceChecks.confidential,
            advanceChecks.compassionateSupply,
            advanceChecks.prescribedExternally,
        ].filter(Boolean).length;

        if (count > 0) {
            setCheckedButtonCount(count);
        }
    }, [advanceChecks]);
    const disableDate = (current) => {
        return current && current < dayjs().startOf('day');
    }

    useEffect(() => {
        if (props.isSAmodal && !isMedicineSwitched) {

            let raw: any = {
                SAFormID: allMedicationForEdit?.mdrMedicineData[0]?.SAFORMNO || props.selectedMedicine?.SAFormID || props.selectedMedicine.saFormID,
                MedicineID: props.selectedMedicine?.Id?.toString() || allMedicationForEdit?.mdrMedicineData[0]?.MedicineID,
                PatientID: patientID,
                isFromSAGrid: true
            };
            dispatch(appServices.GetSpecialAuthorityFormSecond(raw));
        } else {
            dispatch(appServices.GetSpecialAuthorityFormSecondDataClear(""))
        }
    }, [props.isSAmodal])
    const DateOfBirth = PatientDatail !== null ? PatientDatail?.DateOfBirth !== null && PatientDatail?.DateOfBirth !== undefined && PatientDatail?.DateOfBirth !== "" ? PatientDatail.DateOfBirth : null : null;
    const age = DateOfBirth !== null ? calculateAge(DateOfBirth) : null;
    const { isGotAssociatedMedicineTypesLoading, gotAssociatedMedicineTypes }: any = useAppSelector((state) => state.GetAssociatedMedicineType)
    const [getAssociatedMedicineTypeArrayOptions, setGetAssociatedMedicineTypeArrayOptions] = useState<any[]>([])
    const [isShownMedicineBrandDropdown, setIsShownMedicineBrandDropdown] = useState(false)
    const [isGotAssociatedMedicineTypesFunLoading, setIsAssoisGotAssociatedMedicineTypesFunLoading] = useState(false)

    const GetAssociatedMedicineTypeFunc = async (medicineCode: any) => {
        try {
            setIsAssoisGotAssociatedMedicineTypesFunLoading(true)
            const response = await UseMarApi(`GetAssociatedMedicineType?MedicineCode=${medicineCode}`, "get", null, true);
            if (response?.status?.includes("SUCCESS")) {
                setIsAssoisGotAssociatedMedicineTypesFunLoading(false)
                setGetAssociatedMedicineTypeArrayOptions(response?.dataMessage.map((record: any) => {
                    return {
                        ...record,
                        value: record.MedicineID,
                        label: record.Generic_Brande_Name
                    }
                }))

            } else {
                setGetAssociatedMedicineTypeArrayOptions([])
                setIsAssoisGotAssociatedMedicineTypesFunLoading(false)
            }
        } catch (error) {
            setIsAssoisGotAssociatedMedicineTypesFunLoading(false)
            setGetAssociatedMedicineTypeArrayOptions([])
        }
    }
    useEffect(() => {
        if (gotAssociatedMedicineTypes !== null) {
            if (gotAssociatedMedicineTypes.length === 1) {
                if (gotAssociatedMedicineTypes[0]?.Isprescribebybrand === false) {
                    GetAssociatedMedicineTypeFunc(gotAssociatedMedicineTypes[0]?.SCTID)
                    setIsShownMedicineBrandDropdown(gotAssociatedMedicineTypes[0]?.Isprescribebybrand === false ? true : false)
                } else {
                    setIsShownMedicineBrandDropdown(false)
                }
            }
        }
    }, [gotAssociatedMedicineTypes])

    // MedSelectionForm changes before Split Dose 

    const setSplitDoseDirectionsFunction = (takeMed, isDoseRangeSelected, doseRangeValue, frequencyMed, doseUnit, OtherDoseUnit) => {

        let tk = takeMed !== null ? takeMed : '';
        let frq = frequencyMed;
        frq = GetFrequencyDescription(frq)
        let frm = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.form ?? ""
        let formID = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.formID
        let isInsulin = medicationDetailsAddEditData[0]?.lstPatientMedication[0]?.isInsulin

        let unit = doseUnit === "Other" ? OtherDoseUnit : doseUnit;
        let formSuppVal = formID ? formID.toString() : ''
        let form = '';
        let sig = '';

        if (frq.toLowerCase().includes('select')) {
            frq = '';
        }

        if (formSuppVal === '26' || formSuppVal === '35' || formSuppVal === '49' || formSuppVal === '267' || formSuppVal === '74') {
            form = 'Insert';
        } else {
            form = takeLabel.replaceAll(":", "");
        }

        if (tk.includes('.')) {
            if (!form.toLowerCase().includes('inject')) {
                tk = tk.replace(/^0+|0+$/g, '');
                const [preceedingDigit, proceedingDigit] = tk.split('.');
                if (preceedingDigit === '' && proceedingDigit !== '5' && proceedingDigit !== '50') {
                    tk = '0.' + proceedingDigit;
                }
                if (proceedingDigit === '0' && preceedingDigit !== '') {
                    tk = preceedingDigit;
                }
                if (isDoseRangeSelected) {
                    if (takeMed && doseRangeValue) {
                        tk = `${takeMed} to ${doseRangeValue}`;
                    }
                }
                tk = `${takeMed}`
            } else {
                if (isDoseRangeSelected) {
                    if (takeMed && doseRangeValue) {
                        tk = `${takeMed} to ${doseRangeValue}`;
                    }
                }
            }
        } else {
            if (isDoseRangeSelected) {
                if (takeMed && doseRangeValue) {
                    tk = `${takeMed} to ${doseRangeValue}`;
                }
            }
        }
        if (frm.toLowerCase().includes('tablet')) {
            frm = 'tablet';
        } else if (frm.toLowerCase().includes('inhal') || frm.toLowerCase().includes('spray')) {
            frm = 'puff';
        } else if (frm.toLowerCase().includes('suppositor')) {
            frm = 'supp(s)';
        } else if (frm.toLowerCase().includes('oral')) {
            frm = '';
        } else if (frm.toLowerCase().includes('liquid')) {
            frm = 'mL';
        } else if (frm.toLowerCase().includes('inject')) {
            frm = isInsulin ? 'Unit' : '';
        } else if (frm.toLowerCase().includes('capsule')) {
            frm = 'capsule';
        } else if (frm.toLowerCase().includes('powder')) {
            frm = 'g';
        } else if (frm.toLowerCase().includes('test: strip')) {
            frm = 'OP';
        } else {
            frm = '';
        }
        if (parseFloat(takeMed) > 1 && frm) {
            frm = `${frm}s`;
        }
        if (tk.length > 0) {
            if (!frm.toLowerCase().includes('ampoule')) {
                tk = toWordsConvert(tk);
            }
        }
        if (unit == "") {
            unit = ""
        } else {
            unit = unit + '';
        }
        if (formSuppVal === "99") {
            sig = `${form} ${tk} ${unit} into each nostril ${frq}`;
        } else {
            sig = `${form} ${tk} ${unit} ${frq}`;
        }
        // if (medicineTitrationManualObj.startDate !== null && medicineTitrationManualObj.duration && sig.trim() !== "") {
        //     sig = `${sig} Start: ${dayjs(medicineTitrationManualObj.startDate).format("DD/MM/YYYY")},  Stop: ${dayjs(medicineTitrationManualObj.startDate).add(parseInt(medicineTitrationManualObj.duration), medicineTitrationManualObj.days == "1" ? "days" : medicineTitrationManualObj.days == "2" ? "weeks" : "months").format("DD/MM/YYYY")} `;
        // } else if (medicineTitrationManualObj.startDate !== null && sig.trim() !== "") {
        //     sig = `${sig} Start: ${dayjs(medicineTitrationManualObj.startDate).format("DD/MM/YYYY")}`;
        // }
        return sig
    };
    const onChangeSplitDoseFields = (value: any, selectedRowKey: number, type: number) => {
        // type === 1 for take
        // type === 2 for dose range
        // type === 3 for dose range button
        // type === 4 for dose unit drop down
        // type === 5 for Other field input
        // type === 6 for frequency field
        let splitDoseArrayOptionsCopy: SplitDoseOption[] = [...splitDoseArrayOptions]
        let findSplitDoseIndex: number = splitDoseArrayOptionsCopy.findIndex((record: SplitDoseOption) => record.rowKey === selectedRowKey)
        if (findSplitDoseIndex > -1) {
            const selectedSplitDoseRecord: SplitDoseOption = splitDoseArrayOptionsCopy[findSplitDoseIndex]
            if (type === 1) {
                selectedSplitDoseRecord.takeValue = value
                selectedSplitDoseRecord.takeValueErrorMessage = parseFloat(value) === 0 ?
                    "Dose cannot be zero." :
                    parseFloat(value) >= parseFloat(selectedSplitDoseRecord.doseRangeValue) && selectedSplitDoseRecord.isDoseRangeSelected ?
                        `The dose must be less than the dose range` : null

            }
            else if (type === 2) {
                selectedSplitDoseRecord.doseRangeValue = value
                selectedSplitDoseRecord.doseRangeValueErrorMessage = parseFloat(value) === 0 ? "Dose range cannot be zero." :
                    parseFloat(value) <= parseFloat(selectedSplitDoseRecord.takeValue) && selectedSplitDoseRecord.isDoseRangeSelected ? `The dose range must be greater than the ${takeLabel.replace(":", "")}.` : null
            }
            else if (type === 3) {
                selectedSplitDoseRecord.isDoseRangeSelected = value
                if (value === false) {
                    selectedSplitDoseRecord.doseRangeValue = ""
                    selectedSplitDoseRecord.doseRangeValueErrorMessage = null
                }
            }
            else if (type === 6) {
                selectedSplitDoseRecord.frequencyCodeValue = value
                selectedSplitDoseRecord.frequencyCodeValueErrorMessage = null
            }
        }
        const array = splitDoseArrayOptionsCopy.filter((record: SplitDoseOption) => record.IsActive).map((med) => {
            return setSplitDoseDirectionsFunction(med?.takeValue !== undefined ? med?.takeValue : "", med.isDoseRangeSelected, med.doseRangeValue, med.frequencyCodeValue, doseUnit, doseUnitOtherValue)
        });
        let sig = array.filter(Boolean).join(' AND ')
        setDirections(sig)
        setSplitDoseArrayOptions([...splitDoseArrayOptionsCopy])
    }

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
    }
    const onHandleDeleteSplitDoseRow = (deleteRowKey: any) => {
        let splitDoseArrayOptionsCopy: SplitDoseOption[] = [...splitDoseArrayOptions]
        let findSplitDoseIndex: number = splitDoseArrayOptionsCopy.findIndex((record: SplitDoseOption) => record.rowKey === deleteRowKey && record.SplitDoseID !== null)
        if (findSplitDoseIndex > -1) {
            splitDoseArrayOptionsCopy[findSplitDoseIndex].IsActive = false
            splitDoseArrayOptionsCopy[findSplitDoseIndex].doseRangeValueErrorMessage = null
            splitDoseArrayOptionsCopy[findSplitDoseIndex].frequencyCodeValueErrorMessage = null
            splitDoseArrayOptionsCopy[findSplitDoseIndex].takeValueErrorMessage = null
        } else {
            splitDoseArrayOptionsCopy = splitDoseArrayOptionsCopy.filter((record: SplitDoseOption) => record.rowKey !== deleteRowKey)
        }
        const array = splitDoseArrayOptionsCopy.filter((record: SplitDoseOption) => record.IsActive).map((med) => {
            return setSplitDoseDirectionsFunction(med?.takeValue !== undefined ? med?.takeValue : "", med.isDoseRangeSelected, med.doseRangeValue, med.frequencyCodeValue, doseUnit, doseUnitOtherValue)
        });
        let sig = array.filter(Boolean).join(' AND ')
        setDirections(sig)
        setSplitDoseArrayOptions([...splitDoseArrayOptionsCopy])
    };
    return (
        <Fragment>
            {isMedicationDetailsAddEditLoading || isAllMedicationForEditLoading && <Spin size="large" />}
            <div className="find-medicine flex-fill h-100 overflowy-hidden flex-col">
                <div>
                    <div className="find-med-header d-flex  border-bottom p-2">
                        <div className='d-flex flex-column w-100'>
                            <div className='d-flex align-items-center justify-content-between'>
                                <div className='d-flex flex-col gap-1'>
                                    <span className='font-18' >
                                        {props.generateScriptSc && props.selectedMedicine ? props.selectedMedicine.medicineDisplayName || props?.selectedMedicine?.Generic_Brande_Name : props?.selectedMedicine?.MedicineName || props?.selectedMedicine?.medicineName || props?.selectedMedicine?.medicineDisplayName || props?.selectedMedicine?.Generic_Brande_Name}</span>
                                    {props.generateScriptSc ? null : <div className='d-flex gap-3'>
                                        <div className=" font-14">
                                            <span className="fw-bold">{strengthLabel}: </span> {strengthIDMed ? strengthIDMed : '--'}
                                        </div>
                                        <div className="font-14">
                                            <span className="fw-bold">Form: </span>{slelectedMed?.form}
                                        </div>

                                    </div>}

                                </div>
                                <div className='d-flex flex-col align-items-center justify-content-center gap-1'>
                                    <div className='d-flex'>
                                        {/* <img src="/assest/icons/calculater-icon.svg" className='calcicon' alt="" onClick={() => { setIsCalculatorOpen(true) }} /> */}
                                        {props.generateScriptSc ? null :
                                            <> <MButton className='ant-btn-sm theme-button ml-1 mrgn-rgt-4' onClick={() => { setIsVisiblePharmic(true) }}> Pharmac</MButton>
                                                <MButton
                                                    children='Cancel'
                                                    className='btn-dark '
                                                    size='small'
                                                    onClick={() => {
                                                        dispatch(appServices.gettingAssociatedMedicineTypeClear(""))
                                                        dispatch(appServices.gettingCommonSubstanceClear(""))
                                                        dispatch(appServices.gettingOnHeldMedListClear(null))
                                                        dispatch(appServices.gettingAllMedicationForEditClear(null));
                                                        props.setAddMed(false)
                                                        {
                                                            if (!prescribeThroughEdit) {
                                                                setSelectMedicine(false)
                                                            }
                                                        }
                                                    }} />


                                                <MButton
                                                    loading={((isStoppingMedicine || isAllOnHeldMedListLoading || isSavingRecord || isCheckedAlreadyPrescribedMedicineLoading) && isAddToChartClicked)}
                                                    children={props?.selectedMedicine?.isFromMDRInformationEdit && isISPRXLite ? "Save" : ` Add to ${isISPRXLite ? "List" : "Chart"}`}
                                                    className='theme-button ml-1'
                                                    onClick={() => {
                                                        if (props?.selectedMedicine?.isFromMDRInformationEdit && allMedicationForEdit !== null && allMedicationForEdit?.mdrMedicineData[0]?.SCID !== null && allMedicationForEdit?.mdrMedicineData[0]?.SCID !== undefined && allMedicationForEdit?.mdrMedicineData[0]?.SCID !== "") {
                                                            setIsSCIDExistModalOpen(true)
                                                        } else {
                                                            addToChartMedicatioFunc()
                                                            setIsAddToChartClicked(true)
                                                            setIsAddToChartAndGenerateScriptClicked(false)
                                                            dispatch(appServices.setIsGenerateScriptClickedWithoutMed(false))
                                                        }
                                                    }}
                                                    size='small'
                                                />

                                            </>}
                                        {props?.isFromMDRInformation !== true && !isFromGenerateScriptForm &&
                                            <MButton
                                                loading={((isAllOnHeldMedListLoading || isSavingRecord || isCheckedAlreadyPrescribedMedicineLoading) && isAddToChartAndGenerateScriptClicked)}
                                                children={props.generateScriptSc ? "Save" : `Add to ${isISPRXLite ? "List" : "Chart"} and Generate Rx`}
                                                className='theme-button ml-1'
                                                onClick={() => {
                                                    saveMedicineFun(true)
                                                    setIsAddToChartClicked(false)
                                                    setIsAddToChartAndGenerateScriptClicked(true)
                                                }}
                                                size='small'
                                            />
                                        }
                                    </div>

                                </div>
                            </div>
                            <div>
                                {isShownMedicineBrandDropdown && (
                                    isGotAssociatedMedicineTypesFunLoading ? null :
                                        <>
                                            <div className={'flex-col flex-fill mt-2 brand-dropdown-width'}>
                                                <Select
                                                    placeholder="Select brand"
                                                    loading={isGotAssociatedMedicineTypesFunLoading}
                                                    value={null}
                                                    onChange={(e: any, record: any) => {
                                                        let foundSelected: any = getAssociatedMedicineTypeArrayOptions.find((record: any) => record?.value === e)
                                                        if (foundSelected) {
                                                            setIsMedicineSwitched(true)
                                                            setstopMedRecord({ Id: foundSelected?.MedicineID, ...foundSelected, SAFormID: foundSelected?.SAFrom })
                                                            dispatch(appServices.gettingAssociatedMedicineTypeClear(""))
                                                            if (permissions?.GetCommonSubstance) {
                                                                let APIPayload = {
                                                                    medicineID: foundSelected?.MedicineID,
                                                                    patientID: patientID,
                                                                    getCommonSubstanceType: 3
                                                                };
                                                                dispatch(appServices.GetCommonSubstance(APIPayload));
                                                            } else {
                                                                let raw = {
                                                                    medicineID: foundSelected?.MedicineID,
                                                                    pateintID: patientID
                                                                };
                                                                dispatch(appServices.CheckMedicineStopStatus(raw));
                                                            }
                                                        }
                                                    }}
                                                >
                                                    {getAssociatedMedicineTypeArrayOptions.map((opt: any, index: number) => (
                                                        <Option
                                                            key={opt.value}
                                                            value={opt.value}
                                                            className={opt.IsSubsidised && "subisdise-row-select-comp"}

                                                        >
                                                            {opt.label}
                                                        </Option>
                                                    ))}

                                                </Select>
                                            </div>
                                        </>
                                )}
                            </div>

                        </div>

                    </div>
                </div>
                {(isMedicineSwitched) ?
                    <div className='h-100 d-flex align-items-center justify-content-center overflowy-auto'>
                        <Spin size='large' />
                    </div> :
                    <div className='h-100 overflowy-auto'>
                        {isRecomemended ? <span className="specialist_recommended_box">Specialist Recommended</span> : null}

                        <div className="d-flex px-3 pt-3 gap-1 ">
                            {
                                (
                                    (((props?.selectedMedicine?.isFromMDRInformation == true && allMedicationForEdit?.mdrMedicineData?.[0]?.IsSplitDose == null) ||
                                        (allMedicationForEdit?.mdrMedicineData?.[0]?.IsSplitDose)) && permissions?.SaveSplitDose) ||
                                    (allMedicationForEdit == null && permissions?.SaveSplitDose))
                                    ?
                                    (<div className='d-flex flex-column'>
                                        {splitDoseArrayOptions.filter((record: SplitDoseOption) => record.IsActive).map((record: SplitDoseOption, index: number) => {
                                            return (
                                                <div className='d-flex flex-row'>
                                                    <MInputNumber
                                                        isRequired={requiredFieldsObj.isTakeRequired}
                                                        label={takeLabel ? takeLabel : 'Loading...'}
                                                        // isError={!takeMed ? true : false}
                                                        value={record.takeValue}
                                                        min={1}
                                                        maxLength={20}
                                                        type='number'
                                                        placeholder='Enter Dose'
                                                        onChange={(e) => {
                                                            onChangeSplitDoseFields(e.target.value, record.rowKey, 1)
                                                            //     setTakeMed(e.target.value)
                                                            //     setDirectionsFunction(e.target.value, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                            //         maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate
                                                            //     )
                                                            //     if (frequencyMed || durationMed) {
                                                            //         setErrorMessages({
                                                            //             ...errorMessages,
                                                            //             quantity: '',
                                                            //             doseRange: null,
                                                            //             initDispensingPeriod: '',
                                                            //             dose: parseFloat(e.target.value) === 0 ?
                                                            //                 "Dose cannot be zero." :
                                                            //                 parseFloat(e.target.value) >= parseFloat(doseMed) && doseRange ?
                                                            //                     `The dose must be less than the dose range` :
                                                            //                     (parseFloat(e.target.value) >= parseFloat(maxDosePer24Hour) && isPRNMedicine && (maxDosePer24Hour !== "" && maxDosePer24Hour !== undefined && maxDosePer24Hour !== null)) ?
                                                            //                         ('The dose must be less than the max dose') : null
                                                            //         })
                                                            //     }
                                                            //     else {
                                                            //         setErrorMessages({
                                                            //             ...errorMessages,
                                                            //             doseRange: null,
                                                            //             initDispensingPeriod: '',
                                                            //             dose: parseFloat(e.target.value) === 0 ?
                                                            //                 "Dose cannot be zero." :
                                                            //                 parseFloat(e.target.value) >= parseFloat(doseMed) && doseRange ?
                                                            //                     `The dose must be less than the dose range` :
                                                            //                     (parseFloat(e.target.value) >= parseFloat(maxDosePer24Hour) && isPRNMedicine && (maxDosePer24Hour !== "" && maxDosePer24Hour !== undefined && maxDosePer24Hour !== null)) ?
                                                            //                         ('The dose must be less than the max dose') : null
                                                            //         })
                                                            //     }
                                                        }
                                                        }
                                                        labelClass='label-small mt-0'
                                                        layout='flex-col flex-fill pe-1'
                                                        disabled={requiredFieldsObj.isTakeDisabled ? true : frequencyMed === "6" || isFreeTextDirections}
                                                        errorMessageDisplay={record?.takeValueErrorMessage != null && (
                                                            <span className="text-danger font-12">
                                                                {record?.takeValueErrorMessage}
                                                            </span>
                                                        )}
                                                    />
                                                    {record.isDoseRangeSelected ? <div className='d-flex margin-top-19'>
                                                        <div className='font-13 mr-1 pt-1'>to</div>
                                                        <MInputNumber
                                                            value={record.doseRangeValue}
                                                            min={1}
                                                            maxLength={20}
                                                            isError={!doseMed ? true : false}
                                                            placeholder='Enter dose '
                                                            type='number'
                                                            onChange={(e) => {
                                                                onChangeSplitDoseFields(e.target.value, record.rowKey, 2)
                                                                // setDoseMed(e.target.value)
                                                                // setDirectionsFunction(takeMed, PRNIndicationObject.label, e.target.value, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                                //     maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate
                                                                // )
                                                                // if (advanceChecks.initDispensingPeriod) {
                                                                //     let quantity = calculateInitialDispensingQuantity(takeMed, advanceChecks.initialDispensingPeriodVal, advanceChecks.trialType, frequencyMed, doseRange, e.target.value)
                                                                //     setAdvanceChecks({
                                                                //         ...advanceChecks,
                                                                //         // initialDispensingQuantity: quantity,
                                                                //     })
                                                                // }
                                                                // if (frequencyMed || durationMed) {
                                                                //     setErrorMessages({
                                                                //         ...errorMessages,
                                                                //         quantity: '',
                                                                //         doseRange: parseFloat(e.target.value) === 0 ? "Dose range cannot be zero." : parseFloat(e.target.value) <= parseFloat(takeMed) && doseRange ? `The dose range must be greater than the ${takeLabel.replace(":", "")}.` : null,
                                                                //         dose: null,
                                                                //         initDispensingPeriod: ''
                                                                //     })
                                                                // } else {
                                                                //     setErrorMessages({
                                                                //         ...errorMessages,
                                                                //         doseRange: parseFloat(e.target.value) === 0 ? "Dose range cannot be zero." : parseFloat(e.target.value) <= parseFloat(takeMed) && doseRange ? `The dose range must be greater than the ${takeLabel.replace(":", "")}.` : null,
                                                                //         dose: null,
                                                                //         initDispensingPeriod: ''
                                                                //     })
                                                                // }
                                                            }}
                                                            labelClass='label-small'
                                                            layout='flex-col flex-fill pe-1'
                                                            disabled={requiredFieldsObj.isTakeDisabled ? true : frequencyMed === "6" || isFreeTextDirections}
                                                            errorMessageDisplay={record?.doseRangeValueErrorMessage != null && (
                                                                <span className="text-danger font-12">
                                                                    {record?.doseRangeValueErrorMessage}
                                                                </span>
                                                            )}

                                                        />
                                                    </div> : null}
                                                    <MButton
                                                        className={`margin-top-19 me-1 ${record.isDoseRangeSelected ? 'theme-button' : 'btn-primary'}`}
                                                        disabled={frequencyMed === "6" || requiredFieldsObj.isTakeDisabled || isFreeTextDirections}
                                                        onClick={() => {
                                                            onChangeSplitDoseFields(!record.isDoseRangeSelected, record.rowKey, 3)

                                                            // setDoseRange(!doseRange)
                                                            // setDirectionsFunction(takeMed, PRNIndicationObject.label, "", medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, !doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                            //     maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate
                                                            // )
                                                            // if (advanceChecks.initDispensingPeriod) {
                                                            //     let quantity = calculateInitialDispensingQuantity(takeMed, advanceChecks.initialDispensingPeriodVal, advanceChecks.trialType, frequencyMed, !doseRange, doseMed)
                                                            //     setErrorMessages({ ...errorMessages, initDispensingPeriod: '' })
                                                            //     setAdvanceChecks({
                                                            //         ...advanceChecks,
                                                            //         // initialDispensingQuantity: quantity,
                                                            //     })
                                                            // }
                                                            // setDoseMed('')
                                                        }}
                                                        children='Dose Range' />

                                                    <MSelect
                                                        label='Dose Unit'
                                                        value={doseUnit}
                                                        isRequired
                                                        placeholder={'---Select---'}
                                                        disabled={requiredFieldsObj.isDoseUnitDisabled || isFreeTextDirections}
                                                        options={doseUnitOption || []}
                                                        onChange={(e) => {
                                                            if (permissions?.SaveSplitDose !== true) {
                                                                setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed,
                                                                    daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, e === "Other" ? "" : e,
                                                                    isPRNMedicine, maxDosePer24Hour, e === "Other" ? "" : e
                                                                    , medicineStartDate, medicineEndDate
                                                                )
                                                            }
                                                            setErrorMessages({
                                                                ...errorMessages,
                                                                doseunitError: null
                                                            })
                                                            if (e === "Other") {
                                                                setQuantityMed('')
                                                                setErrorMessages({ ...errorMessages, quantity: '' })
                                                            }
                                                            setDoseUnit(e)
                                                            setMaxDosePer24HourUnit(e)
                                                            setDoseUnitOtherValue("")
                                                        }
                                                        }
                                                        labelClass='label-small label-style mt-0'
                                                        layout='flex-col flex-fill pe-1'
                                                        errorMessageDisplay={errorMessages?.doseunitError != null && (
                                                            <span className="text-danger font-12">
                                                                {errorMessages?.doseunitError}
                                                            </span>
                                                        )}


                                                    />
                                                    {doseUnit === "Other" &&
                                                        <MInput
                                                            isRequired
                                                            label='Other Dose Unit'
                                                            placeholder='Enter other dose unit'
                                                            labelClass='label-small label-style mt-0'
                                                            layout='flex-col flex-fill'
                                                            value={doseUnitOtherValue}
                                                            onChange={(e) => {
                                                                const input = e.target.value;
                                                                const alphabeticOnly = input.replace(/[^a-zA-Z]/g, '');

                                                                setDoseUnitOtherValue(alphabeticOnly)
                                                                setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData,
                                                                    frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray,
                                                                    IsBlisterPack, alphabeticOnly, isPRNMedicine, maxDosePer24Hour, alphabeticOnly
                                                                    , medicineStartDate, medicineEndDate
                                                                )
                                                                setErrorMessages({ ...errorMessages, doseUnitOtherValueError: null })
                                                            }}
                                                            errorMessageDisplay={errorMessages?.doseUnitOtherValueError != null && (
                                                                <span className="text-danger font-12">
                                                                    {errorMessages?.doseUnitOtherValueError}
                                                                </span>
                                                            )}
                                                        />
                                                    }
                                                    <MSelect
                                                        isRequired={true}
                                                        label='Frequency'
                                                        allowClear={true}
                                                        disabled={requiredFieldsObj.isFrequencyDisabled || isFreeTextDirections}
                                                        labelClass='label-small label-style mt-0'
                                                        layout='flex-col flex-fill pe-1'
                                                        value={record.frequencyCodeValue}
                                                        placeholder={'---Select---'}
                                                        onChange={(e) => {
                                                            onChangeSplitDoseFields(e, record.rowKey, 6)
                                                            // setFrequencyMed(e)
                                                            // handleFrequencyChange(e)
                                                            // setErrorMessages({ ...errorMessages, frequency: '', initDispensingPeriod: '' })
                                                            // if (e) {
                                                            //     if (advanceChecks.initDispensingPeriod) {
                                                            //         let quantity = calculateInitialDispensingQuantity(takeMed, advanceChecks.initialDispensingPeriodVal, advanceChecks.trialType, e, doseRange, doseMed)
                                                            //         setAdvanceChecks({
                                                            //             ...advanceChecks,
                                                            //             // initialDispensingQuantity: quantity,
                                                            //         })
                                                            //     }
                                                            //     if (e === "8") {
                                                            //         setisPRNMedicine(false)
                                                            //         setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, e, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, false,
                                                            //             "", maxDosePer24HourUnit, medicineStartDate, medicineEndDate
                                                            //         )

                                                            //         setMaxDosePer24Hour("")
                                                            //     } else {
                                                            //         setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, e, durationMed, daysMed, doseRange,
                                                            //             quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                            //             maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate
                                                            //         )
                                                            //     }
                                                            // }
                                                        }}
                                                        className='w-340'
                                                        options={medicationArray?.frequencyArray || []}
                                                        errorMessageDisplay={record?.frequencyCodeValueErrorMessage != null && (
                                                            <span className="text-danger font-12">
                                                                {record?.frequencyCodeValueErrorMessage}
                                                            </span>
                                                        )}
                                                    />
                                                    {splitDoseArrayOptions.filter((record: SplitDoseOption) => record.IsActive).length > 1 && (<MButton
                                                        className={`margin-top-19 me-1 mb-3 btn-danger`}
                                                        onClick={() => onHandleDeleteSplitDoseRow(record.rowKey)}
                                                        children='Delete' />)}
                                                    {index === splitDoseArrayOptions.filter((record: SplitDoseOption) => record.IsActive).length - 1 && (
                                                        <MButton
                                                            className={`margin-top-19 mb-3 ${requiredFieldsObj.isTakeDisabled ? "disabled" : "theme-button"}`}
                                                            onClick={addNewSplitDoseRecord}
                                                            disabled={requiredFieldsObj.isTakeDisabled}
                                                        >
                                                            AND
                                                        </MButton>
                                                    )}

                                                </div>
                                            )
                                        })}
                                    </div>) :
                                    (
                                        <>
                                            <div className="d-flex gap-1 flex-fill">
                                                <MInputNumber
                                                    isRequired={requiredFieldsObj.isTakeRequired}
                                                    label={takeLabel ? takeLabel : 'Loading...'}
                                                    isError={!takeMed ? true : false}
                                                    value={takeMed}
                                                    min={1}
                                                    maxLength={20}
                                                    type='number'
                                                    placeholder='Enter Dose'
                                                    onChange={(e) => {
                                                        setTakeMed(e.target.value)
                                                        setDirectionsFunction(e.target.value, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                            maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate
                                                        )
                                                        if (advanceChecks.initDispensingPeriod) {
                                                            let quantity = calculateInitialDispensingQuantity(e.target.value, advanceChecks.initialDispensingPeriodVal, advanceChecks.trialType, frequencyMed, doseRange, doseMed)
                                                            setAdvanceChecks({
                                                                ...advanceChecks,
                                                                // initialDispensingQuantity: quantity,
                                                            })
                                                        }
                                                        if (frequencyMed || durationMed) {
                                                            setErrorMessages({
                                                                ...errorMessages,
                                                                quantity: '',
                                                                doseRange: null,
                                                                initDispensingPeriod: '',
                                                                dose: parseFloat(e.target.value) === 0 ?
                                                                    "Dose cannot be zero." :
                                                                    parseFloat(e.target.value) >= parseFloat(doseMed) && doseRange ?
                                                                        `The dose must be less than the dose range` :
                                                                        (parseFloat(e.target.value) >= parseFloat(maxDosePer24Hour) && isPRNMedicine && (maxDosePer24Hour !== "" && maxDosePer24Hour !== undefined && maxDosePer24Hour !== null)) ?
                                                                            ('The dose must be less than the max dose') : null
                                                            })
                                                        }
                                                        else {
                                                            setErrorMessages({
                                                                ...errorMessages,
                                                                doseRange: null,
                                                                initDispensingPeriod: '',
                                                                dose: parseFloat(e.target.value) === 0 ?
                                                                    "Dose cannot be zero." :
                                                                    parseFloat(e.target.value) >= parseFloat(doseMed) && doseRange ?
                                                                        `The dose must be less than the dose range` :
                                                                        (parseFloat(e.target.value) >= parseFloat(maxDosePer24Hour) && isPRNMedicine && (maxDosePer24Hour !== "" && maxDosePer24Hour !== undefined && maxDosePer24Hour !== null)) ?
                                                                            ('The dose must be less than the max dose') : null
                                                            })
                                                        }
                                                    }
                                                    }
                                                    labelClass='label-small mt-0'
                                                    layout='flex-col flex-fill'
                                                    disabled={requiredFieldsObj.isTakeDisabled ? true : frequencyMed === "6" || isFreeTextDirections}
                                                    errorMessageDisplay={errorMessages?.dose != null && (
                                                        <span className="text-danger font-12">
                                                            {errorMessages?.dose}
                                                        </span>
                                                    )}
                                                />
                                                {doseRange ? <div className='d-flex margin-top-19'>
                                                    <div className='font-13 mr-1 pt-1'>to</div>
                                                    <MInputNumber
                                                        value={doseMed}
                                                        min={1}
                                                        maxLength={20}
                                                        isError={!doseMed ? true : false}
                                                        placeholder='Enter dose '
                                                        type='number'
                                                        onChange={(e) => {
                                                            setDoseMed(e.target.value)
                                                            setDirectionsFunction(takeMed, PRNIndicationObject.label, e.target.value, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                                maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate
                                                            )
                                                            if (advanceChecks.initDispensingPeriod) {
                                                                let quantity = calculateInitialDispensingQuantity(takeMed, advanceChecks.initialDispensingPeriodVal, advanceChecks.trialType, frequencyMed, doseRange, e.target.value)
                                                                setAdvanceChecks({
                                                                    ...advanceChecks,
                                                                    // initialDispensingQuantity: quantity,
                                                                })
                                                            }
                                                            if (frequencyMed || durationMed) {
                                                                setErrorMessages({
                                                                    ...errorMessages,
                                                                    quantity: '',
                                                                    doseRange: parseFloat(e.target.value) === 0 ? "Dose range cannot be zero." : parseFloat(e.target.value) <= parseFloat(takeMed) && doseRange ? `The dose range must be greater than the ${takeLabel.replace(":", "")}.` : null,
                                                                    dose: null,
                                                                    initDispensingPeriod: ''
                                                                })
                                                            } else {
                                                                setErrorMessages({
                                                                    ...errorMessages,
                                                                    doseRange: parseFloat(e.target.value) === 0 ? "Dose range cannot be zero." : parseFloat(e.target.value) <= parseFloat(takeMed) && doseRange ? `The dose range must be greater than the ${takeLabel.replace(":", "")}.` : null,
                                                                    dose: null,
                                                                    initDispensingPeriod: ''
                                                                })
                                                            }
                                                        }}
                                                        labelClass='label-small'
                                                        layout='flex-col flex-fill'
                                                        disabled={requiredFieldsObj.isTakeDisabled ? true : frequencyMed === "6" || isFreeTextDirections}
                                                        errorMessageDisplay={errorMessages?.doseRange != null && (
                                                            <span className="text-danger font-12">
                                                                {errorMessages?.doseRange}
                                                            </span>
                                                        )}

                                                    />
                                                </div> : null}
                                                <MButton
                                                    className={`margin-top-19 ${doseRange ? 'theme-button' : 'btn-primary'}`}
                                                    disabled={frequencyMed === "6" || requiredFieldsObj.isTakeDisabled || isFreeTextDirections}
                                                    onClick={() => {
                                                        setDoseRange(!doseRange)
                                                        setDirectionsFunction(takeMed, PRNIndicationObject.label, "", medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, !doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                            maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate
                                                        )
                                                        if (advanceChecks.initDispensingPeriod) {
                                                            let quantity = calculateInitialDispensingQuantity(takeMed, advanceChecks.initialDispensingPeriodVal, advanceChecks.trialType, frequencyMed, !doseRange, doseMed)
                                                            setErrorMessages({ ...errorMessages, initDispensingPeriod: '' })
                                                            setAdvanceChecks({
                                                                ...advanceChecks,
                                                                // initialDispensingQuantity: quantity,
                                                            })
                                                        }
                                                        setDoseMed('')
                                                    }}
                                                    children='Dose Range' />

                                                <MSelect
                                                    label='Dose Unit'
                                                    value={doseUnit}
                                                    isRequired
                                                    placeholder={'---Select---'}
                                                    disabled={requiredFieldsObj.isDoseUnitDisabled || isFreeTextDirections}
                                                    options={doseUnitOption || []}
                                                    onChange={(e) => {
                                                        setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed,
                                                            daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, e === "Other" ? "" : e,
                                                            isPRNMedicine, maxDosePer24Hour, e === "Other" ? "" : e
                                                            , medicineStartDate, medicineEndDate
                                                        )
                                                        setErrorMessages({
                                                            ...errorMessages,
                                                            doseunitError: null
                                                        })
                                                        if (e === "Other") {
                                                            setQuantityMed('')
                                                            setErrorMessages({ ...errorMessages, quantity: '' })
                                                        }
                                                        setDoseUnit(e)
                                                        setMaxDosePer24HourUnit(e)
                                                        setDoseUnitOtherValue("")
                                                    }}
                                                    labelClass='label-small label-style mt-0'
                                                    layout='flex-col flex-fill'
                                                    errorMessageDisplay={errorMessages?.doseunitError != null && (
                                                        <span className="text-danger font-12">
                                                            {errorMessages?.doseunitError}
                                                        </span>
                                                    )}


                                                />
                                                {doseUnit === "Other" &&
                                                    <MInput
                                                        isRequired
                                                        label='Other Dose Unit'
                                                        placeholder='Enter other dose unit'
                                                        labelClass='label-small label-style mt-0'
                                                        layout='flex-col flex-fill'
                                                        value={doseUnitOtherValue}
                                                        onChange={(e) => {
                                                            const input = e.target.value;
                                                            const alphabeticOnly = input.replace(/[^a-zA-Z]/g, '');
                                                            setDoseUnitOtherValue(alphabeticOnly)
                                                            setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData,
                                                                frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray,
                                                                IsBlisterPack, alphabeticOnly, isPRNMedicine, maxDosePer24Hour, alphabeticOnly
                                                                , medicineStartDate, medicineEndDate
                                                            )
                                                            setErrorMessages({ ...errorMessages, doseUnitOtherValueError: null })
                                                        }}
                                                        errorMessageDisplay={errorMessages?.doseUnitOtherValueError != null && (
                                                            <span className="text-danger font-12">
                                                                {errorMessages?.doseUnitOtherValueError}
                                                            </span>
                                                        )}
                                                    />
                                                }
                                            </div>
                                            <MSelect
                                                isRequired={true}
                                                label='Frequency'
                                                allowClear={true}
                                                disabled={requiredFieldsObj.isFrequencyDisabled || isFreeTextDirections}
                                                labelClass='label-small label-style mt-0'
                                                layout='flex-col w-10per'
                                                value={frequencyMed}
                                                placeholder={'---Select---'}
                                                onChange={(e) => {
                                                    setFrequencyMed(e)
                                                    handleFrequencyChange(e)
                                                    // handleAdminCancel()
                                                    setErrorMessages({ ...errorMessages, frequency: '', initDispensingPeriod: '' })
                                                    if (e) {
                                                        if (advanceChecks.initDispensingPeriod) {
                                                            let quantity = calculateInitialDispensingQuantity(takeMed, advanceChecks.initialDispensingPeriodVal, advanceChecks.trialType, e, doseRange, doseMed)
                                                            setAdvanceChecks({
                                                                ...advanceChecks,
                                                                // initialDispensingQuantity: quantity,
                                                            })
                                                        }
                                                        if (e === "8") {
                                                            setisPRNMedicine(false)
                                                            setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, e, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, false,
                                                                "", maxDosePer24HourUnit, medicineStartDate, medicineEndDate
                                                            )

                                                            setMaxDosePer24Hour("")
                                                        } else {
                                                            setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, e, durationMed, daysMed, doseRange,
                                                                quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                                maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate
                                                            )
                                                        }
                                                    }
                                                }}
                                                className='w-340'
                                                options={medicationArray?.frequencyArray || []}
                                                errorMessageDisplay={errorMessages?.frequency != null && (
                                                    <span className="text-danger font-12">
                                                        {errorMessages?.frequency}
                                                    </span>
                                                )}
                                            />
                                        </>
                                    )
                            }

                        </div>
                        <div className="d-flex px-3 mb-3 gap-1">
                            <MButton
                                disabled={requiredFieldsObj.isPRNMedicineDisabled}
                                className={`margin-top-19 mb-3 ${isPRNMedicine ? 'theme-button' : 'btn-primary'}`}
                                onClick={() => {

                                    chkPRNChange(!isPRNMedicine)
                                }}
                                children='PRN' />
                            <div className="d-flex gap-1">
                                {isGettingAutoPopulatedDuration ? (
                                    <div className={'flex-col'}>
                                        <label className={`label-style label-small label-style mt-0`}>Period to Supply <span className="text-danger">*</span></label>
                                        <Skeleton.Input active size="default" className='w-100' />
                                    </div>
                                ) :
                                    props.hideItem ?
                                        null : <MInputNumber
                                            isError={!durationMed ? true : false}
                                            // isRequired={requiredFieldsObj.isDurationRequired}
                                            label='Period to Supply'
                                            type='number'
                                            value={durationMed}
                                            maxLength={3}
                                            disabled={requiredFieldsObj.isDurationDisabled}
                                            onChange={(e) => {
                                                // const errorObject={}
                                                if (e.target.value) {
                                                    SetDurationType(true, e.target.value)
                                                }
                                                else {
                                                    setDurationMed("")
                                                    // setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, "", "1", doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                    //     maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate
                                                    // )
                                                    setDaysMed("1");
                                                }
                                                // setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, e.target.value, "1", doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                //     maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate)
                                                setQuantityDurationRequiredAttributes({ id: 'duration', durationMed: e.target.value, quantityMed: quantityMed })
                                                // setErrorMessages({ ...errorMessages, duration: '' })
                                                if (takeMed || doseMed) {
                                                    setErrorMessages({
                                                        ...errorMessages, quantity: '',
                                                        duration: parseFloat(e.target.value) === 0 ? "Period to Supply cannot be zero." : ""
                                                    })
                                                } else {
                                                    setErrorMessages({
                                                        ...errorMessages,
                                                        duration: parseFloat(e.target.value) === 0 ? "Period to Supply cannot be zero." : ""
                                                    })
                                                }
                                            }
                                            }
                                            labelClass='label-small label-style mt-0'
                                            placeholder='Enter period to supply'
                                            layout='flex-col'
                                            errorMessageDisplay={errorMessages?.duration != null && (
                                                <span className="text-danger font-12">
                                                    {errorMessages?.duration}
                                                </span>
                                            )}
                                        />

                                }
                                {props.hideItem ?
                                    null : <div className="flex-col flex-fill margin-top-19">
                                        <MSelect
                                            label=''
                                            value={daysMed}
                                            allowClear={true}
                                            disabled={requiredFieldsObj.isDurationDisabled}
                                            // defaultValue={daysMed}
                                            onChange={(e) => {
                                                // setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, e, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                //     maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate)
                                                setDaysMed(e)
                                            }}
                                            options={daysOptions}
                                            labelClass='label-small'
                                            placeholder=' select Day(s)'
                                        />
                                    </div>}
                            </div>
                            {props.hideItem ?
                                null :
                                <div className="d-flex gap-1 flex-fill">
                                    {props.hideItem ?
                                        null : <>
                                            <MInputNumber
                                                // isRequired={requiredFieldsObj.isQuantityRequired}
                                                isError={!quantityMed ? true : false}
                                                label='Quantity to Supply'
                                                maxLength={50}
                                                placeholder='Enter quantity to supply'
                                                value={quantityMed}
                                                type='number'
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        // setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, Math.ceil(Number(e.target.value))?.toString(), unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                        //     maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate)

                                                        setQuantityDurationRequiredAttributes({ id: 'quantity', quantityMed: e.target.value, durationMed: durationMed })
                                                        setQuantityMed(Math.ceil(Number(e.target.value))?.toString())
                                                        setErrorMessages({
                                                            ...errorMessages,
                                                            quantity: parseFloat(e.target.value) === 0 ? "Quantity to Supply cannot be zero." : ""
                                                        })

                                                    }
                                                    else {
                                                        setErrorMessages({
                                                            ...errorMessages,
                                                            quantity: parseFloat(e.target.value) === 0 ? "Quantity to Supply cannot be zero." : ""
                                                        })
                                                        // setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, e.target.value, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                        //     maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate)
                                                        setIsDurationDisable(false)
                                                        setQuantityMed(e.target.value)
                                                    }
                                                }
                                                }
                                                labelClass='label-small label-style mt-0'
                                                min={0.1}
                                                layout='flex-col'
                                                errorMessageDisplay={errorMessages?.quantity != null && (
                                                    <span className="text-danger font-12">
                                                        {errorMessages?.quantity}
                                                    </span>
                                                )}
                                            />
                                            <MSelect
                                                label=''
                                                layout='flex-col flex-fill margin-top-19  w-10per '
                                                value={packageMed}
                                                allowClear={true}
                                                disabled={isQuantityUnitDisabled}
                                                onChange={(e, record) => {
                                                    if (e) {
                                                        setPackageMed(record.label)
                                                    } else {
                                                        setPackageMed("")
                                                    }
                                                }}
                                                options={medicationArray?.packageArray || []}
                                                labelClass='label-small label-style  mt-0'
                                                placeholder='---Select---'
                                            />
                                        </>}
                                </div>
                            }

                            <MSelect
                                label='Route'
                                isRequired={requiredFieldsObj.isRouteRequired}
                                labelClass='label-small label-style mt-0'
                                placeholder={'---Select---'}
                                layout='flex-col flex-fill w-25'
                                allowClear={true}
                                value={routeMed}
                                onChange={(e, record: any) => {
                                    if (e) {
                                        setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, record.label, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                            maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate)
                                        setRouteMed(e)
                                        setRouteMedText(record.label)
                                        setErrorMessages({ ...errorMessages, route: null })
                                    } else {
                                        setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, "", medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                            maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate)
                                        setRouteMed("")
                                        setRouteMedText("")
                                    }
                                }}
                                options={medicationArray?.routeArray || []}
                                errorMessageDisplay={errorMessages?.route != null && (
                                    <span className="text-danger font-12">
                                        {errorMessages?.route}
                                    </span>
                                )}
                            />
                            {props.generateScriptSc ? null : <MSelect
                                label='Indication'
                                placeholder="Select indication"
                                labelClass='label-small label-style mt-0'
                                layout='flex-col flex-fill w-25'
                                className='w-100'
                                allowClear={true}
                                laoding={isMedicationDetailsAddEditLoading || isIndicationTypeLoading || isAllMedicationForEditLoading}
                                options={indicationTypes}
                                value={PRNIndicationObject.label}
                                // value={isMedicationDetailsAddEditLoading || isIndicationTypeLoading || isAllMedicationForEditLoading ? null : PRNIndicationObject.label}
                                open={openDropdown}
                                onDropdownVisibleChange={(open) => setOpenDropdown(open)}
                                onChange={(value: any, record: any) => {
                                    if (value) {
                                        setDirectionsFunction(takeMed, record.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine, maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate)
                                        setPRNIndicationObject({
                                            value: value,
                                            label: record.label,
                                            isFromFrontEnd: record.isFromFronEnd
                                        })
                                    } else {
                                        setDirectionsFunction(takeMed, "", doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine, maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate)

                                        setPRNIndicationObject({
                                            value: null,
                                            label: '',
                                            isFromFrontEnd: false
                                        })

                                    }
                                }}
                                dropdownRender={(menu) => (
                                    <>
                                        {menu}
                                        <Divider className='m-2' />
                                        <div className='d-flex w-100 align-items-end ps-2 justify-content-between gap-1'>
                                            <MInput
                                                isRequired
                                                label='Custom Indication'
                                                placeholder="Please enter indication"
                                                value={dropDownNewItem}
                                                onPressEnter={addItem}
                                                layout='flex-fill w-100'
                                                className='flex-fill'
                                                onChange={(e) => { handleInputChange(e) }}
                                            />
                                            <MButton
                                                children='Add'
                                                className='theme-button'
                                                onClick={addItem}
                                            />

                                        </div>
                                        {errorMessage && <small className="text-danger ps-2">{errorMessage}</small>}
                                    </>
                                )}
                            // errorMessageDisplay={error?.indicationTypes}
                            />}
                        </div>
                        <div className="d-flex px-3 mb-3 gap-1">
                            <div className={`d-flex ms-0 ps-0  gap-1 flex-fill ${props.isFromMDRInformation == true ? "w-75 pe-0" : "w-75"}`}>


                                {props.generateScriptSc ? null : <>
                                    {/* <MInput
                  placeholder="indication"
                  layout="d-flex flex-column"
                  label="Indication"
                  labelClass='label-small label-style mt-0'
                  value={ PRNIndicationObject}
                  onChange={(e: any) => {
                        setPRNIndicationObject(e.target.value)
                    
                }}
                /> */}
                                    <MInputNumber
                                        label='Max dose per 24h'
                                        placeholder='Enter max dose per 24h'
                                        disabled={requiredFieldsObj.isMaxDosePerHourDisabled}
                                        value={maxDosePer24Hour}
                                        type='number'
                                        onChange={(e) => {
                                            const newMaxDose = e.target.value;

                                            setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine, newMaxDose, maxDosePer24HourUnit, medicineStartDate, medicineEndDate);
                                            setMaxDosePer24Hour(newMaxDose);

                                            setErrorMessages({
                                                ...errorMessages,
                                                "maxDose":
                                                    parseFloat(newMaxDose) === 0
                                                        ? "Max dose cannot be zero."
                                                        // : parseFloat(newMaxDose) === parseFloat(takeMed)
                                                        //     ? "Max dose cannot be same as dose."
                                                        : parseFloat(newMaxDose) < parseFloat(takeMed)
                                                            ? "Max dose cannot be less than dose."
                                                            : ""
                                            });
                                        }}
                                        labelClass='label-small label-style mt-0'
                                        min={1}
                                        max={9999}
                                        layout='flex-col'
                                        errorMessageDisplay={errorMessages?.maxDose != null && (
                                            <span className="text-danger font-12">
                                                {errorMessages?.maxDose}
                                            </span>
                                        )}
                                    />


                                    {/* <MInputNumber
                                    label='Max dose per 24h'
                                    placeholder='Enter max dose per 24h'
                                    disabled={requiredFieldsObj.isMaxDosePerHourDisabled}
                                    value={maxDosePer24Hour}
                                    type='number'
                                    onChange={(e) => {
                                        setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine, e.target.value, maxDosePer24HourUnit, medicineStartDate, medicineEndDate)
                                        setMaxDosePer24Hour(e.target.value)
                                        setErrorMessages({
                                            ...errorMessages,
                                            "maxDose": parseFloat(e.target.value) === 0 ? "Max dose cannot be zero." : parseFloat(e.target.value) <= parseFloat(takeMed) ? "Max dose cannot be less than dose." : ""
                                        })
                                    }}
                                    labelClass='label-small label-style mt-0'
                                    min={1}
                                    max={9999}
                                    layout='flex-col'
                                    errorMessageDisplay={errorMessages?.maxDose != null && (
                                        <span className="text-danger font-12">
                                            {errorMessages?.maxDose}
                                        </span>
                                    )}
                                /> */}
                                    <MSelect
                                        label='Max Dose Unit'
                                        layout='flex-col'
                                        value={maxDosePer24HourUnit}
                                        disabled={requiredFieldsObj.isMaxDosePerHourDisabled}
                                        allowClear={true}
                                        onChange={(e) => {
                                            setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed,
                                                durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray,
                                                IsBlisterPack, e === "Other" ? "" : e, isPRNMedicine, maxDosePer24Hour, e === "Other" ? "" : e, medicineStartDate, medicineEndDate)
                                            setMaxDosePer24HourUnit(e)
                                            setDoseUnit(e)
                                        }}
                                        options={doseUnitOption || []}
                                        labelClass='label-small label-style mt-0'
                                        placeholder='---Select---'
                                    />
                                </>}
                                {props.hideItem ?
                                    null : <>
                                        <MInputNumber
                                            label='Repeats'
                                            placeholder='Enter repeats'
                                            value={repeats}
                                            type='number'
                                            onChange={(e) => {
                                                setReapets(e.target.value)
                                                setErrorMessages({ ...errorMessages, repeatsError: parseFloat(e.target.value) == 0 ? "Repeats cannot be zero." : null })
                                            }}
                                            labelClass='label-small label-style mt-0'
                                            min={1}
                                            maxLength={4}
                                            layout='flex-col'
                                            errorMessageDisplay={errorMessages?.repeatsError != null && (
                                                <span className="text-danger font-12">
                                                    {errorMessages?.repeatsError}
                                                </span>
                                            )}
                                        />
                                        {/* {props.generateScriptSc ? null : <MButton
                                        onClick={() => setIsMedicationUpdateOnly(!isMedicationUpdateOnly)}
                                        className={`margin-top-19 ${isMedicationUpdateOnly ? 'theme-button' : 'btn-primary'}`}
                                    >
                                        Medication update only
                                    </MButton>} */}
                                    </>}
                                {/* <MButton
                                className={`margin-top-19 width-100pixels ${isLongTermMedication ? 'theme-button' : 'btn-primary'}`}
                                onClick={() => { setIsLongTermMedication(!isLongTermMedication) }}
                                children={isLongTermMedication ? "Long Term" : "Short Term"} /> */}
                                <div className='d-flex align-items-end w-50 gap-1'>
                                    {/* 
                                Not needed Long/Short Term toggle button
                                <MRadioGroup
                                    options={[
                                        {
                                            label: 'Long Term',
                                            value: true
                                        },
                                        {
                                            label: 'Short Term',
                                            value: false
                                            },

                                    ]}
                                    selectedValue={isLongTermMedication}
                                    setSelectedValue={() => {
                                        setIsLongTermMedication(!isLongTermMedication)
                                        }}
                                        
                                        /> */}
                                    <MButton
                                        className={` ${IsLongTerm ? 'theme-button' : 'btn-primary'}`}
                                        onClick={() => { setIsLongTerm(!IsLongTerm) }}
                                        children='Long Term' />
                                    {subscriptionPlans.hasOwnProperty("Administration") && <MButton
                                        children={saveAdminData ? 'Edit Administration' : 'Add to Administration'}
                                        className={addToAdmin ? 'theme-button' : 'btn-primary'}
                                        onClick={() => {
                                            if (frequencyMed) {
                                                // if (addToAdmin) {
                                                //     handleAdminCancel();
                                                // }
                                                setAddtoAdmin(true); // toggle
                                                setAddtoAdminDrawer(true)
                                            } else {
                                                setErrorMessages({
                                                    ...errorMessages,
                                                    frequency: 'Please select frequency first',
                                                });
                                            }
                                        }}
                                    />}
                                    <Dropdown
                                        menu={{ items }}
                                        trigger={["click"]}
                                        placement="bottomRight"
                                    >
                                        <MButton
                                            className={` ${IsBlisterPack ? 'theme-button' : 'btn-primary'}`}
                                            children='Blister Pack' />
                                    </Dropdown>
                                    {/* <MButton
                                            className={` ${IsBlisterPack ? 'theme-button' : 'btn-primary'}`}
                                            onClick={() => {
                                                // setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData, frequencyMed, durationMed, daysMed, doseRange, quantityMed, unitMed, routeMedText, medicationArray?.frequencyArray, !IsBlisterPack, doseUnit, isPRNMedicine, maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, medicineEndDate)
                                                setIsBlisterPack(!IsBlisterPack)
                                                let sig = additionalDirections || "";
                                                sig = sig.replaceAll("please blister pack.", "").trim();
                                                if (!IsBlisterPack) {
                                                    if (!sig.toLowerCase().includes("please blister pack.")) {
                                                        sig = `${sig} please blister pack.`.trim();
                                                    }
                                                }
                                                setAdditionalDirections(sig);
                                                setAdditionalAdminDirections(sig);
                                            }}
                                            children='Blister Pack' /> */}
                                </div>
                            </div>
                        </div>
                        <div className='d-flex gap-2 px-3'>
                            <div className={'flex-col mb-3 width-30percent'}>
                                <div className='d-flex justify-content-between'>
                                    <label className={`label-style ${'mt-0'}`}>{"Directions"} <span className="text-danger">*</span></label>
                                    <MCheckbox checked={isFreeTextDirections} text="Free text directions" onChange={() => {
                                        setIsFreeTextDirections(!isFreeTextDirections)
                                    }}
                                    />
                                </div>
                                <TextArea
                                    value={directions}
                                    showCount={true}
                                    disabled
                                    maxLength={1000}
                                    onChange={(e) => {
                                        setDirections(e.target.value)
                                        setAdminDirections(e.target.value)
                                        setErrorMessages({ ...errorMessages, directions: null })
                                        setIsDirectionManuallyEntered(true)
                                    }}
                                />
                                {errorMessages?.directions != null && (
                                    <span className="text-danger font-12">
                                        {errorMessages?.directions}
                                    </span>
                                )}
                            </div>
                            <MTextArea
                                label={`Additional Directions (Shows on ${isISPRXLite ? "list" : "chart"} and script)`}
                                labelClass='mt-0 padding-bottom-three-pixels'
                                layout='flex-col mb-3 width-70percent'
                                showCount={true}
                                value={additionalDirections}
                                maxLength={1000}
                                onChange={(e) => {
                                    setAdditionalDirections(e.target.value)
                                    setAdditionalAdminDirections(e.target.value)
                                }}
                            />
                        </div>

                        <div className='d-flex gap-2 px-3'>
                            <MTextArea
                                label='Information for Pharmacy only'
                                labelClass='label-small'
                                layout='flex-col flex-fill mb-4'
                                maxLength={500}
                                showCount={true}
                                value={advanceChecks.privatePharmacistsOnly}
                                onChange={(e) => setAdvanceChecks({
                                    ...advanceChecks,
                                    privatePharmacistsOnly: e.target.value
                                })}
                            />
                            <MTextArea
                                label='Prescribing Reason'
                                labelClass='label-small'
                                maxLength={200}
                                showCount={true}
                                layout='flex-col flex-fill mb-4'
                                value={advanceChecks.prescribingReason}
                                onChange={(e) => setAdvanceChecks({
                                    ...advanceChecks,
                                    prescribingReason: e.target.value
                                })} />
                        </div>

                        <div className="d-flex gap-1 px-3 ">
                            {/*
                        Not needed Current Prescriber DD
                        <MSelect
                            // isRequired={true}
                            label='Current Prescriber'
                            allowClear={true}
                            labelClass='label-small'
                            placeholder='Select Prescriber'
                            layout='flex-col w-10per mb-3'
                            options={medicationArray?.providerListArray || []}
                            onChange={(e) => {
                                setErrorMessages({ ...errorMessages, prescriber: null })
                                setCurrnetPrescriberID(e)
                            }}
                            value={currnetPrescriberID}
                            defaultValue={currnetPrescriberID}
                            errorMessageDisplay={errorMessages?.prescriber != null && (
                                <span className="text-danger font-12">
                                    {errorMessages?.prescriber}
                                </span>
                            )}
                        /> */}
                            {props.generateScriptSc ? null :
                                <>
                                    {/* {!isISPRXLite && <MDate
                                isRequired={true}
                                label='Inserted Date'
                                labelClass='label-small'
                                layout='flex-col mb-3'
                                value={medicineInsertedDate}
                                onChange={(e) => {
                                    setMedicineInsertedDate(e)
                                }}
                            />
                            } */}
                                    {!isISPRXLite && <>
                                        <MDate
                                            // isRequired
                                            layout='flex-col mb-3'
                                            label='Start Date'
                                            allowClear
                                            labelClass='label-small'
                                            placeholder='Select start date & time'
                                            // disabledDate={disableFromDate}
                                            value={medicineStartDate}
                                            onChange={(e) => {
                                                setMedicineStartDate(e)
                                                // setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData,
                                                //     frequencyMed == "8" ? "" : frequencyMed, durationMed, daysMed, doseRange, quantityMed,
                                                //     unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                //     maxDosePer24Hour, maxDosePer24HourUnit, e, medicineEndDate
                                                // )
                                                setErrorMessages({ ...errorMessages, startDateError: null })
                                                if (e == null) {
                                                    setMedicineStartTime(null)
                                                    // let sig = additionalDirections || "";
                                                    // sig = sig.replace(/Start:\s*\d{2}\/\d{2}\/\d{4}/, ``);

                                                    // setAdditionalDirections(sig);
                                                    // setAdditionalAdminDirections(sig)
                                                }
                                            }}
                                            errorMessageDisplay={errorMessages?.startDateError != null && (
                                                <span className="text-danger font-12">
                                                    {errorMessages?.startDateError}
                                                </span>
                                            )}
                                        />
                                        <MTime
                                            // isRequired
                                            label='Start Time'
                                            layout='flex-col mb-3'
                                            placeholder='Select start time'
                                            format={"hh:mm A"}
                                            value={medicineStartTime}
                                            labelClass='label-small'
                                            allowClear
                                            onChange={(e) => {
                                                setErrorMessages({ ...errorMessages, startTimeError: null })
                                                setMedicineStartTime(e)
                                            }}
                                            errorMessageDisplay={errorMessages?.startTimeError != null && (
                                                <span className="text-danger font-12">
                                                    {errorMessages?.startTimeError}
                                                </span>
                                            )}
                                        />
                                        <MDate
                                            // isRequired
                                            labelClass='label-small'
                                            label='End Date'
                                            placeholder='Select end date '
                                            layout='flex-col mb-3'
                                            value={medicineEndDate}
                                            allowClear
                                            disabledDate={disableToDate}
                                            onChange={(e) => {
                                                setMedicineEndDate(e)
                                                // setDirectionsFunction(takeMed, PRNIndicationObject.label, doseMed, medicationDetailsAddEditData,
                                                //     frequencyMed == "8" ? "" : frequencyMed, durationMed, daysMed, doseRange, quantityMed,
                                                //     unitMed, routeMedText, medicationArray?.frequencyArray, IsBlisterPack, doseUnit, isPRNMedicine,
                                                //     maxDosePer24Hour, maxDosePer24HourUnit, medicineStartDate, e
                                                // )
                                                if (medicineEndTime === null)
                                                    setMedicineEndTime(dayjs("12:00 am", "hh:mm a"))
                                                setErrorMessages({ ...errorMessages, endDateError: null, endTimeError: null })
                                                if (e == null) {
                                                    setMedicineEndTime(null)
                                                    // let sig = additionalDirections || "";
                                                    // sig = sig.replace(/Stop:\s*\d{2}\/\d{2}\/\d{4}/, ``);

                                                    // setAdditionalDirections(sig);
                                                    // setAdditionalAdminDirections(sig)
                                                }
                                            }}
                                            errorMessageDisplay={errorMessages?.endDateError != null && (
                                                <span className="text-danger font-12">
                                                    {errorMessages?.endDateError}
                                                </span>
                                            )}
                                        />
                                        <MTime
                                            // isRequired
                                            label='End Time'
                                            layout='flex-col mb-3'
                                            placeholder='Select end time'
                                            format={"hh:mm A"}
                                            value={medicineEndTime}
                                            allowClear
                                            labelClass='label-small'
                                            onChange={(e) => {
                                                setErrorMessages({ ...errorMessages, endTimeError: null })
                                                setMedicineEndTime(e)
                                            }}
                                            errorMessageDisplay={errorMessages?.endTimeError != null && (
                                                <span className="text-danger font-12">
                                                    {errorMessages?.endTimeError}
                                                </span>
                                            )}

                                        />
                                    </>}
                                </>}
                            {props.hideItem ?
                                null :
                                !isISPRXLite ? <MSelect
                                    label='Pharmacy'
                                    // isRequired
                                    labelClass='label-small'
                                    placeholder={'---Select---'}
                                    layout='flex-col w-25 mb-3'
                                    allowClear={true}
                                    value={selectedPharmacyID}
                                    onChange={(e) => {
                                        if (e) {
                                            setErrorMessages({ ...errorMessages, pharmacy: null })
                                            setSelectedPharmacyID(e)
                                        } else {
                                            setSelectedPharmacyID(null)
                                        }
                                    }}
                                    options={allPharmaciesData || []}
                                    errorMessageDisplay={errorMessages?.pharmacy != null && (
                                        <span className="text-danger font-12">
                                            {errorMessages?.pharmacy}
                                        </span>
                                    )}
                                /> : null
                            }

                            {/* <div className='d-flex padding-top-20'>
                            {props.generateScriptSc ? null :
                                <> <MButton
                                    className={`mb-3 ms-1 ${IsLongTerm ? 'theme-button' : 'btn-primary'}`}
                                    onClick={() => { setIsLongTerm(!IsLongTerm) }}
                                    children='Long Term' />
                                    {props?.isFromMDRInformation !== true &&
                                        <div className='med-switch-btn p-2'>
                                            <MCheckbox
                                                text={'Add to Medication Chart'}
                                                className='ml-2 clr-green'
                                                checked={isAddToMedicationChart}
                                                onChange={() => {
                                                    setIsAddToMedicationChart(!isAddToMedicationChart)
                                                }}
                                            />
                                        </div>
                                    }
                                </>
                            }
                        </div> */}

                        </div>
                        {props.generateScriptSc ? <MTextArea
                            layout='flex-col px-3 mb-3'
                            label='Message to Pharmacist'
                            maxLength={100}
                            showCount={true}
                            value={chatToPharmacist}
                            onChange={(enteredValue: any) => {
                                setchatToPharmacist(enteredValue.target.value)
                            }} /> : null}
                        <div className="d-flex gap-1 px-3 ">

                        </div>
                        {props.generateScriptSc ? null : <div className="d-flex gap-1 px-3">
                            {((allMedicationForEdit?.mdrMedicineData[0]?.SAFORMNO !== null &&
                                allMedicationForEdit?.mdrMedicineData[0]?.SAFORMNO !== "" &&
                                allMedicationForEdit?.mdrMedicineData[0]?.SAFORMNO !== undefined) || (props?.selectedMedicine !== null && (props.selectedMedicine?.SAFormID || props.selectedMedicine.saFormID))) ?
                                <div className='d-flex gap-1 flex-fill'>
                                    {/* <MSelect
                                    // isRequired={true}
                                    // isError={!saStatusMed ? true : false}
                                    label='SA Status'
                                    labelClass='label-small'
                                    layout='flex-col w-25 mb-3'
                                    allowClear={true}
                                    value={saStatusMed}
                                    placeholder={'---Select---'}
                                    onChange={(e) => {
                                        setErrorMessages({ ...errorMessages, SAStatusError: "" })
                                        setSAStatusMed(e)
                                    }}
                                    options={medicationArray?.saStatusArray || []}
                                    errorMessageDisplay={errorMessages?.SAStatusError != null && (
                                        <span className="text-danger font-12">
                                            {errorMessages?.SAStatusError}
                                        </span>
                                    )}
                                /> */}
                                    <MInputNumber
                                        // isRequired={true}
                                        label='SA Number'
                                        labelClass='label-small'
                                        placeholder='Enter SA Number'
                                        layout='flex-col mb-3'
                                        value={saFormNumberMed}
                                        min={1}
                                        maxLength={10}
                                        onChange={(e) => {
                                            setErrorMessages({ ...errorMessages, SANumberError: "" })
                                            setSAFormNumberMed(e.target.value)
                                        }}
                                    // errorMessageDisplay={errorMessages?.SANumberError != null && (
                                    //     <span className="text-danger font-12">
                                    //         {errorMessages?.SANumberError}
                                    //     </span>
                                    // )}
                                    />
                                    <MDate
                                        // isRequired={!SAExpiry ? true : false}
                                        label='Expiry Date'
                                        labelClass='label-style label-small'
                                        layout='flex-col w-25 mb-3'
                                        disable={SAExpiry}
                                        disabledDate={disableDate}
                                        value={expiryDate}
                                        onChange={(e) => {
                                            setExpiryDate(e)
                                            setErrorMessages({ ...errorMessages, SAExpiryError: null })
                                        }
                                        }
                                        errorMessageDisplay={(errorMessages?.SAExpiryError != null) && (
                                            <span className="text-danger font-12">
                                                {errorMessages?.SAExpiryError}
                                            </span>
                                        )}
                                    />
                                    <MButton
                                        className={`mb-3  margin-top-20 ${SAExpiry ? 'theme-button' : 'btn-primary'}`}
                                        onClick={() => {
                                            setSAExpiry(!SAExpiry)
                                            setExpiryDate('')
                                            setErrorMessages({ ...errorMessages, SAExpiryError: null })
                                        }
                                        }
                                        children='SA Lifetime' />
                                    {/* {isExpired && */}
                                    {(isAllMedicationForEditLoading || isMedicationDetailsAddEditLoading) ? null :
                                        isRenewButtonShown &&
                                        <MButton
                                            children={`${isSARenewButton ? "Renew SA" : "Apply for SA"}`}
                                            className={'mb-3  margin-top-20 theme-button'}
                                            onClick={() => {
                                                props.setIsSAmodal(true)
                                            }}
                                        />
                                    }
                                    {/* } */}
                                </div> : null}

                            {
                                isRecomemended ? <div className='d-flex gap-2 align-items-center'>
                                    <MSelect
                                        // isRequired={true}
                                        label='Specialist Name'
                                        labelClass='label-small'
                                        layout='flex-col flex-fill mb-3'
                                        value={specialistName}
                                        onChange={(e) => {
                                            // setErrorMessages({ ...errorMessages, SASpecialistNameError: null })
                                            setSpecialistName(e)
                                        }}
                                        options={medicationArray?.providerListArray || []}
                                    // errorMessageDisplay={(errorMessages?.SASpecialistNameError != null) && (
                                    //     <span className="text-danger font-12">
                                    //         {errorMessages?.SASpecialistNameError}
                                    //     </span>
                                    // )}
                                    />
                                    <MDate
                                        label='Recommendation Date'
                                        // isRequired
                                        labelClass='label-style label-small'
                                        layout='flex-col flex-fill mb-3'
                                        value={recommendationDate}
                                        onChange={(date) => {
                                            setRecommendationDate(date)
                                            // setErrorMessages({ ...errorMessages, SARecommendationDateError: null })
                                        }}
                                    // errorMessageDisplay={(errorMessages?.SARecommendationDateError != null) && (
                                    //     <span className="text-danger font-12">
                                    //         {errorMessages?.SARecommendationDateError}
                                    //     </span>
                                    // )}
                                    />

                                </div> : null
                            }
                        </div>}
                        {props.generateScriptSc ? null : <div className="px-3 mb-3">
                            <MCollapse
                                headertext={<div className='d-flex justify-content-between'>
                                    <span>Additional Options</span>
                                    <span>{checkedButtonCount}/12</span>
                                </div>}
                                expandIconPosition="end"
                                activeKey={activeKey}
                                onChange={() => {
                                    setActiveKey(activeKey === 0 ? 1 : 0)
                                }}
                                children={<div className=''>
                                    <div className='d-flex gap-1 flex-wrap mt-3'>
                                        <div className='d-flex gap-2 flex-wrap'>
                                            <MButton
                                                className={advanceChecks.gsAllowed ? 'theme-button' : 'btn-primary'}
                                                onClick={() => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        gsAllowed: !advanceChecks.gsAllowed
                                                    })
                                                }} children='Generic Substitution Allowed' />
                                            <MButton
                                                className={advanceChecks.frequentlyDispensed ? 'theme-button' : 'btn-primary'}
                                                onClick={() => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        frequentlyDispensed: !advanceChecks.frequentlyDispensed
                                                    })
                                                    setErrorMessages({ ...errorMessages, freqDispensedPeriod: '' })
                                                }} children='Frequently Dispensed' />
                                            <MButton
                                                className={advanceChecks.useGenericName ? 'theme-button' : 'btn-primary'}
                                                onClick={() => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        useGenericName: !advanceChecks.useGenericName
                                                    })
                                                }} children='Use Generic Name or Label' />
                                            <MButton
                                                className={advanceChecks.privateFunded ? 'theme-button' : 'btn-primary'}
                                                onClick={() => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        privateFunded: !advanceChecks.privateFunded
                                                    })
                                                }} children='Private Funded' />
                                            <MButton
                                                className={advanceChecks.unusualDose ? 'theme-button' : 'btn-primary'}
                                                onClick={() => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        unusualDose: !advanceChecks.unusualDose
                                                    })
                                                }} children='Unusual Dose or Quantity' />

                                            <MPopConfirm
                                                title={null}
                                                description={`Unchecking Free-text directions will clear Directions, ${takeLabel.replaceAll(":", "")} and Frequency, Are you sure you want to proceed?`}
                                                disabled={!(advanceChecks.variableDose)}
                                                onConfirm={() => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        variableDose: false
                                                    })
                                                    onVariableDoseBootBoxConfirm()
                                                }}
                                                onCancel={() => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        variableDose: true
                                                    })
                                                    onVariableDoseBootBoxCancel()
                                                }}
                                                okText="Yes"
                                                cancelText="No"
                                            >
                                                <MButton
                                                    className={advanceChecks.variableDose ? 'theme-button' : 'btn-primary'}
                                                    children='Variable Dose'
                                                    onClick={!(advanceChecks.variableDose) ? () => {
                                                        onHandeVariableDoseClicked()
                                                        setAdvanceChecks({
                                                            ...advanceChecks,
                                                            variableDose: true
                                                        })
                                                    } : undefined}
                                                />
                                            </MPopConfirm>
                                            <MButton
                                                className={advanceChecks.initDispensingPeriod ? 'theme-button' : 'btn-primary'}
                                                onClick={() => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        initDispensingPeriod: !advanceChecks.initDispensingPeriod,
                                                        trialType: "1",
                                                        initialDispensingPeriodVal: "",
                                                        initialDispensingQuantity: "",
                                                        trialPeriodReason: ""
                                                    })
                                                    setErrorMessages({ ...errorMessages, initDispensingPeriod: '', initialDispensingQuantity: '' })
                                                }} children='Initial Dispensing Period' />
                                            <MButton
                                                className={advanceChecks.confidential ? 'theme-button' : 'btn-primary'}
                                                onClick={() => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        confidential: !advanceChecks.confidential,
                                                        patientConsent: !!advanceChecks.confidential

                                                    })
                                                }} children='Confidential' />
                                            <MButton
                                                className={advanceChecks.ltcAssessment ? 'theme-button' : 'btn-primary'}
                                                onClick={() => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        ltcAssessment: !advanceChecks.ltcAssessment
                                                    })
                                                }} children='Pharmacy LTC Assessment' />
                                            <MButton
                                                className={advanceChecks.patientConsent ? 'theme-button' : 'btn-primary'}
                                                onClick={() => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        patientConsent: !advanceChecks.patientConsent,
                                                        confidential: !!advanceChecks.patientConsent
                                                    })
                                                }} children='Patient Consent' />
                                            <MButton
                                                className={advanceChecks.compassionateSupply ? 'theme-button' : 'btn-primary'}
                                                onClick={() => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        compassionateSupply: !advanceChecks.compassionateSupply
                                                    })
                                                }} children='Compassionate Supply' />
                                            <MButton
                                                className={advanceChecks.prescribedExternally ? 'theme-button' : 'btn-primary'}
                                                disabled
                                                onClick={() => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        prescribedExternally: !advanceChecks.prescribedExternally
                                                    })
                                                }} children='Prescribed Externally' />

                                        </div>
                                    </div>

                                    {advanceChecks.initDispensingPeriod ?
                                        <div className='d-flex gap-1 my-3 flex-wrap'>

                                            <MInputNumber
                                                type='number'
                                                layout='w-25'
                                                min={1}
                                                maxLength={3}
                                                label='Initial Dispensing Period'
                                                placeholder='Enter Dispensing Period'
                                                value={advanceChecks.initialDispensingPeriodVal}
                                                labelClass='label-small label-style mt-0 mb-0'
                                                onChange={(e) => {
                                                    let val = e.target.value
                                                    let calculatedDuration: any = SetDurationType(false, val)
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        trialType: val ? calculatedDuration?.daysMed : "1",
                                                        initialDispensingPeriodVal: val ? calculatedDuration?.durationMed : "",
                                                    })
                                                    if (calculatedDuration?.daysMed === daysMed && Number(calculatedDuration?.durationMed) > Number(durationMed) && (durationMed !== "" && durationMed !== undefined && durationMed !== null)) {
                                                        setErrorMessages({ ...errorMessages, initDispensingPeriod: 'Initial dispensing period should not be greater than actual duration' })
                                                    } else {
                                                        setErrorMessages({ ...errorMessages, initDispensingPeriod: '' })
                                                    }
                                                }
                                                }
                                                errorMessageDisplay={errorMessages?.initDispensingPeriod != null && (
                                                    <span className="text-danger font-12 w-25">
                                                        {errorMessages?.initDispensingPeriod}
                                                    </span>
                                                )}
                                            />


                                            <MSelect
                                                layout='margin-top-22'
                                                value={advanceChecks.trialType}
                                                allowClear={true}
                                                onChange={(e) => {
                                                    if (advanceChecks.initDispensingPeriod) {
                                                        let quantity = calculateInitialDispensingQuantity(takeMed, advanceChecks.initialDispensingPeriodVal, e, frequencyMed, doseRange, doseMed)
                                                        setAdvanceChecks({
                                                            ...advanceChecks,
                                                            trialType: e
                                                        })
                                                        let num = quantity
                                                    }
                                                }}
                                                options={daysOptions}
                                                labelClass='label-small'
                                                placeholder=' select Day(s)'
                                            />


                                            <MInputNumber
                                                type='number'
                                                min={1}
                                                layout='w-20per'
                                                label='Initial Dispensing Quantity'
                                                labelClass='label-small label-style mt-0 mb-0'
                                                value={advanceChecks.initialDispensingQuantity}
                                                onChange={(e) => {
                                                    setErrorMessages({ ...errorMessages, initialDispensingQuantity: '' })
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        initialDispensingQuantity: e.target.value
                                                    })
                                                    let num = e.target.value
                                                    if (Number(num) > Number(quantityMed) && (quantityMed !== "" && quantityMed !== undefined && quantityMed !== null)) {
                                                        setErrorMessages({ ...errorMessages, initialDispensingQuantity: 'Quantiy must be less than actual quantity' })
                                                    } else {
                                                        setErrorMessages({ ...errorMessages, initialDispensingQuantity: '' })
                                                    }
                                                }

                                                }
                                                errorMessageDisplay={errorMessages?.initialDispensingQuantity != null && (
                                                    <span className="text-danger font-12 w-25">
                                                        {errorMessages?.initialDispensingQuantity}
                                                    </span>
                                                )}
                                            />
                                            <MInput
                                                label='Trial Period Reason'
                                                labelClass='label-small label-style mt-0 mb-0'
                                                value={advanceChecks.trialPeriodReason}
                                                onChange={(e) => setAdvanceChecks({
                                                    ...advanceChecks,
                                                    trialPeriodReason: e.target.value
                                                })}
                                            />
                                        </div> : null}

                                    {advanceChecks.frequentlyDispensed ?
                                        <div className='d-flex gap-1 my-3 flex-wrap'>
                                            <MInput
                                                type='number'
                                                layout='w-25'
                                                min={1}
                                                labelClass='label-small label-style mt-0'
                                                label='Dispensing Period'
                                                placeholder='Enter Dispensing Period'
                                                value={advanceChecks.freqDispensedPeriod}
                                                onChange={(e) => {
                                                    setAdvanceChecks({
                                                        ...advanceChecks,
                                                        freqDispensedPeriod: e.target.value
                                                    })
                                                    setErrorMessages({ ...errorMessages, freqDispensedPeriod: '' })
                                                }
                                                }
                                                errorMessageDisplay={errorMessages?.freqDispensedPeriod != null && (
                                                    <span className="text-danger font-12">
                                                        {errorMessages?.freqDispensedPeriod}
                                                    </span>
                                                )}

                                            />


                                            <MSelect
                                                layout='margin-top-22'
                                                value={advanceChecks.freqDispensedType}
                                                allowClear={true}
                                                // defaultValue={daysMed}
                                                onChange={(e) => setAdvanceChecks({
                                                    ...advanceChecks,
                                                    freqDispensedType: e
                                                })}
                                                options={daysOptions}
                                                labelClass='label-small label-style mt-0'
                                                placeholder=' select Day(s)'
                                            />

                                            {/* <MSelect
                                            layout='margin-top-22 w-20per'
                                            disabled={!advanceChecks.prescribedExternally ? true : false}
                                            placeholder={'--Select--'}
                                            className='w-100'
                                        /> */}

                                        </div> : null}

                                </div>} />
                        </div>}
                    </div>
                }
            </div>

            <DrawerContainer
                title={"Paracetamol/Brufen Calculator"}
                className="graph-drawer"
                width={"50%"}
                open={isCalculatorOpen}
                onCLose={() => setIsCalculatorOpen(false)}
                setOpen={setIsCalculatorOpen}
                showHeader={true}
                // showHeader={drawerType === "addPatient" ? false : true}
                children={
                    <Calculator setIsCalculatorOpen={setIsCalculatorOpen} />
                }
            />


            <MModal
                open={addToAdminDrawer}
                title='Medicine Administration'
                setOpen={(val: any) => setAddtoAdminDrawer(false)}
                isShowPatientHeader={false}
                onCancel={() => setAddtoAdminDrawer(false)}
                // onCancel={() => handleAdminCancel()}
                footer={[
                    <>
                        {!saveAdminData && <Popconfirm
                            placement="topRight"
                            title={false}
                            description={'Are you sure you want to cancel? Any unsaved changes will be lost.'}
                            onConfirm={() => handleAdminCancel()}
                            okText="Yes"
                            cancelText="No"
                        >

                            <MButton
                                key="back"
                                className='btn-dark justify-content-end '>
                                Cancel
                            </MButton>

                        </Popconfirm>}

                        <MButton className={'theme-button'} onClick={() => {
                            let isAllEmptyExist = true;
                            const hasCheckedDose = variableDoseArray.some(item =>
                                item?.doses?.some(dose => dose?.checked)
                            );
                            const checkedDoseCount = variableDoseArray.reduce((count, item) => {
                                return count + item?.doses?.filter(dose => dose?.checked).length;
                            }, 0);
                            if (hasCheckedDose) {
                                isAllEmptyExist = false;
                            }

                            const errors = { ...adminErrors };

                            if (!dFrom) { errors.range = 'Please select start date.'; }

                            if (["21", "22", "17"].includes(frequencyMed)) {
                                if (frequencyMed == "22" && selectedDays.length < 3) {
                                    errors.days = 'Please select at least three days.';
                                } else if (frequencyMed == "21" && selectedDays.length < 2) {
                                    errors.days = 'Please select at least two days.';
                                } else if (frequencyMed == "17" && selectedDays.length < 1) {
                                    errors.days = 'Please select at least one day.';
                                }
                            }

                            if (isAllEmptyExist && !isPRNMedicine && frequencyMed != "8" && frequencyMed != "23") { errors.timeCell = 'Please select the required number of time slots.'; }



                            if (["1", "2", "3", "4"].includes(frequencyMed)) {

                                if (frequencyMed != checkedDoseCount && !isAllEmptyExist) {
                                    errors.timeCell = `Please select at least ${frequencyMed} time slots.`
                                }
                            }

                            // if (frequencyMed == "16" && checkedDoseCount != 5 && !isAllEmptyExist) {
                            //     errors.timeCell = `Please select at least 5 time slots.`
                            // }
                            if (
                                (!isAllEmptyExist && (
                                    (frequencyMed == "16" && checkedDoseCount != 5) ||
                                    (frequencyMed == "7" && checkedDoseCount != 6) ||
                                    (frequencyMed == "12" && checkedDoseCount != 4) ||
                                    (frequencyMed == "13" && checkedDoseCount != 3) ||
                                    (frequencyMed == "14" && checkedDoseCount != 2)
                                ))
                            ) {
                                errors.timeCell = "Please select the required number of time slots.";
                            }


                            const hasErrors = (Object.values(errors) as string[]).some(errorMsg => errorMsg.trim() !== "");

                            if (hasErrors) {
                                setAdminErrors(errors);
                                return;
                            }
                            setAddtoAdminDrawer(false);
                            setSaveAdminData(true)
                        }}>
                            Save
                        </MButton>

                    </>

                ]}
            >
                <div>
                    <div className="find-med-header d-flex align-items-center justify-content-between border-bottom py-2">
                        <div className='d-flex flex-col gap-1'>
                            <span className='font-18' >
                                {props.generateScriptSc && props.selectedMedicine ? props.selectedMedicine.medicineDisplayName : props?.selectedMedicine?.MedicineName || props?.selectedMedicine?.medicineName || props?.selectedMedicine?.medicineDisplayName}</span>
                            {props.generateScriptSc ? null : <div className='d-flex gap-3'>
                                <div className=" font-14">
                                    <span className="fw-bold">{strengthLabel}: </span> {strengthIDMed ? strengthIDMed : '--'}
                                </div>
                                <div className="font-14">
                                    <span className="fw-bold">Form: </span>{slelectedMed?.form}
                                </div>
                            </div>}
                        </div>
                    </div>
                    <div className='d-flex gap-1 align-items-start mt-2'>

                        <MDate
                            isRequired
                            layout='flex-col mb-3 w-100'
                            label='Start Date'
                            allowClear
                            labelClass='label-small'
                            placeholder='Select start date'
                            value={dFrom}
                            onChange={(e) => {
                                dateFromFun(e ? e : null)

                            }}
                            errorMessageDisplay={adminErrors?.range != null && (
                                <span className="text-danger font-12">
                                    {adminErrors?.range}
                                </span>
                            )}
                        />
                        <MDate
                            layout='flex-col mb-3 w-100'
                            label='End Date'
                            allowClear
                            labelClass='label-small'
                            placeholder='Select start date'
                            value={dTo}
                            onChange={(e) => {
                                dateToFun(e ? e : null)
                            }}

                        />
                        <MInput
                            value={showDue}
                            label='Show Due (minutes)'
                            labelClass='label-small'
                            layout='col-3 px-1 mb-3'
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                setAdminErrors({
                                    ...adminErrors,
                                    showDue: ""
                                })
                                handleNumberInput(0, 999999, setShowDue, showDue, event)
                            }}
                            errorMessageDisplay={adminErrors?.showDue}
                        />

                        <MInput
                            label='Show Overdue (minutes)'
                            labelClass='label-small'
                            layout='col-3 ps-1 pe-0 mb-3'
                            value={showOverDue}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                setAdminErrors({
                                    ...adminErrors,
                                    showOverDue: ""
                                })
                                handleNumberInput(0, 999999, setShowOverDue, showOverDue, event)
                            }
                            }
                            errorMessageDisplay={adminErrors?.showOverDue}
                        />
                    </div>
                    <div className='d-flex gap-1 mb-2'>
                        <MTextArea
                            label='Directions'
                            labelClass='mt-0 padding-bottom-three-pixels'
                            layout='flex-col mb-3 width-70percent'
                            showCount={true}
                            disabled={true}
                            value={adminDirections}
                            maxLength={1000}
                        // onChange={(e) => {
                        //     setAdminDirections(e.target.value)
                        // }}
                        />
                        <MTextArea
                            label={`Additional Directions (Shows on ${isISPRXLite ? "list" : "chart"} and script)`}
                            labelClass='mt-0 padding-bottom-three-pixels'
                            layout='flex-col mb-3 width-70percent'
                            showCount={true}
                            value={adminAdditionalDirections}
                            disabled={true}
                            maxLength={1000}
                            onChange={(e) => {
                                setAdditionalAdminDirections(e.target.value)
                            }}
                        />

                    </div>

                    {["21", "22", "17"].includes(frequencyMed) && (
                        <div className='mb-2'>
                            <label className='label-style'>
                                <span>Select Days <span className="text-danger">*</span></span>
                            </label>
                            <Select
                                mode="multiple"
                                placeholder="Select Days of Week"
                                value={selectedDays}
                                open={daysDropdownOpen}
                                onDropdownVisibleChange={setDaysDropdownOpen}
                                onChange={(days) => {
                                    {
                                        setAdminErrors({ ...adminErrors, days: '' });
                                        let limit = 0;
                                        if (frequencyMed === "17") limit = 1;
                                        else if (frequencyMed === "21") limit = 2;
                                        else if (frequencyMed === "22") limit = 3;

                                        if (days.length >= limit) {
                                            setDaysDropdownOpen(false); // Auto-close
                                        } else {
                                            setDaysDropdownOpen(true); // Keep open if under limit
                                        }

                                        if (days.length > limit) {
                                            // If over limit, do NOT accept the new extra one
                                            return;
                                        }

                                        setSelectedDays(days);
                                    };
                                }}
                                style={{ width: '100%' }}
                            >
                                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                                    <Select.Option key={day} value={day}>{day}</Select.Option>
                                ))}
                            </Select>
                            {adminErrors && <small className="text-danger">{adminErrors.days}</small>}
                        </div>
                    )}
                    {(!isPRNMedicine && frequencyMed != "8" && frequencyMed != "23") && <>
                        <label className='label-style mt-2'>
                            <span>Select Time <span className="text-danger">*</span></span>
                            <span className='font-italic font-12 redColor'>{frequencyMed && ` (${getAllowedCheckboxText(frequencyMed, selectedDays)})`}</span>
                        </label>
                        <div className='d-flex '>
                            <div className='d-flex flex-column w-100'>
                                <div className='d-flex mb-1'>
                                    {(time || []).map((data, i) =>
                                        <div className="med-admin-time-cell"><span>{data?.From}</span>-<span>{data?.To}</span></div>
                                    )}
                                </div>
                                {(variableDoseArray || []).map((data, index) => {
                                    return (
                                        <div className='d-flex mb-1'>
                                            {
                                                data?.doses.map((dose, index) => {
                                                    return <>

                                                        <div className='med-admin-time-cell'>
                                                            <MCheckbox
                                                                checked={dose.checked}
                                                                disabled={dose.isDisabled}
                                                                onChange={(e) => {
                                                                    handleCheckBoxChange(index, e.target.checked, dose?.doseId)


                                                                }} />
                                                        </div>


                                                    </>

                                                })
                                            }

                                        </div>


                                    )
                                }
                                )}

                            </div>
                        </div>
                        {adminErrors && <small className="text-danger">{adminErrors.timeCell}</small>}
                    </>}

                </div>

            </MModal>
            <MModal
                open={isVisiblePharmic}
                title='Pharmac Detail'
                setOpen={(val: any) => setIsVisiblePharmic(false)}
                // onSubmit={() => onSubmitSAForm(false)}
                loading={isGetSpecialAuthoritySecondFormLoading}
                footer={[

                    <MButton key="back" className='btn-dark justify-content-end ' onClick={() => {
                        setIsVisiblePharmic(false)
                    }}>
                        Close
                    </MButton>

                ]}
            >
                <div>
                    {
                        (getMedicationAdvanceSearchDetail && (getMedicationAdvanceSearchDetail?.dataMessage?.lstMedicineRuleType.filter((item: any) => item.RuleDescription !== null && item.RuleDescription !== "").length ||
                            getMedicationAdvanceSearchDetail?.dataMessage?.lstMedicineNote.filter((item: any) => item.Note_Xml !== null && item.Note_Xml !== "").length)) ?

                            <div className="bordered boxborder">
                                {getMedicationAdvanceSearchDetail?.dataMessage?.lstMedicineRuleType.filter((item: any) => item.RuleDescription !== null && item.RuleDescription !== "").length > 0 ?
                                    <div className='mb-3'>
                                        <p className='medadmin-heading '>Rules</p>
                                        {
                                            (getMedicationAdvanceSearchDetail?.dataMessage?.lstMedicineRuleType || []).map((item, index) => (
                                                <>{item?.RuleDescription !== null ? <span className='d-flex'><ul className='margin-bottom-0'><li>{item?.RuleDescription} </li></ul><br /></span> : null} </>
                                            ))
                                        }
                                    </div>
                                    : null
                                }
                                {getMedicationAdvanceSearchDetail?.dataMessage?.lstMedicineNote.filter((item: any) => item.Note_Xml !== null && item.Note_Xml !== "").length > 0 ?
                                    <>
                                        <p className='medadmin-heading'>Notes</p>
                                        <ul className='margin-bottom-0'>
                                            {
                                                (getMedicationAdvanceSearchDetail?.dataMessage?.lstMedicineNote || []).map((item, index) => (
                                                    <span className='d-flex'>
                                                        <li>
                                                            {item?.note_class?.toLowerCase() === "request" ?
                                                                <>
                                                                    <p>SA Required</p>
                                                                    {parse(item?.Note_Xml)}
                                                                </> :
                                                                <>{parse(item?.Note_Xml)}</>
                                                            }</li></span>
                                                ))
                                            }
                                        </ul>
                                    </> : null}

                            </div>
                            : null
                    }

                    <MTable
                        columns={columns}
                        dataSource={getMedicationAdvanceSearchDetail?.dataMessage?.lstMedicine}
                        loading={isMedicationAdvanceSearchDetailLoading}
                        defaultPageSize={10}
                        pagination
                        setCurrent={setCurrent}
                        setPageSize={setPageSize}
                        current={current}
                        pageSize={pageSize}
                        total={getMedicationAdvanceSearchDetail != null && getMedicationAdvanceSearchDetail?.dataMessage?.lstMedicine?.length > 0 && getMedicationAdvanceSearchDetail?.dataMessage?.lstMedicine[0]?.TotalRecords}

                    />
                </div>

            </MModal>
            {!isMedicineSwitched && (
                <DrawerContainer
                    title={"Special Authority"}
                    className="graph-drawer"
                    width={"55%"}
                    onCLose={() => props.setIsSAmodal(false)}
                    open={props.isSAmodal}
                    setOpen={(val: any) => props.setIsSAmodal(val)}
                    footer={[
                        <div className="d-flex gap-1 justify-content-end">
                            <MButton
                                className=""
                                key="back"
                                onClick={() => {
                                    props.setIsSAmodal(false);
                                }}
                            >
                                Close
                            </MButton>
                            ,
                            <MButton
                                key="back"
                                className="theme-button"
                                onClick={() => {
                                    window.open(
                                        "https://esa.moh.health.nz/online-sa/search.jsf",
                                        "_blank"
                                    );
                                }}
                            >
                                Check For Existing SA (MoH lookup)
                            </MButton>
                            ,
                            <MButton
                                key="submit"
                                className="theme-button"
                                loading={!isParkSARequest && isSARequestandResponseSecondLoading}
                                onClick={() => onSubmitSAForm(false)}
                            >
                                Send SA Request
                            </MButton>
                            ,
                            <MButton
                                className="theme-button"
                                loading={isParkSARequest && isSARequestandResponseSecondLoading}
                                onClick={() => onSubmitSAForm(true)}
                            >
                                Save Draft
                            </MButton>
                            ,
                        </div>,
                    ]}
                >
                    {isGetSpecialAuthoritySecondFormLoading ? (
                        <div className="d-flex justify-content-center w-100">
                            <Spin size="default" />
                        </div>
                    ) : (
                        <div className="SA-modal-height">
                            <div id="SAForm1">
                                {(SpecialAuthorityFormSecondData && SpecialAuthorityFormSecondData != 1) ? (
                                    <>{parse(updatedSAFormHTML)}</>
                                ) : null}
                            </div>
                        </div>
                    )}
                </DrawerContainer>
            )}
            <MModal
                open={saValidation}
                title={'Special Authority'}
                isShowPatientHeader={false}
                onCancel={() => {
                    setSaValidation(false)
                }}
                footer={
                    <div className='d-flex justify-content-end w-100 gap-1'>

                        <MButton
                            className="btn-dark pro-footer-btn"
                            key="back"
                            onClick={() => {
                                setSaValidation(false)
                            }}>
                            Cancel
                        </MButton>
                        <MButton
                            className="theme-button"
                            onClick={() => {
                                setSaValidation(false)
                                setProceedWithoutSA(true)
                            }}>
                            Yes
                        </MButton>
                    </div>
                }
            >
                <div className='font-18'>
                    Special authority details need to be filled in for this medicine to be funded - Do you want to continue?
                </div>
            </MModal>
            <MModal
                open={specialistNameValidation}
                title={'Specialist Recommendation'}
                isShowPatientHeader={false}
                onCancel={() => {
                    setSpecialistNameValidation(false)
                }}
                footer={
                    <div className='d-flex justify-content-end w-100 gap-1'>
                        <MButton
                            className="btn-dark pro-footer-btn"
                            key="back"
                            onClick={() => {
                                setSpecialistNameValidation(false)
                            }}>
                            Cancel
                        </MButton>
                        <MButton
                            className="theme-button"
                            onClick={() => {
                                setSpecialistNameValidation(false)
                                if (Object.keys(errorMessages).length > 0)
                                    SystemAlert("warning", "Please fill required fields.")
                                else {
                                    if (!props.selectedMedicine?.isFromMDRInformationEdit ||
                                        (props.isFromMDRInformation === true &&
                                            props.selectedMedicine &&
                                            props?.selectedMedicine?.isFromUseExistingMedicationDrawer !== true
                                            && props?.selectedMedicine?.isFromUseExistingMedicationMDRDrawer !== true)
                                    ) {
                                        if (ValidateFields(isGenerateScriptSaveButtonClicked)) {
                                            let onStopdata: any = {
                                                "OtherReason": 'medicine data updated',
                                                "Reason": "other",
                                                "StartDate": MARDateFormatforAPI(dayjs()),
                                                "Comment": "medicine data updated by user",
                                                "PatientID": (PatientDatail as any)?.PatientID,
                                                "MedId": props.selectedMedicine?.medId,
                                                "MedinineName": props.selectedMedicine?.medicineName || props.selectedMedicine?.medicineDisplayName,
                                                StopOnlyInactivemed: true,
                                                ActiveMedId: props?.selectedMedicine?.activeMedID
                                            }
                                            // dispatch(appServices.StopMedicine(onStopdata))
                                            if (props.selectedMedicine?.isFromMDRInformationEdit !== true && props.selectedMedicine?.isFromMDRInformation !== true)
                                                dispatch(appServices.StopMedicine(onStopdata))
                                            else
                                                saveMedicineFun(isGenerateScriptSaveButtonClicked)
                                        }
                                    } else {
                                        saveMedicineFun(isGenerateScriptSaveButtonClicked)
                                    }
                                    setProceedWithoutRecommendation(true)
                                    setSpecialistNameValidation(false)
                                }
                            }}>
                            Yes
                        </MButton>
                    </div>
                }
            >
                <div className='font-18'>
                    Please add name of specialist and date of recommendation. Do you want to continue? The prescription will not be funded.
                </div>
            </MModal >
            {/* <DrawerContainer
                title={"Generate Script"}
                width="1500px"
                open={generateScript}
                setOpen={setGenerateScript}
                className="graph-drawer"
                showHeader={true}
                onCLose={() => {
                    setGenerateScript(false);
                    dispatch(appServices.gettingAllMedicationForEditClear(null));
                }}
                children={
                    <GenerateScriptForm
                        isGenerateScriptDrawerOpen={generateScript}
                        setIsGenerateScriptDrawerOpen={setGenerateScript}
                        selectedMedcineRecords={selectedMedcineRecords}
                        setSelectedMedcineRecords={setSelectedMedcineRecords}
                        patientPharmacyID={patientPharmacyID}
                        setPatientPharmacyID={setPatientPharmacyID}
                        currentPrescriberID={currentPrescriberID}
                        setCurrentPrescriberID={setCurrentPrescriberID}
                        medicineSelectedArrayOptions={medicineSelectedArrayOptions}
                        setMedicineSelectedArrayOptions={setMedicineSelectedArrayOptions}
                        textAreaText={textAreaText}
                        setTextAreaText={setTextAreaText}
                        setErrorMessages={setErrorMessages}
                        errorMessages={errorMessages}
                        setEmailsIDs={setEmailsIDs}
                        emailsIDs={emailsIDs}
                        setselectedItem={setselectedItem}
                        selectedItem={selectedItem}
                    />
                }
                footer={
                    <div className="d-flex flex-end">
                        <MButton
                            children={"Close"}
                            className="btn-dark me-2"
                            onClick={() => {
                                setGenerateScript(false);
                                //   setScriptedArray([]);
                                //   setCheckedMedications([]);
                                //   setSelectedRowKeys([]);
                                //   handleResetIsChecked();
                                dispatch(appServices.gettingAllMedicationForEditClear(null));
                            }}
                        />
                        {permissions?.PatientMedicationInsertUpdate && (
                            <MButton
                                children={"Print"}
                                className="theme-button me-2"
                                loading={isSavingRecord && savingTypeObject.isPrint}
                                onClick={() => savePrescription({ isSave: false, isEmailToPharmacy: false, isEmailToPatient: false, isPrint: true })}
                            />
                        )}

                        {permissions?.PatientMedicationInsertUpdate && (
                            <MButton
                                children={"Save"}
                                className="theme-button"
                                loading={(isSavingRecord && savingTypeObject.isSave)}
                                onClick={() => savePrescription({ isSave: true, isEmailToPharmacy: false, isEmailToPatient: false, isPrint: false })}
                            />
                        )}
                    </div>
                }
            /> */}
            < MModal
                title=" Special Authority Expire"
                open={saCheckExpire}
                setOpen={setSaCheckExpire}
                // handleOk={() => setSaCheckExpire(false)}
                onCancel={() => setSaCheckExpire(false)}
                loading={false}
                minHeight='30px'
                isShowPatientHeader={false}
                footer={
                    < div className="d-flex justify-content-end " >
                        <div className="float-right d-flex ">
                            <MButton
                                className="btn-dark ms-2"
                                onClick={() => {
                                    setSaCheckExpire(false)
                                }}
                            >
                                No
                            </MButton>
                            <MButton className="theme-button "
                                onClick={() => {
                                    setSaCheckExpire(false)
                                    props.setIsSAmodal(true)
                                    props.setAddMed(false)
                                    setSelectMedicine(false)
                                }}
                            >
                                Yes
                            </MButton>
                        </div>
                    </div >
                }
            >
                <div className='font-18'>SA for this medicine has expired. Do you want to reapply?</div>


            </MModal >
            <MModal
                open={isMedicineFoundModalOpen}
                title={"Warning"}
                isShowPatientHeader={false}
                onCancel={() => {
                    setIsMedicineFoundModalOpen(false)
                    dispatch(appServices.checkingAlreadyprescribeMedicineClear(""))
                }}
                footer={
                    <div className="d-flex gap-1 justify-content-end w-100">
                        <MButton key="back" onClick={() => {
                            setIsMedicineFoundModalOpen(false)
                            dispatch(appServices.checkingAlreadyprescribeMedicineClear(""))
                        }} className="btn-dark pro-footer-btn" >
                            No
                        </MButton>
                        <MButton onClick={() => {
                            saveMedicineFun(isGenerateScriptSaveButtonClicked)
                            setIsMedicineFoundModalOpen(false)
                        }} className="theme-button">
                            Yes
                        </MButton>

                    </div>
                }
            >
                <div>
                    {checkedAlreadyPrescribedMedicine !== null ? checkedAlreadyPrescribedMedicine.message : ""}
                </div>
            </MModal>
            <MModal
                open={isSCIDExistModalOpen}
                title={"Warning"}
                width={"25%"}
                isShowPatientHeader={false}
                onCancel={() => {
                    setIsSCIDExistModalOpen(false)
                }}
                footer={
                    <div className="d-flex gap-1 justify-content-end w-100">
                        <MButton key="back" onClick={() => {
                            setIsSCIDExistModalOpen(false)
                        }} className="btn-dark pro-footer-btn" >
                            No
                        </MButton>
                        <MButton onClick={() => {
                            setIsSCIDExistModalOpen(false)
                            addToChartMedicatioFunc()
                            setIsAddToChartClicked(true)
                            setIsAddToChartAndGenerateScriptClicked(false)
                            dispatch(appServices.setIsGenerateScriptClickedWithoutMed(false))
                        }} className="theme-button">
                            Yes
                        </MButton>

                    </div>
                }
            >
                <div>
                    Are you sure? Amending this medication will amend any active prescriptions that have already been sent to the NZ ePrescription service and may or may not have already been dispensed.
                    This amendment will not display on the original emailed or printed prescription. Please contact the pharmacy and the patient to avoid confusion.
                    Do you wish to Proceed?
                </div>
            </MModal>
        </Fragment >
    )
}

export default MedSelectionForm