/**
 * NOTE!!!!
 *
 * Refer to ./contributingGuides/philosophies/ROUTING.md for information on how to construct routes.
 */
import type {TupleToUnion, ValueOf} from 'type-fest';
import type {UpperCaseCharacters} from 'type-fest/source/internal';
import type {SearchFilterKey, SearchQueryString, UserFriendlyKey} from './components/Search/types';
import type CONST from './CONST';
import type {IOUAction, IOUType} from './CONST';
import type {IOURequestType} from './libs/actions/IOU';
import Log from './libs/Log';
import type {RootNavigatorParamList} from './libs/Navigation/types';
import type {ReimbursementAccountStepToOpen} from './libs/ReimbursementAccountUtils';
import {getUrlWithParams} from './libs/Url';
import SCREENS from './SCREENS';
import type {Screen} from './SCREENS';
import type {ConnectionName} from './types/onyx/Policy';
import type {CustomFieldType} from './types/onyx/PolicyEmployee';
import type AssertTypesNotEqual from './types/utils/AssertTypesNotEqual';

// This is a file containing constants for all the routes we want to be able to go to

/**
 * Builds a URL with an encoded URI component for the `backTo` param which can be added to the end of URLs
 */
function getUrlWithBackToParam<TUrl extends string>(url: TUrl, backTo?: string, shouldEncodeURIComponent = true): `${TUrl}` {
    const backToParam = backTo ? (`${url.includes('?') ? '&' : '?'}backTo=${shouldEncodeURIComponent ? encodeURIComponent(backTo) : backTo}` as const) : '';
    return `${url}${backToParam}` as `${TUrl}`;
}

const PUBLIC_SCREENS_ROUTES = {
    // If the user opens this route, we'll redirect them to the path saved in the last visited path or to the home page if the last visited path is empty.
    ROOT: '',
    TRANSITION_BETWEEN_APPS: 'transition',
    CONNECTION_COMPLETE: 'connection-complete',
    BANK_CONNECTION_COMPLETE: 'bank-connection-complete',
    VALIDATE_LOGIN: 'v/:accountID/:validateCode',
    UNLINK_LOGIN: 'u/:accountID/:validateCode',
    APPLE_SIGN_IN: 'sign-in-with-apple',
    GOOGLE_SIGN_IN: 'sign-in-with-google',
    SAML_SIGN_IN: 'sign-in-with-saml',
} as const;

// Exported for identifying a url as a verify-account route, associated with a page extending the VerifyAccountPageBase component
const VERIFY_ACCOUNT = 'verify-account';

