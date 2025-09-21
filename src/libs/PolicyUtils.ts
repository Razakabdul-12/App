import {Str} from 'expensify-common';
import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import type {ValueOf} from 'type-fest';
import type {LocaleContextProps} from '@components/LocaleContextProvider';
import type {SelectorType} from '@components/SelectionScreen';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {OnyxInputOrEntry, Policy, PolicyCategories, PolicyEmployeeList, PolicyTagLists, PolicyTags, Report, TaxRate} from '@src/types/onyx';
import type {ErrorFields, PendingAction, PendingFields} from '@src/types/onyx/OnyxCommon';
import type {
    ConnectionLastSync,
    ConnectionName,
    Connections,
    CustomUnit,
    InvoiceItem,
    PolicyConnectionSyncProgress,
    PolicyFeatureName,
    Rate,
    Tenant,
} from '@src/types/onyx/Policy';
import type PolicyEmployee from '@src/types/onyx/PolicyEmployee';
import type {SearchPolicy} from '@src/types/onyx/SearchResults';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import {hasSynchronizationErrorMessage, isAuthenticationError} from './actions/connections';
import {getCurrentUserAccountID, getCurrentUserEmail} from './actions/Report';
import {getCategoryApproverRule} from './CategoryUtils';
import {translateLocal} from './Localize';
import Navigation from './Navigation/Navigation';
import {isOffline as isOfflineNetworkStore} from './Network/NetworkStore';
import {getAccountIDsByLogins, getLoginsByAccountIDs, getPersonalDetailByEmail} from './PersonalDetailsUtils';
import {getAllSortedTransactions, getCategory, getTag, getTagArrayFromName} from './TransactionUtils';
import {isPublicDomain} from './ValidationUtils';

type MemberEmailsToAccountIDs = Record<string, number>;

type WorkspaceDetails = {
    policyID: string | undefined;
    name: string;
};

type ConnectionWithLastSyncData = {
    /** State of the last synchronization */
    lastSync?: ConnectionLastSync;
};

let allPolicies: OnyxCollection<Policy>;

Onyx.connect({
    key: ONYXKEYS.COLLECTION.POLICY,
    waitForCollectionCallback: true,
    callback: (value) => (allPolicies = value),
});

/**
 * Filter out the active policies, which will exclude policies with pending deletion
 * and policies the current user doesn't belong to.
 * These are policies that we can use to create reports with in NewDot.
 */
function getActivePolicies(policies: OnyxCollection<Policy> | null, currentUserLogin: string | undefined): Policy[] {
    return Object.values(policies ?? {}).filter<Policy>(
        (policy): policy is Policy =>
            !!policy && policy.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE && !!policy.name && !!policy.id && !!getPolicyRole(policy, currentUserLogin),
    );
}

/**
 * Filter out the active policies, which will exclude policies with pending deletion
 * and policies the current user doesn't belong to.
 * These will be policies that has expense chat enabled.
 * These are policies that we can use to create reports with in NewDot.
 */
function getActivePoliciesWithExpenseChat(policies: OnyxCollection<Policy> | null, currentUserLogin: string | undefined): Policy[] {
    return Object.values(policies ?? {}).filter<Policy>(
        (policy): policy is Policy =>
            !!policy &&
            policy.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE &&
            !!policy.name &&
            !!policy.id &&
            !!getPolicyRole(policy, currentUserLogin) &&
            policy.isPolicyExpenseChatEnabled,
    );
}

function getPerDiemCustomUnits(policies: OnyxCollection<Policy> | null, email: string | undefined): Array<{policyID: string; customUnit: CustomUnit}> {
    return (
        getActivePoliciesWithExpenseChat(policies, email)
            .map((mappedPolicy) => ({policyID: mappedPolicy.id, customUnit: getPerDiemCustomUnit(mappedPolicy)}))
            // We filter out custom units that are undefine but ts cant' figure it out.
            .filter(({customUnit}) => !isEmptyObject(customUnit) && !!customUnit.enabled) as Array<{policyID: string; customUnit: CustomUnit}>
    );
}

/**
 * Checks if the current user is an admin of the policy.
 */
const isPolicyAdmin = (policy: OnyxInputOrEntry<Policy> | SearchPolicy, currentUserLogin?: string): boolean => getPolicyRole(policy, currentUserLogin) === CONST.POLICY.ROLE.ADMIN;

/**
 * Checks if we have any errors stored within the policy?.employeeList. Determines whether we should show a red brick road error or not.
 */
function shouldShowEmployeeListError(policy: OnyxEntry<Policy>): boolean {
    return isPolicyAdmin(policy) && Object.values(policy?.employeeList ?? {}).some((employee) => Object.keys(employee?.errors ?? {}).length > 0);
}

/**
 * Check if the policy has any errors within the categories.
 */
function hasPolicyCategoriesError(policyCategories: OnyxEntry<PolicyCategories>): boolean {
    return Object.keys(policyCategories ?? {}).some((categoryName) => Object.keys(policyCategories?.[categoryName]?.errors ?? {}).length > 0);
}

/**
 * Checks if the policy had a sync error.
 */
function shouldShowSyncError(policy: OnyxEntry<Policy>, isSyncInProgress: boolean): boolean {
    return isPolicyAdmin(policy) && (Object.keys(policy?.connections ?? {}) as ConnectionName[]).some((connection) => !!hasSynchronizationErrorMessage(policy, connection, isSyncInProgress));
}

/**
 * Check if the policy has any error fields.
 */
function shouldShowPolicyErrorFields(policy: OnyxEntry<Policy>): boolean {
    return isPolicyAdmin(policy) && Object.values(policy?.errorFields ?? {}).some((fieldErrors) => Object.keys(fieldErrors ?? {}).length > 0);
}

/**
 * Check if the policy has any errors, and if it doesn't, then check if it has any error fields.
 */
function shouldShowPolicyError(policy: OnyxEntry<Policy>): boolean {
    return Object.keys(policy?.errors ?? {}).length > 0 ? isPolicyAdmin(policy) : shouldShowPolicyErrorFields(policy);
}

/**
 * Checks if we have any errors stored within the policy custom units.
 */
function shouldShowCustomUnitsError(policy: OnyxEntry<Policy>): boolean {
    return isPolicyAdmin(policy) && Object.keys(policy?.customUnits?.errors ?? {}).length > 0;
}

function getNumericValue(value: number | string, toLocaleDigit: (arg: string) => string): number | string {
    const numValue = parseFloat(value.toString().replace(toLocaleDigit('.'), '.'));
    if (Number.isNaN(numValue)) {
        return NaN;
    }
    // Rounding to 4 decimal places
    return parseFloat(numValue.toFixed(CONST.MAX_TAX_RATE_DECIMAL_PLACES));
}

/**
 * Retrieves the distance custom unit object for the given policy
 */
function getDistanceRateCustomUnit(policy: OnyxEntry<Policy>): CustomUnit | undefined {
    return Object.values(policy?.customUnits ?? {}).find((unit) => unit.name === CONST.CUSTOM_UNITS.NAME_DISTANCE);
}

