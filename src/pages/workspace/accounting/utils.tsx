import React from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import ConnectToQuickbooksDesktopFlow from '@components/ConnectToQuickbooksDesktopFlow';
import ConnectToSageIntacctFlow from '@components/ConnectToSageIntacctFlow';
import ConnectToXeroFlow from '@components/ConnectToXeroFlow';
import * as Expensicons from '@components/Icon/Expensicons';
import type {LocaleContextProps} from '@components/LocaleContextProvider';
import Text from '@components/Text';
import TextLink from '@components/TextLink';
import {isAuthenticationError} from '@libs/actions/connections';
import {getAdminPoliciesConnectedToSageIntacct} from '@libs/actions/Policy/Policy';
import getPlatform from '@libs/getPlatform';
import {translateLocal} from '@libs/Localize';
import Navigation from '@navigation/Navigation';
import type {ThemeStyles} from '@styles/index';
import {getTrackingCategories} from '@userActions/connections/Xero';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {Policy} from '@src/types/onyx';
import type {Account, ConnectionName, Connections, PolicyConnectionName, QBDNonReimbursableExportAccountType, QBDReimbursableExportAccountType} from '@src/types/onyx/Policy';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import type {AccountingIntegration} from './types';

const platform = getPlatform(true);
const isMobile = [CONST.PLATFORM.MOBILE_WEB, CONST.PLATFORM.IOS, CONST.PLATFORM.ANDROID].some((value) => value === platform);