const ROUTES = {
    ...PUBLIC_SCREENS_ROUTES,
    // This route renders the list of reports.
    HOME: 'home',

    // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
    WORKSPACES_LIST: {route: 'workspaces', getRoute: (backTo?: string) => getUrlWithBackToParam('workspaces', backTo)},

    SEARCH_ROOT: {
        route: 'search',
        getRoute: ({query, name}: {query: SearchQueryString; name?: string}) => {
            return `search?q=${encodeURIComponent(query)}${name ? `&name=${name}` : ''}` as const;
        },
    },
    SEARCH_SAVED_SEARCH_RENAME: {
        route: 'search/saved-search/rename',
        getRoute: ({name, jsonQuery}: {name: string; jsonQuery: SearchQueryString}) => `search/saved-search/rename?name=${name}&q=${jsonQuery}` as const,
    },
    SEARCH_ADVANCED_FILTERS: {
        route: 'search/filters/:filterKey?',
        getRoute: (filterKey?: SearchFilterKey | UserFriendlyKey) => {
            return `search/filters/${filterKey ?? ''}` as const;
        },
    },
    SEARCH_REPORT: {
        route: 'search/view/:reportID/:reportActionID?',
        getRoute: ({reportID, reportActionID, backTo}: {reportID: string | undefined; reportActionID?: string; backTo?: string}) => {
            if (!reportID) {
                Log.warn('Invalid reportID is used to build the SEARCH_REPORT route');
            }

            const baseRoute = reportActionID ? (`search/view/${reportID}/${reportActionID}` as const) : (`search/view/${reportID}` as const);

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(baseRoute, backTo);
        },
    },
    SEARCH_MONEY_REQUEST_REPORT: {
        route: 'search/r/:reportID',
        getRoute: ({reportID, backTo}: {reportID: string; backTo?: string}) => {
            const baseRoute = `search/r/${reportID}` as const;

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(baseRoute, backTo);
        },
    },
    SEARCH_MONEY_REQUEST_REPORT_HOLD_TRANSACTIONS: {
        route: 'search/r/:reportID/hold',
        getRoute: ({reportID, backTo}: {reportID: string; backTo?: string}) => {
            const baseRoute = `search/r/${reportID}/hold` as const;

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(baseRoute, backTo);
        },
    },
    TRANSACTION_HOLD_REASON_RHP: 'search/hold',
    MOVE_TRANSACTIONS_SEARCH_RHP: 'search/move-transactions',

    // This is a utility route used to go to the user's concierge chat, or the sign-in page if the user's not authenticated
    CONCIERGE: 'concierge',
    TRACK_EXPENSE: 'track-expense',
    SUBMIT_EXPENSE: 'submit-expense',
    PROFILE: {
        route: 'a/:accountID',
        getRoute: (accountID?: number, backTo?: string, login?: string) => {
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            const baseRoute = getUrlWithBackToParam(`a/${accountID}`, backTo);
            const loginParam = login ? `?login=${encodeURIComponent(login)}` : '';
            return `${baseRoute}${loginParam}` as const;
        },
    },
    PROFILE_AVATAR: {
        route: 'a/:accountID/avatar',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (accountID: number, backTo?: string) => getUrlWithBackToParam(`a/${accountID}/avatar` as const, backTo),
    },

    DESKTOP_SIGN_IN_REDIRECT: 'desktop-signin-redirect',

    // This is a special validation URL that will take the user to /workspace/new after validation. This is used
    // when linking users from e.com in order to share a session in this app.
    SIGN_IN_MODAL: 'sign-in-modal',
    REQUIRE_TWO_FACTOR_AUTH: '2fa-required',

    BANK_ACCOUNT: 'bank-account',
    BANK_ACCOUNT_NEW: 'bank-account/new',
    BANK_ACCOUNT_PERSONAL: 'bank-account/personal',
    BANK_ACCOUNT_WITH_STEP_TO_OPEN: {
        route: 'bank-account/:stepToOpen?',
        getRoute: (policyID: string | undefined, stepToOpen: ReimbursementAccountStepToOpen = '', backTo?: string) => {
            if (!policyID) {
                Log.warn('Invalid policyID is used to build the BANK_ACCOUNT_WITH_STEP_TO_OPEN route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`bank-account/${stepToOpen}?policyID=${policyID}`, backTo);
        },
    },
    BANK_ACCOUNT_ENTER_SIGNER_INFO: {
        route: 'bank-account/enter-signer-info',
        getRoute: (policyID: string | undefined, bankAccountID: string | undefined, isCompleted: boolean) => {
            if (!policyID) {
                Log.warn('Invalid policyID is used to build the BANK_ACCOUNT_ENTER_SIGNER_INFO route');
            }
            return `bank-account/enter-signer-info?policyID=${policyID}&bankAccountID=${bankAccountID}&isCompleted=${isCompleted}` as const;
        },
    },
    PUBLIC_CONSOLE_DEBUG: {
        route: 'troubleshoot/console',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (backTo?: string) => getUrlWithBackToParam(`troubleshoot/console`, backTo),
    },
    SETTINGS: 'settings',
    SETTINGS_PROFILE: {
        route: 'settings/profile',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (backTo?: string) => getUrlWithBackToParam('settings/profile', backTo),
    },
    SETTINGS_SHARE_CODE: 'settings/shareCode',
    SETTINGS_DISPLAY_NAME: 'settings/profile/display-name',
    SETTINGS_TIMEZONE: 'settings/profile/timezone',
    SETTINGS_TIMEZONE_SELECT: 'settings/profile/timezone/select',
    SETTINGS_PRONOUNS: 'settings/profile/pronouns',
    SETTINGS_PREFERENCES: 'settings/preferences',
    SETTINGS_PRIORITY_MODE: 'settings/preferences/priority-mode',
    SETTINGS_LANGUAGE: 'settings/preferences/language',
    SETTINGS_PAYMENT_CURRENCY: 'setting/preferences/payment-currency',
    SETTINGS_THEME: 'settings/preferences/theme',
    SETTINGS_SECURITY: 'settings/security',
    SETTINGS_CLOSE: 'settings/security/closeAccount',
    SETTINGS_ABOUT: 'settings/about',
    SETTINGS_APP_DOWNLOAD_LINKS: 'settings/about/app-download-links',
    SETTINGS_LEGAL_NAME: 'settings/profile/legal-name',
    SETTINGS_DATE_OF_BIRTH: 'settings/profile/date-of-birth',
    SETTINGS_PHONE_NUMBER: 'settings/profile/phone',
    SETTINGS_ADDRESS: 'settings/profile/address',
    SETTINGS_ADDRESS_COUNTRY: {
        route: 'settings/profile/address/country',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (country: string, backTo?: string) => getUrlWithBackToParam(`settings/profile/address/country?country=${country}`, backTo),
    },
    SETTINGS_ADDRESS_STATE: {
        route: 'settings/profile/address/state',

        getRoute: (state?: string, backTo?: string, label?: string) =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            `${getUrlWithBackToParam(`settings/profile/address/state${state ? `?state=${encodeURIComponent(state)}` : ''}`, backTo)}${
                // the label param can be an empty string so we cannot use a nullish ?? operator
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                label ? `${backTo || state ? '&' : '?'}label=${encodeURIComponent(label)}` : ''
            }` as const,
    },
    SETTINGS_CONTACT_METHODS: {
        route: 'settings/profile/contact-methods',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (backTo?: string) => getUrlWithBackToParam('settings/profile/contact-methods', backTo),
    },
    SETTINGS_CONTACT_METHOD_DETAILS: {
        route: 'settings/profile/contact-methods/:contactMethod/details',
        getRoute: (contactMethod: string, backTo?: string, shouldSkipInitialValidation?: boolean) => {
            const encodedMethod = encodeURIComponent(contactMethod);

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`settings/profile/contact-methods/${encodedMethod}/details${shouldSkipInitialValidation ? `?shouldSkipInitialValidation=true` : ``}`, backTo);
        },
    },
    SETTINGS_NEW_CONTACT_METHOD: {
        route: 'settings/profile/contact-methods/new',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (backTo?: string) => getUrlWithBackToParam('settings/profile/contact-methods/new', backTo),
    },
    SETTINGS_CONTACT_METHOD_VERIFY_ACCOUNT: {
        route: 'settings/profile/contact-methods/verify',
        getRoute: (backTo?: string, forwardTo?: string) =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(forwardTo ? `settings/profile/contact-methods/verify?forwardTo=${encodeURIComponent(forwardTo)}` : 'settings/profile/contact-methods/verify', backTo),
    },
    SETTINGS_2FA_VERIFY_ACCOUNT: {
        route: `settings/security/two-factor-auth/${VERIFY_ACCOUNT}`,
        getRoute: (params: {backTo?: string; forwardTo?: string} = {}) => getUrlWithParams(`settings/security/two-factor-auth/${VERIFY_ACCOUNT}`, params),
    },
    SETTINGS_2FA_ROOT: {
        route: 'settings/security/two-factor-auth',
        getRoute: (backTo?: string, forwardTo?: string) =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(forwardTo ? `settings/security/two-factor-auth?forwardTo=${encodeURIComponent(forwardTo)}` : 'settings/security/two-factor-auth', backTo),
    },
    SETTINGS_2FA_VERIFY: {
        route: 'settings/security/two-factor-auth/verify',
        getRoute: (backTo?: string, forwardTo?: string) =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(forwardTo ? `settings/security/two-factor-auth/verify?forwardTo=${encodeURIComponent(forwardTo)}` : 'settings/security/two-factor-auth/verify', backTo),
    },
    SETTINGS_2FA_SUCCESS: {
        route: 'settings/security/two-factor-auth/success',
        getRoute: (backTo?: string, forwardTo?: string) =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(forwardTo ? `settings/security/two-factor-auth/success?forwardTo=${encodeURIComponent(forwardTo)}` : 'settings/security/two-factor-auth/success', backTo),
    },
    SETTINGS_2FA_DISABLED: 'settings/security/two-factor-auth/disabled',
    SETTINGS_2FA_DISABLE: 'settings/security/two-factor-auth/disable',

    SETTINGS_STATUS: 'settings/profile/status',

    SETTINGS_STATUS_CLEAR_AFTER: 'settings/profile/status/clear-after',
    SETTINGS_STATUS_CLEAR_AFTER_DATE: 'settings/profile/status/clear-after/date',
    SETTINGS_STATUS_CLEAR_AFTER_TIME: 'settings/profile/status/clear-after/time',
    SETTINGS_VACATION_DELEGATE: 'settings/profile/status/vacation-delegate',
    SETTINGS_TROUBLESHOOT: 'settings/troubleshoot',
    SETTINGS_CONSOLE: {
        route: 'settings/troubleshoot/console',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (backTo?: string) => getUrlWithBackToParam(`settings/troubleshoot/console`, backTo),
    },
    SETTINGS_SHARE_LOG: {
        route: 'settings/troubleshoot/console/share-log',
        getRoute: (source: string) => `settings/troubleshoot/console/share-log?source=${encodeURI(source)}` as const,
    },

    KEYBOARD_SHORTCUTS: {
        route: 'keyboard-shortcuts',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (backTo?: string) => getUrlWithBackToParam('keyboard-shortcuts', backTo),
    },

    NEW_REPORT_WORKSPACE_SELECTION: 'new-report-workspace-selection',
    REPORT: 'r',
    REPORT_WITH_ID: {
        route: 'r/:reportID?/:reportActionID?',
        getRoute: (reportID: string | undefined, reportActionID?: string, referrer?: string, backTo?: string) => {
            if (!reportID) {
                Log.warn('Invalid reportID is used to build the REPORT_WITH_ID route');
            }
            const baseRoute = reportActionID ? (`r/${reportID}/${reportActionID}` as const) : (`r/${reportID}` as const);

            const queryParams: string[] = [];
            if (referrer) {
                queryParams.push(`referrer=${encodeURIComponent(referrer)}`);
            }

            const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${baseRoute}${queryString}` as const, backTo);
        },
    },
    REPORT_AVATAR: {
        route: 'r/:reportID/avatar',
        getRoute: (reportID: string, policyID?: string) => {
            if (policyID) {
                return `r/${reportID}/avatar?policyID=${policyID}` as const;
            }
            return `r/${reportID}/avatar` as const;
        },
    },
    ATTACHMENTS: {
        route: 'attachment',
        getRoute: (params?: ReportAttachmentsRouteParams) => getAttachmentModalScreenRoute('attachment', params),
    },
    EDIT_CURRENCY_REQUEST: {
        route: 'r/:threadReportID/edit/currency',
        getRoute: (threadReportID: string, currency: string, backTo: string) => `r/${threadReportID}/edit/currency?currency=${currency}&backTo=${backTo}` as const,
    },
    EDIT_REPORT_FIELD_REQUEST: {
        route: 'r/:reportID/edit/policyField/:policyID/:fieldID',
        getRoute: (reportID: string | undefined, policyID: string | undefined, fieldID: string, backTo?: string) => {
            if (!policyID || !reportID) {
                Log.warn('Invalid policyID or reportID is used to build the EDIT_REPORT_FIELD_REQUEST route', {
                    policyID,
                    reportID,
                });
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`r/${reportID}/edit/policyField/${policyID}/${encodeURIComponent(fieldID)}` as const, backTo);
        },
    },
    REPORT_WITH_ID_DETAILS_SHARE_CODE: {
        route: 'r/:reportID/details/shareCode',
        getRoute: (reportID: string | undefined, backTo?: string) => {
            if (!reportID) {
                Log.warn('Invalid reportID is used to build the REPORT_WITH_ID_DETAILS_SHARE_CODE route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`r/${reportID}/details/shareCode` as const, backTo);
        },
    },
    REPORT_WITH_ID_DETAILS: {
        route: 'r/:reportID/details',
        getRoute: (reportID: string | number | undefined, backTo?: string) => {
            if (!reportID) {
                Log.warn('Invalid reportID is used to build the REPORT_WITH_ID_DETAILS route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`r/${reportID}/details`, backTo);
        },
    },
    REPORT_WITH_ID_DETAILS_EXPORT: {
        route: 'r/:reportID/details/export/:connectionName',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (reportID: string, connectionName: ConnectionName, backTo?: string) => getUrlWithBackToParam(`r/${reportID}/details/export/${connectionName as string}` as const, backTo),
    },
    REPORT_WITH_ID_CHANGE_WORKSPACE: {
        route: 'r/:reportID/change-workspace',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (reportID: string, backTo?: string) => getUrlWithBackToParam(`r/${reportID}/change-workspace` as const, backTo),
    },
    REPORT_CHANGE_APPROVER: {
        route: 'r/:reportID/change-approver',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (reportID: string, backTo?: string) => getUrlWithBackToParam(`r/${reportID}/change-approver` as const, backTo),
    },
    REPORT_CHANGE_APPROVER_ADD_APPROVER: {
        route: 'r/:reportID/change-approver/add',
        getRoute: (reportID: string) => `r/${reportID}/change-approver/add` as const,
    },
   
    SPLIT_EXPENSE: {
        route: 'create/split-expense/overview/:reportID/:transactionID/:splitExpenseTransactionID?',
       
    },
    SPLIT_EXPENSE_EDIT: {
        route: 'edit/split-expense/overview/:reportID/:transactionID/:splitExpenseTransactionID?',
        getRoute: (reportID: string | undefined, originalTransactionID: string | undefined, splitExpenseTransactionID?: string, backTo?: string) => {
            if (!reportID || !originalTransactionID) {
                Log.warn(`Invalid ${reportID}(reportID) or ${originalTransactionID}(transactionID) is used to build the SPLIT_EXPENSE_EDIT route`);
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`edit/split-expense/overview/${reportID}/${originalTransactionID}${splitExpenseTransactionID ? `/${splitExpenseTransactionID}` : ''}`, backTo);
        },
    },
    MONEY_REQUEST_HOLD_REASON: {
        route: ':type/edit/reason/:transactionID?/:searchHash?',
        getRoute: (type: ValueOf<typeof CONST.POLICY.TYPE>, transactionID: string, reportID: string | undefined, backTo: string, searchHash?: number) => {
            const searchPart = searchHash ? `/${searchHash}` : '';
            const reportPart = reportID ? `&reportID=${reportID}` : '';
            return `${type as string}/edit/reason/${transactionID}${searchPart}/?backTo=${backTo}${reportPart}` as const;
        },
    },
    MONEY_REQUEST_CREATE: {
        route: ':action/:iouType/start/:transactionID/:reportID/:backToReport?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backToReport?: string) =>
            `${action as string}/${iouType as string}/start/${transactionID}/${reportID}/${backToReport ?? ''}` as const,
    },
    MONEY_REQUEST_STEP_SEND_FROM: {
        route: 'create/:iouType/from/:transactionID/:reportID',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (iouType: IOUType, transactionID: string, reportID: string, backTo = '') => getUrlWithBackToParam(`create/${iouType as string}/from/${transactionID}/${reportID}`, backTo),
    },
    MONEY_REQUEST_STEP_COMPANY_INFO: {
        route: 'create/:iouType/company-info/:transactionID/:reportID',
        getRoute: (iouType: IOUType, transactionID: string, reportID: string, backTo = '') =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`create/${iouType as string}/company-info/${transactionID}/${reportID}`, backTo),
    },
    MONEY_REQUEST_STEP_CONFIRMATION: {
        route: ':action/:iouType/confirmation/:transactionID/:reportID/:backToReport?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string | undefined, backToReport?: string, participantsAutoAssigned?: boolean, backTo?: string) =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(
                `${action as string}/${iouType as string}/confirmation/${transactionID}/${reportID}/${backToReport ?? ''}${participantsAutoAssigned ? '?participantsAutoAssigned=true' : ''}`,
                backTo,
            ),
    },
    MONEY_REQUEST_STEP_AMOUNT: {
        route: ':action/:iouType/amount/:transactionID/:reportID/:reportActionID?/:pageIndex?/:backToReport?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, reportActionID?: string, pageIndex?: string, backTo = '') => {
            if (!transactionID || !reportID) {
                Log.warn('Invalid transactionID or reportID is used to build the MONEY_REQUEST_STEP_AMOUNT route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/amount/${transactionID}/${reportID}/${reportActionID ? `${reportActionID}/` : ''}${pageIndex}`, backTo);
        },
    },
    MONEY_REQUEST_STEP_TAX_RATE: {
        route: ':action/:iouType/taxRate/:transactionID/:reportID?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, backTo = '') => {
            if (!transactionID || !reportID) {
                Log.warn('Invalid transactionID or reportID is used to build the MONEY_REQUEST_STEP_TAX_RATE route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/taxRate/${transactionID}/${reportID}`, backTo);
        },
    },
    MONEY_REQUEST_STEP_TAX_AMOUNT: {
        route: ':action/:iouType/taxAmount/:transactionID/:reportID?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, backTo = '') => {
            if (!transactionID || !reportID) {
                Log.warn('Invalid transactionID or reportID is used to build the MONEY_REQUEST_STEP_TAX_AMOUNT route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/taxAmount/${transactionID}/${reportID}`, backTo);
        },
    },
    MONEY_REQUEST_STEP_CATEGORY: {
        route: ':action/:iouType/category/:transactionID/:reportID/:reportActionID?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, backTo = '', reportActionID?: string) => {
            if (!transactionID || !reportID) {
                Log.warn('Invalid transactionID or reportID is used to build the MONEY_REQUEST_STEP_CATEGORY route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/category/${transactionID}/${reportID}${reportActionID ? `/${reportActionID}` : ''}`, backTo);
        },
    },
    MONEY_REQUEST_ATTENDEE: {
        route: ':action/:iouType/attendees/:transactionID/:reportID',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, backTo = '') => {
            if (!transactionID || !reportID) {
                Log.warn('Invalid transactionID or reportID is used to build the MONEY_REQUEST_ATTENDEE route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/attendees/${transactionID}/${reportID}`, backTo);
        },
    },
    MONEY_REQUEST_ACCOUNTANT: {
        route: ':action/:iouType/accountant/:transactionID/:reportID',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, backTo = '') => {
            if (!transactionID || !reportID) {
                Log.warn('Invalid transactionID or reportID is used to build the MONEY_REQUEST_ACCOUNTANT route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/accountant/${transactionID}/${reportID}`, backTo);
        },
    },
    MONEY_REQUEST_UPGRADE: {
        route: ':action/:iouType/upgrade/:transactionID/:reportID/:upgradePath?',
        getRoute: (params: {action: IOUAction; iouType: IOUType; transactionID: string; reportID: string; backTo?: string; shouldSubmitExpense?: boolean; upgradePath?: string}) => {
            const {action, iouType, transactionID, reportID, backTo = '', shouldSubmitExpense = false, upgradePath} = params;
            const upgradePathParam = upgradePath ? `/${upgradePath}` : '';
            const baseURL = `${action as string}/${iouType as string}/upgrade/${transactionID}/${reportID}${upgradePathParam}` as const;

            if (shouldSubmitExpense) {
                // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
                return getUrlWithBackToParam(`${baseURL}?shouldSubmitExpense=${shouldSubmitExpense}` as const, backTo);
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(baseURL, backTo);
        },
    },
    MONEY_REQUEST_STEP_DESTINATION: {
        route: ':action/:iouType/destination/:transactionID/:reportID',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backTo = '') =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`${action as string}/${iouType as string}/destination/${transactionID}/${reportID}`, backTo),
    },
    MONEY_REQUEST_STEP_TIME: {
        route: ':action/:iouType/time/:transactionID/:reportID',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backTo = '') =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`${action as string}/${iouType as string}/time/${transactionID}/${reportID}`, backTo),
    },
    MONEY_REQUEST_STEP_SUBRATE: {
        route: ':action/:iouType/subrate/:transactionID/:reportID/:pageIndex',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backTo = '') =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`${action as string}/${iouType as string}/subrate/${transactionID}/${reportID}/0`, backTo),
    },
    MONEY_REQUEST_STEP_DESTINATION_EDIT: {
        route: ':action/:iouType/destination/:transactionID/:reportID/edit',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backTo = '') =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`${action as string}/${iouType as string}/destination/${transactionID}/${reportID}/edit`, backTo),
    },
    MONEY_REQUEST_STEP_TIME_EDIT: {
        route: ':action/:iouType/time/:transactionID/:reportID/edit',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backTo = '') =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`${action as string}/${iouType as string}/time/${transactionID}/${reportID}/edit`, backTo),
    },
    MONEY_REQUEST_STEP_SUBRATE_EDIT: {
        route: ':action/:iouType/subrate/:transactionID/:reportID/edit/:pageIndex',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, pageIndex = 0, backTo = '') =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`${action as string}/${iouType as string}/subrate/${transactionID}/${reportID}/edit/${pageIndex}`, backTo),
    },
    MONEY_REQUEST_STEP_REPORT: {
        route: ':action/:iouType/report/:transactionID/:reportID/:reportActionID?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backTo = '', reportActionID?: string) =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`${action as string}/${iouType as string}/report/${transactionID}/${reportID}${reportActionID ? `/${reportActionID}` : ''}`, backTo),
    },
    MONEY_REQUEST_RECEIPT_PREVIEW: {
        route: ':action/:iouType/receipt/:transactionID/:reportID',
        getRoute: (reportID: string, transactionID: string, action: IOUAction, iouType: IOUType) => {
            if (!reportID) {
                Log.warn('Invalid reportID is used to build the MONEY_REQUEST_RECEIPT_PREVIEW route');
            }
            if (!transactionID) {
                Log.warn('Invalid transactionID is used to build the MONEY_REQUEST_RECEIPT_PREVIEW route');
            }
            return `${action}/${iouType}/receipt/${transactionID}/${reportID}?readonly=false` as const;
        },
    },
    MONEY_REQUEST_EDIT_REPORT: {
        route: ':action/:iouType/report/:reportID/edit',
        getRoute: (action: IOUAction, iouType: IOUType, reportID?: string, shouldTurnOffSelectionMode?: boolean, backTo = '') => {
            if (!reportID) {
                Log.warn('Invalid reportID while building route MONEY_REQUEST_EDIT_REPORT');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/report/${reportID}/edit${shouldTurnOffSelectionMode ? '?shouldTurnOffSelectionMode=true' : ''}`, backTo);
        },
    },
    SETTINGS_CATEGORIES_ROOT: {
        route: 'settings/:policyID/categories',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, backTo = '') => getUrlWithBackToParam(`settings/${policyID}/categories`, backTo),
    },
    SETTINGS_CATEGORY_SETTINGS: {
        route: 'settings/:policyID/category/:categoryName',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, categoryName: string, backTo = '') => getUrlWithBackToParam(`settings/${policyID}/category/${encodeURIComponent(categoryName)}`, backTo),
    },
    SETTINGS_CATEGORIES_SETTINGS: {
        route: 'settings/:policyID/categories/settings',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, backTo = '') => getUrlWithBackToParam(`settings/${policyID}/categories/settings`, backTo),
    },
    SETTINGS_CATEGORY_CREATE: {
        route: 'settings/:policyID/categories/new',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, backTo = '') => getUrlWithBackToParam(`settings/${policyID}/categories/new`, backTo),
    },
    SETTINGS_CATEGORY_EDIT: {
        route: 'settings/:policyID/category/:categoryName/edit',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, categoryName: string, backTo = '') => getUrlWithBackToParam(`settings/${policyID}/category/${encodeURIComponent(categoryName)}/edit`, backTo),
    },
    SETTINGS_CATEGORIES_IMPORT: {
        route: 'settings/:policyID/categories/import',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, backTo = '') => getUrlWithBackToParam(`settings/${policyID}/categories/import` as const, backTo),
    },
    SETTINGS_CATEGORIES_IMPORTED: {
        route: 'settings/:policyID/categories/imported',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, backTo = '') => getUrlWithBackToParam(`settings/${policyID}/categories/imported` as const, backTo),
    },
    SETTINGS_CATEGORY_PAYROLL_CODE: {
        route: 'settings/:policyID/category/:categoryName/payroll-code',
        getRoute: (policyID: string, categoryName: string, backTo = '') =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`settings/${policyID}/category/${encodeURIComponent(categoryName)}/payroll-code` as const, backTo),
    },
    SETTINGS_CATEGORY_GL_CODE: {
        route: 'settings/:policyID/category/:categoryName/gl-code',
        getRoute: (policyID: string, categoryName: string, backTo = '') =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`settings/${policyID}/category/${encodeURIComponent(categoryName)}/gl-code` as const, backTo),
    },
    MONEY_REQUEST_STEP_CURRENCY: {
        route: ':action/:iouType/currency/:transactionID/:reportID/:pageIndex?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, pageIndex = '', currency = '', backTo = '') =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`${action as string}/${iouType as string}/currency/${transactionID}/${reportID}/${pageIndex}?currency=${currency}`, backTo),
    },
    MONEY_REQUEST_STEP_DATE: {
        route: ':action/:iouType/date/:transactionID/:reportID/:reportActionID?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, backTo = '', reportActionID?: string) => {
            if (!transactionID || !reportID) {
                Log.warn('Invalid transactionID or reportID is used to build the MONEY_REQUEST_STEP_DATE route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/date/${transactionID}/${reportID}${reportActionID ? `/${reportActionID}` : ''}`, backTo);
        },
    },
    MONEY_REQUEST_STEP_DESCRIPTION: {
        route: ':action/:iouType/description/:transactionID/:reportID/:reportActionID?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, backTo = '', reportActionID?: string) => {
            if (!transactionID || !reportID) {
                Log.warn('Invalid transactionID or reportID is used to build the MONEY_REQUEST_STEP_DESCRIPTION route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/description/${transactionID}/${reportID}${reportActionID ? `/${reportActionID}` : ''}`, backTo);
        },
    },
    MONEY_REQUEST_STEP_DISTANCE: {
        route: ':action/:iouType/distance/:transactionID/:reportID/:reportActionID?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, backTo = '', reportActionID?: string) => {
            if (!transactionID || !reportID) {
                Log.warn('Invalid transactionID or reportID is used to build the MONEY_REQUEST_STEP_DISTANCE route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/distance/${transactionID}/${reportID}${reportActionID ? `/${reportActionID}` : ''}`, backTo);
        },
    },
    MONEY_REQUEST_STEP_DISTANCE_MANUAL: {
        route: ':action/:iouType/distance-manual/:transactionID/:reportID/:reportActionID?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, backTo = '', reportActionID?: string) => {
            if (!transactionID || !reportID) {
                Log.warn('Invalid transactionID or reportID is used to build the MONEY_REQUEST_STEP_DISTANCE_MANUAL route');
            }
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/distance-manual/${transactionID}/${reportID}${reportActionID ? `/${reportActionID}` : ''}`, backTo);
        },
    },
    MONEY_REQUEST_STEP_DISTANCE_RATE: {
        route: ':action/:iouType/distanceRate/:transactionID/:reportID/:reportActionID?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, backTo = '', reportActionID?: string) => {
            if (!transactionID || !reportID) {
                Log.warn('Invalid transactionID or reportID is used to build the MONEY_REQUEST_STEP_DISTANCE_RATE route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/distanceRate/${transactionID}/${reportID}${reportActionID ? `/${reportActionID}` : ''}`, backTo);
        },
    },
    MONEY_REQUEST_STEP_MERCHANT: {
        route: ':action/:iouType/merchant/:transactionID/:reportID/:reportActionID?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, backTo = '', reportActionID?: string) => {
            if (!transactionID || !reportID) {
                Log.warn('Invalid transactionID or reportID is used to build the MONEY_REQUEST_STEP_MERCHANT route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/merchant/${transactionID}/${reportID}${reportActionID ? `/${reportActionID}` : ''}`, backTo);
        },
    },
    MONEY_REQUEST_STEP_PARTICIPANTS: {
        route: ':action/:iouType/participants/:transactionID/:reportID',
        getRoute: (iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, backTo = '', action: IOUAction = 'create') =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`${action as string}/${iouType as string}/participants/${transactionID}/${reportID}`, backTo),
    },
    MONEY_REQUEST_STEP_SPLIT_PAYER: {
        route: ':action/:iouType/confirmation/:transactionID/:reportID/payer',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backTo = '') =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`${action as string}/${iouType as string}/confirmation/${transactionID}/${reportID}/payer`, backTo),
    },
    MONEY_REQUEST_STEP_SCAN: {
        route: ':action/:iouType/scan/:transactionID/:reportID',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string | undefined, reportID: string | undefined, backTo = '') => {
            if (!transactionID || !reportID) {
                Log.warn('Invalid transactionID or reportID is used to build the MONEY_REQUEST_STEP_SCAN route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`${action as string}/${iouType as string}/scan/${transactionID}/${reportID}`, backTo);
        },
    },
    MONEY_REQUEST_STEP_TAG: {
        route: ':action/:iouType/tag/:orderWeight/:transactionID/:reportID/:reportActionID?',
        getRoute: (action: IOUAction, iouType: IOUType, orderWeight: number, transactionID: string, reportID?: string, backTo = '', reportActionID?: string) =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(
                `${action as string}/${iouType as string}/tag/${orderWeight}/${transactionID}${reportID ? `/${reportID}` : ''}${reportActionID ? `/${reportActionID}` : ''}`,
                backTo,
            ),
    },
    MONEY_REQUEST_STEP_WAYPOINT: {
        route: ':action/:iouType/waypoint/:transactionID/:reportID/:pageIndex',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID?: string, pageIndex = '', backTo = '') =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`${action as string}/${iouType as string}/waypoint/${transactionID}/${reportID}/${pageIndex}`, backTo),
    },
    // This URL is used as a redirect to one of the create tabs below. This is so that we can message users with a link
    // straight to those flows without needing to have optimistic transaction and report IDs.
    MONEY_REQUEST_START: {
        route: 'start/:iouType/:iouRequestType',
        getRoute: (iouType: IOUType, iouRequestType: IOURequestType) => `start/${iouType as string}/${iouRequestType as string}` as const,
    },
    MONEY_REQUEST_CREATE_TAB_DISTANCE: {
        route: 'distance/:backToReport?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backToReport?: string) =>
            `create/${iouType as string}/start/${transactionID}/${reportID}/distance/${backToReport ?? ''}` as const,
    },
    MONEY_REQUEST_CREATE_TAB_MANUAL: {
        route: 'manual/:backToReport?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backToReport?: string) =>
            `${action as string}/${iouType as string}/start/${transactionID}/${reportID}/manual/${backToReport ?? ''}` as const,
    },
    MONEY_REQUEST_CREATE_TAB_SCAN: {
        route: 'scan/:backToReport?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backToReport?: string) =>
            `create/${iouType as string}/start/${transactionID}/${reportID}/scan/${backToReport ?? ''}` as const,
    },
    MONEY_REQUEST_CREATE_TAB_PER_DIEM: {
        route: 'per-diem/:backToReport?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backToReport?: string) =>
            `create/${iouType as string}/start/${transactionID}/${reportID}/per-diem/${backToReport ?? ''}` as const,
    },

    MONEY_REQUEST_RECEIPT_VIEW: {
        route: 'receipt-view/:transactionID',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (transactionID: string, backTo: string) => getUrlWithBackToParam(`receipt-view/${transactionID}`, backTo),
    } as const,

    MONEY_REQUEST_STATE_SELECTOR: {
        route: 'submit/state',

        getRoute: (state?: string, backTo?: string, label?: string) =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            `${getUrlWithBackToParam(`submit/state${state ? `?state=${encodeURIComponent(state)}` : ''}`, backTo)}${
                // the label param can be an empty string so we cannot use a nullish ?? operator
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                label ? `${backTo || state ? '&' : '?'}label=${encodeURIComponent(label)}` : ''
            }` as const,
    },
    DISTANCE_REQUEST_CREATE: {
        route: ':action/:iouType/start/:transactionID/:reportID/distance-new/:backToReport?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backToReport?: string) =>
            `${action as string}/${iouType as string}/start/${transactionID}/${reportID}/distance-new/${backToReport ?? ''}` as const,
    },
    DISTANCE_REQUEST_CREATE_TAB_MAP: {
        route: 'distance-map/:backToReport?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backToReport?: string) =>
            `${action as string}/${iouType as string}/start/${transactionID}/${reportID}/distance-new/distance-map/${backToReport ?? ''}` as const,
    },
    DISTANCE_REQUEST_CREATE_TAB_MANUAL: {
        route: 'distance-manual/:backToReport?',
        getRoute: (action: IOUAction, iouType: IOUType, transactionID: string, reportID: string, backToReport?: string) =>
            `${action as string}/${iouType as string}/start/${transactionID}/${reportID}/distance-new/distance-manual/${backToReport ?? ''}` as const,
    },


    ERECEIPT: {
        route: 'eReceipt/:transactionID',
        getRoute: (transactionID: string) => `eReceipt/${transactionID}` as const,
    },

    WORKSPACE_NEW: 'workspace/new',
    WORKSPACE_INITIAL: {
        route: 'workspaces/:policyID',
        getRoute: (policyID: string | undefined, backTo?: string) => {
            if (!policyID) {
                Log.warn('Invalid policyID is used to build the WORKSPACE_INITIAL route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return `${getUrlWithBackToParam(`workspaces/${policyID}`, backTo)}` as const;
        },
    },
    WORKSPACE_INVITE: {
        route: 'workspaces/:policyID/invite',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, backTo?: string) => `${getUrlWithBackToParam(`workspaces/${policyID}/invite`, backTo)}` as const,
    },
    WORKSPACE_INVITE_MESSAGE: {
        route: 'workspaces/:policyID/invite-message',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, backTo?: string) => `${getUrlWithBackToParam(`workspaces/${policyID}/invite-message`, backTo)}` as const,
    },
    WORKSPACE_INVITE_MESSAGE_ROLE: {
        route: 'workspaces/:policyID/invite-message/role',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, backTo?: string) => `${getUrlWithBackToParam(`workspaces/${policyID}/invite-message/role`, backTo)}` as const,
    },
    WORKSPACE_OVERVIEW: {
        route: 'workspaces/:policyID/overview',
        getRoute: (policyID: string | undefined, backTo?: string) => {
            if (!policyID) {
                Log.warn('Invalid policyID is used to build the WORKSPACE_OVERVIEW route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`workspaces/${policyID}/overview` as const, backTo);
        },
    },
    WORKSPACE_OVERVIEW_ADDRESS: {
        route: 'workspaces/:policyID/overview/address',
        getRoute: (policyID: string | undefined, backTo?: string) => {
            if (!policyID) {
                Log.warn('Invalid policyID is used to build the WORKSPACE_OVERVIEW_ADDRESS route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`workspaces/${policyID}/overview/address` as const, backTo);
        },
    },
    WORKSPACE_OVERVIEW_PLAN: {
        route: 'workspaces/:policyID/overview/plan',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, backTo?: string) => getUrlWithBackToParam(`workspaces/${policyID}/overview/plan` as const, backTo),
    },
    WORKSPACE_OVERVIEW_CURRENCY: {
        route: 'workspaces/:policyID/overview/currency',
        getRoute: (policyID: string) => `workspaces/${policyID}/overview/currency` as const,
    },
    WORKSPACE_OVERVIEW_NAME: {
        route: 'workspaces/:policyID/overview/name',
        getRoute: (policyID: string) => `workspaces/${policyID}/overview/name` as const,
    },
    WORKSPACE_OVERVIEW_DESCRIPTION: {
        route: 'workspaces/:policyID/overview/description',
        getRoute: (policyID: string | undefined) => {
            if (!policyID) {
                Log.warn('Invalid policyID is used to build the WORKSPACE_OVERVIEW_DESCRIPTION route');
            }
            return `workspaces/${policyID}/overview/description` as const;
        },
    },
    WORKSPACE_OVERVIEW_SHARE: {
        route: 'workspaces/:policyID/overview/share',
        getRoute: (policyID: string) => `workspaces/${policyID}/overview/share` as const,
    },
    WORKSPACE_AVATAR: {
        route: 'workspaces/:policyID/avatar',
        getRoute: (policyID: string, fallbackLetter?: UpperCaseCharacters) => `workspaces/${policyID}/avatar${fallbackLetter ? `?letter=${fallbackLetter}` : ''}` as const,
    },
    WORKSPACE_JOIN_USER: {
        route: 'workspaces/:policyID/join',
        getRoute: (policyID: string, inviterEmail: string) => `workspaces/${policyID}/join?email=${inviterEmail}` as const,
    },
    WORKSPACE_SETTINGS_CURRENCY: {
        route: 'workspaces/:policyID/settings/currency',
        getRoute: (policyID: string) => `workspaces/${policyID}/settings/currency` as const,
    },
    WORKSPACE_MEMBERS: {
        route: 'workspaces/:policyID/members',
        getRoute: (policyID: string | undefined) => {
            if (!policyID) {
                Log.warn('Invalid policyID is used to build the WORKSPACE_MEMBERS route');
            }
            return `workspaces/${policyID}/members` as const;
        },
    },
    WORKSPACE_MEMBERS_IMPORT: {
        route: 'workspaces/:policyID/members/import',
        getRoute: (policyID: string) => `workspaces/${policyID}/members/import` as const,
    },
    WORKSPACE_MEMBERS_IMPORTED: {
        route: 'workspaces/:policyID/members/imported',
        getRoute: (policyID: string) => `workspaces/${policyID}/members/imported` as const,
    },
    WORKSPACE_MEMBERS_IMPORTED_CONFIRMATION: {
        route: 'workspaces/:policyID/members/imported/confirmation',
        getRoute: (policyID: string) => `workspaces/${policyID}/members/imported/confirmation` as const,
    },
    WORKSPACE_CATEGORIES: {
        route: 'workspaces/:policyID/categories',
        getRoute: (policyID: string | undefined) => {
            if (!policyID) {
                Log.warn('Invalid policyID is used to build the WORKSPACE_CATEGORIES route');
            }
            return `workspaces/${policyID}/categories` as const;
        },
    },
    WORKSPACE_CATEGORY_SETTINGS: {
        route: 'workspaces/:policyID/category/:categoryName',
        getRoute: (policyID: string, categoryName: string) => `workspaces/${policyID}/category/${encodeURIComponent(categoryName)}` as const,
    },
  
    WORKSPACE_CATEGORIES_SETTINGS: {
        route: 'workspaces/:policyID/categories/settings',
        getRoute: (policyID: string) => `workspaces/${policyID}/categories/settings` as const,
    },
    WORKSPACE_CATEGORIES_IMPORT: {
        route: 'workspaces/:policyID/categories/import',
        getRoute: (policyID: string) => `workspaces/${policyID}/categories/import` as const,
    },
    WORKSPACE_CATEGORIES_IMPORTED: {
        route: 'workspaces/:policyID/categories/imported',
        getRoute: (policyID: string) => `workspaces/${policyID}/categories/imported` as const,
    },
    WORKSPACE_CATEGORY_CREATE: {
        route: 'workspaces/:policyID/categories/new',
        getRoute: (policyID: string) => `workspaces/${policyID}/categories/new` as const,
    },
    WORKSPACE_CATEGORY_EDIT: {
        route: 'workspaces/:policyID/category/:categoryName/edit',
        getRoute: (policyID: string, categoryName: string) => `workspaces/${policyID}/category/${encodeURIComponent(categoryName)}/edit` as const,
    },
    WORKSPACE_CATEGORY_PAYROLL_CODE: {
        route: 'workspaces/:policyID/category/:categoryName/payroll-code',
        getRoute: (policyID: string, categoryName: string) => `workspaces/${policyID}/category/${encodeURIComponent(categoryName)}/payroll-code` as const,
    },
    WORKSPACE_CATEGORY_GL_CODE: {
        route: 'workspaces/:policyID/category/:categoryName/gl-code',
        getRoute: (policyID: string, categoryName: string) => `workspaces/${policyID}/category/${encodeURIComponent(categoryName)}/gl-code` as const,
    },
    WORKSPACE_CATEGORY_DEFAULT_TAX_RATE: {
        route: 'workspaces/:policyID/category/:categoryName/tax-rate',
        getRoute: (policyID: string, categoryName: string) => `workspaces/${policyID}/category/${encodeURIComponent(categoryName)}/tax-rate` as const,
    },
    WORKSPACE_CATEGORY_FLAG_AMOUNTS_OVER: {
        route: 'workspaces/:policyID/category/:categoryName/flag-amounts',
        getRoute: (policyID: string, categoryName: string) => `workspaces/${policyID}/category/${encodeURIComponent(categoryName)}/flag-amounts` as const,
    },
    WORKSPACE_CATEGORY_DESCRIPTION_HINT: {
        route: 'workspaces/:policyID/category/:categoryName/description-hint',
        getRoute: (policyID: string, categoryName: string) => `workspaces/${policyID}/category/${encodeURIComponent(categoryName)}/description-hint` as const,
    },
    WORKSPACE_CATEGORY_REQUIRE_RECEIPTS_OVER: {
        route: 'workspaces/:policyID/category/:categoryName/require-receipts-over',
        getRoute: (policyID: string, categoryName: string) => `workspaces/${policyID}/category/${encodeURIComponent(categoryName)}/require-receipts-over` as const,
    },
    WORKSPACE_CATEGORY_APPROVER: {
        route: 'workspaces/:policyID/category/:categoryName/approver',
        getRoute: (policyID: string, categoryName: string) => `workspaces/${policyID}/category/${encodeURIComponent(categoryName)}/approver` as const,
    },
    WORKSPACE_MORE_FEATURES: {
        route: 'workspaces/:policyID/more-features',
        getRoute: (policyID: string | undefined) => {
            if (!policyID) {
                Log.warn('Invalid policyID is used to build the WORKSPACE_MORE_FEATURES route');
            }
            return `workspaces/${policyID}/more-features` as const;
        },
    },
 
    WORKSPACE_MEMBER_DETAILS: {
        route: 'workspaces/:policyID/members/:accountID',
        getRoute: (policyID: string, accountID: number) => `workspaces/${policyID}/members/${accountID}` as const,
    },
    WORKSPACE_CUSTOM_FIELDS: {
        route: 'workspaces/:policyID/members/:accountID/:customFieldType',
        getRoute: (policyID: string, accountID: number, customFieldType: CustomFieldType) => `/workspaces/${policyID}/members/${accountID}/${customFieldType}` as const,
    },
    WORKSPACE_MEMBER_NEW_CARD: {
        route: 'workspaces/:policyID/members/:accountID/new-card',
        getRoute: (policyID: string, accountID: number) => `workspaces/${policyID}/members/${accountID}/new-card` as const,
    },
    WORKSPACE_MEMBER_ROLE_SELECTION: {
        route: 'workspaces/:policyID/members/:accountID/role-selection',
        getRoute: (policyID: string, accountID: number) => `workspaces/${policyID}/members/${accountID}/role-selection` as const,
    },
    WORKSPACE_OWNER_CHANGE_SUCCESS: {
        route: 'workspaces/:policyID/change-owner/:accountID/success',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, accountID: number, backTo?: string) => getUrlWithBackToParam(`workspaces/${policyID}/change-owner/${accountID}/success` as const, backTo),
    },
    WORKSPACE_OWNER_CHANGE_ERROR: {
        route: 'workspaces/:policyID/change-owner/:accountID/failure',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, accountID: number, backTo?: string) => getUrlWithBackToParam(`workspaces/${policyID}/change-owner/${accountID}/failure` as const, backTo),
    },
    WORKSPACE_OWNER_CHANGE_CHECK: {
        route: 'workspaces/:policyID/change-owner/:accountID/:error',
        getRoute: (policyID: string | undefined, accountID: number, error: ValueOf<typeof CONST.POLICY.OWNERSHIP_ERRORS>, backTo?: string) => {
            if (!policyID) {
                Log.warn('Invalid policyID is used to build the WORKSPACE_OWNER_CHANGE_CHECK route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`workspaces/${policyID}/change-owner/${accountID}/${error as string}` as const, backTo);
        },
    },
   
    WORKSPACE_COMPANY_CARDS: {
        route: 'workspaces/:policyID/company-cards',
        getRoute: (policyID: string | undefined) => {
            if (!policyID) {
                Log.warn('Invalid policyID is used to build the WORKSPACE_COMPANY_CARDS route');
            }
            return `workspaces/${policyID}/company-cards` as const;
        },
    },
    WORKSPACE_COMPANY_CARDS_BANK_CONNECTION: {
        route: 'workspaces/:policyID/company-cards/:bankName/bank-connection',
        getRoute: (policyID: string | undefined, bankName: string, backTo: string) => {
            if (!policyID) {
                Log.warn('Invalid policyID is used to build the WORKSPACE_COMPANY_CARDS_BANK_CONNECTION route');
            }

            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            return getUrlWithBackToParam(`workspaces/${policyID}/company-cards/${bankName}/bank-connection`, backTo);
        },
    },
    WORKSPACE_COMPANY_CARDS_ADD_NEW: {
        route: 'workspaces/:policyID/company-cards/add-card-feed',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, backTo?: string) => getUrlWithBackToParam(`workspaces/${policyID}/company-cards/add-card-feed`, backTo),
    },
    WORKSPACE_COMPANY_CARDS_SELECT_FEED: {
        route: 'workspaces/:policyID/company-cards/select-feed',
        getRoute: (policyID: string) => `workspaces/${policyID}/company-cards/select-feed` as const,
    },
    WORKSPACE_COMPANY_CARDS_ASSIGN_CARD: {
        route: 'workspaces/:policyID/company-cards/:feed/assign-card',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, feed: string, backTo?: string) => getUrlWithBackToParam(`workspaces/${policyID}/company-cards/${feed}/assign-card`, backTo),
    },
    WORKSPACE_COMPANY_CARDS_TRANSACTION_START_DATE: {
        route: 'workspaces/:policyID/company-cards/:feed/assign-card/transaction-start-date',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, feed: string, backTo?: string) => getUrlWithBackToParam(`workspaces/${policyID}/company-cards/${feed}/assign-card/transaction-start-date`, backTo),
    },
    WORKSPACE_COMPANY_CARD_DETAILS: {
        route: 'workspaces/:policyID/company-cards/:bank/:cardID',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (policyID: string, cardID: string, bank: string, backTo?: string) => getUrlWithBackToParam(`workspaces/${policyID}/company-cards/${bank}/${cardID}`, backTo),
    },
    WORKSPACE_COMPANY_CARD_NAME: {
        route: 'workspaces/:policyID/company-cards/:bank/:cardID/edit/name',
        getRoute: (policyID: string, cardID: string, bank: string) => `workspaces/${policyID}/company-cards/${bank}/${cardID}/edit/name` as const,
    },
    WORKSPACE_COMPANY_CARD_EXPORT: {
        route: 'workspaces/:policyID/company-cards/:bank/:cardID/edit/export',
        getRoute: (policyID: string, cardID: string, bank: string, backTo?: string) =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`workspaces/${policyID}/company-cards/${bank}/${cardID}/edit/export`, backTo, false),
    },
    WORKSPACE_COMPANY_CARDS_SETTINGS: {
        route: 'workspaces/:policyID/company-cards/settings',
        getRoute: (policyID: string) => `workspaces/${policyID}/company-cards/settings` as const,
    },
    WORKSPACE_COMPANY_CARDS_SETTINGS_FEED_NAME: {
        route: 'workspaces/:policyID/company-cards/settings/feed-name',
        getRoute: (policyID: string) => `workspaces/${policyID}/company-cards/settings/feed-name` as const,
    },
    WORKSPACE_COMPANY_CARDS_SETTINGS_STATEMENT_CLOSE_DATE: {
        route: 'workspaces/:policyID/company-cards/settings/statement-close-date',
        getRoute: (policyID: string) => `workspaces/${policyID}/company-cards/settings/statement-close-date` as const,
    },


    // Referral program promotion
    REFERRAL_DETAILS_MODAL: {
        route: 'referral/:contentType',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (contentType: string, backTo?: string) => getUrlWithBackToParam(`referral/${contentType}`, backTo),
    },
    SHARE_ROOT: 'share/root',
    SHARE_ROOT_SHARE: 'share/root/share',
    SHARE_ROOT_SUBMIT: 'share/root/submit',
    SHARE_DETAILS: {
        route: 'share/share-details/:reportOrAccountID',
        getRoute: (reportOrAccountID: string) => `share/share-details/${reportOrAccountID}` as const,
    },
    SHARE_SUBMIT_DETAILS: {
        route: 'share/submit-details/:reportOrAccountID',
        getRoute: (reportOrAccountID: string) => `share/submit-details/${reportOrAccountID}` as const,
    },

    ONBOARDING_ROOT: {
        route: 'onboarding',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (backTo?: string) => getUrlWithBackToParam(`onboarding`, backTo),
    },
    ONBOARDING_PERSONAL_DETAILS: {
        route: 'onboarding/personal-details',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (backTo?: string) => getUrlWithBackToParam(`onboarding/personal-details`, backTo),
    },
    ONBOARDING_PURPOSE: {
        route: 'onboarding/purpose',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (backTo?: string) => getUrlWithBackToParam(`onboarding/purpose`, backTo),
    },
    EXPLANATION_MODAL_ROOT: 'onboarding/explanation',
    TEST_DRIVE_MODAL_ROOT: {
        route: 'onboarding/test-drive',
        getRoute: (bossEmail?: string) => `onboarding/test-drive${bossEmail ? `?bossEmail=${encodeURIComponent(bossEmail)}` : ''}` as const,
    },
    TEST_DRIVE_DEMO_ROOT: 'onboarding/test-drive/demo',
    TRACK_TRAINING_MODAL: 'feature-training/track-expenses',
    WORKSPACE_CONFIRMATION: {
        route: 'workspace/confirmation',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (backTo?: string) => getUrlWithBackToParam(`workspace/confirmation`, backTo),
    },
    MIGRATED_USER_WELCOME_MODAL: {
        route: 'onboarding/migrated-user-welcome',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (shouldOpenSearch?: boolean) => getUrlWithBackToParam(`onboarding/migrated-user-welcome?${shouldOpenSearch ? 'shouldOpenSearch=true' : ''}`, undefined, false),
    },

    TRANSACTION_RECEIPT: {
        route: 'r/:reportID/transaction/:transactionID/receipt/:action?/:iouType?',
        getRoute: (reportID: string | undefined, transactionID: string | undefined, readonly = false) => {
            if (!reportID) {
                Log.warn('Invalid reportID is used to build the TRANSACTION_RECEIPT route');
            }
            if (!transactionID) {
                Log.warn('Invalid transactionID is used to build the TRANSACTION_RECEIPT route');
            }
            return `r/${reportID}/transaction/${transactionID}/receipt?readonly=${readonly}` as const;
        },
    },

    RESTRICTED_ACTION: {
        route: 'restricted-action/workspace/:policyID',
        getRoute: (policyID: string) => `restricted-action/workspace/${policyID}` as const,
    },
    ADD_UNREPORTED_EXPENSE: {
        route: 'search/r/:reportID/add-unreported-expense/:backToReport?',
        getRoute: (reportID: string | undefined, backToReport?: string) => `search/r/${reportID}/add-unreported-expense/${backToReport ?? ''}` as const,
    },
    DEBUG_REPORT: {
        route: 'debug/report/:reportID',
        getRoute: (reportID: string | undefined) => `debug/report/${reportID}` as const,
    },
    DEBUG_REPORT_TAB_DETAILS: {
        route: 'debug/report/:reportID/details',
        getRoute: (reportID: string) => `debug/report/${reportID}/details` as const,
    },
    DEBUG_REPORT_TAB_JSON: {
        route: 'debug/report/:reportID/json',
        getRoute: (reportID: string) => `debug/report/${reportID}/json` as const,
    },
    DEBUG_REPORT_TAB_ACTIONS: {
        route: 'debug/report/:reportID/actions',
        getRoute: (reportID: string) => `debug/report/${reportID}/actions` as const,
    },
    DEBUG_REPORT_ACTION: {
        route: 'debug/report/:reportID/actions/:reportActionID',
        getRoute: (reportID: string | undefined, reportActionID: string) => {
            if (!reportID) {
                Log.warn('Invalid reportID is used to build the DEBUG_REPORT_ACTION route');
            }
            return `debug/report/${reportID}/actions/${reportActionID}` as const;
        },
    },
    DEBUG_REPORT_ACTION_CREATE: {
        route: 'debug/report/:reportID/actions/create',
        getRoute: (reportID: string) => `debug/report/${reportID}/actions/create` as const,
    },
    DEBUG_REPORT_ACTION_TAB_DETAILS: {
        route: 'debug/report/:reportID/actions/:reportActionID/details',
        getRoute: (reportID: string, reportActionID: string) => `debug/report/${reportID}/actions/${reportActionID}/details` as const,
    },
    DEBUG_REPORT_ACTION_TAB_JSON: {
        route: 'debug/report/:reportID/actions/:reportActionID/json',
        getRoute: (reportID: string, reportActionID: string) => `debug/report/${reportID}/actions/${reportActionID}/json` as const,
    },
    DEBUG_REPORT_ACTION_TAB_PREVIEW: {
        route: 'debug/report/:reportID/actions/:reportActionID/preview',
        getRoute: (reportID: string, reportActionID: string) => `debug/report/${reportID}/actions/${reportActionID}/preview` as const,
    },
    DETAILS_CONSTANT_PICKER_PAGE: {
        route: 'debug/:formType/details/constant/:fieldName',
        getRoute: (formType: string, fieldName: string, fieldValue?: string, policyID?: string, backTo?: string) =>
            // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
            getUrlWithBackToParam(`debug/${formType}/details/constant/${fieldName}?fieldValue=${fieldValue}&policyID=${policyID}`, backTo),
    },
    DETAILS_DATE_TIME_PICKER_PAGE: {
        route: 'debug/details/datetime/:fieldName',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (fieldName: string, fieldValue?: string, backTo?: string) => getUrlWithBackToParam(`debug/details/datetime/${fieldName}?fieldValue=${fieldValue}`, backTo),
    },
    DEBUG_TRANSACTION: {
        route: 'debug/transaction/:transactionID',
        getRoute: (transactionID: string) => `debug/transaction/${transactionID}` as const,
    },
    DEBUG_TRANSACTION_TAB_DETAILS: {
        route: 'debug/transaction/:transactionID/details',
        getRoute: (transactionID: string) => `debug/transaction/${transactionID}/details` as const,
    },
    DEBUG_TRANSACTION_TAB_JSON: {
        route: 'debug/transaction/:transactionID/json',
        getRoute: (transactionID: string) => `debug/transaction/${transactionID}/json` as const,
    },
    DEBUG_TRANSACTION_TAB_VIOLATIONS: {
        route: 'debug/transaction/:transactionID/violations',
        getRoute: (transactionID: string) => `debug/transaction/${transactionID}/violations` as const,
    },
    DEBUG_TRANSACTION_VIOLATION_CREATE: {
        route: 'debug/transaction/:transactionID/violations/create',
        getRoute: (transactionID: string) => `debug/transaction/${transactionID}/violations/create` as const,
    },
    DEBUG_TRANSACTION_VIOLATION: {
        route: 'debug/transaction/:transactionID/violations/:index',
        getRoute: (transactionID: string, index: string) => `debug/transaction/${transactionID}/violations/${index}` as const,
    },
    DEBUG_TRANSACTION_VIOLATION_TAB_DETAILS: {
        route: 'debug/transaction/:transactionID/violations/:index/details',
        getRoute: (transactionID: string, index: string) => `debug/transaction/${transactionID}/violations/${index}/details` as const,
    },
    DEBUG_TRANSACTION_VIOLATION_TAB_JSON: {
        route: 'debug/transaction/:transactionID/violations/:index/json',
        getRoute: (transactionID: string, index: string) => `debug/transaction/${transactionID}/violations/${index}/json` as const,
    },
    REJECT_MONEY_REQUEST_REASON: {
        route: 'reject/reason/:transactionID',
        getRoute: (transactionID: string, reportID: string, backTo?: string) => `reject/reason/${transactionID}?reportID=${reportID}&backTo=${backTo}` as const,
    },
    TEST_TOOLS_MODAL: {
        route: 'test-tools',

        // eslint-disable-next-line no-restricted-syntax -- Legacy route generation
        getRoute: (backTo?: string) => getUrlWithBackToParam('test-tools' as const, backTo),
    },
} as const;