/**
 * Retrieves the per diem custom unit object for the given policy
 */
function getPerDiemCustomUnit(policy: OnyxEntry<Policy>): CustomUnit | undefined {
    return Object.values(policy?.customUnits ?? {}).find((unit) => unit.name === CONST.CUSTOM_UNITS.NAME_PER_DIEM_INTERNATIONAL);
}

/**
 * Retrieves custom unit rate object from the given customUnitRateID
 */
function getDistanceRateCustomUnitRate(policy: OnyxEntry<Policy>, customUnitRateID: string): Rate | undefined {
    const distanceUnit = getDistanceRateCustomUnit(policy);
    return distanceUnit?.rates[customUnitRateID];
}

/**
 * Retrieves custom unit rate object from the given customUnitRateID
 */
function getPerDiemRateCustomUnitRate(policy: OnyxEntry<Policy>, customUnitRateID: string): Rate | undefined {
    const perDiemUnit = getPerDiemCustomUnit(policy);
    return perDiemUnit?.rates[customUnitRateID];
}

function getRateDisplayValue(value: number, toLocaleDigit: (arg: string) => string, withDecimals?: boolean): string {
    const numValue = getNumericValue(value, toLocaleDigit);
    if (Number.isNaN(numValue)) {
        return '';
    }

    if (withDecimals) {
        const decimalPart = numValue.toString().split('.').at(1) ?? '';
        // Set the fraction digits to be between 2 and 4 (OD Behavior)
        const fractionDigits = Math.min(Math.max(decimalPart.length, CONST.MIN_TAX_RATE_DECIMAL_PLACES), CONST.MAX_TAX_RATE_DECIMAL_PLACES);
        return Number(numValue).toFixed(fractionDigits).toString().replace('.', toLocaleDigit('.'));
    }

    return numValue.toString().replace('.', toLocaleDigit('.')).substring(0, value.toString().length);
}

function getUnitRateValue(toLocaleDigit: (arg: string) => string, customUnitRate?: Partial<Rate>, withDecimals?: boolean) {
    return getRateDisplayValue((customUnitRate?.rate ?? 0) / CONST.POLICY.CUSTOM_UNIT_RATE_BASE_OFFSET, toLocaleDigit, withDecimals);
}

/**
 * Get the brick road indicator status for a policy. The policy has an error status if there is a policy member error, a custom unit error or a field error.
 */
function getPolicyBrickRoadIndicatorStatus(policy: OnyxEntry<Policy>, isConnectionInProgress: boolean): ValueOf<typeof CONST.BRICK_ROAD_INDICATOR_STATUS> | undefined {
    if (
        shouldShowEmployeeListError(policy) ||
        shouldShowCustomUnitsError(policy) ||
        shouldShowPolicyErrorFields(policy) ||
        shouldShowSyncError(policy, isConnectionInProgress)
    ) {
        return CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR;
    }
    return undefined;
}

function getPolicyRole(policy: OnyxInputOrEntry<Policy> | SearchPolicy, currentUserLogin: string | undefined): string | undefined {
    if (policy?.role) {
        return policy.role;
    }

    if (!currentUserLogin) {
        return;
    }

    return policy?.employeeList?.[currentUserLogin]?.role;
}

