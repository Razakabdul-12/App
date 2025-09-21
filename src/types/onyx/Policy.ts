import type {CONST as COMMON_CONST} from 'expensify-common';
import type {ValueOf} from 'type-fest';
import type CONST from '@src/CONST';
import type {Country} from '@src/CONST';
import type * as OnyxTypes from '.';
import type * as OnyxCommon from './OnyxCommon';

/** Distance units */
type Unit = 'mi' | 'km';

/** Tax rate attributes of the policy distance rate */
type TaxRateAttributes = {
    /** Percentage of the tax that can be reclaimable */
    taxClaimablePercentage?: number;

    /** External ID associated to this tax rate */
    taxRateExternalID?: string;
};

/** Model of policy subrate */
type Subrate = {
    /** Generated ID to identify the subrate */
    id: string;

    /** Name of the subrate */
    name: string;

    /** Amount to be reimbursed per unit */
    rate: number;
};

/** Model of policy rate */
type Rate = OnyxCommon.OnyxValueWithOfflineFeedback<
    {
        /** Name of the rate */
        name?: string;

        /** Amount to be reimbursed per unit */
        rate?: number;

        /** Currency used to pay the rate */
        currency?: string;

        /** Generated ID to identify the rate */
        customUnitRateID: string;

        /** Whether this rate is currently enabled */
        enabled?: boolean;

        /** Error messages to show in UI */
        errors?: OnyxCommon.Errors;

        /** Form fields that triggered the errors */
        errorFields?: OnyxCommon.ErrorFields;

        /** Tax rate attributes of the policy */
        attributes?: TaxRateAttributes;

        /** Subrates of the given rate */
        subRates?: Subrate[];
    },
    keyof TaxRateAttributes
>;

/** Custom unit attributes */
type Attributes = {
    /** Distance unit name */
    unit: Unit;

    /** Whether the tax tracking is enabled or not */
    taxEnabled?: boolean;
};

/** Policy custom unit */
type CustomUnit = OnyxCommon.OnyxValueWithOfflineFeedback<
    {
        /** Custom unit name */
        name: string;

        /** ID that identifies this custom unit */
        customUnitID: string;

        /** Contains custom attributes like unit, for this custom unit */
        attributes?: Attributes;

        /** Distance rates using this custom unit */
        rates: Record<string, Rate>;

        /** The default category in which this custom unit is used */
        defaultCategory?: string;

        /** Whether this custom unit is enabled */
        enabled?: boolean;

        /** Error messages to show in UI */
        errors?: OnyxCommon.Errors;

        /** Form fields that triggered errors */
        errorFields?: OnyxCommon.ErrorFields;
    },
    keyof Attributes
>;

/** Policy company address data */
type CompanyAddress = {
    /** Street address */
    addressStreet: string;

    /** City */
    city: string;

    /** State */
    state: string;

    /** Zip post code */
    zipCode: string;

    /** Country code */
    country: Country | '';
};

/** Policy disabled fields */
type DisabledFields = {
    /** Whether the default billable field is disabled */
    defaultBillable?: boolean;

    /** Whether the reimbursable field is disabled */
    reimbursable?: boolean;
};

/** Policy tax rate */
type TaxRate = OnyxCommon.OnyxValueWithOfflineFeedback<{
    /** Name of the tax rate. */
    name: string;

    /** The value of the tax rate. */
    value: string;

    /** The code associated with the tax rate. If a tax is created in old dot, code field is undefined */
    code?: string;

    /** This contains the tax name and tax value as one name */
    modifiedName?: string;

    /** Indicates if the tax rate is disabled. */
    isDisabled?: boolean;

    /** Indicates if the tax rate is selected. */
    isSelected?: boolean;

    /** The old tax code of the tax rate when we edit the tax code */
    previousTaxCode?: string;

    /** An error message to display to the user */
    errors?: OnyxCommon.Errors;

    /** An error object keyed by field name containing errors keyed by microtime */
    errorFields?: OnyxCommon.ErrorFields;
}>;

/** Record of policy tax rates, indexed by id_{taxRateName} where taxRateName is the name of the tax rate in UPPER_SNAKE_CASE */
type TaxRates = Record<string, TaxRate>;

/** Policy tax rates with default tax rate */
type TaxRatesWithDefault = OnyxCommon.OnyxValueWithOfflineFeedback<{
    /** Name of the tax */
    name: string;

    /** Default policy tax code */
    defaultExternalID: string;

    /** Default value of taxes */
    defaultValue: string;

    /** Default foreign policy tax code */
    foreignTaxDefault: string;

    /** List of tax names and values */
    taxes: TaxRates;

    /** An error message to display to the user */
    errors?: OnyxCommon.Errors;

    /** Error objects keyed by field name containing errors keyed by microtime */
    errorFields?: OnyxCommon.ErrorFields;
}>;