/**
 * Configuration for shared parameters that can be passed between routes.
 * These parameters are commonly used across multiple screens and are preserved
 * during navigation state transitions.
 *
 * Currently includes:
 * - `backTo`: Specifies the route to return to when navigating back, preserving
 *   navigation context in split-screen and central screen
 */
const SHARED_ROUTE_PARAMS: Partial<Record<Screen, string[]>> = {
    [SCREENS.WORKSPACE.INITIAL]: ['backTo'],
} as const;

export {PUBLIC_SCREENS_ROUTES, SHARED_ROUTE_PARAMS, VERIFY_ACCOUNT};
export default ROUTES;

type ReportAttachmentsRoute = typeof ROUTES.ATTACHMENTS.route;
type AttachmentRoutes = ReportAttachmentsRoute;

type ReportAttachmentsRouteParams = RootNavigatorParamList[typeof SCREENS.ATTACHMENTS];

function getAttachmentModalScreenRoute(url: AttachmentRoutes, params?: ReportAttachmentsRouteParams) {
    if (!params?.source) {
        return url;
    }

    const {source, attachmentID, type, reportID, isAuthTokenRequired, originalFileName, attachmentLink} = params;

    const sourceParam = `?source=${encodeURIComponent(source as string)}`;
    const attachmentIDParam = attachmentID ? `&attachmentID=${attachmentID}` : '';
    const typeParam = type ? `&type=${type as string}` : '';
    const reportIDParam = reportID ? `&reportID=${reportID}` : '';
    const authTokenParam = isAuthTokenRequired ? '&isAuthTokenRequired=true' : '';
    const fileNameParam = originalFileName ? `&originalFileName=${originalFileName}` : '';
    const attachmentLinkParam = attachmentLink ? `&attachmentLink=${attachmentLink}` : '';

    return `${url}${sourceParam}${typeParam}${reportIDParam}${attachmentIDParam}${authTokenParam}${fileNameParam}${attachmentLinkParam} ` as const;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractRouteName<TRoute> = TRoute extends {getRoute: (...args: any[]) => infer TRouteName} ? TRouteName : TRoute;

/**
 * Represents all routes in the app as a union of literal strings.
 */
type Route = {
    [K in keyof typeof ROUTES]: ExtractRouteName<(typeof ROUTES)[K]>;
}[keyof typeof ROUTES];

type RoutesValidationError = 'Error: One or more routes defined within `ROUTES` have not correctly used `as const` in their `getRoute` function return value.';

/**
 * Represents all routes in the app as a union of literal strings.
 *
 * If TS throws on this line, it implies that one or more routes defined within `ROUTES` have not correctly used
 * `as const` in their `getRoute` function return value.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RouteIsPlainString = AssertTypesNotEqual<string, Route, RoutesValidationError>;

export type {Route};