function getPolicyNameByID(policyID: string): string {
    return allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`]?.name ?? '';
}

/**
 * Check if the policy can be displayed
 * If shouldShowPendingDeletePolicy is true, show the policy pending deletion.
 * If shouldShowPendingDeletePolicy is false, show the policy pending deletion only if there is an error.
 * Note: Using a local ONYXKEYS.NETWORK subscription will cause a delay in
 * updating the screen. Passing the offline status from the component.
 */
function shouldShowPolicy(policy: OnyxEntry<Policy>, shouldShowPendingDeletePolicy: boolean, currentUserLogin: string | undefined): boolean {
    return (
        !!policy?.isJoinRequestPending ||
        (!!policy &&
            policy?.type !== CONST.POLICY.TYPE.PERSONAL &&
            (shouldShowPendingDeletePolicy || policy?.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE || Object.keys(policy.errors ?? {}).length > 0) &&
            !!getPolicyRole(policy, currentUserLogin))
    );
}

/**
 * Checks if a specific user is a member of the policy.
 */
function isPolicyMember(policy: OnyxEntry<Policy>, userLogin: string | undefined): boolean {
    return !!policy && !!userLogin && !!policy.employeeList?.[userLogin];
}

function isPolicyMemberWithoutPendingDelete(currentUserLogin: string | undefined, policy: OnyxEntry<Policy>): boolean {
    if (!currentUserLogin || !policy?.id) {
        return false;
    }

    const policyEmployee = policy?.employeeList?.[currentUserLogin];
    return !!policyEmployee && policyEmployee.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;
}

function isPolicyPayer(policy: OnyxEntry<Policy>, currentUserLogin: string | undefined): boolean {
    if (!policy) {
        return false;
    }

    const isAdmin = policy.role === CONST.POLICY.ROLE.ADMIN;
    const isReimburser = policy.reimburser === currentUserLogin;

    if (policy.reimbursementChoice === CONST.POLICY.REIMBURSEMENT_CHOICES.REIMBURSEMENT_YES) {
        return policy.reimburser ? isReimburser : isAdmin;
    }

    if (policy.reimbursementChoice === CONST.POLICY.REIMBURSEMENT_CHOICES.REIMBURSEMENT_MANUAL) {
        return isAdmin;
    }

    return false;
}

function isExpensifyTeam(email: string | undefined): boolean {
    const emailDomain = Str.extractEmailDomain(email ?? '');
    return emailDomain === CONST.EXPENSIFY_PARTNER_NAME || emailDomain === CONST.EMAIL.GUIDES_DOMAIN;
}

/**
 * Checks if the user with login is an admin of the policy.
 */
const isUserPolicyAdmin = (policy: OnyxInputOrEntry<Policy>, login?: string) => !!(policy && policy.employeeList && login && policy.employeeList[login]?.role === CONST.POLICY.ROLE.ADMIN);

/**
 * Checks if the current user is of the role "user" on the policy.
 */
const isPolicyUser = (policy: OnyxInputOrEntry<Policy>, currentUserLogin?: string): boolean => getPolicyRole(policy, currentUserLogin) === CONST.POLICY.ROLE.USER;

/**
 * Checks if the current user is an auditor of the policy
 */
const isPolicyAuditor = (policy: OnyxInputOrEntry<Policy>, currentUserLogin?: string): boolean =>
    (policy?.role ?? (currentUserLogin && policy?.employeeList?.[currentUserLogin]?.role)) === CONST.POLICY.ROLE.AUDITOR;

const isPolicyEmployee = (policyID: string | undefined, policy: OnyxEntry<Policy>): boolean => {
    return !!policyID && policyID === policy?.id;
};

/**
 * Checks if the current user is an owner (creator) of the policy.
 */
const isPolicyOwner = (policy: OnyxInputOrEntry<Policy>, currentUserAccountID: number | undefined): boolean => !!currentUserAccountID && policy?.ownerAccountID === currentUserAccountID;

/**
 * Create an object mapping member emails to their accountIDs. Filter for members without errors if includeMemberWithErrors is false, and get the login email from the personalDetail object using the accountID.
 *
 * If includeMemberWithErrors is false, We only return members without errors. Otherwise, the members with errors would immediately be removed before the user has a chance to read the error.
 */
function getMemberAccountIDsForWorkspace(employeeList: PolicyEmployeeList | undefined, includeMemberWithErrors = false, includeMemberWithPendingDelete = true): MemberEmailsToAccountIDs {
    const members = employeeList ?? {};
    const memberEmailsToAccountIDs: MemberEmailsToAccountIDs = {};
    Object.keys(members).forEach((email) => {
        if (!includeMemberWithErrors) {
            const member = members?.[email];
            if (Object.keys(member?.errors ?? {})?.length > 0) {
                return;
            }
        }
        if (!includeMemberWithPendingDelete) {
            const member = members?.[email];
            if (member.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE) {
                return;
            }
        }
        const personalDetail = getPersonalDetailByEmail(email);
        if (!personalDetail?.login) {
            return;
        }
        memberEmailsToAccountIDs[email] = Number(personalDetail.accountID);
    });
    return memberEmailsToAccountIDs;
}

/**
 * Get login list that we should not show in the workspace invite options
 */
function getIneligibleInvitees(employeeList?: PolicyEmployeeList): string[] {
    const policyEmployeeList = employeeList ?? {};
    const memberEmailsToExclude: string[] = [...CONST.EXPENSIFY_EMAILS];
    Object.keys(policyEmployeeList).forEach((email) => {
        const policyEmployee = policyEmployeeList?.[email];
        // Policy members that are pending delete or have errors are not valid and we should show them in the invite options (don't exclude them).
        if (policyEmployee?.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE || Object.keys(policyEmployee?.errors ?? {}).length > 0) {
            return;
        }
        if (!email) {
            return;
        }
        memberEmailsToExclude.push(email);
    });

    return memberEmailsToExclude;
}

function getSortedTagKeys(policyTagList: OnyxEntry<PolicyTagLists>): Array<keyof PolicyTagLists> {
    if (isEmptyObject(policyTagList)) {
        return [];
    }

    return Object.keys(policyTagList).sort((key1, key2) => policyTagList[key1].orderWeight - policyTagList[key2].orderWeight);
}

/**
 * Gets a tag name of policy tags based on a tag's orderWeight.
 */
function getTagListName(policyTagList: OnyxEntry<PolicyTagLists>, orderWeight: number): string {
    if (isEmptyObject(policyTagList)) {
        return '';
    }

    return Object.values(policyTagList).find((tag) => tag.orderWeight === orderWeight)?.name ?? '';
}

/**
 * Gets all tag lists of a policy
 */
function getTagLists(policyTagList: OnyxEntry<PolicyTagLists>): Array<ValueOf<PolicyTagLists>> {
    if (isEmptyObject(policyTagList)) {
        return [];
    }

    return Object.values(policyTagList)
        .filter((policyTagListValue) => policyTagListValue !== null)
        .sort((tagA, tagB) => tagA.orderWeight - tagB.orderWeight);
}

/**
 * Gets a tag list of a policy by a tag index
 */
function getTagList(policyTagList: OnyxEntry<PolicyTagLists>, tagIndex: number): ValueOf<PolicyTagLists> {
    const tagLists = getTagLists(policyTagList);
    return (
        tagLists.at(tagIndex) ?? {
            name: '',
            required: false,
            tags: {},
            orderWeight: 0,
        }
    );
}

/**
 * Gets a tag list of a policy by a tag's orderWeight.
 */
function getTagListByOrderWeight(policyTagList: OnyxEntry<PolicyTagLists>, orderWeight: number): ValueOf<PolicyTagLists> {
    const tagListEmpty = {
        name: '',
        required: false,
        tags: {},
        orderWeight: 0,
    };
    if (isEmptyObject(policyTagList)) {
        return tagListEmpty;
    }

    return Object.values(policyTagList).find((tag) => tag.orderWeight === orderWeight) ?? tagListEmpty;
}

function getTagNamesFromTagsLists(policyTagLists: PolicyTagLists): string[] {
    const uniqueTagNames = new Set<string>();

    for (const policyTagList of Object.values(policyTagLists ?? {})) {
        for (const tag of Object.values(policyTagList.tags ?? {})) {
            uniqueTagNames.add(tag.name);
        }
    }
    return Array.from(uniqueTagNames);
}

/**
 * Cleans up escaping of colons (used to create multi-level tags, e.g. "Parent: Child") in the tag name we receive from the backend
 */
function getCleanedTagName(tag: string) {
    return tag?.replace(/\\:/g, CONST.COLON);
}

/**
 * Converts a colon-delimited tag string into a comma-separated string, filtering out empty tags.
 */
function getCommaSeparatedTagNameWithSanitizedColons(tag: string): string {
    return getTagArrayFromName(tag)
        .filter((tagItem) => tagItem !== '')
        .map(getCleanedTagName)
        .join(', ');
}

function getLengthOfTag(tag: string): number {
    if (!tag) {
        return 0;
    }
    return getTagArrayFromName(tag).length;
}

/**
 * Escape colon from tag name
 */
function escapeTagName(tag: string) {
    return tag?.replaceAll(CONST.COLON, '\\:');
}

/**
 * Gets a count of enabled tags of a policy
 */
function getCountOfEnabledTagsOfList(policyTags: PolicyTags | undefined): number {
    if (!policyTags) {
        return 0;
    }
    return Object.values(policyTags).filter((policyTag) => policyTag.enabled).length;
}
/**
 * Gets count of required tag lists of a policy
 */
function getCountOfRequiredTagLists(policyTagLists: OnyxEntry<PolicyTagLists>): number {
    if (!policyTagLists) {
        return 0;
    }
    return Object.values(policyTagLists).filter((tagList) => tagList.required).length;
}

/**
 * Whether the policy has multi-level tags
 */
function isMultiLevelTags(policyTagList: OnyxEntry<PolicyTagLists>): boolean {
    return Object.keys(policyTagList ?? {}).length > 1;
}

function isPendingDeletePolicy(policy: OnyxEntry<Policy>): boolean {
    return policy?.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;
}

function isPaidGroupPolicy(policy: OnyxInputOrEntry<Policy> | SearchPolicy): boolean {
    return policy?.type === CONST.POLICY.TYPE.TEAM || policy?.type === CONST.POLICY.TYPE.CORPORATE;
}

function getOwnedPaidPolicies(policies: OnyxCollection<Policy> | null, currentUserAccountID: number | undefined): Policy[] {
    return Object.values(policies ?? {}).filter((policy): policy is Policy => isPolicyOwner(policy, currentUserAccountID ?? CONST.DEFAULT_NUMBER_ID) && isPaidGroupPolicy(policy));
}

function isControlPolicy(policy: OnyxEntry<Policy>): boolean {
    return policy?.type === CONST.POLICY.TYPE.CORPORATE;
}

function isCollectPolicy(policy: OnyxEntry<Policy>): boolean {
    return policy?.type === CONST.POLICY.TYPE.TEAM;
}

function isTaxTrackingEnabled(isPolicyExpenseChat: boolean, policy: OnyxEntry<Policy>, isDistanceRequest: boolean, isPerDiemRequest = false): boolean {
    if (isPerDiemRequest) {
        return false;
    }
    const distanceUnit = getDistanceRateCustomUnit(policy);
    const customUnitID = distanceUnit?.customUnitID ?? CONST.DEFAULT_NUMBER_ID;
    const isPolicyTaxTrackingEnabled = isPolicyExpenseChat && policy?.tax?.trackingEnabled;
    const isTaxEnabledForDistance = isPolicyTaxTrackingEnabled && !!customUnitID && policy?.customUnits?.[customUnitID]?.attributes?.taxEnabled;

    return !!(isDistanceRequest ? isTaxEnabledForDistance : isPolicyTaxTrackingEnabled);
}

/**
 * Checks if policy's scheduled submit / auto reporting frequency is "instant".
 * Note: Free policies have "instant" submit always enabled.
 */
function isInstantSubmitEnabled(policy: OnyxInputOrEntry<Policy> | SearchPolicy): boolean {
    return policy?.autoReporting === true && policy?.autoReportingFrequency === CONST.POLICY.AUTO_REPORTING_FREQUENCIES.INSTANT;
}

/**
 * Checks if policy's scheduled submit / auto reporting frequency is not "instant".
 */
function isDelayedSubmissionEnabled(policy: OnyxInputOrEntry<Policy> | SearchPolicy): boolean {
    return policy?.autoReporting === true && policy?.autoReportingFrequency !== CONST.POLICY.AUTO_REPORTING_FREQUENCIES.INSTANT;
}

/**
 * This gets a "corrected" value for autoReportingFrequency. The purpose of this function is to encapsulate some logic around the "immediate" frequency.
 *
 * - "immediate" is actually not immediate. For that you want "instant".
 * - (immediate && harvesting.enabled) === daily
 * - (immediate && !harvesting.enabled) === manual
 *
 * Note that "daily" and "manual" only exist as options for the API, not in the database or Onyx.
 */
function getCorrectedAutoReportingFrequency(policy: OnyxInputOrEntry<Policy> | SearchPolicy): ValueOf<typeof CONST.POLICY.AUTO_REPORTING_FREQUENCIES> | undefined {
    if (policy?.autoReportingFrequency !== CONST.POLICY.AUTO_REPORTING_FREQUENCIES.IMMEDIATE) {
        return policy?.autoReportingFrequency;
    }

    if (policy?.harvesting?.enabled) {
        // This is actually not really "immediate". It's "daily". Surprise!
        return CONST.POLICY.AUTO_REPORTING_FREQUENCIES.IMMEDIATE;
    }

    // "manual" is really just "immediate" (aka "daily") with harvesting disabled
    return CONST.POLICY.AUTO_REPORTING_FREQUENCIES.MANUAL;
}

/**
 * Checks if policy's approval mode is "optional", a.k.a. "Submit & Close"
 */
function isSubmitAndClose(policy: OnyxInputOrEntry<Policy> | SearchPolicy): boolean {
    return policy?.approvalMode === CONST.POLICY.APPROVAL_MODE.OPTIONAL;
}

function arePaymentsEnabled(policy: OnyxEntry<Policy>): boolean {
    return policy?.reimbursementChoice !== CONST.POLICY.REIMBURSEMENT_CHOICES.REIMBURSEMENT_NO;
}

function isControlOnAdvancedApprovalMode(policy: OnyxInputOrEntry<Policy>): boolean {
    return policy?.type === CONST.POLICY.TYPE.CORPORATE && getApprovalWorkflow(policy) === CONST.POLICY.APPROVAL_MODE.ADVANCED;
}

/**
 * Whether the policy has active accounting integration connections.
 * `getCurrentConnectionName` only returns connections supported in NewDot.
 * `hasSupportedOnlyOnOldDotIntegration` detects connections that are supported only on OldDot.
 */
function hasAccountingConnections(policy: OnyxEntry<Policy>) {
    return !!getCurrentConnectionName(policy) || hasSupportedOnlyOnOldDotIntegration(policy);
}

function getPolicyEmployeeListByIdWithoutCurrentUser(policies: OnyxCollection<Pick<Policy, 'employeeList'>>, currentPolicyID?: string, currentUserAccountID?: number) {
    const policy = policies?.[`${ONYXKEYS.COLLECTION.POLICY}${currentPolicyID}`] ?? null;
    const policyMemberEmailsToAccountIDs = getMemberAccountIDsForWorkspace(policy?.employeeList);
    return Object.values(policyMemberEmailsToAccountIDs)
        .map((policyMemberAccountID) => Number(policyMemberAccountID))
        .filter((policyMemberAccountID) => policyMemberAccountID !== currentUserAccountID);
}

function getPolicyEmployeeAccountIDs(policy: OnyxEntry<Pick<Policy, 'employeeList'>>, currentUserAccountID?: number) {
    if (!policy) {
        return [];
    }

    const policyMemberEmailsToAccountIDs = getMemberAccountIDsForWorkspace(policy?.employeeList);
    return Object.values(policyMemberEmailsToAccountIDs)
        .map((policyMemberAccountID) => Number(policyMemberAccountID))
        .filter((policyMemberAccountID) => policyMemberAccountID !== currentUserAccountID);
}

function goBackFromInvalidPolicy() {
    Navigation.goBack(ROUTES.WORKSPACES_LIST.route);
}

/** Get a tax with given ID from policy */
function getTaxByID(policy: OnyxEntry<Policy>, taxID: string): TaxRate | undefined {
    return policy?.taxRates?.taxes?.[taxID];
}

/** Get a tax rate object built like Record<TaxRateName, RelatedTaxRateKeys>.
 * We want to allow user to choose over TaxRateName and there might be a situation when one TaxRateName has two possible keys in different policies */
function getAllTaxRatesNamesAndKeys(): Record<string, string[]> {
    const allTaxRates: Record<string, string[]> = {};
    Object.values(allPolicies ?? {})?.forEach((policy) => {
        if (!policy?.taxRates?.taxes) {
            return;
        }
        Object.entries(policy?.taxRates?.taxes).forEach(([taxRateKey, taxRate]) => {
            if (!allTaxRates[taxRate.name]) {
                allTaxRates[taxRate.name] = [taxRateKey];
                return;
            }
            if (allTaxRates[taxRate.name].includes(taxRateKey)) {
                return;
            }
            allTaxRates[taxRate.name].push(taxRateKey);
        });
    });
    return allTaxRates;
}

function isPolicyFeatureEnabled(policy: OnyxEntry<Policy>, featureName: PolicyFeatureName): boolean {
    if (featureName === CONST.POLICY.MORE_FEATURES.ARE_TAXES_ENABLED) {
        return !!policy?.tax?.trackingEnabled;
    }
    if (featureName === CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED) {
        return policy?.[featureName] ? !!policy?.[featureName] : !isEmptyObject(policy?.connections);
    }
    return !!policy?.[featureName];
}

function getApprovalWorkflow(policy: OnyxEntry<Policy> | SearchPolicy): ValueOf<typeof CONST.POLICY.APPROVAL_MODE> {
    if (policy?.type === CONST.POLICY.TYPE.PERSONAL) {
        return CONST.POLICY.APPROVAL_MODE.OPTIONAL;
    }

    return policy?.approvalMode ?? CONST.POLICY.APPROVAL_MODE.ADVANCED;
}

function getDefaultApprover(policy: OnyxEntry<Policy> | SearchPolicy): string {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    return policy?.approver || policy?.owner || '';
}

function getRuleApprovers(policy: OnyxEntry<Policy> | SearchPolicy, expenseReport: OnyxEntry<Report>) {
    const categoryApprovers: string[] = [];
    const tagApprovers: string[] = [];
    const allReportTransactions = getAllSortedTransactions(expenseReport?.reportID);

    // Before submitting to their `submitsTo` (in a policy on Advanced Approvals), submit to category/tag approvers.
    // Category approvers are prioritized, then tag approvers.
    for (let i = 0; i < allReportTransactions.length; i++) {
        const transaction = allReportTransactions.at(i);
        const tag = getTag(transaction);
        const category = getCategory(transaction);
        const categoryApprover = getCategoryApproverRule(policy?.rules?.approvalRules ?? [], category)?.approver;
        const tagApprover = getTagApproverRule(policy, tag)?.approver;
        if (categoryApprover) {
            categoryApprovers.push(categoryApprover);
        }

        if (tagApprover) {
            tagApprovers.push(tagApprover);
        }
    }

    return [...categoryApprovers, ...tagApprovers];
}

function getManagerAccountID(policy: OnyxEntry<Policy> | SearchPolicy, expenseReport: OnyxEntry<Report> | {ownerAccountID: number}) {
    const employeeAccountID = expenseReport?.ownerAccountID ?? CONST.DEFAULT_NUMBER_ID;
    const employeeLogin = getLoginsByAccountIDs([employeeAccountID]).at(0) ?? '';
    const defaultApprover = getDefaultApprover(policy);

    // For policy using the optional or basic workflow, the manager is the policy default approver.
    if (([CONST.POLICY.APPROVAL_MODE.OPTIONAL, CONST.POLICY.APPROVAL_MODE.BASIC] as Array<ValueOf<typeof CONST.POLICY.APPROVAL_MODE>>).includes(getApprovalWorkflow(policy))) {
        return getAccountIDsByLogins([defaultApprover]).at(0) ?? -1;
    }

    const employee = policy?.employeeList?.[employeeLogin];
    if (!employee && !defaultApprover) {
        return -1;
    }

    return getAccountIDsByLogins([employee?.submitsTo ?? defaultApprover]).at(0) ?? -1;
}

/**
 * Returns the accountID to whom the given expenseReport submits reports to in the given Policy.
 */
function getSubmitToAccountID(policy: OnyxEntry<Policy> | SearchPolicy, expenseReport: OnyxEntry<Report>): number {
    const ruleApprovers = getRuleApprovers(policy, expenseReport);
    const employeeAccountID = expenseReport?.ownerAccountID ?? CONST.DEFAULT_NUMBER_ID;
    const employeeLogin = getLoginsByAccountIDs([employeeAccountID]).at(0) ?? '';
    if (ruleApprovers.length > 0 && ruleApprovers.at(0) === employeeLogin && policy?.preventSelfApproval) {
        ruleApprovers.shift();
    }
    if (ruleApprovers.length > 0 && !isSubmitAndClose(policy)) {
        return getAccountIDsByLogins([ruleApprovers.at(0) ?? '']).at(0) ?? -1;
    }

    return getManagerAccountID(policy, expenseReport);
}

function getManagerAccountEmail(policy: OnyxEntry<Policy>, expenseReport: OnyxEntry<Report>): string {
    const managerAccountID = getManagerAccountID(policy, expenseReport);
    return getLoginsByAccountIDs([managerAccountID]).at(0) ?? '';
}

/**
 * Returns the email of the account to forward the report to depending on the approver's approval limit.
 * Used for advanced approval mode only.
 */
function getForwardsToAccount(policy: OnyxEntry<Policy>, employeeEmail: string, reportTotal: number): string {
    if (!isControlOnAdvancedApprovalMode(policy)) {
        return '';
    }

    const employee = policy?.employeeList?.[employeeEmail];
    if (!employee) {
        return '';
    }

    const positiveReportTotal = Math.abs(reportTotal);
    if (employee.approvalLimit && employee.overLimitForwardsTo && positiveReportTotal > employee.approvalLimit) {
        return employee.overLimitForwardsTo;
    }
    return employee.forwardsTo ?? '';
}

/**
 * Returns the accountID of the policy reimburser, if not available returns -1.
 */
function getReimburserAccountID(policy: OnyxEntry<Policy>): number {
    const reimburserEmail = policy?.achAccount?.reimburser ?? '';
    return reimburserEmail ? (getAccountIDsByLogins([reimburserEmail]).at(0) ?? -1) : -1;
}

function getPersonalPolicy() {
    return Object.values(allPolicies ?? {}).find((policy) => policy?.type === CONST.POLICY.TYPE.PERSONAL);
}

function getAdminEmployees(policy: OnyxEntry<Policy>): PolicyEmployee[] {
    if (!policy || !policy.employeeList) {
        return [];
    }
    return Object.keys(policy.employeeList)
        .map((email) => ({...policy.employeeList?.[email], email}))
        .filter((employee) => employee.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE && employee.role === CONST.POLICY.ROLE.ADMIN);
}

/**
 * Returns the policy of the report
 * @deprecated Get the data straight from Onyx - This will be fixed as part of https://github.com/Expensify/Expensify/issues/507850
 */
function getPolicy(policyID: string | undefined, policies: OnyxCollection<Policy> = allPolicies): OnyxEntry<Policy> {
    if (!policies || !policyID) {
        return undefined;
    }
    return policies[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`];
}