/** Connection sync source values */
type JobSourceValues = 'DIRECT' | 'EXPENSIFYWEB' | 'EXPENSIFYAPI' | 'NEWEXPENSIFY' | 'AUTOSYNC' | 'AUTOAPPROVE';

/** Connection last synchronization state */
type ConnectionLastSync = {
    /** Date when the connection's last successful sync occurred */
    successfulDate?: string;

    /** Date when the connection's last failed sync occurred */
    errorDate?: string;

    /** Error message when the connection's last sync failed */
    errorMessage?: string;

    /** If the connection's last sync failed due to authentication error */
    isAuthenticationError: boolean;

    /** Whether the connection's last sync was successful */
    isSuccessful: boolean;

    /** Where did the connection's last sync job come from */
    source: JobSourceValues;

    /**
     * Sometimes we'll have a connection that is not connected, but the connection object is still present, so we can
     * show an error message
     */
    isConnected?: boolean;
};

/** Financial account (bank account, debit card, etc) */
type Account = {
    /** GL code assigned to the financial account */
    glCode?: string;

    /** Name of the financial account */
    name: string;

    /** Currency of the financial account */
    currency: string;

    /** ID assigned to the financial account */
    id: string;
};

/** State of integration connection */
type Connection<ConnectionData = Record<string, unknown>, ConnectionConfig = OnyxCommon.OnyxValueWithOfflineFeedback<Record<string, unknown>, string>> = {
    /** State of the last synchronization */
    lastSync?: ConnectionLastSync;

    /** Data imported from integration */
    data?: ConnectionData;

    /** Configuration of the connection */
    config: ConnectionConfig;
};

/** Available integration connections */
type Connections = Record<string, Connection>;

/** All integration connections, including unsupported ones */
type AllConnections = Connections;

/** Names of integration connections */
type ConnectionName = keyof Connections;

/** Names of all integration connections */
type AllConnectionName = keyof AllConnections;

/** Merchant Category Code. This is a way to identify the type of merchant (and type of spend) when a credit card is swiped.  */
type MccGroup = {
    /** Default category for provided MCC Group */
    category: string;

    /** ID of the Merchant Category Code */
    groupID: string;

    /** The type of action that's pending  */
    pendingAction?: OnyxCommon.PendingAction;
};

/** Model of verified reimbursement bank account linked to policy */
type ACHAccount = {
    /** ID of the bank account */
    bankAccountID: number;

    /** Bank account number */
    accountNumber: string;

    /** Routing number of bank account */
    routingNumber: string;

    /** Address name of the bank account */
    addressName: string;

    /** Name of the bank */
    bankName: string;

    /** E-mail of the reimburser */
    reimburser: string;

    /** Bank account state */
    state?: string;
};

/** Prohibited expense types */
type ProhibitedExpenses = OnyxCommon.OnyxValueWithOfflineFeedback<{
    /** Whether the policy prohibits alcohol expenses */
    alcohol?: boolean;

    /** Whether the policy prohibits hotel incidental expenses */
    hotelIncidentals?: boolean;

    /** Whether the policy prohibits gambling expenses */
    gambling?: boolean;

    /** Whether the policy prohibits tobacco expenses */
    tobacco?: boolean;

    /** Whether the policy prohibits adult entertainment expenses */
    adultEntertainment?: boolean;
}>;

/** Day of the month to schedule submission  */
type AutoReportingOffset = number | ValueOf<typeof CONST.POLICY.AUTO_REPORTING_OFFSET>;

/** Types of policy report fields */
type PolicyReportFieldType = 'text' | 'date' | 'dropdown' | 'formula';

/** Model of policy report field */
type PolicyReportField = {
    /** Name of the field */
    name: string;

    /** Default value assigned to the field */
    defaultValue: string;

    /** Unique id of the field */
    fieldID: string;

    /** Position at which the field should show up relative to the other fields */
    orderWeight: number;

    /** Type of report field */
    type: PolicyReportFieldType;

    /** Tells if the field is required or not */
    deletable: boolean;

    /** Value of the field */
    value?: string | null;

    /** Value of the target */
    target?: 'expense' | 'invoice' | 'paycheck';

    /** Options to select from if field is of type dropdown */
    values: string[];

    /** Tax UDFs have keys holding the names of taxes (eg, VAT), values holding percentages (eg, 15%) and a value indicating the currently selected tax value (eg, 15%). */
    keys: string[];

    /** list of externalIDs, this are either imported from the integrations or auto generated by us, each externalID */
    externalIDs: string[];

    /** Collection of flags that state whether drop down field options are disabled */
    disabledOptions: boolean[];

    /** Is this a tax user defined report field */
    isTax: boolean;

    /** This is the selected externalID in an expense. */
    externalID?: string | null;

    /** Automated action or integration that added this report field */
    origin?: string | null;

    /** This is indicates which default value we should use. It was preferred using this over having defaultValue (which we have anyway for historical reasons), since the values are not unique we can't determine which key the defaultValue is referring too. It was also preferred over having defaultKey since the keys are user editable and can be changed. The externalIDs work effectively as an ID, which never changes even after changing the key, value or position of the option. */
    defaultExternalID?: string | null;
};