function getAccountingIntegrationData(
    connectionName: PolicyConnectionName,
    policyID: string,
    translate: LocaleContextProps['translate'],
    policy?: Policy,
    key?: number,
    integrationToDisconnect?: ConnectionName,
    shouldDisconnectIntegrationBeforeConnecting?: boolean,
): AccountingIntegration | undefined {
    const hasPoliciesConnectedToSageIntacct = !!getAdminPoliciesConnectedToSageIntacct().length;
    switch (connectionName) {
        case CONST.POLICY.CONNECTIONS.NAME.XERO:
            return {
                title: translate('workspace.accounting.xero'),
                icon: Expensicons.XeroSquare,
                setupConnectionFlow: (
                    <ConnectToXeroFlow
                        policyID={policyID}
                        key={key}
                    />
                ),
                onImportPagePress: () => Navigation.navigate(ROUTES.POLICY_ACCOUNTING_XERO_IMPORT.getRoute(policyID)),
                subscribedImportSettings: [
                    CONST.XERO_CONFIG.ENABLE_NEW_CATEGORIES,
                    CONST.XERO_CONFIG.IMPORT_TRACKING_CATEGORIES,
                    CONST.XERO_CONFIG.IMPORT_CUSTOMERS,
                    CONST.XERO_CONFIG.IMPORT_TAX_RATES,
                    ...getTrackingCategories(policy).map((category) => `${CONST.XERO_CONFIG.TRACKING_CATEGORY_PREFIX}${category.id}`),
                ],
                onExportPagePress: () => Navigation.navigate(ROUTES.POLICY_ACCOUNTING_XERO_EXPORT.getRoute(policyID)),
                subscribedExportSettings: [CONST.XERO_CONFIG.EXPORTER, CONST.XERO_CONFIG.BILL_DATE, CONST.XERO_CONFIG.BILL_STATUS, CONST.XERO_CONFIG.NON_REIMBURSABLE_ACCOUNT],
                onCardReconciliationPagePress: () => Navigation.navigate(ROUTES.WORKSPACE_ACCOUNTING_CARD_RECONCILIATION.getRoute(policyID, CONST.POLICY.CONNECTIONS.ROUTE.XERO)),
                onAdvancedPagePress: () => Navigation.navigate(ROUTES.POLICY_ACCOUNTING_XERO_ADVANCED.getRoute(policyID)),
                subscribedAdvancedSettings: [
                    CONST.XERO_CONFIG.ENABLED,
                    CONST.XERO_CONFIG.SYNC_REIMBURSED_REPORTS,
                    CONST.XERO_CONFIG.REIMBURSEMENT_ACCOUNT_ID,
                    CONST.XERO_CONFIG.INVOICE_COLLECTIONS_ACCOUNT_ID,
                ],
                pendingFields: policy?.connections?.xero?.config?.pendingFields,
                errorFields: policy?.connections?.xero?.config?.errorFields,
            };
        case CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT:
            return {
                title: translate('workspace.accounting.intacct'),
                icon: Expensicons.IntacctSquare,
                setupConnectionFlow: (
                    <ConnectToSageIntacctFlow
                        policyID={policyID}
                        key={key}
                    />
                ),
                onImportPagePress: () => Navigation.navigate(ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_IMPORT.getRoute(policyID)),
                subscribedImportSettings: [
                    CONST.SAGE_INTACCT_CONFIG.SYNC_ITEMS,
                    ...Object.values(CONST.SAGE_INTACCT_CONFIG.MAPPINGS),
                    CONST.SAGE_INTACCT_CONFIG.TAX,
                    ...(policy?.connections?.intacct?.config?.mappings?.dimensions ?? []).map((dimension) => `${CONST.SAGE_INTACCT_CONFIG.DIMENSION_PREFIX}${dimension.dimension}`),
                ],
                onExportPagePress: () => Navigation.navigate(ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_EXPORT.getRoute(policyID)),
                subscribedExportSettings: [
                    CONST.SAGE_INTACCT_CONFIG.EXPORTER,
                    CONST.SAGE_INTACCT_CONFIG.EXPORT_DATE,
                    CONST.SAGE_INTACCT_CONFIG.REIMBURSABLE,
                    CONST.SAGE_INTACCT_CONFIG.REIMBURSABLE_VENDOR,
                    CONST.SAGE_INTACCT_CONFIG.NON_REIMBURSABLE,
                    CONST.SAGE_INTACCT_CONFIG.NON_REIMBURSABLE_ACCOUNT,
                    policy?.connections?.intacct?.config?.export?.nonReimbursable === CONST.SAGE_INTACCT_NON_REIMBURSABLE_EXPENSE_TYPE.VENDOR_BILL
                        ? CONST.SAGE_INTACCT_CONFIG.NON_REIMBURSABLE_VENDOR
                        : CONST.SAGE_INTACCT_CONFIG.NON_REIMBURSABLE_CREDIT_CARD_VENDOR,
                ],
                onCardReconciliationPagePress: () => Navigation.navigate(ROUTES.WORKSPACE_ACCOUNTING_CARD_RECONCILIATION.getRoute(policyID, CONST.POLICY.CONNECTIONS.ROUTE.SAGE_INTACCT)),
                onAdvancedPagePress: () => Navigation.navigate(ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_ADVANCED.getRoute(policyID)),
                subscribedAdvancedSettings: [
                    CONST.SAGE_INTACCT_CONFIG.AUTO_SYNC_ENABLED,
                    CONST.SAGE_INTACCT_CONFIG.IMPORT_EMPLOYEES,
                    CONST.SAGE_INTACCT_CONFIG.APPROVAL_MODE,
                    CONST.SAGE_INTACCT_CONFIG.SYNC_REIMBURSED_REPORTS,
                    CONST.SAGE_INTACCT_CONFIG.REIMBURSEMENT_ACCOUNT_ID,
                ],
                pendingFields: policy?.connections?.intacct?.config?.pendingFields,
                errorFields: policy?.connections?.intacct?.config?.errorFields,
            };
        case CONST.POLICY.CONNECTIONS.NAME.QBD:
            return {
                title: translate('workspace.accounting.qbd'),
                icon: Expensicons.QBDSquare,
                setupConnectionFlow: (
                    <ConnectToQuickbooksDesktopFlow
                        policyID={policyID}
                        key={key}
                    />
                ),
                onImportPagePress: () => Navigation.navigate(ROUTES.POLICY_ACCOUNTING_QUICKBOOKS_DESKTOP_IMPORT.getRoute(policyID)),
                onExportPagePress: () => Navigation.navigate(ROUTES.POLICY_ACCOUNTING_QUICKBOOKS_DESKTOP_EXPORT.getRoute(policyID)),
                onCardReconciliationPagePress: () => Navigation.navigate(ROUTES.WORKSPACE_ACCOUNTING_CARD_RECONCILIATION.getRoute(policyID, CONST.POLICY.CONNECTIONS.ROUTE.QBD)),
                onAdvancedPagePress: () => Navigation.navigate(ROUTES.WORKSPACE_ACCOUNTING_QUICKBOOKS_DESKTOP_ADVANCED.getRoute(policyID)),
                subscribedImportSettings: [
                    CONST.QUICKBOOKS_DESKTOP_CONFIG.ENABLE_NEW_CATEGORIES,
                    CONST.QUICKBOOKS_DESKTOP_CONFIG.MAPPINGS.CLASSES,
                    CONST.QUICKBOOKS_DESKTOP_CONFIG.MAPPINGS.CUSTOMERS,
                    CONST.QUICKBOOKS_DESKTOP_CONFIG.IMPORT_ITEMS,
                ],
                subscribedExportSettings: [
                    CONST.QUICKBOOKS_DESKTOP_CONFIG.EXPORT_DATE,
                    CONST.QUICKBOOKS_DESKTOP_CONFIG.EXPORTER,
                    CONST.QUICKBOOKS_DESKTOP_CONFIG.REIMBURSABLE,
                    CONST.QUICKBOOKS_DESKTOP_CONFIG.REIMBURSABLE_ACCOUNT,
                    CONST.QUICKBOOKS_DESKTOP_CONFIG.MARK_CHECKS_TO_BE_PRINTED,
                    CONST.QUICKBOOKS_DESKTOP_CONFIG.NON_REIMBURSABLE,
                    CONST.QUICKBOOKS_DESKTOP_CONFIG.NON_REIMBURSABLE_ACCOUNT,
                    CONST.QUICKBOOKS_DESKTOP_CONFIG.NON_REIMBURSABLE_BILL_DEFAULT_VENDOR,
                    CONST.QUICKBOOKS_DESKTOP_CONFIG.SHOULD_AUTO_CREATE_VENDOR,
                ],
                subscribedAdvancedSettings: [CONST.QUICKBOOKS_DESKTOP_CONFIG.SHOULD_AUTO_CREATE_VENDOR, CONST.QUICKBOOKS_DESKTOP_CONFIG.AUTO_SYNC],
            };
        default:
            return undefined;
    }
}