/** Return active policies where current user is an admin */
function getActiveAdminWorkspaces(policies: OnyxCollection<Policy> | null, currentUserLogin: string | undefined): Policy[] {
    const activePolicies = getActivePolicies(policies, currentUserLogin);
    return activePolicies.filter((policy) => shouldShowPolicy(policy, isOfflineNetworkStore(), currentUserLogin) && isPolicyAdmin(policy, currentUserLogin));
}

/** Return active policies where current user is an employee (of the role "user") */
function getActiveEmployeeWorkspaces(policies: OnyxCollection<Policy> | null, currentUserLogin: string | undefined): Policy[] {
    const activePolicies = getActivePolicies(policies, currentUserLogin);
    return activePolicies.filter((policy) => shouldShowPolicy(policy, isOfflineNetworkStore(), currentUserLogin) && isPolicyUser(policy, currentUserLogin));
}

/**
 * Checks whether the current user has a policy with admin access
 */
function hasActiveAdminWorkspaces(currentUserLogin: string | undefined) {
    return getActiveAdminWorkspaces(allPolicies, currentUserLogin).length > 0;
}

/** Whether the user can send invoice from the workspace */
function canSendInvoiceFromWorkspace(policyID: string | undefined): boolean {
    // This will be fixed as part of https://github.com/Expensify/Expensify/issues/507850
    // eslint-disable-next-line deprecation/deprecation
    const policy = getPolicy(policyID);
    return policy?.areInvoicesEnabled ?? false;
}