/** Policy invoicing details */
type PolicyInvoicingDetails = OnyxCommon.OnyxValueWithOfflineFeedback<{
    /** Stripe Connect company name */
    companyName?: string;

    /** Stripe Connect company website */
    companyWebsite?: string;

    /** Bank account */
    bankAccount?: {
        /** Account balance */
        stripeConnectAccountBalance?: number;

        /** AccountID */
        stripeConnectAccountID?: string;

        /** bankAccountID of selected BBA for payouts */
        transferBankAccountID?: number;
    };

    /** The markUp */
    markUp?: number;
}>;

/** Names of policy features */
type PolicyFeatureName = ValueOf<typeof CONST.POLICY.MORE_FEATURES>;

/** Current user policy join request state */
type PendingJoinRequestPolicy = {
    /** Whether the current user requested to join the policy */
    isJoinRequestPending: boolean;

    /** Record of public policy details, indexed by policy ID */
    policyDetailsForNonMembers: Record<string, OnyxCommon.OnyxValueWithOfflineFeedback<PolicyDetailsForNonMembers>>;
};

/** Details of public policy */
type PolicyDetailsForNonMembers = {
    /** Name of the policy */
    name: string;

    /** Policy owner account ID */
    ownerAccountID: number;

    /** Policy owner e-mail */
    ownerEmail: string;

    /** Policy type */
    type: ValueOf<typeof CONST.POLICY.TYPE>;

    /** Policy avatar */
    avatar?: string;
};

/** Data informing when a given rule should be applied */
type ApplyRulesWhen = {
    /** The condition for applying the rule to the workspace */
    condition: string;

    /** The target field to which the rule is applied */
    field: string;

    /** The value of the target field */
    value: string;
};

/** Approval rule data model */
type ApprovalRule = {
    /** The approver's email */
    approver: string;

    /** Set of conditions under which the approval rule should be applied */
    applyWhen: ApplyRulesWhen[];

    /** An id of the rule */
    id?: string;
};

/** Expense rule data model */
type ExpenseRule = {
    /** Object containing information about the tax field id and its external identifier */
    tax: {
        /** Object wrapping the external tax id */
        // eslint-disable-next-line @typescript-eslint/naming-convention
        field_id_TAX: {
            /** The external id of the tax field. */
            externalID: string;
        };
    };
    /** Set of conditions under which the expense rule should be applied */
    applyWhen: ApplyRulesWhen[];

    /** An id of the rule */
    id?: string;
};

