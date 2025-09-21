import React from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import ConnectToQuickbooksDesktopFlow from '@components/ConnectToQuickbooksDesktopFlow';
import * as Expensicons from '@components/Icon/Expensicons';
import type {LocaleContextProps} from '@components/LocaleContextProvider';
import Text from '@components/Text';
import TextLink from '@components/TextLink';
import {isAuthenticationError} from '@libs/actions/connections';
import getPlatform from '@libs/getPlatform';
import {translateLocal} from '@libs/Localize';
import Navigation from '@navigation/Navigation';
import type {ThemeStyles} from '@styles/index';
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
    switch (connectionName) {
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