/** Whether the user can submit per diem expense from the workspace */
function canSubmitPerDiemExpenseFromWorkspace(policy: OnyxEntry<Policy>): boolean {
    const perDiemCustomUnit = getPerDiemCustomUnit(policy);
    return !!policy?.isPolicyExpenseChatEnabled && !isEmptyObject(perDiemCustomUnit) && !!perDiemCustomUnit?.enabled;
}

/** Whether the user can send invoice */
function canSendInvoice(policies: OnyxCollection<Policy> | null, currentUserLogin: string | undefined): boolean {
    return getActiveAdminWorkspaces(policies, currentUserLogin).some((policy) => canSendInvoiceFromWorkspace(policy.id));
}

function hasDependentTags(policy: OnyxEntry<Policy>, policyTagList: OnyxEntry<PolicyTagLists>) {
    if (!policy?.hasMultipleTagLists) {
        return false;
    }
    return Object.values(policyTagList ?? {}).some((tagList) => Object.values(tagList.tags).some((tag) => !!tag.rules?.parentTagsFilter || !!tag.parentTagsFilter));
}

function hasIndependentTags(policy: OnyxEntry<Policy>, policyTagList: OnyxEntry<PolicyTagLists>) {
    if (!policy?.hasMultipleTagLists) {
        return false;
    }
    return Object.values(policyTagList ?? {}).every((tagList) => Object.values(tagList.tags).every((tag) => !tag.rules?.parentTagsFilter && !tag.parentTagsFilter));
}