/** Model of policy data */
type Policy = OnyxCommon.OnyxValueWithOfflineFeedback<
    {
        /** The ID of the policy */
        id: string;

        /** The name of the policy */
        name: string;

        /** The current user's role in the policy */
        role: ValueOf<typeof CONST.POLICY.ROLE>;

        /** The policy type */
        type: ValueOf<typeof CONST.POLICY.TYPE>;

        /** The email of the policy owner */
        owner: string;

        /** The accountID of the policy owner */
        ownerAccountID?: number;

        /** The output currency for the policy */
        outputCurrency: string;

        /** The address of the company */
        address?: CompanyAddress;

        /** The URL for the policy avatar */
        avatarURL?: string;

        /** Error objects keyed by field name containing errors keyed by microtime */
        errorFields?: OnyxCommon.ErrorFields;

        /** A list of errors keyed by microtime */
        errors?: OnyxCommon.Errors;

        /** Whether this policy was loaded from a policy summary, or loaded completely with all of its values */
        isFromFullPolicy?: boolean;

        /** When this policy was last modified */
        lastModified?: string;

        /** The custom units data for this policy */
        customUnits?: Record<string, CustomUnit>;

        /** Whether policy expense chats can be created and used on this policy. Enabled manually by CQ/JS snippet. Always true for free policies. */
        isPolicyExpenseChatEnabled: boolean;

        /** Whether the auto reporting is enabled */
        autoReporting?: boolean;

        /**
         * The scheduled submit frequency set up on this policy.
         * Note that manual does not exist in the DB and thus should not exist in Onyx, only as a param for the API.
         * "manual" really means "immediate" (aka "daily") && harvesting.enabled === false
         */
        autoReportingFrequency?: Exclude<ValueOf<typeof CONST.POLICY.AUTO_REPORTING_FREQUENCIES>, typeof CONST.POLICY.AUTO_REPORTING_FREQUENCIES.MANUAL>;

        /** Scheduled submit data */
        harvesting?: {
            /** Whether the scheduled submit is enabled */
            enabled: boolean;

            /** The ID of the Bedrock job that runs harvesting */
            jobID?: number;
        };

        /** Whether the self approval or submitting is enabled */
        preventSelfApproval?: boolean;

        /** When the monthly scheduled submit should happen */
        autoReportingOffset?: AutoReportingOffset;

        /** The employee list of the policy */
        employeeList?: OnyxTypes.PolicyEmployeeList;

        /** The reimbursement choice for policy */
        reimbursementChoice?: ValueOf<typeof CONST.POLICY.REIMBURSEMENT_CHOICES>;

        /** The set reimburser for the policy */
        reimburser?: string;

        /** The set exporter for the policy */
        exporter?: string;

        /** Detailed settings for the autoReimbursement */
        autoReimbursement?: OnyxCommon.OnyxValueWithOfflineFeedback<
            {
                /**
                 * The maximum report total allowed to trigger auto reimbursement.
                 */
                limit?: number;
            },
            'limit'
        >;

        /** The maximum report total allowed to trigger auto reimbursement */
        autoReimbursementLimit?: number;

        /**
         * Whether the auto-approval options are enabled in the policy rules
         */
        shouldShowAutoApprovalOptions?: boolean;

        /** Detailed settings for the autoApproval */
        autoApproval?: OnyxCommon.OnyxValueWithOfflineFeedback<
            {
                /**
                 * The maximum report total allowed to trigger auto approval.
                 */
                limit?: number;
                /**
                 * Percentage of the reports that should be selected for a random audit
                 */
                auditRate?: number;
            },
            'limit' | 'auditRate'
        >;

        /** Whether to leave the calling account as an admin on the policy */
        makeMeAdmin?: boolean;

        /** Original file name which is used for the policy avatar */
        originalFileName?: string;

        /** Alert message for the policy */
        alertMessage?: string;

        /** Informative messages about which policy members were added with primary logins when invited with their secondary login */
        primaryLoginsInvited?: Record<string, string>;

        /** Whether policy is updating */
        isPolicyUpdating?: boolean;

        /** The approver of the policy */
        approver?: string;

        /** The approval mode set up on this policy */
        approvalMode?: ValueOf<typeof CONST.POLICY.APPROVAL_MODE>;

        /** Whether transactions should be billable by default */
        defaultBillable?: boolean;

        /** Whether transactions should be reimbursable by default */
        defaultReimbursable?: boolean;

        /** The workspace description */
        description?: string;

        /** List of field names that are disabled */
        disabledFields?: DisabledFields;

        /** Whether new transactions need to be tagged */
        requiresTag?: boolean;

        /** Whether new transactions need to be categorized */
        requiresCategory?: boolean;

        /** Whether the workspace has multiple levels of tags enabled */
        hasMultipleTagLists?: boolean;

        /**
         * Whether or not the policy has tax tracking enabled
         *
         * @deprecated - use tax.trackingEnabled instead
         */
        isTaxTrackingEnabled?: boolean;

        /** Policy invoicing details */
        invoice?: PolicyInvoicingDetails;

        /** Tax data */
        tax?: {
            /** Whether or not the policy has tax tracking enabled */
            trackingEnabled: boolean;
        };

        /** Collection of tax rates attached to a policy */
        taxRates?: TaxRatesWithDefault;

        /** A set of rules related to the workspace */
        rules?: {
            /** A set of rules related to the workspace approvals */
            approvalRules?: ApprovalRule[];

            /** A set of rules related to the workspace expenses */
            expenseRules?: ExpenseRule[];
        };

        /** A set of custom rules defined with natural language */
        customRules?: string;

        /** ReportID of the admins room for this workspace */
        chatReportIDAdmins?: number;

        /** ReportID of the announce room for this workspace */
        chatReportIDAnnounce?: number;

        /** All the integration connections attached to the policy */
        connections?: Connections;

        /** Report fields attached to the policy */
        fieldList?: Record<string, OnyxCommon.OnyxValueWithOfflineFeedback<PolicyReportField, 'defaultValue' | 'deletable'>>;

        /** Whether the Categories feature is enabled */
        areCategoriesEnabled?: boolean;

        /** Whether the Tags feature is enabled */
        areTagsEnabled?: boolean;

        /** Whether the Accounting feature is enabled */
        areAccountingEnabled?: boolean;

        /** Whether the Distance Rates feature is enabled */
        areDistanceRatesEnabled?: boolean;

        /** Whether the Per diem rates feature is enabled */
        arePerDiemRatesEnabled?: boolean;

        /** Whether the Expensify Card feature is enabled */
        areExpensifyCardsEnabled?: boolean;

        /** Whether the workflows feature is enabled */
        areWorkflowsEnabled?: boolean;

        /** Whether the rules feature is enabled */
        areRulesEnabled?: boolean;

        /** Whether the Report Fields feature is enabled */
        areReportFieldsEnabled?: boolean;

        /** Whether the Connections feature is enabled */
        areConnectionsEnabled?: boolean;

        /** Whether the Invoices feature is enabled */
        areInvoicesEnabled?: boolean;

        /** Whether the Company Cards feature is enabled */
        areCompanyCardsEnabled?: boolean;

        /** The verified bank account linked to the policy */
        achAccount?: ACHAccount;

        /** Whether the eReceipts are enabled */
        eReceipts?: boolean;

        /** Settings for the Policy's prohibited expenses */
        prohibitedExpenses?: ProhibitedExpenses;

        /** Indicates if the Policy is in loading state */
        isLoading?: boolean;

        /** Indicates the Policy's SetWorkspaceReimbursement call loading state */
        isLoadingWorkspaceReimbursement?: boolean;

        /** Indicates if the Policy ownership change is successful */
        isChangeOwnerSuccessful?: boolean;

        /** Indicates if the Policy ownership change is failed */
        isChangeOwnerFailed?: boolean;


        /** Indicates if the policy is pending an upgrade */
        isPendingUpgrade?: boolean;

        /** Indicates if the policy is pending a downgrade */
        isPendingDowngrade?: boolean;

        /** Max expense age for a Policy violation */
        maxExpenseAge?: number;

        /** Max expense amount for a policy violation */
        maxExpenseAmount?: number;

        /** Max amount for an expense with no receipt violation */
        maxExpenseAmountNoReceipt?: number;

        /** Whether GL codes are enabled */
        glCodes?: boolean;

        /** Is the auto-pay option for the policy enabled  */
        shouldShowAutoReimbursementLimitOption?: boolean;

        /** Policy MCC Group settings */
        mccGroup?: Record<string, MccGroup>;

        /** Workspace account ID configured for Expensify Card */
        workspaceAccountID?: number;

        /** Setup specialist guide assigned for the policy */
        assignedGuide?: {
            /** The guide's email */
            email: string;
        };

        /** Indicate whether the Workspace plan can be downgraded */
        canDowngrade?: boolean;

        /** Policy level user created in-app export templates */
        exportLayouts?: Record<string, OnyxTypes.ExportTemplate>;

        /** Whether Attendee Tracking is enabled */
        isAttendeeTrackingEnabled?: boolean;
    } & Partial<PendingJoinRequestPolicy>,
    'addWorkspaceRoom' | keyof ACHAccount | keyof Attributes