function getSynchronizationErrorMessage(
    policy: OnyxEntry<Policy>,
    connectionName: PolicyConnectionName,
    isSyncInProgress: boolean,
    translate: LocaleContextProps['translate'],
    styles?: ThemeStyles,
): React.ReactNode | undefined {
    if (isAuthenticationError(policy, connectionName)) {
        return (
            <Text style={[styles?.formError]}>
                <Text style={[styles?.formError]}>{translate('workspace.common.authenticationError', {connectionName: CONST.POLICY.CONNECTIONS.NAME_USER_FRIENDLY[connectionName]})} </Text>
                {connectionName in CONST.POLICY.CONNECTIONS.AUTH_HELP_LINKS && (
                    <>
                        <TextLink
                            style={[styles?.link, styles?.fontSizeLabel]}
                            href={CONST.POLICY.CONNECTIONS.AUTH_HELP_LINKS[connectionName as keyof typeof CONST.POLICY.CONNECTIONS.AUTH_HELP_LINKS]}
                        >
                            {translate('workspace.common.learnMore')}
                        </TextLink>
                        .
                    </>
                )}
            </Text>
        );
    }

    const syncError = translateLocal('workspace.accounting.syncError', {connectionName});

    const connection = policy?.connections?.[connectionName];
    if (isSyncInProgress || isEmptyObject(connection?.lastSync) || connection?.lastSync?.isSuccessful !== false || !connection?.lastSync?.errorDate) {
        return;
    }

    return `${syncError} ("${connection?.lastSync?.errorMessage}")`;
}

function getQBDReimbursableAccounts(
    quickbooksDesktop?: Connections[typeof CONST.POLICY.CONNECTIONS.NAME.QBD],
    reimbursable?: QBDReimbursableExportAccountType | QBDNonReimbursableExportAccountType,
) {
    const {bankAccounts, journalEntryAccounts, payableAccounts, creditCardAccounts} = quickbooksDesktop?.data ?? {};

    let accounts: Account[];
    switch (reimbursable ?? quickbooksDesktop?.config?.export.reimbursable) {
        case CONST.QUICKBOOKS_DESKTOP_REIMBURSABLE_ACCOUNT_TYPE.CHECK:
            accounts = bankAccounts ?? [];
            break;
        case CONST.QUICKBOOKS_DESKTOP_REIMBURSABLE_ACCOUNT_TYPE.JOURNAL_ENTRY:
            // Journal entry accounts include payable accounts, other current liabilities, and other current assets
            accounts = [...(payableAccounts ?? []), ...(journalEntryAccounts ?? [])];
            break;
        case CONST.QUICKBOOKS_DESKTOP_REIMBURSABLE_ACCOUNT_TYPE.VENDOR_BILL:
            accounts = payableAccounts ?? [];
            break;
        case CONST.QUICKBOOKS_DESKTOP_NON_REIMBURSABLE_EXPORT_ACCOUNT_TYPE.CREDIT_CARD:
            accounts = creditCardAccounts ?? [];
            break;
        default:
            accounts = [];
    }
    return accounts;
}

export {getAccountingIntegrationData, getSynchronizationErrorMessage, getQBDReimbursableAccounts};