function areSettingsInErrorFields(settings?: string[], errorFields?: ErrorFields) {
    if (settings === undefined || errorFields === undefined) {
        return false;
    }

    const keys = Object.keys(errorFields);
    return settings.some((setting) => keys.includes(setting));
}

function settingsPendingAction(settings?: string[], pendingFields?: PendingFields<string>): PendingAction | undefined {
    if (settings === undefined || pendingFields === undefined) {
        return null;
    }

    const key = Object.keys(pendingFields).find((setting) => settings.includes(setting));
    if (!key) {
        return;
    }
    return pendingFields[key];
}

function getIntegrationLastSuccessfulDate(
    getLocalDateFromDatetime: LocaleContextProps['getLocalDateFromDatetime'],
    connection?: Connections[keyof Connections],
    connectionSyncProgress?: PolicyConnectionSyncProgress,
) {
    let syncSuccessfulDate;
    if (!connection) {
        return undefined;
    }
    syncSuccessfulDate = (connection as ConnectionWithLastSyncData)?.lastSync?.successfulDate;

    const connectionSyncTimeStamp = getLocalDateFromDatetime(connectionSyncProgress?.timestamp).toISOString();

    if (
        connectionSyncProgress &&
        connectionSyncProgress.stageInProgress === CONST.POLICY.CONNECTIONS.SYNC_STAGE_NAME.JOB_DONE &&
        syncSuccessfulDate &&
        connectionSyncTimeStamp > getLocalDateFromDatetime(syncSuccessfulDate).toISOString()
    ) {
        syncSuccessfulDate = connectionSyncTimeStamp;
    }
    return syncSuccessfulDate;
}

/**
 * Sort the workspaces by their name, while keeping the selected one at the beginning.
 * @param workspace1 Details of the first workspace to be compared.
 * @param workspace2 Details of the second workspace to be compared.
 * @param selectedWorkspaceID ID of the selected workspace which needs to be at the beginning.
 */
const sortWorkspacesBySelected = (
    workspace1: WorkspaceDetails,
    workspace2: WorkspaceDetails,
    selectedWorkspaceIDs: string[] | undefined,
    localeCompare: LocaleContextProps['localeCompare'],
): number => {
    if (workspace1.policyID && selectedWorkspaceIDs?.includes(workspace1?.policyID) && workspace2.policyID && selectedWorkspaceIDs?.includes(workspace2.policyID)) {
        return localeCompare(workspace1.name?.toLowerCase() ?? '', workspace2.name?.toLowerCase() ?? '');
    }
    if (workspace1.policyID && selectedWorkspaceIDs?.includes(workspace1?.policyID)) {
        return -1;
    }
    if (workspace2.policyID && selectedWorkspaceIDs?.includes(workspace2.policyID)) {
        return 1;
    }
    return localeCompare(workspace1.name?.toLowerCase() ?? '', workspace2.name?.toLowerCase() ?? '');
};

/**
 * Takes removes pendingFields and errorFields from a customUnit
 */
function removePendingFieldsFromCustomUnit(customUnit: CustomUnit): CustomUnit {
    const cleanedCustomUnit = {...customUnit};

    delete cleanedCustomUnit.pendingFields;
    delete cleanedCustomUnit.errorFields;

    return cleanedCustomUnit;
}

function goBackWhenEnableFeature(policyID: string) {
    setTimeout(() => {
        Navigation.goBack(ROUTES.WORKSPACE_INITIAL.getRoute(policyID));
    }, CONST.WORKSPACE_ENABLE_FEATURE_REDIRECT_DELAY);
}

function getAvailableIntegrationNames(policy: Policy | undefined, accountingIntegrations?: ConnectionName[]) {
    if (accountingIntegrations && accountingIntegrations.length > 0) {
        return accountingIntegrations;
    }

    if (!policy) {
        return [] as ConnectionName[];
    }

    return Object.keys(policy.connections ?? {}) as ConnectionName[];
}

function getConnectedIntegration(policy: Policy | undefined, accountingIntegrations?: ConnectionName[]) {
    return getAvailableIntegrationNames(policy, accountingIntegrations).find((integration) => !!policy?.connections?.[integration]);
}

function getValidConnectedIntegration(policy: Policy | undefined, accountingIntegrations?: ConnectionName[]) {
    return getAvailableIntegrationNames(policy, accountingIntegrations).find(
        (integration) => !!policy?.connections?.[integration] && !isAuthenticationError(policy, integration),
    );
}

function hasIntegrationAutoSync(policy: Policy | undefined, connectedIntegration?: ConnectionName) {
    return (connectedIntegration && policy?.connections?.[connectedIntegration]?.config?.autoSync?.enabled) ?? false;
}

