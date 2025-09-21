import type {ValueOf} from 'type-fest';
import type {LocaleContextProps} from '@components/LocaleContextProvider';
import type {SelectorType} from '@components/SelectionScreen';
import {getCurrentConnectionName, getSageIntacctNonReimbursableActiveDefaultVendor} from '@libs/PolicyUtils';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {Card, Policy} from '@src/types/onyx';
import type {Account, PolicyConnectionName} from '@src/types/onyx/Policy';

type ExportIntegration = {
    title?: string;
    description?: string;
    exportPageLink: string;
    data: SelectorType[];
    exportType?: ValueOf<typeof CONST.COMPANY_CARDS.EXPORT_CARD_TYPES>;
    shouldShowMenuItem?: boolean;
};

function getExportMenuItem(
    connectionName: PolicyConnectionName | undefined,
    policyID: string,
    translate: LocaleContextProps['translate'],
    policy?: Policy,
    companyCard?: Card,
    backTo?: string | undefined,
): ExportIntegration | undefined {
    const currentConnectionName = getCurrentConnectionName(policy);
    const defaultCard = translate('workspace.moreFeatures.companyCards.defaultCard');
    const defaultVendor = translate('workspace.accounting.defaultVendor');

    const defaultMenuItem: Account & {value?: string} = {
        name: defaultCard,
        value: defaultCard,
        id: defaultCard,
        currency: '',
    };

    const defaultVendorMenuItem: Account & {value?: string} = {
        name: defaultVendor,
        value: defaultVendor,
        id: defaultVendor,
        currency: '',
    };

    const {export: exportConfig} = policy?.connections?.intacct?.config ?? {};
    const {export: exportConfiguration} = policy?.connections?.xero?.config ?? {};
    const {bankAccounts} = policy?.connections?.xero?.data ?? {};
    const {creditCardAccounts} = policy?.connections?.quickbooksDesktop?.data ?? {};
    const {export: exportQBD} = policy?.connections?.quickbooksDesktop?.config ?? {};

    switch (connectionName) {
        case CONST.POLICY.CONNECTIONS.NAME.XERO: {
            const type = translate('workspace.xero.xeroBankAccount');
            const description = currentConnectionName && type ? translate('workspace.moreFeatures.companyCards.integrationExport', {integration: type}) : undefined;
            const exportType = CONST.COMPANY_CARDS.EXPORT_CARD_TYPES.NVP_XERO_EXPORT_BANK_ACCOUNT;
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            const defaultAccount = exportConfiguration?.nonReimbursableAccount || bankAccounts?.[0]?.id;
            const isDefaultTitle = !!(
                defaultAccount &&
                (!companyCard?.nameValuePairs?.xero_export_bank_account || companyCard?.nameValuePairs?.xero_export_bank_account === CONST.COMPANY_CARDS.DEFAULT_EXPORT_TYPE)
            );
            const selectedAccount = (bankAccounts ?? []).find((bank) => bank.id === (companyCard?.nameValuePairs?.xero_export_bank_account ?? defaultAccount));
            const resultData = (bankAccounts ?? [])?.length > 0 ? [defaultMenuItem, ...(bankAccounts ?? [])] : bankAccounts;

            return {
                description,
                exportType,
                shouldShowMenuItem: !!exportConfiguration?.nonReimbursableAccount,
                title: isDefaultTitle ? defaultCard : selectedAccount?.name,
                exportPageLink: ROUTES.POLICY_ACCOUNTING_XERO_EXPORT.getRoute(policyID, backTo),
                data: (resultData ?? []).map((card) => {
                    return {
                        value: card.id,
                        text: card.name,
                        keyForList: card.id,
                        isSelected: isDefaultTitle ? card.name === defaultCard : selectedAccount?.id === card.id,
                    };
                }),
            };
        }
        case CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT: {
            const isNonReimbursable = !!exportConfig?.nonReimbursable;
            const isReimbursable = !!exportConfig?.reimbursable;
            const typeNonReimbursable = isNonReimbursable ? translate(`workspace.sageIntacct.nonReimbursableExpenses.values.${exportConfig.nonReimbursable}`) : undefined;
            const typeReimbursable = isReimbursable ? translate(`workspace.sageIntacct.reimbursableExpenses.values.${exportConfig.reimbursable}`) : undefined;
            const type = typeNonReimbursable ?? typeReimbursable;
            const description = currentConnectionName && type ? translate('workspace.moreFeatures.companyCards.integrationExport', {integration: currentConnectionName, type}) : undefined;
            let exportType: ValueOf<typeof CONST.COMPANY_CARDS.EXPORT_CARD_TYPES> | undefined;
            let title: string | undefined = '';
            let isDefaultTitle = false;

            let shouldShowMenuItem = true;
            let data: SelectorType[];

            const sageConfig = exportConfig?.nonReimbursable ?? exportConfig?.reimbursable;

            switch (sageConfig) {
                case CONST.SAGE_INTACCT_NON_REIMBURSABLE_EXPENSE_TYPE.VENDOR_BILL:
                case CONST.SAGE_INTACCT_REIMBURSABLE_EXPENSE_TYPE.VENDOR_BILL: {
                    const defaultAccount = isNonReimbursable ? getSageIntacctNonReimbursableActiveDefaultVendor(policy) : exportConfig?.reimbursableExpenseReportDefaultVendor;
                    isDefaultTitle = !!(
                        companyCard?.nameValuePairs?.intacct_export_vendor === CONST.COMPANY_CARDS.DEFAULT_EXPORT_TYPE || !companyCard?.nameValuePairs?.intacct_export_vendor
                    );
                    const vendors = policy?.connections?.intacct?.data?.vendors ?? [];
                    const selectedVendorID = companyCard?.nameValuePairs?.intacct_export_vendor ?? defaultAccount;
                    const selectedVendor = (vendors ?? []).find(({id}) => id === selectedVendorID);
                    title = isDefaultTitle ? defaultVendor : selectedVendor?.value;
                    const resultData = (vendors ?? []).length > 0 ? [defaultVendorMenuItem, ...(vendors ?? [])] : vendors;
                    data = (resultData ?? []).map(({id, value}) => {
                        return {
                            value: id,
                            text: value,
                            keyForList: id,
                            isSelected: isDefaultTitle ? value === defaultVendor : selectedVendor?.id === id,
                        };
                    });
                    exportType = CONST.COMPANY_CARDS.EXPORT_CARD_TYPES.NVP_INTACCT_EXPORT_VENDOR;
                    break;
                }
                case CONST.SAGE_INTACCT_NON_REIMBURSABLE_EXPENSE_TYPE.CREDIT_CARD_CHARGE: {
                    const intacctCreditCards = policy?.connections?.intacct?.data?.creditCards ?? [];
                    const activeDefaultVendor = getSageIntacctNonReimbursableActiveDefaultVendor(policy);

                    const defaultVendorAccount = (policy?.connections?.intacct?.data?.vendors ?? []).find((vendor) => vendor.id === activeDefaultVendor);
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    const defaultAccount = exportConfig?.nonReimbursableAccount || defaultVendorAccount;
                    isDefaultTitle = !!(
                        companyCard?.nameValuePairs?.intacct_export_charge_card === CONST.COMPANY_CARDS.DEFAULT_EXPORT_TYPE || !companyCard?.nameValuePairs?.intacct_export_charge_card
                    );
                    const selectedVendorID = companyCard?.nameValuePairs?.intacct_export_charge_card ?? defaultAccount;
                    const selectedCard = (intacctCreditCards ?? []).find(({id}) => id === selectedVendorID);
                    title = isDefaultTitle ? defaultCard : selectedCard?.name;
                    const resultData = (intacctCreditCards ?? []).length > 0 ? [defaultMenuItem, ...(intacctCreditCards ?? [])] : intacctCreditCards;

                    data = (resultData ?? []).map(({id, name}) => {
                        return {
                            value: id,
                            text: name,
                            keyForList: id,
                            isSelected: isDefaultTitle ? name === defaultCard : selectedCard?.id === id,
                        };
                    });
                    exportType = CONST.COMPANY_CARDS.EXPORT_CARD_TYPES.NVP_INTACCT_EXPORT_CHARGE_CARD;
                    break;
                }
                default:
                    shouldShowMenuItem = false;
                    data = [];
            }

            return {
                description,
                shouldShowMenuItem,
                exportType,
                title,
                exportPageLink: ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_EXPORT.getRoute(policyID, backTo),
                data,
            };
        }
        case CONST.POLICY.CONNECTIONS.NAME.QBD: {
            const nonReimbursableExpenses = exportQBD?.nonReimbursable;
            const reimbursableExpenses = exportQBD?.reimbursable;
            const typeNonReimbursable = nonReimbursableExpenses ? translate(`workspace.qbd.accounts.${nonReimbursableExpenses}`) : undefined;
            const typeReimbursable = reimbursableExpenses ? translate(`workspace.qbd.accounts.${reimbursableExpenses}`) : undefined;
            const type = typeNonReimbursable ?? typeReimbursable;
            const description = currentConnectionName && type ? translate('workspace.moreFeatures.companyCards.integrationExport', {integration: currentConnectionName, type}) : undefined;
            let data: Account[];
            let shouldShowMenuItem =
                nonReimbursableExpenses !== CONST.QUICKBOOKS_DESKTOP_NON_REIMBURSABLE_EXPORT_ACCOUNT_TYPE.CHECK &&
                nonReimbursableExpenses !== CONST.QUICKBOOKS_DESKTOP_NON_REIMBURSABLE_EXPORT_ACCOUNT_TYPE.VENDOR_BILL;
            let title: string | undefined = '';
            let selectedAccount: string | undefined = '';
            const defaultAccount = exportQBD?.nonReimbursableAccount ?? exportQBD?.reimbursableAccount;
            let isDefaultTitle = false;
            let exportType: ValueOf<typeof CONST.COMPANY_CARDS.EXPORT_CARD_TYPES> | undefined;
            const qbdConfig = nonReimbursableExpenses ?? reimbursableExpenses;
            switch (qbdConfig) {
                case CONST.QUICKBOOKS_DESKTOP_REIMBURSABLE_ACCOUNT_TYPE.JOURNAL_ENTRY:
                case CONST.QUICKBOOKS_DESKTOP_REIMBURSABLE_ACCOUNT_TYPE.CHECK:
                case CONST.QUICKBOOKS_DESKTOP_REIMBURSABLE_ACCOUNT_TYPE.VENDOR_BILL:
                case CONST.QUICKBOOKS_DESKTOP_NON_REIMBURSABLE_EXPORT_ACCOUNT_TYPE.CREDIT_CARD: {
                    data = creditCardAccounts ?? [];
                    isDefaultTitle = !!(
                        companyCard?.nameValuePairs?.quickbooks_desktop_export_account_credit === CONST.COMPANY_CARDS.DEFAULT_EXPORT_TYPE ||
                        (defaultAccount && !companyCard?.nameValuePairs?.quickbooks_desktop_export_account_credit)
                    );
                    title = isDefaultTitle ? defaultCard : companyCard?.nameValuePairs?.quickbooks_desktop_export_account_credit;
                    selectedAccount = companyCard?.nameValuePairs?.quickbooks_desktop_export_account_credit ?? defaultAccount;
                    exportType = CONST.COMPANY_CARDS.EXPORT_CARD_TYPES.NVP_QUICKBOOKS_DESKTOP_EXPORT_ACCOUNT_CREDIT;
                    break;
                }
                default:
                    shouldShowMenuItem = false;
                    data = [];
            }

            const resultData = data.length > 0 ? [defaultMenuItem, ...data] : data;

            return {
                description,
                title,
                exportType,
                shouldShowMenuItem,
                exportPageLink: ROUTES.POLICY_ACCOUNTING_QUICKBOOKS_DESKTOP_EXPORT.getRoute(policyID, backTo),
                data: resultData.map((card) => ({
                    value: card.name,
                    text: card.name,
                    keyForList: card.name,
                    isSelected: isDefaultTitle ? card.name === defaultCard : card.name === selectedAccount,
                })),
            };
        }

        default:
            return undefined;
    }
}

// eslint-disable-next-line import/prefer-default-export
export {getExportMenuItem};