>;

/** Stages of policy connection sync */
type PolicyConnectionSyncStage = ValueOf<typeof CONST.POLICY.CONNECTIONS.SYNC_STAGE_NAME>;

/** Names of policy connection services */
type PolicyConnectionName = ConnectionName;

/** Policy connection sync progress state */
type PolicyConnectionSyncProgress = {
    /** Current sync stage */
    stageInProgress: PolicyConnectionSyncStage;

    /** Name of the connected service */
    connectionName: ConnectionName;

    /** Timestamp of the connection */
    timestamp: string;
};

export default Policy;

export type {
    PolicyReportField,
    PolicyReportFieldType,
    Unit,
    CustomUnit,
    Attributes,
    Rate,
    TaxRateAttributes,
    TaxRate,
    TaxRates,
    TaxRatesWithDefault,
    CompanyAddress,
    PolicyFeatureName,
    PolicyDetailsForNonMembers,
    PolicyConnectionName,
    PolicyConnectionSyncStage,
    PolicyConnectionSyncProgress,
    Connections,
    ConnectionName,
    AllConnectionName,
    Account,
    ConnectionLastSync,
    InvoiceItem,
    ACHAccount,
    ApprovalRule,
    ExpenseRule,
    MccGroup,
    Subrate,
    ProhibitedExpenses,
};