function hasUnsupportedIntegration(policy: Policy | undefined) {
    return Object.values(CONST.POLICY.CONNECTIONS.UNSUPPORTED_NAMES).some((integration) => !!(policy?.connections as Record<string, unknown>)?.[integration]);
}

function hasSupportedOnlyOnOldDotIntegration(policy: Policy | undefined) {
    return Object.values(CONST.POLICY.CONNECTIONS.SUPPORTED_ONLY_ON_OLDDOT).some((integration) => !!(policy?.connections as Record<string, unknown>)?.[integration]);
}

function getCurrentConnectionName(policy: Policy | undefined): string | undefined {
    const connectionKey = getConnectedIntegration(policy);

    if (!connectionKey) {
        return undefined;
    }

    return CONST.POLICY.CONNECTIONS.NAME_USER_FRIENDLY[connectionKey] ?? connectionKey;
}

/**
 * Check if the policy member is deleted from the workspace
 */
function isDeletedPolicyEmployee(policyEmployee: PolicyEmployee, isOffline: boolean) {
    return !isOffline && policyEmployee.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE && isEmptyObject(policyEmployee.errors);
}

function hasNoPolicyOtherThanPersonalType() {
    return (
        Object.values(allPolicies ?? {}).filter((policy) => policy && policy.type !== CONST.POLICY.TYPE.PERSONAL && policy.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE)
            .length === 0
    );
}

function getWorkspaceAccountID(policyID?: string) {
    // This will be fixed as part of https://github.com/Expensify/Expensify/issues/507850
    // eslint-disable-next-line deprecation/deprecation
    const policy = getPolicy(policyID);

    if (!policy) {
        return 0;
    }
    return policy.workspaceAccountID ?? CONST.DEFAULT_NUMBER_ID;
}

function hasVBBA(policyID: string | undefined) {
    // This will be fixed as part of https://github.com/Expensify/Expensify/issues/507850
    // eslint-disable-next-line deprecation/deprecation
    const policy = getPolicy(policyID);
    return !!policy?.achAccount?.bankAccountID;
}

function getTagApproverRule(policyOrID: string | SearchPolicy | OnyxEntry<Policy>, tagName: string) {
    if (!policyOrID) {
        return;
    }
    // This will be fixed as part of https://github.com/Expensify/Expensify/issues/507850
    // eslint-disable-next-line deprecation/deprecation
    const policy = typeof policyOrID === 'string' ? getPolicy(policyOrID) : policyOrID;

    const approvalRules = policy?.rules?.approvalRules ?? [];
    const approverRule = approvalRules.find((rule) =>
        rule.applyWhen.find(({condition, field, value}) => condition === CONST.POLICY.RULE_CONDITIONS.MATCHES && field === CONST.POLICY.FIELDS.TAG && value === tagName),
    );

    return approverRule;
}

function getDomainNameForPolicy(policyID?: string): string {
    if (!policyID) {
        return '';
    }

    return `${CONST.EXPENSIFY_POLICY_DOMAIN}${policyID.toLowerCase()}${CONST.EXPENSIFY_POLICY_DOMAIN_EXTENSION}`;
}

function getWorkflowApprovalsUnavailable(policy: OnyxEntry<Policy>) {
    return policy?.approvalMode === CONST.POLICY.APPROVAL_MODE.OPTIONAL || !!policy?.errorFields?.approvalMode;
}

function getUserFriendlyWorkspaceType(workspaceType: ValueOf<typeof CONST.POLICY.TYPE>) {
    switch (workspaceType) {
        case CONST.POLICY.TYPE.CORPORATE:
            return translateLocal('workspace.type.control');
        case CONST.POLICY.TYPE.TEAM:
            return translateLocal('workspace.type.collect');
        default:
            return translateLocal('workspace.type.free');
    }
}

function isPolicyAccessible(policy: OnyxEntry<Policy>): boolean {
    return (
        !isEmptyObject(policy) && (Object.keys(policy).length !== 1 || isEmptyObject(policy.errors)) && !!policy?.id && policy?.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE
    );
}

function areAllGroupPoliciesExpenseChatDisabled(policies = allPolicies) {
    const groupPolicies = Object.values(policies ?? {}).filter((policy) => isPaidGroupPolicy(policy));
    if (groupPolicies.length === 0) {
        return false;
    }
    return !groupPolicies.some((policy) => !!policy?.isPolicyExpenseChatEnabled);
}

function getGroupPaidPoliciesWithExpenseChatEnabled(policies: OnyxCollection<Policy> | null = allPolicies) {
    if (isEmptyObject(policies)) {
        return CONST.EMPTY_ARRAY;
    }
    return Object.values(policies).filter((policy) => isPaidGroupPolicy(policy) && policy?.isPolicyExpenseChatEnabled);
}

function hasOtherControlWorkspaces(currentPolicyID: string) {
    const otherControlWorkspaces = Object.values(allPolicies ?? {}).filter((policy) => policy?.id !== currentPolicyID && isPolicyAdmin(policy) && isControlPolicy(policy));
    return otherControlWorkspaces.length > 0;
}

// If no policyID is provided, it indicates the workspace upgrade/downgrade URL
// is being accessed from the Subscriptions page without a specific policyID.
// In this case, check if the user is an admin on more than one policy.
// If the user is an admin for multiple policies, we can render the page as it contains a condition
// to navigate them to the Workspaces page when no policyID is provided, instead of showing the Upgrade/Downgrade button.
// If the user is not an admin for multiple policies, they are not allowed to perform this action, and the NotFoundPage is displayed.

function canModifyPlan(policyID?: string) {
    const currentUserAccountID = getCurrentUserAccountID();
    const ownerPolicies = getOwnedPaidPolicies(allPolicies, currentUserAccountID);

    if (!policyID) {
        return ownerPolicies.length > 1;
    }
    // This will be fixed as part of https://github.com/Expensify/Expensify/issues/507850
    // eslint-disable-next-line deprecation/deprecation
    const policy = getPolicy(policyID);

    return !!policy && isPolicyAdmin(policy);
}

function getAdminsPrivateEmailDomains(policy?: Policy) {
    if (!policy) {
        return [];
    }

    const adminDomains = Object.entries(policy.employeeList ?? {}).reduce((domains, [email, employee]) => {
        if (employee.role !== CONST.POLICY.ROLE.ADMIN) {
            return domains;
        }
        domains.push(Str.extractEmailDomain(email).toLowerCase());
        return domains;
    }, [] as string[]);

    const ownerDomains = policy.owner ? [Str.extractEmailDomain(policy.owner).toLowerCase()] : [];

    const privateDomains = [...new Set(adminDomains.concat(ownerDomains))].filter((domain) => !isPublicDomain(domain));

    // If the policy is not owned by Expensify there is no point in showing the domain for provisioning.
    if (!isExpensifyTeam(policy.owner)) {
        return privateDomains.filter((domain) => domain !== CONST.EXPENSIFY_PARTNER_NAME && domain !== CONST.EMAIL.GUIDES_DOMAIN);
    }

    return privateDomains;
}

/**
 * Determines the most frequent domain from the `acceptedDomains` list
 * that appears in the email addresses of policy members.
 *
 * @param acceptedDomains - List of domains to consider.
 * @param policy - The policy object.
 */
function getMostFrequentEmailDomain(acceptedDomains: string[], policy?: Policy) {
    if (!policy) {
        return undefined;
    }
    const domainOccurrences = {} as Record<string, number>;
    Object.keys(policy.employeeList ?? {})
        .concat(policy.owner)
        .map((email) => Str.extractEmailDomain(email).toLowerCase())
        .forEach((memberDomain) => {
            if (!acceptedDomains.includes(memberDomain)) {
                return;
            }
            domainOccurrences[memberDomain] = (domainOccurrences[memberDomain] || 0) + 1;
        });
    let mostFrequent = {domain: '', count: 0};
    Object.entries(domainOccurrences).forEach(([domain, count]) => {
        if (count <= mostFrequent.count) {
            return;
        }
        mostFrequent = {domain, count};
    });
    if (mostFrequent.count === 0) {
        return undefined;
    }
    return mostFrequent.domain;
}

const getDescriptionForPolicyDomainCard = (domainName: string): string => {
    // A domain name containing a policyID indicates that this is a workspace feed
    const policyID = domainName.match(CONST.REGEX.EXPENSIFY_POLICY_DOMAIN_NAME)?.[1];
    if (policyID) {
        // This will be fixed as part of https://github.com/Expensify/Expensify/issues/507850
        // eslint-disable-next-line deprecation/deprecation
        const policy = getPolicy(policyID.toUpperCase());
        return policy?.name ?? domainName;
    }
    return domainName;
};

function isPreferredExporter(policy: Policy) {
    const user = getCurrentUserEmail();
    const exporters = Object.values(policy.connections ?? {}).map((connection) => {
        if (!connection) {
            return undefined;
        }

        const config = connection.config as {export?: {exporter?: string}} | undefined;
        return config?.export?.exporter;
    });

    return exporters.some((exporter) => exporter && exporter === user);
}

/**
 * Checks if the current user is a member of any policyExpenseChatEnabled policy
 */
function isCurrentUserMemberOfAnyPolicy(): boolean {
    return Object.values(allPolicies ?? {}).some((policy) => policy?.isPolicyExpenseChatEnabled && policy?.id && policy.id !== CONST.POLICY.ID_FAKE);
}

/**
 * Whether the given policy member is an admin of the given policy
 */
function isMemberPolicyAdmin(policy: OnyxEntry<Policy>, memberEmail: string | undefined): boolean {
    if (!policy || !memberEmail) {
        return false;
    }
    const admins = getAdminEmployees(policy);
    return admins.some((admin) => admin.email === memberEmail);
}

export {
    escapeTagName,
    getActivePolicies,
    getPerDiemCustomUnits,
    getAdminEmployees,
    getCleanedTagName,
    getCommaSeparatedTagNameWithSanitizedColons,
    getConnectedIntegration,
    getValidConnectedIntegration,
    getCountOfEnabledTagsOfList,
    getIneligibleInvitees,
    getMemberAccountIDsForWorkspace,
    getNumericValue,
    isMultiLevelTags,
    getPersonalPolicy,
    // This will be fixed as part of https://github.com/Expensify/Expensify/issues/507850
    // eslint-disable-next-line deprecation/deprecation
    getPolicy,
    getPolicyBrickRoadIndicatorStatus,
    getPolicyEmployeeListByIdWithoutCurrentUser,
    getSortedTagKeys,
    getTagList,
    getTagListByOrderWeight,
    getTagListName,
    getTagLists,
    getTaxByID,
    getUnitRateValue,
    getRateDisplayValue,
    goBackFromInvalidPolicy,
    hasAccountingConnections,
    shouldShowSyncError,
    shouldShowCustomUnitsError,
    shouldShowEmployeeListError,
    hasIntegrationAutoSync,
    hasPolicyCategoriesError,
    shouldShowPolicyError,
    shouldShowPolicyErrorFields,
    isControlOnAdvancedApprovalMode,
    isExpensifyTeam,
    isDeletedPolicyEmployee,
    isInstantSubmitEnabled,
    isDelayedSubmissionEnabled,
    getCorrectedAutoReportingFrequency,
    isPaidGroupPolicy,
    isPendingDeletePolicy,
    isUserPolicyAdmin,
    isPolicyAdmin,
    isPolicyUser,
    isPolicyAuditor,
    isPolicyEmployee,
    isPolicyFeatureEnabled,
    isPolicyOwner,
    isPolicyMember,
    isPolicyPayer,
    arePaymentsEnabled,
    isSubmitAndClose,
    isTaxTrackingEnabled,
    shouldShowPolicy,
    getActiveAdminWorkspaces,
    hasActiveAdminWorkspaces,
    getOwnedPaidPolicies,
    canSendInvoiceFromWorkspace,
    canSubmitPerDiemExpenseFromWorkspace,
    canSendInvoice,
    hasDependentTags,
    hasVBBA,
    getDistanceRateCustomUnit,
    getPerDiemCustomUnit,
    getDistanceRateCustomUnitRate,
    getPerDiemRateCustomUnitRate,
    sortWorkspacesBySelected,
    removePendingFieldsFromCustomUnit,
    goBackWhenEnableFeature,
    getIntegrationLastSuccessfulDate,
    getCurrentConnectionName,
    getDefaultApprover,
    getApprovalWorkflow,
    getReimburserAccountID,
    isControlPolicy,
    isCollectPolicy,
    hasNoPolicyOtherThanPersonalType,
    areSettingsInErrorFields,
    settingsPendingAction,
    getGroupPaidPoliciesWithExpenseChatEnabled,
    getForwardsToAccount,
    getSubmitToAccountID,
    getWorkspaceAccountID,
    getAllTaxRatesNamesAndKeys as getAllTaxRates,
    getTagNamesFromTagsLists,
    getTagApproverRule,
    getDomainNameForPolicy,
    hasUnsupportedIntegration,
    hasSupportedOnlyOnOldDotIntegration,
    getWorkflowApprovalsUnavailable,
    getUserFriendlyWorkspaceType,
    isPolicyAccessible,
    hasOtherControlWorkspaces,
    getManagerAccountEmail,
    getRuleApprovers,
    canModifyPlan,
    getAdminsPrivateEmailDomains,
    getPolicyNameByID,
    getMostFrequentEmailDomain,
    getDescriptionForPolicyDomainCard,
    getManagerAccountID,
    isPreferredExporter,
    areAllGroupPoliciesExpenseChatDisabled,
    getCountOfRequiredTagLists,
    getActiveEmployeeWorkspaces,
    isCurrentUserMemberOfAnyPolicy,
    getPolicyRole,
    hasIndependentTags,
    getLengthOfTag,
    isPolicyMemberWithoutPendingDelete,
    getPolicyEmployeeAccountIDs,
    isMemberPolicyAdmin,
};

export type {MemberEmailsToAccountIDs};
