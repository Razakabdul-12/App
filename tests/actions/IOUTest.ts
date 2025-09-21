/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {renderHook} from '@testing-library/react-native';
import {format} from 'date-fns';
import {deepEqual} from 'fast-equals';
import type {OnyxCollection, OnyxEntry, OnyxInputValue} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import useReportWithTransactionsAndViolations from '@hooks/useReportWithTransactionsAndViolations';
import type {PerDiemExpenseTransactionParams, RequestMoneyParticipantParams} from '@libs/actions/IOU';
import {
    addSplitExpenseField,
    calculateDiffAmount,
    canApproveIOU,
    canCancelPayment,
    cancelPayment,
    canIOUBePaid,
    canUnapproveIOU,
    completeSplitBill,
    createDistanceRequest,
    deleteMoneyRequest,
    getIOUReportActionToApproveOrPay,
    getPerDiemExpenseInformation,
    getSendInvoiceInformation,
    initMoneyRequest,
    initSplitExpense,
    markRejectViolationAsResolved,
    payMoneyRequest,
    putOnHold,
    rejectMoneyRequest,
    replaceReceipt,
    requestMoney,
    saveSplitTransactions,
    sendInvoice,
    setDraftSplitTransaction,
    setMoneyRequestCategory,
    splitBill,
    startSplitBill,
    submitReport,
    trackExpense,
    unholdRequest,
    updateMoneyRequestAmountAndCurrency,
    updateMoneyRequestAttendees,
    updateMoneyRequestCategory,
    updateSplitExpenseAmountField,
} from '@libs/actions/IOU';
import initOnyxDerivedValues from '@libs/actions/OnyxDerived';
import {createWorkspace, deleteWorkspace, generatePolicyID} from '@libs/actions/Policy/Policy';
import {addComment, createNewReport, deleteReport, notifyNewAction, openReport} from '@libs/actions/Report';
import {clearAllRelatedReportActionErrors} from '@libs/actions/ReportActions';
import {subscribeToUserEvents} from '@libs/actions/User';
import {WRITE_COMMANDS} from '@libs/API/types';
import type {ApiCommand} from '@libs/API/types';
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';
import {translateLocal} from '@libs/Localize';
import Navigation from '@libs/Navigation/Navigation';
import {rand64} from '@libs/NumberUtils';
import {getLoginsByAccountIDs} from '@libs/PersonalDetailsUtils';
import {
    getOriginalMessage,
    getReportActionHtml,
    getReportActionMessage,
    getReportActionText,
    getReportPreviewAction,
    getSortedReportActions,
    isActionableTrackExpense,
    isActionOfType,
    isMoneyRequestAction,
} from '@libs/ReportActionsUtils';
import {buildOptimisticIOUReport, buildOptimisticIOUReportAction, buildTransactionThread, createDraftTransactionAndNavigateToParticipantSelector, isIOUReport} from '@libs/ReportUtils';
import type {OptimisticChatReport} from '@libs/ReportUtils';
import {buildOptimisticTransaction, getValidWaypoints, isDistanceRequest as isDistanceRequestUtil} from '@libs/TransactionUtils';
import CONST from '@src/CONST';
import type {IOUAction} from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import OnyxUpdateManager from '@src/libs/actions/OnyxUpdateManager';
import * as API from '@src/libs/API';
import DateUtils from '@src/libs/DateUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {OriginalMessageIOU, PersonalDetailsList, Policy, PolicyTagLists, Report, ReportNameValuePairs, SearchResults} from '@src/types/onyx';
import type {Accountant, Attendee} from '@src/types/onyx/IOU';
import type {Participant, ReportCollectionDataSet} from '@src/types/onyx/Report';
import type {ReportActions, ReportActionsCollectionDataSet} from '@src/types/onyx/ReportAction';
import type ReportAction from '@src/types/onyx/ReportAction';
import type {TransactionCollectionDataSet} from '@src/types/onyx/Transaction';
import type Transaction from '@src/types/onyx/Transaction';
import {toCollectionDataSet} from '@src/types/utils/CollectionDataSet';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import {changeTransactionsReport} from '../../src/libs/actions/Transaction';
import * as InvoiceData from '../data/Invoice';
import type {InvoiceTestData} from '../data/Invoice';
import createRandomPolicy, {createCategoryTaxExpenseRules} from '../utils/collections/policies';
import createRandomPolicyCategories from '../utils/collections/policyCategory';
import createRandomPolicyTags from '../utils/collections/policyTags';
import {createRandomReport} from '../utils/collections/reports';
import createRandomTransaction from '../utils/collections/transaction';
import getOnyxValue from '../utils/getOnyxValue';
import PusherHelper from '../utils/PusherHelper';
import {getGlobalFetchMock, getOnyxData, setPersonalDetails, signInWithTestUser} from '../utils/TestHelper';
import type {MockFetch} from '../utils/TestHelper';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';
import waitForNetworkPromises from '../utils/waitForNetworkPromises';

const topMostReportID = '23423423';
jest.mock('@src/libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
    dismissModal: jest.fn(),
    dismissModalWithReport: jest.fn(),
    goBack: jest.fn(),
    getTopmostReportId: jest.fn(() => topMostReportID),
    setNavigationActionToMicrotaskQueue: jest.fn(),
    removeScreenByKey: jest.fn(),
    isNavigationReady: jest.fn(() => Promise.resolve()),
    getReportRouteByID: jest.fn(),
    getActiveRouteWithoutParams: jest.fn(),
    getActiveRoute: jest.fn(),
    navigationRef: {
        getRootState: jest.fn(),
    },
}));

jest.mock('@react-navigation/native');

jest.mock('@src/libs/actions/Report', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const originalModule = jest.requireActual('@src/libs/actions/Report');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
        ...originalModule,
        notifyNewAction: jest.fn(),
    };
});
jest.mock('@libs/Navigation/helpers/isSearchTopmostFullScreenRoute', () => jest.fn());

const unapprovedCashHash = 71801560;
const unapprovedCashSimilarSearchHash = 1832274510;
jest.mock('@src/libs/SearchQueryUtils', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const actual = jest.requireActual('@src/libs/SearchQueryUtils');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
        ...actual,
        getCurrentSearchQueryJSON: jest.fn().mockImplementation(() => ({
            hash: unapprovedCashHash,
            query: 'test',
            type: 'expense',
            status: ['drafts', 'outstanding'],
            filters: {operator: 'eq', left: 'reimbursable', right: 'yes'},
            flatFilters: [{key: 'reimbursable', filters: [{operator: 'eq', value: 'yes'}]}],
            inputQuery: '',
            recentSearchHash: 89,
            similarSearchHash: unapprovedCashSimilarSearchHash,
            sortBy: 'tag',
            sortOrder: 'asc',
        })),
        buildCannedSearchQuery: jest.fn(),
    };
});

const CARLOS_EMAIL = 'cmartins@expensifail.com';
const CARLOS_ACCOUNT_ID = 1;
const CARLOS_PARTICIPANT: Participant = {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS, role: 'member'};
const JULES_EMAIL = 'jules@expensifail.com';
const JULES_ACCOUNT_ID = 2;
const JULES_PARTICIPANT: Participant = {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS, role: 'member'};
const RORY_EMAIL = 'rory@expensifail.com';
const RORY_ACCOUNT_ID = 3;
const RORY_PARTICIPANT: Participant = {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS, role: 'admin'};
const VIT_EMAIL = 'vit@expensifail.com';
const VIT_ACCOUNT_ID = 4;
const VIT_PARTICIPANT: Participant = {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS, role: 'member'};

OnyxUpdateManager();
describe('actions/IOU', () => {
    beforeAll(() => {
        Onyx.init({
            keys: ONYXKEYS,
            initialKeyStates: {
                [ONYXKEYS.SESSION]: {accountID: RORY_ACCOUNT_ID, email: RORY_EMAIL},
                [ONYXKEYS.PERSONAL_DETAILS_LIST]: {[RORY_ACCOUNT_ID]: {accountID: RORY_ACCOUNT_ID, login: RORY_EMAIL}},
            },
        });
        initOnyxDerivedValues();
        IntlStore.load(CONST.LOCALES.EN);

            // Given all report actions of the selfDM report
            const allReportActions = await new Promise<OnyxCollection<ReportActions>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.REPORT_ACTIONS,
                    waitForCollectionCallback: true,
                    callback: (reportActions) => {
                        Onyx.disconnect(connection);
                        resolve(reportActions);
                    },
                });
            });

            // Then the selfDM report should have an actionable track expense whisper action and an IOU action
            const selfDMReportActions = allReportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReport.reportID}`];
            expect(Object.values(selfDMReportActions ?? {}).length).toBe(2);

            // When the cache is cleared before categorizing the tracked expense
            await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction?.transactionID}`, {
                iouRequestType: null,
            });

            // When the transaction is saved to draft by selecting a category in the selfDM report
            const reportActionableTrackExpense = Object.values(selfDMReportActions ?? {}).find((reportAction) => isActionableTrackExpense(reportAction));
            createDraftTransactionAndNavigateToParticipantSelector(
                transaction?.transactionID,
                selfDMReport.reportID,
                CONST.IOU.ACTION.CATEGORIZE,
                reportActionableTrackExpense?.reportActionID,
            );
            await waitForBatchedUpdates();

            // Then the transaction draft should be saved successfully
            const allTransactionsDraft = await new Promise<OnyxCollection<Transaction>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.TRANSACTION_DRAFT,
                    waitForCollectionCallback: true,
                    callback: (transactionDrafts) => {
                        Onyx.disconnect(connection);
                        resolve(transactionDrafts);
                    },
                });
            });
            const transactionDraft = allTransactionsDraft?.[`${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${transaction?.transactionID}`];

            // When the user confirms the category for the tracked expense
            trackExpense({
                report: policyExpenseChat,
                isDraftPolicy: false,
                action: CONST.IOU.ACTION.CATEGORIZE,
                participantParams: {
                    payeeEmail: participant.login,
                    payeeAccountID: participant.accountID,
                    participant: {...participant, isPolicyExpenseChat: true},
                },
                policyParams: {
                    policy: fakePolicy,
                    policyCategories: fakeCategories,
                },
                transactionParams: {
                    amount: transactionDraft?.amount ?? fakeTransaction.amount,
                    currency: transactionDraft?.currency ?? fakeTransaction.currency,
                    created: format(new Date(), CONST.DATE.FNS_FORMAT_STRING),
                    merchant: transactionDraft?.merchant ?? fakeTransaction.merchant,
                    category: Object.keys(fakeCategories).at(0) ?? '',
                    validWaypoints: Object.keys(transactionDraft?.comment?.waypoints ?? {}).length ? getValidWaypoints(transactionDraft?.comment?.waypoints, true) : undefined,
                    actionableWhisperReportActionID: transactionDraft?.actionableWhisperReportActionID,
                    linkedTrackedExpenseReportAction: transactionDraft?.linkedTrackedExpenseReportAction,
                    linkedTrackedExpenseReportID: transactionDraft?.linkedTrackedExpenseReportID,
                    customUnitRateID: CONST.CUSTOM_UNITS.FAKE_P2P_ID,
                },
            });
            await waitForBatchedUpdates();
            await mockFetch?.resume?.();

            // Then the expense should be categorized successfully
            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.TRANSACTION,
                    waitForCollectionCallback: true,
                    callback: (transactions) => {
                        Onyx.disconnect(connection);
                        const categorizedTransaction = transactions?.[`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction?.transactionID}`];

                        // Then the transaction must remain a distance request, ensuring that the optimistic data is correctly built and the transaction type remains accurate.
                        const isDistanceRequest = isDistanceRequestUtil(categorizedTransaction);
                        expect(isDistanceRequest).toBe(true);

                        // Then the transaction category must match the original category
                        expect(categorizedTransaction?.category).toBe(Object.keys(fakeCategories).at(0) ?? '');
                        resolve();
                    },
                });
            });

            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.NVP_QUICK_ACTION_GLOBAL_CREATE,
                    callback: (quickAction) => {
                        Onyx.disconnect(connection);
                        resolve();

                        // Then the quickAction.action should be set to REQUEST_DISTANCE
                        expect(quickAction?.action).toBe(CONST.QUICK_ACTIONS.REQUEST_DISTANCE);
                        // Then the quickAction.chatReportID should be set to the given policyExpenseChat reportID
                        expect(quickAction?.chatReportID).toBe(policyExpenseChat.reportID);
                    },
                });
            });
        });

        it('share with accountant', async () => {
            const accountant: Required<Accountant> = {login: VIT_EMAIL, accountID: VIT_ACCOUNT_ID};
            const policy: Policy = {...createRandomPolicy(1), id: 'ABC'};
            const selfDMReport: Report = {
                ...createRandomReport(1),
                reportID: '10',
                chatType: CONST.REPORT.CHAT_TYPE.SELF_DM,
            };
            const policyExpenseChat: Report = {
                ...createRandomReport(1),
                reportID: '123',
                policyID: policy.id,
                type: CONST.REPORT.TYPE.CHAT,
                chatType: CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT,
                isOwnPolicyExpenseChat: true,
            };
            const transaction: Transaction = {...createRandomTransaction(1), transactionID: '555'};

            await Onyx.set(`${ONYXKEYS.COLLECTION.POLICY}${policy.id}`, policy);
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${policyExpenseChat.reportID}`, policyExpenseChat);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${transaction.transactionID}`, transaction);

            // Create a tracked expense
            trackExpense({
                report: selfDMReport,
                isDraftPolicy: true,
                action: CONST.IOU.ACTION.CREATE,
                participantParams: {
                    payeeEmail: RORY_EMAIL,
                    payeeAccountID: RORY_ACCOUNT_ID,
                    participant: {accountID: RORY_ACCOUNT_ID},
                },
                transactionParams: {
                    amount: transaction.amount,
                    currency: transaction.currency,
                    created: format(new Date(), CONST.DATE.FNS_FORMAT_STRING),
                    merchant: transaction.merchant,
                    billable: false,
                },
            });
            await waitForBatchedUpdates();

            const selfDMReportActionsOnyx = await new Promise<OnyxEntry<ReportActions>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReport.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (value) => {
                        Onyx.disconnect(connection);
                        resolve(value);
                    },
                });
            });
            expect(Object.values(selfDMReportActionsOnyx ?? {}).length).toBe(2);

            const linkedTrackedExpenseReportAction = Object.values(selfDMReportActionsOnyx ?? {}).find((reportAction) => isMoneyRequestAction(reportAction));
            const reportActionableTrackExpense = Object.values(selfDMReportActionsOnyx ?? {}).find((reportAction) => isActionableTrackExpense(reportAction));

            mockFetch?.pause?.();

            // Share the tracked expense with an accountant
            trackExpense({
                report: policyExpenseChat,
                isDraftPolicy: false,
                action: CONST.IOU.ACTION.SHARE,
                participantParams: {
                    payeeEmail: RORY_EMAIL,
                    payeeAccountID: RORY_ACCOUNT_ID,
                    participant: {reportID: policyExpenseChat.reportID, isPolicyExpenseChat: true},
                },
                policyParams: {
                    policy,
                },
                transactionParams: {
                    amount: transaction.amount,
                    currency: transaction.currency,
                    created: format(new Date(), CONST.DATE.FNS_FORMAT_STRING),
                    merchant: transaction.merchant,
                    billable: false,
                    actionableWhisperReportActionID: reportActionableTrackExpense?.reportActionID,
                    linkedTrackedExpenseReportAction,
                    linkedTrackedExpenseReportID: selfDMReport.reportID,
                },
                accountantParams: {
                    accountant,
                },
            });
            await waitForBatchedUpdates();

            const policyExpenseChatOnyx = await new Promise<OnyxEntry<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${policyExpenseChat.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (value) => {
                        Onyx.disconnect(connection);
                        resolve(value);
                    },
                });
            });
            const policyOnyx = await new Promise<OnyxEntry<Policy>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.POLICY}${policy.id}`,
                    waitForCollectionCallback: false,
                    callback: (value) => {
                        Onyx.disconnect(connection);
                        resolve(value);
                    },
                });
            });

            await mockFetch?.resume?.();

            // Accountant should be invited to the expense report
            expect(policyExpenseChatOnyx?.participants?.[accountant.accountID]).toBeTruthy();

            // Accountant should be added to the workspace as an admin
            expect(policyOnyx?.employeeList?.[accountant.login].role).toBe(CONST.POLICY.ROLE.ADMIN);
        });

        it('share with accountant who is already a member', async () => {
            const accountant: Required<Accountant> = {login: VIT_EMAIL, accountID: VIT_ACCOUNT_ID};
            const policy: Policy = {...createRandomPolicy(1), id: 'ABC', employeeList: {[accountant.login]: {email: accountant.login, role: CONST.POLICY.ROLE.USER}}};
            const selfDMReport: Report = {
                ...createRandomReport(1),
                reportID: '10',
                chatType: CONST.REPORT.CHAT_TYPE.SELF_DM,
            };
            const policyExpenseChat: Report = {
                ...createRandomReport(1),
                reportID: '123',
                policyID: policy.id,
                type: CONST.REPORT.TYPE.CHAT,
                chatType: CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT,
                isOwnPolicyExpenseChat: true,
                participants: {[accountant.accountID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS}},
            };
            const transaction: Transaction = {...createRandomTransaction(1), transactionID: '555'};

            await Onyx.set(`${ONYXKEYS.COLLECTION.POLICY}${policy.id}`, policy);
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${policyExpenseChat.reportID}`, policyExpenseChat);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${transaction.transactionID}`, transaction);
            await Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, {[accountant.accountID]: accountant});

            // Create a tracked expense
            trackExpense({
                report: selfDMReport,
                isDraftPolicy: true,
                action: CONST.IOU.ACTION.CREATE,
                participantParams: {
                    payeeEmail: RORY_EMAIL,
                    payeeAccountID: RORY_ACCOUNT_ID,
                    participant: {accountID: RORY_ACCOUNT_ID},
                },
                transactionParams: {
                    amount: transaction.amount,
                    currency: transaction.currency,
                    created: format(new Date(), CONST.DATE.FNS_FORMAT_STRING),
                    merchant: transaction.merchant,
                    billable: false,
                },
            });
            await waitForBatchedUpdates();

            const selfDMReportActionsOnyx = await new Promise<OnyxEntry<ReportActions>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReport.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (value) => {
                        Onyx.disconnect(connection);
                        resolve(value);
                    },
                });
            });
            expect(Object.values(selfDMReportActionsOnyx ?? {}).length).toBe(2);

            const linkedTrackedExpenseReportAction = Object.values(selfDMReportActionsOnyx ?? {}).find((reportAction) => isMoneyRequestAction(reportAction));
            const reportActionableTrackExpense = Object.values(selfDMReportActionsOnyx ?? {}).find((reportAction) => isActionableTrackExpense(reportAction));

            mockFetch?.pause?.();

            // Share the tracked expense with an accountant
            trackExpense({
                report: policyExpenseChat,
                isDraftPolicy: false,
                action: CONST.IOU.ACTION.SHARE,
                participantParams: {
                    payeeEmail: RORY_EMAIL,
                    payeeAccountID: RORY_ACCOUNT_ID,
                    participant: {reportID: policyExpenseChat.reportID, isPolicyExpenseChat: true},
                },
                policyParams: {
                    policy,
                },
                transactionParams: {
                    amount: transaction.amount,
                    currency: transaction.currency,
                    created: format(new Date(), CONST.DATE.FNS_FORMAT_STRING),
                    merchant: transaction.merchant,
                    billable: false,
                    actionableWhisperReportActionID: reportActionableTrackExpense?.reportActionID,
                    linkedTrackedExpenseReportAction,
                    linkedTrackedExpenseReportID: selfDMReport.reportID,
                },
                accountantParams: {
                    accountant,
                },
            });
            await waitForBatchedUpdates();

            const policyExpenseChatOnyx = await new Promise<OnyxEntry<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${policyExpenseChat.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (value) => {
                        Onyx.disconnect(connection);
                        resolve(value);
                    },
                });
            });
            const policyOnyx = await new Promise<OnyxEntry<Policy>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.POLICY}${policy.id}`,
                    waitForCollectionCallback: false,
                    callback: (value) => {
                        Onyx.disconnect(connection);
                        resolve(value);
                    },
                });
            });

            await mockFetch?.resume?.();

            // Accountant should be still a participant in the expense report
            expect(policyExpenseChatOnyx?.participants?.[accountant.accountID]).toBeTruthy();

            // Accountant role should change to admin
            expect(policyOnyx?.employeeList?.[accountant.login].role).toBe(CONST.POLICY.ROLE.ADMIN);
        });
    });

    describe('requestMoney', () => {
        it('creates new chat if needed', () => {
            const amount = 10000;
            const comment = 'Giv money plz';
            const merchant = 'KFC';
            let iouReportID: string | undefined;
            let createdAction: OnyxEntry<ReportAction>;
            let iouAction: OnyxEntry<ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU>>;
            let transactionID: string | undefined;
            let transactionThread: OnyxEntry<Report>;
            let transactionThreadCreatedAction: OnyxEntry<ReportAction>;
            mockFetch?.pause?.();
            requestMoney({
                report: {reportID: ''},
                participantParams: {
                    payeeEmail: RORY_EMAIL,
                    payeeAccountID: RORY_ACCOUNT_ID,
                    participant: {login: CARLOS_EMAIL, accountID: CARLOS_ACCOUNT_ID},
                },
                transactionParams: {
                    amount,
                    attendees: [],
                    currency: CONST.CURRENCY.USD,
                    created: '',
                    merchant,
                    comment,
                },
                shouldGenerateTransactionThreadReport: true,
            });

            expect(nonReimbursableTotal).toBe(0);

            requestMoney({
                report: expenseReport,
                participantParams: {
                    payeeEmail: RORY_EMAIL,
                    payeeAccountID: RORY_ACCOUNT_ID,
                    participant: {reportID: workspaceChat.reportID, isPolicyExpenseChat: true},
                },
                transactionParams: {
                    amount: 100,
                    attendees: [],
                    currency: CONST.CURRENCY.USD,
                    created: '',
                    merchant: '',
                    comment: '',
                    reimbursable: false,
                },
                shouldGenerateTransactionThreadReport: true,
            });

            await waitForBatchedUpdates();

            const newNonReimbursableTotal = await new Promise<number>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${expenseReport?.reportID}`,
                    callback: (report) => {
                        Onyx.disconnect(connection);
                        resolve(report?.nonReimbursableTotal ?? 0);
                    },
                });
            });

            expect(newNonReimbursableTotal).toBe(-100);
        });
    });

    describe('createDistanceRequest', () => {
        it('does not trigger notifyNewAction when doing the money request in a money request report', () => {
            createDistanceRequest({
                report: {reportID: '123', type: CONST.REPORT.TYPE.EXPENSE},
                participants: [],
                transactionParams: {
                    amount: 1,
                    attendees: [],
                    currency: CONST.CURRENCY.USD,
                    created: '',
                    merchant: '',
                    comment: '',
                    validWaypoints: {},
                },
            });
            expect(notifyNewAction).toHaveBeenCalledTimes(0);
        });

        it('trigger notifyNewAction when doing the money request in a chat report', () => {
            createDistanceRequest({
                report: {reportID: '123'},
                participants: [],
                transactionParams: {
                    amount: 1,
                    attendees: [],
                    currency: CONST.CURRENCY.USD,
                    created: '',
                    merchant: '',
                    comment: '',
                    validWaypoints: {},
                },
            });
            expect(notifyNewAction).toHaveBeenCalledTimes(1);
        });
    });

    describe('split expense', () => {
        it('creates and updates new chats and IOUs as needed', () => {
            jest.setTimeout(10 * 1000);
            /*
             * Given that:
             *   - Rory and Carlos have chatted before
             *   - Rory and Jules have chatted before and have an active IOU report
             *   - Rory and Vit have never chatted together before
             *   - There is no existing group chat with the four of them
             */
            const amount = 400;
            const comment = 'Yes, I am splitting a bill for $4 USD';
            const merchant = 'Yema Kitchen';
            let carlosChatReport: OnyxEntry<Report> = {
                reportID: rand64(),
                type: CONST.REPORT.TYPE.CHAT,
                participants: {[RORY_ACCOUNT_ID]: RORY_PARTICIPANT, [CARLOS_ACCOUNT_ID]: CARLOS_PARTICIPANT},
            };
            const carlosCreatedAction: OnyxEntry<ReportAction> = {
                reportActionID: rand64(),
                actionName: CONST.REPORT.ACTIONS.TYPE.CREATED,
                created: DateUtils.getDBTime(),
                reportID: carlosChatReport.reportID,
            };
            const julesIOUReportID = rand64();
            let julesChatReport: OnyxEntry<Report> = {
                reportID: rand64(),
                type: CONST.REPORT.TYPE.CHAT,
                iouReportID: julesIOUReportID,
                participants: {[RORY_ACCOUNT_ID]: RORY_PARTICIPANT, [JULES_ACCOUNT_ID]: JULES_PARTICIPANT},
            };
            const julesChatCreatedAction: OnyxEntry<ReportAction> = {
                reportActionID: rand64(),
                actionName: CONST.REPORT.ACTIONS.TYPE.CREATED,
                created: DateUtils.getDBTime(),
                reportID: julesChatReport.reportID,
            };
            const julesCreatedAction: OnyxEntry<ReportAction> = {
                reportActionID: rand64(),
                actionName: CONST.REPORT.ACTIONS.TYPE.CREATED,
                created: DateUtils.getDBTime(),
                reportID: julesIOUReportID,
            };
            jest.advanceTimersByTime(200);
            const julesExistingTransaction: OnyxEntry<Transaction> = {
                transactionID: rand64(),
                amount: 1000,
                comment: {
                    comment: 'This is an existing transaction',
                    attendees: [{email: 'text@expensify.com', displayName: 'Test User', avatarUrl: ''}],
                },
                created: DateUtils.getDBTime(),
                currency: '',
                merchant: '',
                reportID: '',
            };
            let julesIOUReport: OnyxEntry<Report> = {
                reportID: julesIOUReportID,
                chatReportID: julesChatReport.reportID,
                type: CONST.REPORT.TYPE.IOU,
                ownerAccountID: RORY_ACCOUNT_ID,
                managerID: JULES_ACCOUNT_ID,
                currency: CONST.CURRENCY.USD,
                total: julesExistingTransaction?.amount,
            };
            const julesExistingIOUAction: OnyxEntry<ReportAction> = {
                reportActionID: rand64(),
                actionName: CONST.REPORT.ACTIONS.TYPE.IOU,
                actorAccountID: RORY_ACCOUNT_ID,
                created: DateUtils.getDBTime(),
                originalMessage: {
                    IOUReportID: julesIOUReportID,
                    IOUTransactionID: julesExistingTransaction?.transactionID,
                    amount: julesExistingTransaction?.amount ?? 0,
                    currency: CONST.CURRENCY.USD,
                    type: CONST.IOU.REPORT_ACTION_TYPE.CREATE,
                    participantAccountIDs: [RORY_ACCOUNT_ID, JULES_ACCOUNT_ID],
                },
                reportID: julesIOUReportID,
            };

            let carlosIOUReport: OnyxEntry<Report>;
            let carlosIOUAction: OnyxEntry<ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU>>;
            let carlosIOUCreatedAction: OnyxEntry<ReportAction>;
            let carlosTransaction: OnyxEntry<Transaction>;

            let julesIOUAction: OnyxEntry<ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU>>;
            let julesIOUCreatedAction: OnyxEntry<ReportAction>;
            let julesTransaction: OnyxEntry<Transaction>;

            let vitChatReport: OnyxEntry<Report>;
            let vitIOUReport: OnyxEntry<Report>;
            let vitCreatedAction: OnyxEntry<ReportAction>;
            let vitIOUAction: OnyxEntry<ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU>>;
            let vitTransaction: OnyxEntry<Transaction>;

            let groupChat: OnyxEntry<Report>;
            let groupCreatedAction: OnyxEntry<ReportAction>;
            let groupIOUAction: OnyxEntry<ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU>>;
            let groupTransaction: OnyxEntry<Transaction>;

            const reportCollectionDataSet = toCollectionDataSet(ONYXKEYS.COLLECTION.REPORT, [carlosChatReport, julesChatReport, julesIOUReport], (item) => item.reportID);

            const carlosActionsCollectionDataSet = toCollectionDataSet(
                `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}`,
                [
                    {
                        [carlosCreatedAction.reportActionID]: carlosCreatedAction,
                    },
                ],
                (item) => item[carlosCreatedAction.reportActionID].reportID,
            );

            const julesActionsCollectionDataSet = toCollectionDataSet(
                `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}`,
                [
                    {
                        [julesCreatedAction.reportActionID]: julesCreatedAction,
                        [julesExistingIOUAction.reportActionID]: julesExistingIOUAction,
                    },
                ],
                (item) => item[julesCreatedAction.reportActionID].reportID,
            );

            const julesCreatedActionsCollectionDataSet = toCollectionDataSet(
                `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}`,
                [
                    {
                        [julesChatCreatedAction.reportActionID]: julesChatCreatedAction,
                    },
                ],
                (item) => item[julesChatCreatedAction.reportActionID].reportID,
            );

            return Onyx.mergeCollection(ONYXKEYS.COLLECTION.REPORT, {
                ...reportCollectionDataSet,
            })
                .then(() =>
                    Onyx.mergeCollection(ONYXKEYS.COLLECTION.REPORT_ACTIONS, {
                        ...carlosActionsCollectionDataSet,
                        ...julesCreatedActionsCollectionDataSet,
                        ...julesActionsCollectionDataSet,
                    }),
                )
                .then(() => Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${julesExistingTransaction?.transactionID}`, julesExistingTransaction))
                .then(() => {
                    // When we split a bill offline
                    mockFetch?.pause?.();
                    splitBill(
                        // TODO: Migrate after the backend accepts accountIDs
                        {
                            participants: [
                                [CARLOS_EMAIL, String(CARLOS_ACCOUNT_ID)],
                                [JULES_EMAIL, String(JULES_ACCOUNT_ID)],
                                [VIT_EMAIL, String(VIT_ACCOUNT_ID)],
                            ].map(([email, accountID]) => ({login: email, accountID: Number(accountID)})),
                            currentUserLogin: RORY_EMAIL,
                            currentUserAccountID: RORY_ACCOUNT_ID,
                            amount,
                            comment,
                            currency: CONST.CURRENCY.USD,
                            merchant,
                            created: '',
                            tag: '',
                            existingSplitChatReportID: '',
                        },
                    );

            await new Promise<OnyxEntry<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${workspaceReportID}`,
                    callback: (report) => {
                        Onyx.disconnect(connection);
                        expect(report?.lastVisibleActionCreated).toBe(reportPreviewAction?.created);
                        resolve(report);
                    },
                });
            });
        });

        it('should update split chat report lastVisibleActionCreated to the latest IOU action when split bill in a DM', async () => {
            // Given a DM chat with no expenses
            const reportID = '1';
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`, {
                reportID,
                type: CONST.REPORT.TYPE.CHAT,
                participants: {[RORY_ACCOUNT_ID]: RORY_PARTICIPANT, [CARLOS_ACCOUNT_ID]: CARLOS_PARTICIPANT},
            });

            // When the user split bill twice on the DM
            splitBill({
                participants: [{accountID: CARLOS_ACCOUNT_ID, login: CARLOS_EMAIL}],
                currentUserLogin: RORY_EMAIL,
                currentUserAccountID: RORY_ACCOUNT_ID,
                comment: '',
                amount: 100,
                currency: CONST.CURRENCY.USD,
                merchant: 'test',
                created: '',
                existingSplitChatReportID: reportID,
            });

            await waitForBatchedUpdates();

            splitBill({
                participants: [{accountID: CARLOS_ACCOUNT_ID, login: CARLOS_EMAIL}],
                currentUserLogin: RORY_EMAIL,
                currentUserAccountID: RORY_ACCOUNT_ID,
                comment: '',
                amount: 200,
                currency: CONST.CURRENCY.USD,
                merchant: 'test',
                created: '',
                existingSplitChatReportID: reportID,
            });

            await waitForBatchedUpdates();

            // Then the DM lastVisibleActionCreated should be updated to the second IOU action created
            const iouAction = await new Promise<OnyxEntry<ReportAction>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`,
                    callback: (reportActions) => {
                        Onyx.disconnect(connection);
                        resolve(Object.values(reportActions ?? {}).find((action) => isActionOfType(action, CONST.REPORT.ACTIONS.TYPE.IOU) && getOriginalMessage(action)?.amount === 200));
                    },
                });
            });

            const report = await new Promise<OnyxEntry<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${reportID}`,
                    callback: (reportVal) => {
                        Onyx.disconnect(connection);
                        resolve(reportVal);
                    },
                });
            });
            expect(report?.lastVisibleActionCreated).toBe(iouAction?.created);
        });

        it('optimistic transaction should be merged with the draft transaction if it is a distance request', async () => {
            // Given a workspace expense chat and a draft split transaction
            const workspaceReportID = '1';
            const transactionAmount = 100;
            const draftTransaction = {
                amount: transactionAmount,
                currency: CONST.CURRENCY.USD,
                merchant: 'test',
                created: '',
                iouRequestType: CONST.IOU.REQUEST_TYPE.DISTANCE,
            };

            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${workspaceReportID}`, {reportID: workspaceReportID, isOwnPolicyExpenseChat: true});
            await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${CONST.IOU.OPTIMISTIC_TRANSACTION_ID}`, draftTransaction);

            // When doing a distance split expense
            splitBill({
                participants: [{reportID: workspaceReportID}],
                currentUserLogin: RORY_EMAIL,
                currentUserAccountID: RORY_ACCOUNT_ID,
                existingSplitChatReportID: workspaceReportID,
                ...draftTransaction,
                comment: '',
            });

            await waitForBatchedUpdates();

            const optimisticTransaction = await new Promise<OnyxEntry<Transaction>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.TRANSACTION,
                    waitForCollectionCallback: true,
                    callback: (transactions) => {
                        Onyx.disconnect(connection);
                        resolve(Object.values(transactions ?? {}).find((transaction) => transaction?.amount === -(transactionAmount / 2)));
                    },
                });
            });

            // Then the data from the transaction draft should be merged into the optimistic transaction
            expect(optimisticTransaction?.iouRequestType).toBe(CONST.IOU.REQUEST_TYPE.DISTANCE);
        });

        it("should update the notification preference of the report to ALWAYS if it's previously hidden", async () => {
            // Given a group chat with hidden notification preference
            const reportID = '1';
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`, {
                reportID,
                type: CONST.REPORT.TYPE.CHAT,
                chatType: CONST.REPORT.CHAT_TYPE.GROUP,
                participants: {
                    [RORY_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN},
                    [CARLOS_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN},
                },
            });

            // When the user split bill on the group chat
            splitBill({
                participants: [{accountID: CARLOS_ACCOUNT_ID, login: CARLOS_EMAIL}],
                currentUserLogin: RORY_EMAIL,
                currentUserAccountID: RORY_ACCOUNT_ID,
                comment: '',
                amount: 100,
                currency: CONST.CURRENCY.USD,
                merchant: 'test',
                created: '',
                existingSplitChatReportID: reportID,
            });

            await waitForBatchedUpdates();

            // Then the DM notification preference should be updated to ALWAYS
            const report = await new Promise<OnyxEntry<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${reportID}`,
                    callback: (reportVal) => {
                        Onyx.disconnect(connection);
                        resolve(reportVal);
                    },
                });
            });
            expect(report?.participants?.[RORY_ACCOUNT_ID].notificationPreference).toBe(CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS);
        });

        it('the description should not be parsed again after completing the scan split bill without changing the description', async () => {
            const reportID = '1';
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`, {
                reportID,
                type: CONST.REPORT.TYPE.CHAT,
                chatType: CONST.REPORT.CHAT_TYPE.GROUP,
                participants: {
                    [RORY_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS},
                    [CARLOS_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS},
                },
            });

            // Start a scan split bill
            const {splitTransactionID} = startSplitBill({
                participants: [{accountID: CARLOS_ACCOUNT_ID, login: CARLOS_EMAIL}],
                currentUserLogin: RORY_EMAIL,
                currentUserAccountID: RORY_ACCOUNT_ID,
                comment: '# test',
                currency: CONST.CURRENCY.USD,
                existingSplitChatReportID: reportID,
                receipt: {},
                category: undefined,
                tag: undefined,
                taxCode: '',
                taxAmount: 0,
            });

            await waitForBatchedUpdates();

            let splitTransaction = await getOnyxValue(`${ONYXKEYS.COLLECTION.TRANSACTION}${splitTransactionID}`);

            // Then the description should be parsed correctly
            expect(splitTransaction?.comment?.comment).toBe('<h1>test</h1>');

            const updatedSplitTransaction = splitTransaction
                ? {
                      ...splitTransaction,
                      amount: 100,
                  }
                : undefined;

            const reportActions = await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`);
            const iouAction = Object.values(reportActions ?? {}).find((action) => isActionOfType(action, CONST.REPORT.ACTIONS.TYPE.IOU));

            expect(iouAction).toBeTruthy();

            // Complete this split bill without changing the description
            completeSplitBill(reportID, iouAction, updatedSplitTransaction, RORY_ACCOUNT_ID, RORY_EMAIL);

            await waitForBatchedUpdates();

            splitTransaction = await getOnyxValue(`${ONYXKEYS.COLLECTION.TRANSACTION}${splitTransactionID}`);

            // Then the description should be the same since it was not changed
            expect(splitTransaction?.comment?.comment).toBe('<h1>test</h1>');
        });
    });

    describe('saveSplitTransactions', () => {
        it('should delete the original transaction thread report', async () => {
            const expenseReport: Report = {
                ...createRandomReport(1),
                type: CONST.REPORT.TYPE.EXPENSE,
            };
            const transaction: Transaction = {
                amount: 100,
                currency: 'USD',
                transactionID: '1',
                reportID: expenseReport.reportID,
                created: DateUtils.getDBTime(),
                merchant: 'test',
            };
            const transactionThread: Report = {
                ...createRandomReport(2),
            };
            const iouAction: ReportAction = {
                ...buildOptimisticIOUReportAction({
                    type: CONST.IOU.REPORT_ACTION_TYPE.CREATE,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    comment: '',
                    participants: [],
                    transactionID: transaction.transactionID,
                    iouReportID: expenseReport.reportID,
                }),
                childReportID: transactionThread.reportID,
            };
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${expenseReport.reportID}`, expenseReport);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${transactionThread.reportID}`, transactionThread);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${expenseReport.reportID}`, {
                [iouAction.reportActionID]: iouAction,
            });
            const draftTransaction: OnyxEntry<Transaction> = {
                ...transaction,
                comment: {
                    originalTransactionID: transaction.transactionID,
                },
            };
            saveSplitTransactions(draftTransaction, 1);

            await waitForBatchedUpdates();

            const originalTransactionThread = await new Promise<OnyxEntry<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${iouAction.childReportID}`,
                    callback: (val) => {
                        Onyx.disconnect(connection);
                        resolve(val);
                    },
                });
            });
            expect(originalTransactionThread).toBe(undefined);
        });

        it('should remove the original transaction from the search snapshot data', async () => {
            // Given a single expense
            const expenseReport: Report = {
                ...createRandomReport(1),
                type: CONST.REPORT.TYPE.EXPENSE,
            };
            const transaction: Transaction = {
                amount: 100,
                currency: 'USD',
                transactionID: '1',
                reportID: expenseReport.reportID,
                created: DateUtils.getDBTime(),
                merchant: 'test',
            };
            const transactionThread: Report = {
                ...createRandomReport(2),
            };
            const iouAction: ReportAction = {
                ...buildOptimisticIOUReportAction({
                    type: CONST.IOU.REPORT_ACTION_TYPE.CREATE,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    comment: '',
                    participants: [],
                    transactionID: transaction.transactionID,
                    iouReportID: expenseReport.reportID,
                }),
                childReportID: transactionThread.reportID,
            };
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${expenseReport.reportID}`, expenseReport);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${transactionThread.reportID}`, transactionThread);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${expenseReport.reportID}`, {
                [iouAction.reportActionID]: iouAction,
            });
            const draftTransaction: OnyxEntry<Transaction> = {
                ...transaction,
                comment: {
                    originalTransactionID: transaction.transactionID,
                },
            };

            // When splitting the expense
            const hash = 1;
            saveSplitTransactions(draftTransaction, hash);

            await waitForBatchedUpdates();

            // Then the original expense/transaction should be removed from the search snapshot data
            const searchSnapshot = await new Promise<OnyxEntry<SearchResults>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.SNAPSHOT}${hash}`,
                    callback: (val) => {
                        Onyx.disconnect(connection);
                        resolve(val);
                    },
                });
            });
            expect(searchSnapshot?.data[`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction.transactionID}`]).toBe(undefined);
        });

        it('should add split transactions optimistically on search snapshot when current search filter is on unapprovedCash', async () => {
            const chatReport: Report = {
                ...createRandomReport(7),
                chatType: CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT,
            };
            // Given a single expense
            const expenseReport: Report = {
                ...createRandomReport(1),
                type: CONST.REPORT.TYPE.EXPENSE,
                chatReportID: chatReport.reportID,
                stateNum: CONST.REPORT.STATE_NUM.SUBMITTED,
                statusNum: CONST.REPORT.STATUS_NUM.SUBMITTED,
            };
            const transaction: Transaction = {
                amount: 100,
                currency: 'USD',
                transactionID: '1',
                reportID: expenseReport.reportID,
                created: DateUtils.getDBTime(),
                merchant: 'test',
            };
            const transactionThread: Report = {
                ...createRandomReport(2),
            };
            const iouAction: ReportAction = {
                ...buildOptimisticIOUReportAction({
                    type: CONST.IOU.REPORT_ACTION_TYPE.CREATE,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    comment: '',
                    participants: [],
                    transactionID: transaction.transactionID,
                    iouReportID: expenseReport.reportID,
                }),
                childReportID: transactionThread.reportID,
            };
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${chatReport.reportID}`, chatReport);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${expenseReport.reportID}`, expenseReport);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${transactionThread.reportID}`, transactionThread);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${expenseReport.reportID}`, {
                [iouAction.reportActionID]: iouAction,
            });
            const splitTransactionID1 = '34';
            const splitTransactionID2 = '35';
            const draftTransaction: OnyxEntry<Transaction> = {
                ...transaction,
                comment: {
                    originalTransactionID: transaction.transactionID,
                    splitExpenses: [
                        {amount: transaction.amount / 2, transactionID: splitTransactionID1, created: ''},
                        {amount: transaction.amount / 2, transactionID: splitTransactionID2, created: ''},
                    ],
                },
            };

            // When splitting the expense
            const hash = 1;
            saveSplitTransactions(draftTransaction, hash);

            await waitForBatchedUpdates();

            // Then the split expenses/transactions should be added on the search snapshot data
            const searchSnapshot = await new Promise<OnyxEntry<SearchResults>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.SNAPSHOT}${unapprovedCashHash}`,
                    callback: (val) => {
                        Onyx.disconnect(connection);
                        resolve(val);
                    },
                });
            });
            expect(searchSnapshot?.data?.[`${ONYXKEYS.COLLECTION.TRANSACTION}${splitTransactionID1}`]).toBeDefined();
            expect(searchSnapshot?.data?.[`${ONYXKEYS.COLLECTION.TRANSACTION}${splitTransactionID2}`]).toBeDefined();
        });
    });

    describe('payMoneyRequestElsewhere', () => {
        it('clears outstanding IOUReport', () => {
            const amount = 10000;
            const comment = 'Giv money plz';
            let chatReport: OnyxEntry<Report>;
            let iouReport: OnyxEntry<Report>;
            let createIOUAction: OnyxEntry<ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU>>;
            let payIOUAction: OnyxEntry<ReportAction>;
            let transaction: OnyxEntry<Transaction>;
            requestMoney({
                report: {reportID: ''},
                participantParams: {
                    payeeEmail: RORY_EMAIL,
                    payeeAccountID: RORY_ACCOUNT_ID,
                    participant: {login: CARLOS_EMAIL, accountID: CARLOS_ACCOUNT_ID},
                },
                transactionParams: {
                    amount,
                    attendees: [],
                    currency: CONST.CURRENCY.USD,
                    created: '',
                    merchant: '',
                    comment,
                },
                shouldGenerateTransactionThreadReport: true,
            });

    describe('pay expense report via ACH', () => {
        const amount = 10000;
        const comment = '💸💸💸💸';
        const merchant = 'NASDAQ';

        afterEach(() => {
            mockFetch?.resume?.();
        });

        it('updates the expense request and expense report when paid while offline', () => {
            let expenseReport: OnyxEntry<Report>;
            let chatReport: OnyxEntry<Report>;

            mockFetch?.pause?.();
            Onyx.set(ONYXKEYS.SESSION, {email: CARLOS_EMAIL, accountID: CARLOS_ACCOUNT_ID});

    describe('payMoneyRequest', () => {
        it('should apply optimistic data correctly', async () => {
            // Given an outstanding IOU report
            const chatReport = {
                ...createRandomReport(0),
                lastReadTime: DateUtils.getDBTime(),
                lastVisibleActionCreated: DateUtils.getDBTime(),
            };
            const iouReport = {
                ...createRandomReport(1),
                chatType: undefined,
                type: CONST.REPORT.TYPE.IOU,
                total: 10,
            };
            mockFetch?.pause?.();

            jest.advanceTimersByTime(10);

            // When paying the IOU report
            payMoneyRequest(CONST.IOU.PAYMENT_TYPE.ELSEWHERE, chatReport, iouReport);

            await waitForBatchedUpdates();

            // Then the optimistic data should be applied correctly
            const payReportAction = await new Promise<ReportAction | undefined>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport.reportID}`,
                    callback: (reportActions) => {
                        Onyx.disconnect(connection);
                        resolve(Object.values(reportActions ?? {}).pop());
                    },
                });
            });

            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${chatReport.reportID}`,
                    callback: (report) => {
                        Onyx.disconnect(connection);
                        expect(report?.lastVisibleActionCreated).toBe(chatReport.lastVisibleActionCreated);
                        expect(report?.hasOutstandingChildRequest).toBe(false);
                        expect(report?.iouReportID).toBeUndefined();
                        expect(new Date(report?.lastReadTime ?? '').getTime()).toBeGreaterThan(new Date(chatReport?.lastReadTime ?? '').getTime());
                        expect(report?.lastMessageText).toBe(getReportActionText(payReportAction));
                        expect(report?.lastMessageHtml).toBe(getReportActionHtml(payReportAction));
                        resolve();
                    },
                });
            });

            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${iouReport.reportID}`,
                    callback: (report) => {
                        Onyx.disconnect(connection);
                        expect(report?.hasOutstandingChildRequest).toBe(false);
                        expect(report?.statusNum).toBe(CONST.REPORT.STATUS_NUM.REIMBURSED);
                        expect(report?.lastVisibleActionCreated).toBe(payReportAction?.created);
                        expect(report?.lastMessageText).toBe(getReportActionText(payReportAction));
                        expect(report?.lastMessageHtml).toBe(getReportActionHtml(payReportAction));
                        expect(report?.pendingFields).toEqual({
                            preview: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE,
                            reimbursed: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE,
                        });
                        resolve();
                    },
                });
            });

            mockFetch?.resume?.();
        });

        it('calls notifyNewAction for the top most report', () => {
            // Given two expenses in an iou report where one of them held
            const iouReport = buildOptimisticIOUReport(1, 2, 100, '1', 'USD');
            const transaction1 = buildOptimisticTransaction({
                transactionParams: {
                    amount: 100,
                    currency: 'USD',
                    reportID: iouReport.reportID,
                },
            });
            const transaction2 = buildOptimisticTransaction({
                transactionParams: {
                    amount: 100,
                    currency: 'USD',
                    reportID: iouReport.reportID,
                },
            });
            const transactionCollectionDataSet: TransactionCollectionDataSet = {
                [`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction1.transactionID}`]: transaction1,
                [`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction2.transactionID}`]: transaction2,
            };
            const iouActions: ReportAction[] = [];
            [transaction1, transaction2].forEach((transaction) =>
                iouActions.push(
                    buildOptimisticIOUReportAction({
                        type: CONST.IOU.REPORT_ACTION_TYPE.CREATE,
                        amount: transaction.amount,
                        currency: transaction.currency,
                        comment: '',
                        participants: [],
                        transactionID: transaction.transactionID,
                    }),
                ),
            );
            const actions: OnyxInputValue<ReportActions> = {};
            iouActions.forEach((iouAction) => (actions[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouAction.reportActionID}`] = iouAction));
            const actionCollectionDataSet: ReportActionsCollectionDataSet = {[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport.reportID}`]: actions};
    });

    describe('a expense chat with a cancelled payment', () => {
        const amount = 10000;
        const comment = '💸💸💸💸';
        const merchant = 'NASDAQ';

        afterEach(() => {
            mockFetch?.resume?.();
        });

        it("has an iouReportID of the cancelled payment's expense report", () => {
            let expenseReport: OnyxEntry<Report>;
            let chatReport: OnyxEntry<Report>;

            // Given a signed in account, which owns a workspace, and has a policy expense chat
            Onyx.set(ONYXKEYS.SESSION, {email: CARLOS_EMAIL, accountID: CARLOS_ACCOUNT_ID});

    describe('deleteMoneyRequest', () => {
        const amount = 10000;
        const comment = 'Send me money please';
        let chatReport: OnyxEntry<Report>;
        let iouReport: OnyxEntry<Report>;
        let createIOUAction: OnyxEntry<ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU>>;
        let transaction: OnyxEntry<Transaction>;
        let thread: OptimisticChatReport;
        const TEST_USER_ACCOUNT_ID = 1;
        const TEST_USER_LOGIN = 'test@test.com';
        let IOU_REPORT_ID: string | undefined;
        let reportActionID;
        const REPORT_ACTION: OnyxEntry<ReportAction> = {
            actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
            actorAccountID: TEST_USER_ACCOUNT_ID,
            automatic: false,
            avatar: 'https://d2k5nsl2zxldvw.cloudfront.net/images/avatars/avatar_3.png',
            message: [{type: 'COMMENT', html: 'Testing a comment', text: 'Testing a comment', translationKey: ''}],
            person: [{type: 'TEXT', style: 'strong', text: 'Test User'}],
            shouldShow: true,
            created: DateUtils.getDBTime(),
            reportActionID: '1',
            originalMessage: {
                html: '',
                whisperedTo: [],
            },
        };

        let reportActions: OnyxCollection<ReportAction>;

        beforeEach(async () => {
            // Given mocks are cleared and helpers are set up
            jest.clearAllMocks();
            PusherHelper.setup();

            // Given a test user is signed in with Onyx setup and some initial data
            await signInWithTestUser(TEST_USER_ACCOUNT_ID, TEST_USER_LOGIN);
            subscribeToUserEvents();
            await waitForBatchedUpdates();
            await setPersonalDetails(TEST_USER_LOGIN, TEST_USER_ACCOUNT_ID);

            // When a submit IOU expense is made
            requestMoney({
                report: chatReport,
                participantParams: {
                    payeeEmail: TEST_USER_LOGIN,
                    payeeAccountID: TEST_USER_ACCOUNT_ID,
                    participant: {login: RORY_EMAIL, accountID: RORY_ACCOUNT_ID},
                },
                transactionParams: {
                    amount,
                    attendees: [],
                    currency: CONST.CURRENCY.USD,
                    created: '',
                    merchant: '',
                    comment,
                },
                shouldGenerateTransactionThreadReport: true,
            });
            await waitForBatchedUpdates();

            // When fetching all reports from Onyx
            const allReports = await new Promise<OnyxCollection<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.REPORT,
                    waitForCollectionCallback: true,
                    callback: (reports) => {
                        Onyx.disconnect(connection);
                        resolve(reports);
                    },
                });
            });

            // Then we should have exactly 3 reports
            expect(Object.values(allReports ?? {}).length).toBe(3);

            // Then one of them should be a chat report with relevant properties
            chatReport = Object.values(allReports ?? {}).find((report) => report?.type === CONST.REPORT.TYPE.CHAT);
            expect(chatReport).toBeTruthy();
            expect(chatReport).toHaveProperty('reportID');
            expect(chatReport).toHaveProperty('iouReportID');

            // Then one of them should be an IOU report with relevant properties
            iouReport = Object.values(allReports ?? {}).find((report) => report?.type === CONST.REPORT.TYPE.IOU);
            expect(iouReport).toBeTruthy();
            expect(iouReport).toHaveProperty('reportID');
            expect(iouReport).toHaveProperty('chatReportID');

            // Then their IDs should reference each other
            expect(chatReport?.iouReportID).toBe(iouReport?.reportID);
            expect(iouReport?.chatReportID).toBe(chatReport?.reportID);

            // Storing IOU Report ID for further reference
            IOU_REPORT_ID = chatReport?.iouReportID;

            await waitForBatchedUpdates();

            // When fetching all report actions from Onyx
            const allReportActions = await new Promise<OnyxCollection<ReportActions>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.REPORT_ACTIONS,
                    waitForCollectionCallback: true,
                    callback: (actions) => {
                        Onyx.disconnect(connection);
                        resolve(actions);
                    },
                });
            });

            // Then we should find an IOU action with specific properties
            const reportActionsForIOUReport = allReportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${chatReport?.iouReportID}`];
            createIOUAction = Object.values(reportActionsForIOUReport ?? {}).find((reportAction): reportAction is ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU> =>
                isMoneyRequestAction(reportAction),
            );
            expect(createIOUAction).toBeTruthy();
            expect(createIOUAction && getOriginalMessage(createIOUAction)?.IOUReportID).toBe(iouReport?.reportID);

            // When fetching all transactions from Onyx
            const allTransactions = await new Promise<OnyxCollection<Transaction>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.TRANSACTION,
                    waitForCollectionCallback: true,
                    callback: (transactions) => {
                        Onyx.disconnect(connection);
                        resolve(transactions);
                    },
                });
            });

            // Then we should find a specific transaction with relevant properties
            transaction = Object.values(allTransactions ?? {}).find((t) => t);
            expect(transaction).toBeTruthy();
            expect(transaction?.amount).toBe(amount);
            expect(transaction?.reportID).toBe(iouReport?.reportID);
            expect(createIOUAction && getOriginalMessage(createIOUAction)?.IOUTransactionID).toBe(transaction?.transactionID);
        });

        afterEach(PusherHelper.teardown);

        it('delete an expense (IOU Action and transaction) successfully', async () => {
            // Given the fetch operations are paused and an expense is initiated
            mockFetch?.pause?.();

            if (transaction && createIOUAction) {
                // When the expense is deleted
                deleteMoneyRequest(transaction?.transactionID, createIOUAction, {}, {}, true);
            }
            await waitForBatchedUpdates();

            // Then we check if the IOU report action is removed from the report actions collection
            let reportActionsForReport = await new Promise<OnyxCollection<ReportAction>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport?.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (actionsForReport) => {
                        Onyx.disconnect(connection);
                        resolve(actionsForReport);
                    },
                });
            });

            createIOUAction = Object.values(reportActionsForReport ?? {}).find((reportAction): reportAction is ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU> =>
                isMoneyRequestAction(reportAction),
            );
            // Then the IOU Action should be truthy for offline support.
            expect(createIOUAction).toBeTruthy();

            // Then we check if the transaction is removed from the transactions collection
            const t = await new Promise<OnyxEntry<Transaction>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.TRANSACTION}${transaction?.transactionID}`,
                    waitForCollectionCallback: false,
                    callback: (transactionResult) => {
                        Onyx.disconnect(connection);
                        resolve(transactionResult);
                    },
                });
            });

            expect(t).toBeTruthy();
            expect(t?.pendingAction).toBe(CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE);

            // Given fetch operations are resumed
            mockFetch?.resume?.();
            await waitForBatchedUpdates();

            // Then we recheck the IOU report action from the report actions collection
            reportActionsForReport = await new Promise<OnyxCollection<ReportAction>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport?.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (actionsForReport) => {
                        Onyx.disconnect(connection);
                        resolve(actionsForReport);
                    },
                });
            });

            createIOUAction = Object.values(reportActionsForReport ?? {}).find((reportAction): reportAction is ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU> =>
                isMoneyRequestAction(reportAction),
            );
            expect(createIOUAction).toBeFalsy();

            // Then we recheck the transaction from the transactions collection
            const tr = await new Promise<OnyxEntry<Transaction>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.TRANSACTION}${transaction?.transactionID}`,
                    waitForCollectionCallback: false,
                    callback: (transactionResult) => {
                        Onyx.disconnect(connection);
                        resolve(transactionResult);
                    },
                });
            });

            expect(tr).toBeFalsy();
        });

        it('delete the IOU report when there are no expenses left in the IOU report', async () => {
            // Given an IOU report and a paused fetch state
            mockFetch?.pause?.();

            if (transaction && createIOUAction) {
                // When the IOU expense is deleted
                deleteMoneyRequest(transaction?.transactionID, createIOUAction, {}, {}, true);
            }
            await waitForBatchedUpdates();

            let report = await new Promise<OnyxEntry<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${iouReport?.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (res) => {
                        Onyx.disconnect(connection);
                        resolve(res);
                    },
                });
            });

            // Then the report should be truthy for offline support
            expect(report).toBeTruthy();

            // Given the resumed fetch state
            mockFetch?.resume?.();
            await waitForBatchedUpdates();

            report = await new Promise<OnyxEntry<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${iouReport?.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (res) => {
                        Onyx.disconnect(connection);
                        resolve(res);
                    },
                });
            });

            // Then the report should be falsy so that there is no trace of the expense.
            expect(report).toBeFalsy();
        });

        it('does not delete the IOU report when there are expenses left in the IOU report', async () => {
            // Given multiple expenses on an IOU report
            requestMoney({
                report: chatReport,
                participantParams: {
                    payeeEmail: TEST_USER_LOGIN,
                    payeeAccountID: TEST_USER_ACCOUNT_ID,
                    participant: {login: RORY_EMAIL, accountID: RORY_ACCOUNT_ID},
                },
                transactionParams: {
                    amount,
                    attendees: [],
                    currency: CONST.CURRENCY.USD,
                    created: '',
                    merchant: '',
                    comment,
                },
                shouldGenerateTransactionThreadReport: true,
            });

            await waitForBatchedUpdates();

            // When we attempt to delete an expense from the IOU report
            mockFetch?.pause?.();
            if (transaction && createIOUAction) {
                deleteMoneyRequest(transaction?.transactionID, createIOUAction, {}, {});
            }
            await waitForBatchedUpdates();

            // Then expect that the IOU report still exists
            let allReports = await new Promise<OnyxCollection<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.REPORT,
                    waitForCollectionCallback: true,
                    callback: (reports) => {
                        Onyx.disconnect(connection);
                        resolve(reports);
                    },
                });
            });

            await waitForBatchedUpdates();

            iouReport = Object.values(allReports ?? {}).find((report) => isIOUReport(report));
            expect(iouReport).toBeTruthy();
            expect(iouReport).toHaveProperty('reportID');
            expect(iouReport).toHaveProperty('chatReportID');

            // Given the resumed fetch state
            await mockFetch?.resume?.();

            allReports = await new Promise<OnyxCollection<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.REPORT,
                    waitForCollectionCallback: true,
                    callback: (reports) => {
                        Onyx.disconnect(connection);
                        resolve(reports);
                    },
                });
            });
            // Then expect that the IOU report still exists
            iouReport = Object.values(allReports ?? {}).find((report) => isIOUReport(report));
            expect(iouReport).toBeTruthy();
            expect(iouReport).toHaveProperty('reportID');
            expect(iouReport).toHaveProperty('chatReportID');
        });

        it('delete the transaction thread if there are no visible comments in the thread', async () => {
            // Given all promises are resolved
            await waitForBatchedUpdates();
            jest.advanceTimersByTime(10);

            // Given a transaction thread
            thread = buildTransactionThread(createIOUAction, iouReport);

            expect(thread.participants).toStrictEqual({[CARLOS_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN, role: CONST.REPORT.ROLE.ADMIN}});

            Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${thread.reportID}`,
                callback: (val) => (reportActions = val),
            });

            await waitForBatchedUpdates();

            jest.advanceTimersByTime(10);

            // Given User logins from the participant accounts
            const participantAccountIDs = Object.keys(thread.participants ?? {}).map(Number);
            const userLogins = getLoginsByAccountIDs(participantAccountIDs);

            // When Opening a thread report with the given details
            openReport(thread.reportID, '', userLogins, thread, createIOUAction?.reportActionID);
            await waitForBatchedUpdates();

            // Then The iou action has the transaction report id as a child report ID
            const allReportActions = await new Promise<OnyxCollection<ReportActions>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.REPORT_ACTIONS,
                    waitForCollectionCallback: true,
                    callback: (actions) => {
                        Onyx.disconnect(connection);
                        resolve(actions);
                    },
                });
            });
            const reportActionsForIOUReport = allReportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${chatReport?.iouReportID}`];
            createIOUAction = Object.values(reportActionsForIOUReport ?? {}).find((reportAction): reportAction is ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU> =>
                isMoneyRequestAction(reportAction),
            );
            expect(createIOUAction?.childReportID).toBe(thread.reportID);

            await waitForBatchedUpdates();

            // Given Fetch is paused and timers have advanced
            mockFetch?.pause?.();
            jest.advanceTimersByTime(10);

            if (transaction && createIOUAction) {
                // When Deleting an expense
                deleteMoneyRequest(transaction?.transactionID, createIOUAction, {}, {});
            }
            await waitForBatchedUpdates();

            // Then The report for the given thread ID does not exist
            let report = await new Promise<OnyxEntry<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${thread.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (reportData) => {
                        Onyx.disconnect(connection);
                        resolve(reportData);
                    },
                });
            });

            expect(report?.reportID).toBeFalsy();
            mockFetch?.resume?.();

            // Then After resuming fetch, the report for the given thread ID still does not exist
            report = await new Promise<OnyxEntry<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${thread.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (reportData) => {
                        Onyx.disconnect(connection);
                        resolve(reportData);
                    },
                });
            });

            expect(report?.reportID).toBeFalsy();
        });

        it('delete the transaction thread if there are only changelogs (i.e. MODIFIED_EXPENSE actions) in the thread', async () => {
            // Given all promises are resolved
            await waitForBatchedUpdates();
            jest.advanceTimersByTime(10);

            // Given a transaction thread
            thread = buildTransactionThread(createIOUAction, iouReport);

            Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${thread.reportID}`,
                callback: (val) => (reportActions = val),
            });

            await waitForBatchedUpdates();

            jest.advanceTimersByTime(10);

            // Given User logins from the participant accounts
            const participantAccountIDs = Object.keys(thread.participants ?? {}).map(Number);
            const userLogins = getLoginsByAccountIDs(participantAccountIDs);

            // When Opening a thread report with the given details
            openReport(thread.reportID, '', userLogins, thread, createIOUAction?.reportActionID);
            await waitForBatchedUpdates();

            // Then The iou action has the transaction report id as a child report ID
            const allReportActions = await new Promise<OnyxCollection<ReportActions>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.REPORT_ACTIONS,
                    waitForCollectionCallback: true,
                    callback: (actions) => {
                        Onyx.disconnect(connection);
                        resolve(actions);
                    },
                });
            });
            const reportActionsForIOUReport = allReportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${chatReport?.iouReportID}`];
            createIOUAction = Object.values(reportActionsForIOUReport ?? {}).find((reportAction): reportAction is ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU> =>
                isMoneyRequestAction(reportAction),
            );

            expect(createIOUAction?.childReportID).toBe(thread.reportID);

            await waitForBatchedUpdates();

            jest.advanceTimersByTime(10);
            if (transaction && createIOUAction) {
                updateMoneyRequestAmountAndCurrency({
                    transactionID: transaction.transactionID,
                    transactions: {},
                    transactionThreadReportID: thread.reportID,
                    transactionViolations: {},
                    amount: 20000,
                    currency: CONST.CURRENCY.USD,
                    taxAmount: 0,
                    taxCode: '',
                    policy: {
                        id: '123',
                        role: 'user',
                        type: CONST.POLICY.TYPE.TEAM,
                        name: '',
                        owner: '',
                        outputCurrency: '',
                        isPolicyExpenseChatEnabled: false,
                    },
                    policyTagList: {},
                    policyCategories: {},
                });
            }
            await waitForBatchedUpdates();

            // Verify there are two actions (created + changelog)
            expect(Object.values(reportActions ?? {}).length).toBe(2);

            // Fetch the updated IOU Action from Onyx
            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport?.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (reportActionsForReport) => {
                        Onyx.disconnect(connection);
                        createIOUAction = Object.values(reportActionsForReport ?? {}).find((reportAction): reportAction is ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU> =>
                            isMoneyRequestAction(reportAction),
                        );
                        resolve();
                    },
                });
            });

            if (transaction && createIOUAction) {
                // When Deleting an expense
                deleteMoneyRequest(transaction?.transactionID, createIOUAction, {}, {});
            }
            await waitForBatchedUpdates();

            // Then, the report for the given thread ID does not exist
            const report = await new Promise<OnyxEntry<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${thread.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (reportData) => {
                        Onyx.disconnect(connection);
                        resolve(reportData);
                    },
                });
            });

            expect(report?.reportID).toBeFalsy();
        });

        it('does not delete the transaction thread if there are visible comments in the thread', async () => {
            // Given initial environment is set up
            await waitForBatchedUpdates();

            // Given a transaction thread
            thread = buildTransactionThread(createIOUAction, iouReport);

            expect(thread.participants).toEqual({[CARLOS_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN, role: CONST.REPORT.ROLE.ADMIN}});

            const participantAccountIDs = Object.keys(thread.participants ?? {}).map(Number);
            const userLogins = getLoginsByAccountIDs(participantAccountIDs);
            jest.advanceTimersByTime(10);
            openReport(thread.reportID, '', userLogins, thread, createIOUAction?.reportActionID);
            await waitForBatchedUpdates();

            Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${thread.reportID}`,
                callback: (val) => (reportActions = val),
            });
            await waitForBatchedUpdates();

            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${thread.reportID}`,
                    callback: (report) => {
                        Onyx.disconnect(connection);
                        expect(report).toBeTruthy();
                        resolve();
                    },
                });
            });

            jest.advanceTimersByTime(10);

            // When a comment is added
            addComment(thread.reportID, 'Testing a comment', CONST.DEFAULT_TIME_ZONE);
            await waitForBatchedUpdates();

            // Then comment details should match the expected report action
            const resultAction = Object.values(reportActions ?? {}).find((reportAction) => reportAction?.actionName === CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT);
            reportActionID = resultAction?.reportActionID;
            expect(resultAction?.message).toEqual(REPORT_ACTION.message);
            expect(resultAction?.person).toEqual(REPORT_ACTION.person);

            await waitForBatchedUpdates();

            // Then the report should have 2 actions
            expect(Object.values(reportActions ?? {}).length).toBe(2);
            const resultActionAfter = reportActionID ? reportActions?.[reportActionID] : undefined;
            expect(resultActionAfter?.pendingAction).toBeUndefined();

            mockFetch?.pause?.();

            if (transaction && createIOUAction) {
                // When deleting expense
                deleteMoneyRequest(transaction?.transactionID, createIOUAction, {}, {});
            }
            await waitForBatchedUpdates();

            // Then the transaction thread report should still exist
            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${thread.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (report) => {
                        Onyx.disconnect(connection);
                        expect(report).toBeTruthy();
                        resolve();
                    },
                });
            });

            // When fetch resumes
            // Then the transaction thread report should still exist
            mockFetch?.resume?.();
            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT}${thread.reportID}`,
                    callback: (report) => {
                        Onyx.disconnect(connection);
                        expect(report).toBeTruthy();
                        resolve();
                    },
                });
            });
        });

        it('update the moneyRequestPreview to show [Deleted expense] when appropriate', async () => {
            await waitForBatchedUpdates();

            // Given a thread report

            jest.advanceTimersByTime(10);
            thread = buildTransactionThread(createIOUAction, iouReport);

            expect(thread.participants).toStrictEqual({[CARLOS_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN, role: CONST.REPORT.ROLE.ADMIN}});

            Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${thread.reportID}`,
                callback: (val) => (reportActions = val),
            });
            await waitForBatchedUpdates();

            jest.advanceTimersByTime(10);
            const participantAccountIDs = Object.keys(thread.participants ?? {}).map(Number);
            const userLogins = getLoginsByAccountIDs(participantAccountIDs);
            openReport(thread.reportID, '', userLogins, thread, createIOUAction?.reportActionID);

            await waitForBatchedUpdates();

            const allReportActions = await new Promise<OnyxCollection<ReportActions>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.REPORT_ACTIONS,
                    waitForCollectionCallback: true,
                    callback: (actions) => {
                        Onyx.disconnect(connection);
                        resolve(actions);
                    },
                });
            });

            const reportActionsForIOUReport = allReportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${chatReport?.iouReportID}`];
            createIOUAction = Object.values(reportActionsForIOUReport ?? {}).find((reportAction): reportAction is ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU> =>
                isMoneyRequestAction(reportAction),
            );
            expect(createIOUAction?.childReportID).toBe(thread.reportID);

            await waitForBatchedUpdates();

            // Given an added comment to the thread report

            jest.advanceTimersByTime(10);

            addComment(thread.reportID, 'Testing a comment', CONST.DEFAULT_TIME_ZONE);
            await waitForBatchedUpdates();

            // Fetch the updated IOU Action from Onyx due to addition of comment to transaction thread.
            // This needs to be fetched as `deleteMoneyRequest` depends on `childVisibleActionCount` in `createIOUAction`.
            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport?.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (reportActionsForReport) => {
                        Onyx.disconnect(connection);
                        createIOUAction = Object.values(reportActionsForReport ?? {}).find((reportAction): reportAction is ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU> =>
                            isMoneyRequestAction(reportAction),
                        );
                        resolve();
                    },
                });
            });

            let resultAction = Object.values(reportActions ?? {}).find((reportAction) => reportAction?.actionName === CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT);
            reportActionID = resultAction?.reportActionID;

            expect(resultAction?.message).toEqual(REPORT_ACTION.message);
            expect(resultAction?.person).toEqual(REPORT_ACTION.person);
            expect(resultAction?.pendingAction).toBeUndefined();

            await waitForBatchedUpdates();

            // Verify there are three actions (created + addcomment) and our optimistic comment has been removed
            expect(Object.values(reportActions ?? {}).length).toBe(2);

            let resultActionAfterUpdate = reportActionID ? reportActions?.[reportActionID] : undefined;

            // Verify that our action is no longer in the loading state
            expect(resultActionAfterUpdate?.pendingAction).toBeUndefined();

            await waitForBatchedUpdates();

            // Given an added comment to the IOU report

            Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${IOU_REPORT_ID}`,
                callback: (val) => (reportActions = val),
            });
            await waitForBatchedUpdates();

            jest.advanceTimersByTime(10);

            if (IOU_REPORT_ID) {
                addComment(IOU_REPORT_ID, 'Testing a comment', CONST.DEFAULT_TIME_ZONE);
            }
            await waitForBatchedUpdates();

            resultAction = Object.values(reportActions ?? {}).find((reportAction) => reportAction?.actionName === CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT);
            reportActionID = resultAction?.reportActionID;

            expect(resultAction?.message).toEqual(REPORT_ACTION.message);
            expect(resultAction?.person).toEqual(REPORT_ACTION.person);
            expect(resultAction?.pendingAction).toBeUndefined();

            await waitForBatchedUpdates();

            // Verify there are three actions (created + iou + addcomment) and our optimistic comment has been removed
            expect(Object.values(reportActions ?? {}).length).toBe(3);

            resultActionAfterUpdate = reportActionID ? reportActions?.[reportActionID] : undefined;

            // Verify that our action is no longer in the loading state
            expect(resultActionAfterUpdate?.pendingAction).toBeUndefined();

            mockFetch?.pause?.();
            if (transaction && createIOUAction) {
                // When we delete the expense
                deleteMoneyRequest(transaction.transactionID, createIOUAction, {}, {});
            }
            await waitForBatchedUpdates();

            // Then we expect the moneyRequestPreview to show [Deleted expense]

            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport?.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (reportActionsForReport) => {
                        Onyx.disconnect(connection);
                        createIOUAction = Object.values(reportActionsForReport ?? {}).find((reportAction): reportAction is ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU> =>
                            isMoneyRequestAction(reportAction),
                        );
                        expect(getReportActionMessage(createIOUAction)?.isDeletedParentAction).toBeTruthy();
                        resolve();
                    },
                });
            });

            // When we resume fetch
            mockFetch?.resume?.();

            // Then we expect the moneyRequestPreview to show [Deleted expense]

            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport?.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (reportActionsForReport) => {
                        Onyx.disconnect(connection);
                        createIOUAction = Object.values(reportActionsForReport ?? {}).find((reportAction): reportAction is ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU> =>
                            isMoneyRequestAction(reportAction),
                        );
                        expect(getReportActionMessage(createIOUAction)?.isDeletedParentAction).toBeTruthy();
                        resolve();
                    },
                });
            });
        });

        it('update IOU report and reportPreview with new totals and messages if the IOU report is not deleted', async () => {
            await waitForBatchedUpdates();
            Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.REPORT}${iouReport?.reportID}`,
                callback: (val) => (iouReport = val),
            });
            await waitForBatchedUpdates();

            // Given a second expense in addition to the first one

            jest.advanceTimersByTime(10);
            const amount2 = 20000;
            const comment2 = 'Send me money please 2';
            if (chatReport) {
                requestMoney({
                    report: chatReport,
                    participantParams: {
                        payeeEmail: TEST_USER_LOGIN,
                        payeeAccountID: TEST_USER_ACCOUNT_ID,
                        participant: {login: RORY_EMAIL, accountID: RORY_ACCOUNT_ID},
                    },
                    transactionParams: {
                        amount: amount2,
                        attendees: [],
                        currency: CONST.CURRENCY.USD,
                        created: '',
                        merchant: '',
                        comment: comment2,
                    },
                    shouldGenerateTransactionThreadReport: true,
                });
            }

            await waitForBatchedUpdates();

            // Then we expect the IOU report and reportPreview to update with new totals

            expect(iouReport).toBeTruthy();
            expect(iouReport).toHaveProperty('reportID');
            expect(iouReport).toHaveProperty('chatReportID');
            expect(iouReport?.total).toBe(30000);

            const iouPreview = chatReport?.reportID && iouReport?.reportID ? getReportPreviewAction(chatReport.reportID, iouReport.reportID) : undefined;
            expect(iouPreview).toBeTruthy();
            expect(getReportActionText(iouPreview)).toBe('rory@expensifail.com owes $300.00');

            // When we delete the first expense
            mockFetch?.pause?.();
            jest.advanceTimersByTime(10);
            if (transaction && createIOUAction) {
                deleteMoneyRequest(transaction.transactionID, createIOUAction, {}, {});
            }
            await waitForBatchedUpdates();

            // Then we expect the IOU report and reportPreview to update with new totals

            expect(iouReport).toBeTruthy();
            expect(iouReport).toHaveProperty('reportID');
            expect(iouReport).toHaveProperty('chatReportID');
            expect(iouReport?.total).toBe(20000);

            // When we resume
            mockFetch?.resume?.();

            // Then we expect the IOU report and reportPreview to update with new totals
            expect(iouReport).toBeTruthy();
            expect(iouReport).toHaveProperty('reportID');
            expect(iouReport).toHaveProperty('chatReportID');
            expect(iouReport?.total).toBe(20000);
        });

        it('navigate the user correctly to the iou Report when appropriate', async () => {
            // Given multiple expenses on an IOU report
            requestMoney({
                report: chatReport,
                participantParams: {
                    payeeEmail: TEST_USER_LOGIN,
                    payeeAccountID: TEST_USER_ACCOUNT_ID,
                    participant: {login: RORY_EMAIL, accountID: RORY_ACCOUNT_ID},
                },
                transactionParams: {
                    amount,
                    attendees: [],
                    currency: CONST.CURRENCY.USD,
                    created: '',
                    merchant: '',
                    comment,
                },
                shouldGenerateTransactionThreadReport: true,
            });
            await waitForBatchedUpdates();

            // Given a thread report
            jest.advanceTimersByTime(10);
            thread = buildTransactionThread(createIOUAction, iouReport);

            expect(thread.participants).toStrictEqual({[CARLOS_ACCOUNT_ID]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN, role: CONST.REPORT.ROLE.ADMIN}});

            jest.advanceTimersByTime(10);
            const participantAccountIDs = Object.keys(thread.participants ?? {}).map(Number);
            const userLogins = getLoginsByAccountIDs(participantAccountIDs);
            openReport(thread.reportID, '', userLogins, thread, createIOUAction?.reportActionID);
            await waitForBatchedUpdates();

            const allReportActions = await new Promise<OnyxCollection<ReportActions>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.REPORT_ACTIONS,
                    waitForCollectionCallback: true,
                    callback: (actions) => {
                        Onyx.disconnect(connection);
                        resolve(actions);
                    },
                });
            });

            const reportActionsForIOUReport = allReportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${chatReport?.iouReportID}`];
            createIOUAction = Object.values(reportActionsForIOUReport ?? {}).find((reportAction): reportAction is ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU> =>
                isMoneyRequestAction(reportAction),
            );
            expect(createIOUAction?.childReportID).toBe(thread.reportID);

            // When we delete the expense, we should not delete the IOU report
            mockFetch?.pause?.();

            let navigateToAfterDelete;
            if (transaction && createIOUAction) {
                navigateToAfterDelete = deleteMoneyRequest(transaction.transactionID, createIOUAction, {}, {}, true);
            }

            let allReports = await new Promise<OnyxCollection<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.REPORT,
                    waitForCollectionCallback: true,
                    callback: (reports) => {
                        Onyx.disconnect(connection);
                        resolve(reports);
                    },
                });
            });

            iouReport = Object.values(allReports ?? {}).find((report) => isIOUReport(report));
            expect(iouReport).toBeTruthy();
            expect(iouReport).toHaveProperty('reportID');
            expect(iouReport).toHaveProperty('chatReportID');

            await mockFetch?.resume?.();

            allReports = await new Promise<OnyxCollection<Report>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.REPORT,
                    waitForCollectionCallback: true,
                    callback: (reports) => {
                        Onyx.disconnect(connection);
                        resolve(reports);
                    },
                });
            });

            iouReport = Object.values(allReports ?? {}).find((report) => isIOUReport(report));
            expect(iouReport).toBeTruthy();
            expect(iouReport).toHaveProperty('reportID');
            expect(iouReport).toHaveProperty('chatReportID');

            // Then we expect to navigate to the iou report
            expect(IOU_REPORT_ID).not.toBeUndefined();
            if (IOU_REPORT_ID) {
                expect(navigateToAfterDelete).toEqual(ROUTES.REPORT_WITH_ID.getRoute(IOU_REPORT_ID));
            }
        });

        it('navigate the user correctly to the chat Report when appropriate', () => {
            let navigateToAfterDelete;
            if (transaction && createIOUAction) {
                // When we delete the expense and we should delete the IOU report
                navigateToAfterDelete = deleteMoneyRequest(transaction.transactionID, createIOUAction, {}, {});
            }
            // Then we expect to navigate to the chat report
            expect(chatReport?.reportID).not.toBeUndefined();

            if (chatReport?.reportID) {
                expect(navigateToAfterDelete).toEqual(ROUTES.REPORT_WITH_ID.getRoute(chatReport?.reportID));
            }
        });
    });

    describe('submitReport', () => {
        it('correctly submits a report', () => {
            const amount = 10000;
            const comment = '💸💸💸💸';
            const merchant = 'NASDAQ';
            let expenseReport: OnyxEntry<Report>;
            let chatReport: OnyxEntry<Report>;

    describe('resolveDuplicate', () => {
        test('Resolving duplicates of two transaction by keeping one of them should properly set the other one on hold even if the transaction thread reports do not exist in onyx', () => {
            // Given two duplicate transactions
            const iouReport = buildOptimisticIOUReport(1, 2, 100, '1', 'USD');
            const transaction1 = buildOptimisticTransaction({
                transactionParams: {
                    amount: 100,
                    currency: 'USD',
                    reportID: iouReport.reportID,
                },
            });
            const transaction2 = buildOptimisticTransaction({
                transactionParams: {
                    amount: 100,
                    currency: 'USD',
                    reportID: iouReport.reportID,
                },
            });
            const transactionCollectionDataSet: TransactionCollectionDataSet = {
                [`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction1.transactionID}`]: transaction1,
                [`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction2.transactionID}`]: transaction2,
            };
            const iouActions: ReportAction[] = [];
            [transaction1, transaction2].forEach((transaction) =>
                iouActions.push(
                    buildOptimisticIOUReportAction({
                        type: CONST.IOU.REPORT_ACTION_TYPE.CREATE,
                        amount: transaction.amount,
                        currency: transaction.currency,
                        comment: '',
                        participants: [],
                        transactionID: transaction.transactionID,
                    }),
                ),
            );
            const actions: OnyxInputValue<ReportActions> = {};
            iouActions.forEach((iouAction) => (actions[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouAction.reportActionID}`] = iouAction));
            const actionCollectionDataSet: ReportActionsCollectionDataSet = {[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport.reportID}`]: actions};
                });
        });
    });

    describe('putOnHold', () => {
        test("should update the transaction thread report's lastVisibleActionCreated to the optimistically added hold comment report action created timestamp", () => {
            const iouReport = buildOptimisticIOUReport(1, 2, 100, '1', 'USD');
            const transaction = buildOptimisticTransaction({
                transactionParams: {
                    amount: 100,
                    currency: 'USD',
                    reportID: iouReport.reportID,
                },
            });

            const transactionCollectionDataSet: TransactionCollectionDataSet = {
                [`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction.transactionID}`]: transaction,
            };
            const iouAction: ReportAction = buildOptimisticIOUReportAction({
                type: CONST.IOU.REPORT_ACTION_TYPE.CREATE,
                amount: transaction.amount,
                currency: transaction.currency,
                comment: '',
                participants: [],
                transactionID: transaction.transactionID,
            });
            const transactionThread = buildTransactionThread(iouAction, iouReport);

            const actions: OnyxInputValue<ReportActions> = {[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouAction.reportActionID}`]: iouAction};
            const reportCollectionDataSet: ReportCollectionDataSet = {
                [`${ONYXKEYS.COLLECTION.REPORT}${transactionThread.reportID}`]: transactionThread,
                [`${ONYXKEYS.COLLECTION.REPORT}${iouReport.reportID}`]: iouReport,
            };
            const actionCollectionDataSet: ReportActionsCollectionDataSet = {[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport.reportID}`]: actions};
            const comment = 'hold reason';
                });
        });

        test('should create transaction thread optimistically when initialReportID is undefined', () => {
            const iouReport = buildOptimisticIOUReport(1, 2, 100, '1', 'USD');
            const transaction = buildOptimisticTransaction({
                transactionParams: {
                    amount: 100,
                    currency: 'USD',
                    reportID: iouReport.reportID,
                },
            });
            const transactionCollectionDataSet: TransactionCollectionDataSet = {
                [`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction.transactionID}`]: transaction,
            };
            const iouAction: ReportAction = buildOptimisticIOUReportAction({
                type: CONST.IOU.REPORT_ACTION_TYPE.CREATE,
                amount: transaction.amount,
                currency: transaction.currency,
                comment: '',
                participants: [],
                transactionID: transaction.transactionID,
            });
            const actions: OnyxInputValue<ReportActions> = {[iouAction.reportActionID]: iouAction};
            const reportCollectionDataSet: ReportCollectionDataSet = {
                [`${ONYXKEYS.COLLECTION.REPORT}${iouReport.reportID}`]: iouReport,
            };
            const actionCollectionDataSet: ReportActionsCollectionDataSet = {
                [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport.reportID}`]: actions,
            };
            const comment = 'hold reason for new thread';
                });
        });
    });

    describe('unHoldRequest', () => {
        test("should update the transaction thread report's lastVisibleActionCreated to the optimistically added unhold report action created timestamp", () => {
            const iouReport = buildOptimisticIOUReport(1, 2, 100, '1', 'USD');
            const transaction = buildOptimisticTransaction({
                transactionParams: {
                    amount: 100,
                    currency: 'USD',
                    reportID: iouReport.reportID,
                },
            });

            const transactionCollectionDataSet: TransactionCollectionDataSet = {
                [`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction.transactionID}`]: transaction,
            };
            const iouAction: ReportAction = buildOptimisticIOUReportAction({
                type: CONST.IOU.REPORT_ACTION_TYPE.CREATE,
                amount: transaction.amount,
                currency: transaction.currency,
                comment: '',
                participants: [],
                transactionID: transaction.transactionID,
            });
            const transactionThread = buildTransactionThread(iouAction, iouReport);

            const actions: OnyxInputValue<ReportActions> = {[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouAction.reportActionID}`]: iouAction};
            const reportCollectionDataSet: ReportCollectionDataSet = {
                [`${ONYXKEYS.COLLECTION.REPORT}${transactionThread.reportID}`]: transactionThread,
                [`${ONYXKEYS.COLLECTION.REPORT}${iouReport.reportID}`]: iouReport,
            };
            const actionCollectionDataSet: ReportActionsCollectionDataSet = {[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport.reportID}`]: actions};
            const comment = 'hold reason';
                });
        });

        test('should rollback unhold request on API failure', () => {
            const iouReport = buildOptimisticIOUReport(1, 2, 100, '1', 'USD');
            const transaction = buildOptimisticTransaction({
                transactionParams: {
                    amount: 100,
                    currency: 'USD',
                    reportID: iouReport.reportID,
                },
            });

            const transactionCollectionDataSet: TransactionCollectionDataSet = {
                [`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction.transactionID}`]: transaction,
            };
            const iouAction: ReportAction = buildOptimisticIOUReportAction({
                type: CONST.IOU.REPORT_ACTION_TYPE.CREATE,
                amount: transaction.amount,
                currency: transaction.currency,
                comment: '',
                participants: [],
                transactionID: transaction.transactionID,
            });
            const transactionThread = buildTransactionThread(iouAction, iouReport);

            const actions: OnyxInputValue<ReportActions> = {[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouAction.reportActionID}`]: iouAction};
            const reportCollectionDataSet: ReportCollectionDataSet = {
                [`${ONYXKEYS.COLLECTION.REPORT}${transactionThread.reportID}`]: transactionThread,
                [`${ONYXKEYS.COLLECTION.REPORT}${iouReport.reportID}`]: iouReport,
            };
            const actionCollectionDataSet: ReportActionsCollectionDataSet = {[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport.reportID}`]: actions};
            const comment = 'hold reason';
                });
        });
    });

    describe('sendInvoice', () => {
        it('creates a new invoice chat when one has been converted from individual to business', async () => {
            // Mock API.write for this test
            const writeSpy = jest.spyOn(API, 'write').mockImplementation(jest.fn());

            // Given a convertedInvoiceReport is stored in Onyx
            const {policy, transaction, convertedInvoiceChat}: InvoiceTestData = InvoiceData;

            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${convertedInvoiceChat?.reportID}`, convertedInvoiceChat ?? {});

            // And data for when a new invoice is sent to a user
            const currentUserAccountID = 32;
            const companyName = 'b1-53019';
            const companyWebsite = 'https://www.53019.com';

            // When the user sends a new invoice to an individual
            sendInvoice(currentUserAccountID, transaction, undefined, undefined, policy, undefined, undefined, companyName, companyWebsite);

            // Then a new invoice chat is created instead of incorrectly using the invoice chat which has been converted from individual to business
            expect(writeSpy).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    invoiceRoomReportID: expect.not.stringMatching(convertedInvoiceChat.reportID) as string,
                }),
                expect.anything(),
            );
            writeSpy.mockRestore();
        });

        it('should not clear transaction pending action when send invoice fails', async () => {
            // Given a send invoice request
            mockFetch?.pause?.();
            sendInvoice(1, createRandomTransaction(1));

            // When the request fails
            mockFetch?.fail?.();
            mockFetch?.resume?.();
            await waitForBatchedUpdates();

            // Then the pending action of the optimistic transaction shouldn't be cleared
            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.TRANSACTION,
                    waitForCollectionCallback: true,
                    callback: (allTransactions) => {
                        Onyx.disconnect(connection);
                        const transaction = Object.values(allTransactions).at(0);
                        expect(transaction?.errors).not.toBeUndefined();
                        expect(transaction?.pendingAction).toBe(CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD);
                        resolve();
                    },
                });
            });
        });
    });

    describe('canIOUBePaid', () => {
        it('For invoices from archived workspaces', async () => {
            const {policy, convertedInvoiceChat: chatReport}: InvoiceTestData = InvoiceData;

            const chatReportRNVP: ReportNameValuePairs = {private_isArchived: DateUtils.getDBTime()};

            const invoiceReceiver = chatReport?.invoiceReceiver as {type: string; policyID: string; accountID: number};

            const iouReport = {...createRandomReport(1), type: CONST.REPORT.TYPE.INVOICE, statusNum: CONST.REPORT.STATUS_NUM.SUBMITTED};

            await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${invoiceReceiver.policyID}`, {id: invoiceReceiver.policyID, role: CONST.POLICY.ROLE.ADMIN});

            expect(canIOUBePaid(iouReport, chatReport, policy, [], true)).toBe(true);
            expect(canIOUBePaid(iouReport, chatReport, policy, [], false)).toBe(true);

            // When the invoice is archived
            expect(canIOUBePaid(iouReport, chatReport, policy, [], true, chatReportRNVP)).toBe(false);
            expect(canIOUBePaid(iouReport, chatReport, policy, [], false, chatReportRNVP)).toBe(false);
        });
    });

    describe('setMoneyRequestCategory', () => {
        it('should set the associated tax for the category based on the tax expense rules', async () => {
            // Given a policy with tax expense rules associated with category
            const transactionID = '1';
            const category = 'Advertising';
            const policyID = '2';
            const taxCode = 'id_TAX_EXEMPT';
            const ruleTaxCode = 'id_TAX_RATE_1';
            const fakePolicy: Policy = {
                ...createRandomPolicy(Number(policyID)),
                taxRates: CONST.DEFAULT_TAX,
                rules: {expenseRules: createCategoryTaxExpenseRules(category, ruleTaxCode)},
            };
            await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${transactionID}`, {
                taxCode,
                taxAmount: 0,
                amount: 100,
            });
            await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, fakePolicy);

            // When setting the money request category
            setMoneyRequestCategory(transactionID, category, policyID);

            await waitForBatchedUpdates();

            // Then the transaction tax rate and amount should be updated based on the expense rules
            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${transactionID}`,
                    callback: (transaction) => {
                        Onyx.disconnect(connection);
                        expect(transaction?.taxCode).toBe(ruleTaxCode);
                        expect(transaction?.taxAmount).toBe(5);
                        resolve();
                    },
                });
            });
        });

        describe('should not change the tax', () => {
            it('if the transaction type is distance', async () => {
                // Given a policy with tax expense rules associated with category and a distance transaction
                const transactionID = '1';
                const category = 'Advertising';
                const policyID = '2';
                const taxCode = 'id_TAX_EXEMPT';
                const ruleTaxCode = 'id_TAX_RATE_1';
                const taxAmount = 0;
                const fakePolicy: Policy = {
                    ...createRandomPolicy(Number(policyID)),
                    taxRates: CONST.DEFAULT_TAX,
                    rules: {expenseRules: createCategoryTaxExpenseRules(category, ruleTaxCode)},
                };
                await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${transactionID}`, {
                    taxCode,
                    taxAmount,
                    amount: 100,
                    iouRequestType: CONST.IOU.REQUEST_TYPE.DISTANCE,
                });
                await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, fakePolicy);

                // When setting the money request category
                setMoneyRequestCategory(transactionID, category, policyID);

                await waitForBatchedUpdates();

                // Then the transaction tax rate and amount shouldn't be updated
                await new Promise<void>((resolve) => {
                    const connection = Onyx.connect({
                        key: `${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${transactionID}`,
                        callback: (transaction) => {
                            Onyx.disconnect(connection);
                            expect(transaction?.taxCode).toBe(taxCode);
                            expect(transaction?.taxAmount).toBe(taxAmount);
                            resolve();
                        },
                    });
                });
            });

            it('if there are no tax expense rules', async () => {
                // Given a policy without tax expense rules
                const transactionID = '1';
                const category = 'Advertising';
                const policyID = '2';
                const taxCode = 'id_TAX_EXEMPT';
                const taxAmount = 0;
                const fakePolicy: Policy = {
                    ...createRandomPolicy(Number(policyID)),
                    taxRates: CONST.DEFAULT_TAX,
                    rules: {},
                };
                await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${transactionID}`, {
                    taxCode,
                    taxAmount,
                    amount: 100,
                });
                await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, fakePolicy);

                // When setting the money request category
                setMoneyRequestCategory(transactionID, category, policyID);

                await waitForBatchedUpdates();

                // Then the transaction tax rate and amount shouldn't be updated
                await new Promise<void>((resolve) => {
                    const connection = Onyx.connect({
                        key: `${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${transactionID}`,
                        callback: (transaction) => {
                            Onyx.disconnect(connection);
                            expect(transaction?.taxCode).toBe(taxCode);
                            expect(transaction?.taxAmount).toBe(taxAmount);
                            resolve();
                        },
                    });
                });
            });
        });

        it('should clear the tax when the policyID is empty', async () => {
            // Given a transaction with a tax
            const transactionID = '1';
            const taxCode = 'id_TAX_EXEMPT';
            const taxAmount = 0;
            await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${transactionID}`, {
                taxCode,
                taxAmount,
                amount: 100,
            });

            // When setting the money request category without a policyID
            setMoneyRequestCategory(transactionID, '');
            await waitForBatchedUpdates();

            // Then the transaction tax should be cleared
            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${transactionID}`,
                    callback: (transaction) => {
                        Onyx.disconnect(connection);
                        expect(transaction?.taxCode).toBe('');
                        expect(transaction?.taxAmount).toBeUndefined();
                        resolve();
                    },
                });
            });
        });
    });

    describe('updateMoneyRequestCategory', () => {
        it('should update the tax when there are tax expense rules', async () => {
            // Given a policy with tax expense rules associated with category
            const transactionID = '1';
            const policyID = '2';
            const transactionThreadReportID = '3';
            const category = 'Advertising';
            const taxCode = 'id_TAX_EXEMPT';
            const ruleTaxCode = 'id_TAX_RATE_1';
            const fakePolicy: Policy = {
                ...createRandomPolicy(Number(policyID)),
                taxRates: CONST.DEFAULT_TAX,
                rules: {expenseRules: createCategoryTaxExpenseRules(category, ruleTaxCode)},
            };
            await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`, {
                taxCode,
                taxAmount: 0,
                amount: 100,
            });
            await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, fakePolicy);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${transactionThreadReportID}`, {reportID: transactionThreadReportID});

            // When updating a money request category
            updateMoneyRequestCategory(transactionID, transactionThreadReportID, category, fakePolicy, undefined, undefined);

            await waitForBatchedUpdates();

            // Then the transaction tax rate and amount should be updated based on the expense rules
            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`,
                    callback: (transaction) => {
                        Onyx.disconnect(connection);
                        expect(transaction?.taxCode).toBe(ruleTaxCode);
                        expect(transaction?.taxAmount).toBe(5);
                        resolve();
                    },
                });
            });

            // But the original message should only contains the old and new category data
            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${transactionThreadReportID}`,
                    callback: (reportActions) => {
                        Onyx.disconnect(connection);
                        const reportAction = Object.values(reportActions ?? {}).at(0);
                        if (isActionOfType(reportAction, CONST.REPORT.ACTIONS.TYPE.MODIFIED_EXPENSE)) {
                            const originalMessage = getOriginalMessage(reportAction);
                            expect(originalMessage?.oldCategory).toBe('');
                            expect(originalMessage?.category).toBe(category);
                            expect(originalMessage?.oldTaxRate).toBeUndefined();
                            expect(originalMessage?.oldTaxAmount).toBeUndefined();
                            resolve();
                        }
                    },
                });
            });
        });

        describe('should not update the tax', () => {
            it('if the transaction type is distance', async () => {
                // Given a policy with tax expense rules associated with category and a distance transaction
                const transactionID = '1';
                const policyID = '2';
                const category = 'Advertising';
                const taxCode = 'id_TAX_EXEMPT';
                const taxAmount = 0;
                const ruleTaxCode = 'id_TAX_RATE_1';
                const fakePolicy: Policy = {
                    ...createRandomPolicy(Number(policyID)),
                    taxRates: CONST.DEFAULT_TAX,
                    rules: {expenseRules: createCategoryTaxExpenseRules(category, ruleTaxCode)},
                };
                await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`, {
                    taxCode,
                    taxAmount,
                    amount: 100,
                    comment: {
                        type: CONST.TRANSACTION.TYPE.CUSTOM_UNIT,
                        customUnit: {
                            name: CONST.CUSTOM_UNITS.NAME_DISTANCE,
                        },
                    },
                });
                await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, fakePolicy);

                // When updating a money request category
                updateMoneyRequestCategory(transactionID, '3', category, fakePolicy, undefined, undefined);

                await waitForBatchedUpdates();

                // Then the transaction tax rate and amount shouldn't be updated
                await new Promise<void>((resolve) => {
                    const connection = Onyx.connect({
                        key: `${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`,
                        callback: (transaction) => {
                            Onyx.disconnect(connection);
                            expect(transaction?.taxCode).toBe(taxCode);
                            expect(transaction?.taxAmount).toBe(taxAmount);
                            resolve();
                        },
                    });
                });
            });

            it('if there are no tax expense rules', async () => {
                // Given a policy without tax expense rules
                const transactionID = '1';
                const policyID = '2';
                const category = 'Advertising';
                const fakePolicy: Policy = {
                    ...createRandomPolicy(Number(policyID)),
                    taxRates: CONST.DEFAULT_TAX,
                    rules: {},
                };
                await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`, {amount: 100});
                await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, fakePolicy);

                // When updating the money request category
                updateMoneyRequestCategory(transactionID, '3', category, fakePolicy, undefined, undefined);

                await waitForBatchedUpdates();

                // Then the transaction tax rate and amount shouldn't be updated
                await new Promise<void>((resolve) => {
                    const connection = Onyx.connect({
                        key: `${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`,
                        callback: (transaction) => {
                            Onyx.disconnect(connection);
                            expect(transaction?.taxCode).toBeUndefined();
                            expect(transaction?.taxAmount).toBeUndefined();
                            resolve();
                        },
                    });
                });
            });
        });
    });

    describe('setDraftSplitTransaction', () => {
        it('should set the associated tax for the category based on the tax expense rules', async () => {
            // Given a policy with tax expense rules associated with category
            const transactionID = '1';
            const category = 'Advertising';
            const policyID = '2';
            const taxCode = 'id_TAX_EXEMPT';
            const ruleTaxCode = 'id_TAX_RATE_1';
            const fakePolicy: Policy = {
                ...createRandomPolicy(Number(policyID)),
                taxRates: CONST.DEFAULT_TAX,
                rules: {expenseRules: createCategoryTaxExpenseRules(category, ruleTaxCode)},
            };
            await Onyx.merge(`${ONYXKEYS.COLLECTION.SPLIT_TRANSACTION_DRAFT}${transactionID}`, {
                taxCode,
                taxAmount: 0,
                amount: 100,
            });
            await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, fakePolicy);

            // When setting a category of a draft split transaction
            setDraftSplitTransaction(transactionID, {category}, fakePolicy);

            await waitForBatchedUpdates();

            // Then the transaction tax rate and amount should be updated based on the expense rules
            await new Promise<void>((resolve) => {
                const connection = Onyx.connect({
                    key: `${ONYXKEYS.COLLECTION.SPLIT_TRANSACTION_DRAFT}${transactionID}`,
                    callback: (transaction) => {
                        Onyx.disconnect(connection);
                        expect(transaction?.taxCode).toBe(ruleTaxCode);
                        expect(transaction?.taxAmount).toBe(5);
                        resolve();
                    },
                });
            });
        });

        describe('should not change the tax', () => {
            it('if there are no tax expense rules', async () => {
                // Given a policy without tax expense rules
                const transactionID = '1';
                const category = 'Advertising';
                const policyID = '2';
                const taxCode = 'id_TAX_EXEMPT';
                const taxAmount = 0;
                const fakePolicy: Policy = {
                    ...createRandomPolicy(Number(policyID)),
                    taxRates: CONST.DEFAULT_TAX,
                    rules: {},
                };
                await Onyx.merge(`${ONYXKEYS.COLLECTION.SPLIT_TRANSACTION_DRAFT}${transactionID}`, {
                    taxCode,
                    taxAmount,
                    amount: 100,
                });
                await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, fakePolicy);

                // When setting a category of a draft split transaction
                setDraftSplitTransaction(transactionID, {category}, fakePolicy);

                await waitForBatchedUpdates();

                // Then the transaction tax rate and amount shouldn't be updated
                await new Promise<void>((resolve) => {
                    const connection = Onyx.connect({
                        key: `${ONYXKEYS.COLLECTION.SPLIT_TRANSACTION_DRAFT}${transactionID}`,
                        callback: (transaction) => {
                            Onyx.disconnect(connection);
                            expect(transaction?.taxCode).toBe(taxCode);
                            expect(transaction?.taxAmount).toBe(taxAmount);
                            resolve();
                        },
                    });
                });
            });

            it('if we are not updating category', async () => {
                // Given a policy with tax expense rules associated with category
                const transactionID = '1';
                const category = 'Advertising';
                const policyID = '2';
                const ruleTaxCode = 'id_TAX_RATE_1';
                const fakePolicy: Policy = {
                    ...createRandomPolicy(Number(policyID)),
                    taxRates: CONST.DEFAULT_TAX,
                    rules: {expenseRules: createCategoryTaxExpenseRules(category, ruleTaxCode)},
                };
                await Onyx.merge(`${ONYXKEYS.COLLECTION.SPLIT_TRANSACTION_DRAFT}${transactionID}`, {amount: 100});
                await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, fakePolicy);

                // When setting a draft split transaction without category update
                setDraftSplitTransaction(transactionID, {}, fakePolicy);

                await waitForBatchedUpdates();

                // Then the transaction tax rate and amount shouldn't be updated
                await new Promise<void>((resolve) => {
                    const connection = Onyx.connect({
                        key: `${ONYXKEYS.COLLECTION.SPLIT_TRANSACTION_DRAFT}${transactionID}`,
                        callback: (transaction) => {
                            Onyx.disconnect(connection);
                            expect(transaction?.taxCode).toBeUndefined();
                            expect(transaction?.taxAmount).toBeUndefined();
                            resolve();
                        },
                    });
                });
            });
        });
    });

    describe('should have valid parameters', () => {
        let writeSpy: jest.SpyInstance;
        const isValid = (value: unknown) => !value || typeof value !== 'object' || value instanceof Blob;

        beforeEach(() => {
            // eslint-disable-next-line rulesdir/no-multiple-api-calls
            writeSpy = jest.spyOn(API, 'write').mockImplementation(jest.fn());
        });

        afterEach(() => {
            writeSpy.mockRestore();
        });

        test.each([
            [WRITE_COMMANDS.REQUEST_MONEY, CONST.IOU.ACTION.CREATE],
            [WRITE_COMMANDS.CONVERT_TRACKED_EXPENSE_TO_REQUEST, CONST.IOU.ACTION.SUBMIT],
        ])('%s', async (expectedCommand: ApiCommand, action: IOUAction) => {
            // When an expense is created
            requestMoney({
                action,
                report: {reportID: ''},
                participantParams: {
                    payeeEmail: RORY_EMAIL,
                    payeeAccountID: RORY_ACCOUNT_ID,
                    participant: {login: CARLOS_EMAIL, accountID: CARLOS_ACCOUNT_ID},
                },
                transactionParams: {
                    amount: 10000,
                    attendees: [],
                    currency: CONST.CURRENCY.USD,
                    created: '',
                    merchant: 'KFC',
                    comment: '',
                    linkedTrackedExpenseReportAction: {
                        reportActionID: '',
                        actionName: CONST.REPORT.ACTIONS.TYPE.IOU,
                        created: '2024-10-30',
                    },
                    actionableWhisperReportActionID: '1',
                    linkedTrackedExpenseReportID: '1',
                },
                shouldGenerateTransactionThreadReport: true,
            });

            await waitForBatchedUpdates();

            // Then the correct API request should be made
            expect(writeSpy).toHaveBeenCalledTimes(1);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const [command, params] = writeSpy.mock.calls.at(0);
            expect(command).toBe(expectedCommand);

            // And the parameters should be supported by XMLHttpRequest
            Object.values(params as Record<string, unknown>).forEach((value) => {
                expect(Array.isArray(value) ? value.every(isValid) : isValid(value)).toBe(true);
            });
        });

        test.each([
            [WRITE_COMMANDS.TRACK_EXPENSE, CONST.IOU.ACTION.CREATE],
            [WRITE_COMMANDS.CATEGORIZE_TRACKED_EXPENSE, CONST.IOU.ACTION.CATEGORIZE],
            [WRITE_COMMANDS.SHARE_TRACKED_EXPENSE, CONST.IOU.ACTION.SHARE],
        ])('%s', async (expectedCommand: ApiCommand, action: IOUAction) => {
            // When a track expense is created
            trackExpense({
                report: {reportID: '123', policyID: 'A'},
                isDraftPolicy: false,
                action,
                participantParams: {
                    payeeEmail: RORY_EMAIL,
                    payeeAccountID: RORY_ACCOUNT_ID,
                    participant: {login: CARLOS_EMAIL, accountID: CARLOS_ACCOUNT_ID},
                },
                transactionParams: {
                    amount: 10000,
                    currency: CONST.CURRENCY.USD,
                    created: '2024-10-30',
                    merchant: 'KFC',
                    receipt: {},
                    actionableWhisperReportActionID: '1',
                    linkedTrackedExpenseReportAction: {
                        reportActionID: '',
                        actionName: CONST.REPORT.ACTIONS.TYPE.IOU,
                        created: '2024-10-30',
                    },
                    linkedTrackedExpenseReportID: '1',
                },
                accountantParams: action === CONST.IOU.ACTION.SHARE ? {accountant: {accountID: VIT_ACCOUNT_ID, login: VIT_EMAIL}} : undefined,
            });

            await waitForBatchedUpdates();

            // Then the correct API request should be made
            expect(writeSpy).toHaveBeenCalledTimes(1);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const [command, params] = writeSpy.mock.calls.at(0);
            expect(command).toBe(expectedCommand);

            if (expectedCommand === WRITE_COMMANDS.SHARE_TRACKED_EXPENSE) {
                expect(params).toHaveProperty('policyName');
            }

            // And the parameters should be supported by XMLHttpRequest
            Object.values(params as Record<string, unknown>).forEach((value) => {
                expect(Array.isArray(value) ? value.every(isValid) : isValid(value)).toBe(true);
            });
        });
    });

    describe('canApproveIOU', () => {
        it('should return false if we have only pending card transactions', async () => {
            const policyID = '2';
            const reportID = '1';
            const fakePolicy: Policy = {
                ...createRandomPolicy(Number(policyID)),
                type: CONST.POLICY.TYPE.TEAM,
                approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC,
            };
            const fakeReport: Report = {
                ...createRandomReport(Number(reportID)),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID,
            };
            const fakeTransaction1: Transaction = {
                ...createRandomTransaction(0),
                reportID,
                bank: CONST.EXPENSIFY_CARD.BANK,
                status: CONST.TRANSACTION.STATUS.PENDING,
            };
            const fakeTransaction2: Transaction = {
                ...createRandomTransaction(1),
                reportID,
                bank: CONST.EXPENSIFY_CARD.BANK,
                status: CONST.TRANSACTION.STATUS.PENDING,
            };

            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${fakeReport.reportID}`, fakeReport);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction1.transactionID}`, fakeTransaction1);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction2.transactionID}`, fakeTransaction2);

            await waitForBatchedUpdates();

            expect(canApproveIOU(fakeReport, fakePolicy)).toBeFalsy();
            // Then should return false when passing transactions directly as the third parameter instead of relying on Onyx data
            const {result} = renderHook(() => useReportWithTransactionsAndViolations(reportID), {wrapper: OnyxListItemProvider});
            await waitForBatchedUpdates();
            expect(canApproveIOU(result.current.at(0) as Report, fakePolicy, result.current.at(1) as Transaction[])).toBeFalsy();
        });
        it('should return false if we have only scan failure transactions', async () => {
            const policyID = '2';
            const reportID = '1';
            const fakePolicy: Policy = {
                ...createRandomPolicy(Number(policyID)),
                type: CONST.POLICY.TYPE.TEAM,
                approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC,
            };
            const fakeReport: Report = {
                ...createRandomReport(Number(reportID)),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID,
                stateNum: CONST.REPORT.STATE_NUM.SUBMITTED,
                statusNum: CONST.REPORT.STATUS_NUM.SUBMITTED,
                managerID: RORY_ACCOUNT_ID,
            };
            const fakeTransaction1: Transaction = {
                ...createRandomTransaction(0),
                reportID,
                amount: 0,
                modifiedAmount: 0,
                receipt: {
                    source: 'test',
                    state: CONST.IOU.RECEIPT_STATE.SCAN_FAILED,
                },
                merchant: CONST.TRANSACTION.PARTIAL_TRANSACTION_MERCHANT,
                modifiedMerchant: undefined,
            };
            const fakeTransaction2: Transaction = {
                ...createRandomTransaction(1),
                reportID,
                amount: 0,
                modifiedAmount: 0,
                receipt: {
                    source: 'test',
                    state: CONST.IOU.RECEIPT_STATE.SCAN_FAILED,
                },
                merchant: 'test merchant',
                modifiedMerchant: undefined,
            };

            await Onyx.set(ONYXKEYS.COLLECTION.REPORT, {
                [`${ONYXKEYS.COLLECTION.REPORT}${fakeReport.reportID}`]: fakeReport,
            });
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${fakeReport.reportID}`, fakeReport);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction1.transactionID}`, fakeTransaction1);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction2.transactionID}`, fakeTransaction2);

            await waitForBatchedUpdates();

            expect(canApproveIOU(fakeReport, fakePolicy)).toBeFalsy();
            // Then should return false when passing transactions directly as the third parameter instead of relying on Onyx data
            const {result} = renderHook(() => useReportWithTransactionsAndViolations(reportID), {wrapper: OnyxListItemProvider});
            await waitForBatchedUpdates();
            expect(canApproveIOU(result.current.at(0) as Report, fakePolicy, result.current.at(1) as Transaction[])).toBeFalsy();
        });
        it('should return false if all transactions are pending card or scan failure transaction', async () => {
            const policyID = '2';
            const reportID = '1';
            const fakePolicy: Policy = {
                ...createRandomPolicy(Number(policyID)),
                type: CONST.POLICY.TYPE.TEAM,
                approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC,
            };
            const fakeReport: Report = {
                ...createRandomReport(Number(reportID)),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID,
                stateNum: CONST.REPORT.STATE_NUM.SUBMITTED,
                statusNum: CONST.REPORT.STATUS_NUM.SUBMITTED,
                managerID: RORY_ACCOUNT_ID,
            };
            const fakeTransaction1: Transaction = {
                ...createRandomTransaction(0),
                reportID,
                bank: CONST.EXPENSIFY_CARD.BANK,
                status: CONST.TRANSACTION.STATUS.PENDING,
            };
            const fakeTransaction2: Transaction = {
                ...createRandomTransaction(1),
                reportID,
                amount: 0,
                modifiedAmount: 0,
                receipt: {
                    source: 'test',
                    state: CONST.IOU.RECEIPT_STATE.SCAN_FAILED,
                },
                merchant: 'test merchant',
                modifiedMerchant: undefined,
            };

            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${fakeReport.reportID}`, fakeReport);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction1.transactionID}`, fakeTransaction1);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction2.transactionID}`, fakeTransaction2);

            await waitForBatchedUpdates();

            expect(canApproveIOU(fakeReport, fakePolicy)).toBeFalsy();
            // Then should return false when passing transactions directly as the third parameter instead of relying on Onyx data
            const {result} = renderHook(() => useReportWithTransactionsAndViolations(reportID), {wrapper: OnyxListItemProvider});
            await waitForBatchedUpdates();
            expect(canApproveIOU(result.current.at(0) as Report, fakePolicy, result.current.at(1) as Transaction[])).toBeFalsy();
        });
        it('should return true if at least one transactions is not pending card or scan failure transaction', async () => {
            const policyID = '2';
            const reportID = '1';
            const fakePolicy: Policy = {
                ...createRandomPolicy(Number(policyID)),
                type: CONST.POLICY.TYPE.TEAM,
                approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC,
            };
            const fakeReport: Report = {
                ...createRandomReport(Number(reportID)),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID,
                stateNum: CONST.REPORT.STATE_NUM.SUBMITTED,
                statusNum: CONST.REPORT.STATUS_NUM.SUBMITTED,
                managerID: RORY_ACCOUNT_ID,
            };
            const fakeTransaction1: Transaction = {
                ...createRandomTransaction(0),
                reportID,
                bank: CONST.EXPENSIFY_CARD.BANK,
                status: CONST.TRANSACTION.STATUS.PENDING,
            };
            const fakeTransaction2: Transaction = {
                ...createRandomTransaction(1),
                reportID,
                amount: 0,
                receipt: {
                    source: 'test',
                    state: CONST.IOU.RECEIPT_STATE.SCAN_FAILED,
                },
                merchant: CONST.TRANSACTION.PARTIAL_TRANSACTION_MERCHANT,
                modifiedMerchant: undefined,
            };
            const fakeTransaction3: Transaction = {
                ...createRandomTransaction(2),
                reportID,
                amount: 100,
            };

            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${fakeReport.reportID}`, fakeReport);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction1.transactionID}`, fakeTransaction1);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction2.transactionID}`, fakeTransaction2);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction3.transactionID}`, fakeTransaction3);

            await waitForBatchedUpdates();

            expect(canApproveIOU(fakeReport, fakePolicy)).toBeTruthy();
            // Then should return true when passing transactions directly as the third parameter instead of relying on Onyx data
            const {result} = renderHook(() => useReportWithTransactionsAndViolations(reportID), {wrapper: OnyxListItemProvider});
            await waitForBatchedUpdates();
            expect(canApproveIOU(result.current.at(0) as Report, fakePolicy, result.current.at(1) as Transaction[])).toBeTruthy();
        });

        it('should return false if the report is closed', async () => {
            // Given a closed report, a policy, and a transaction
            const policyID = '2';
            const reportID = '1';
            const fakePolicy: Policy = {
                ...createRandomPolicy(Number(policyID)),
                type: CONST.POLICY.TYPE.TEAM,
                approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC,
            };
            const fakeReport: Report = {
                ...createRandomReport(Number(reportID)),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID,
                stateNum: CONST.REPORT.STATE_NUM.APPROVED,
                statusNum: CONST.REPORT.STATUS_NUM.CLOSED,
                managerID: RORY_ACCOUNT_ID,
            };
            const fakeTransaction: Transaction = {
                ...createRandomTransaction(1),
            };
            Onyx.multiSet({
                [ONYXKEYS.COLLECTION.REPORT]: fakeReport,
                [ONYXKEYS.COLLECTION.TRANSACTION]: fakeTransaction,
            });
            await waitForBatchedUpdates();
            // Then, canApproveIOU should return false since the report is closed
            expect(canApproveIOU(fakeReport, fakePolicy)).toBeFalsy();
            // Then should return false when passing transactions directly as the third parameter instead of relying on Onyx data
            expect(canApproveIOU(fakeReport, fakePolicy, [fakeTransaction])).toBeFalsy();
        });
    });

    describe('canUnapproveIOU', () => {
        it('should return false if the report is waiting for a bank account', () => {
            const fakeReport: Report = {
                ...createRandomReport(1),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID: 'A',
                stateNum: CONST.REPORT.STATE_NUM.APPROVED,
                statusNum: CONST.REPORT.STATUS_NUM.APPROVED,
                isWaitingOnBankAccount: true,
                managerID: RORY_ACCOUNT_ID,
            };
            expect(canUnapproveIOU(fakeReport, undefined)).toBeFalsy();
        });
    });

    describe('canCancelPayment', () => {
        it('should return true if the report is waiting for a bank account', () => {
            const fakeReport: Report = {
                ...createRandomReport(1),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID: 'A',
                stateNum: CONST.REPORT.STATE_NUM.APPROVED,
                statusNum: CONST.REPORT.STATUS_NUM.APPROVED,
                isWaitingOnBankAccount: true,
                managerID: RORY_ACCOUNT_ID,
            };
            expect(canCancelPayment(fakeReport, {accountID: RORY_ACCOUNT_ID})).toBeTruthy();
        });
    });

    describe('canIOUBePaid', () => {
        it('should return false if the report has negative total', () => {
            const policyChat = createRandomReport(1);
            const fakePolicy: Policy = {
                ...createRandomPolicy(Number('AA')),
                type: CONST.POLICY.TYPE.TEAM,
                approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC,
            };

            const fakeReport: Report = {
                ...createRandomReport(1),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID: 'AA',
                stateNum: CONST.REPORT.STATE_NUM.APPROVED,
                statusNum: CONST.REPORT.STATUS_NUM.APPROVED,
                managerID: RORY_ACCOUNT_ID,
                total: 100, // positive amount in the DB means negative amount in the UI
            };
            expect(canIOUBePaid(fakeReport, policyChat, fakePolicy)).toBeFalsy();
        });
    });

    describe('calculateDiffAmount', () => {
        it('should return 0 if iouReport is undefined', () => {
            const fakeTransaction: Transaction = {
                ...createRandomTransaction(1),
                reportID: '1',
                amount: 100,
                currency: 'USD',
            };

            expect(calculateDiffAmount(undefined, fakeTransaction, fakeTransaction)).toBe(0);
        });

        it('should return 0 when the currency and amount of the transactions are the same', () => {
            const fakeReport: Report = {
                ...createRandomReport(1),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID: '1',
                stateNum: CONST.REPORT.STATE_NUM.APPROVED,
                statusNum: CONST.REPORT.STATUS_NUM.APPROVED,
                managerID: RORY_ACCOUNT_ID,
            };
            const fakeTransaction: Transaction = {
                ...createRandomTransaction(1),
                reportID: fakeReport.reportID,
                amount: 100,
                currency: 'USD',
            };

            expect(calculateDiffAmount(fakeReport, fakeTransaction, fakeTransaction)).toBe(0);
        });

        it('should return the difference between the updated amount and the current amount when the currency of the updated and current transactions have the same currency', () => {
            const fakeReport: Report = {
                ...createRandomReport(1),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID: '1',
                stateNum: CONST.REPORT.STATE_NUM.APPROVED,
                statusNum: CONST.REPORT.STATUS_NUM.APPROVED,
                managerID: RORY_ACCOUNT_ID,
                currency: 'USD',
            };
            const fakeTransaction: Transaction = {
                ...createRandomTransaction(1),
                amount: 100,
                currency: 'USD',
            };
            const updatedTransaction = {
                ...fakeTransaction,
                amount: 200,
                currency: 'USD',
            };

            expect(calculateDiffAmount(fakeReport, updatedTransaction, fakeTransaction)).toBe(-100);
        });

        it('should return null when the currency of the updated and current transactions have different values', () => {
            const fakeReport: Report = {
                ...createRandomReport(1),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID: '1',
                stateNum: CONST.REPORT.STATE_NUM.APPROVED,
                statusNum: CONST.REPORT.STATUS_NUM.APPROVED,
                managerID: RORY_ACCOUNT_ID,
            };
            const fakeTransaction: Transaction = {
                ...createRandomTransaction(1),
                amount: 100,
                currency: 'USD',
            };
            const updatedTransaction = {
                ...fakeTransaction,
                amount: 200,
                currency: 'EUR',
            };

            expect(calculateDiffAmount(fakeReport, updatedTransaction, fakeTransaction)).toBeNull();
        });
    });

    describe('initMoneyRequest', () => {
        const fakeReport: Report = {
            ...createRandomReport(0),
            type: CONST.REPORT.TYPE.EXPENSE,
            policyID: '1',
            managerID: CARLOS_ACCOUNT_ID,
        };
        const fakePolicy: Policy = {
            ...createRandomPolicy(1),
            type: CONST.POLICY.TYPE.TEAM,
            outputCurrency: 'USD',
        };

        const fakeParentReport: Report = {
            ...createRandomReport(1),
            reportID: fakeReport.reportID,
            type: CONST.REPORT.TYPE.EXPENSE,
            policyID: '1',
            managerID: CARLOS_ACCOUNT_ID,
        };
        const fakePersonalPolicy: Policy = {
            ...createRandomPolicy(2),
            type: CONST.POLICY.TYPE.PERSONAL,
            outputCurrency: 'NZD',
        };
        const transactionResult: Transaction = {
            amount: 0,
            comment: {
                attendees: [
                    {
                        email: 'rory@expensifail.com',
                        login: 'rory@expensifail.com',
                        accountID: 3,
                        text: 'rory@expensifail.com',
                        selected: true,
                        reportID: '0',
                        avatarUrl: '',
                        displayName: '',
                    },
                ],
            },
            created: '2025-04-01',
            currency: 'USD',
            iouRequestType: 'manual',
            reportID: fakeReport.reportID,
            transactionID: CONST.IOU.OPTIMISTIC_TRANSACTION_ID,
            isFromGlobalCreate: true,
            merchant: '(none)',
            splitPayerAccountIDs: [3],
        };

        const currentDate = '2025-04-01';
        beforeEach(async () => {
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${CONST.IOU.OPTIMISTIC_TRANSACTION_ID}`, null);
            await Onyx.merge(`${ONYXKEYS.CURRENT_DATE}`, currentDate);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${fakeReport.reportID}`, fakeReport);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${fakePolicy.id}`, fakePolicy);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${fakePersonalPolicy.id}`, fakePersonalPolicy);

        it('should modify transaction draft when currentIouRequestType is different', async () => {
            await waitForBatchedUpdates()
                .then(() => {
                    return initMoneyRequest({
                        reportID: fakeReport.reportID,
                        policy: fakePolicy,
                        isFromGlobalCreate: true,
                        currentIouRequestType: CONST.IOU.REQUEST_TYPE.MANUAL,
                        newIouRequestType: CONST.IOU.REQUEST_TYPE.SCAN,
                        report: fakeReport,
                        parentReport: fakeParentReport,
                        currentDate,
                    });
                })
                .then(async () => {
                    expect(await getOnyxValue(`${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${CONST.IOU.OPTIMISTIC_TRANSACTION_ID}`)).toStrictEqual({
                        ...transactionResult,
                        iouRequestType: CONST.IOU.REQUEST_TYPE.SCAN,
                    });
                });
        });
        it('should return personal currency when policy is missing', async () => {
            await waitForBatchedUpdates()
                .then(() => {
                    return initMoneyRequest({
                        reportID: fakeReport.reportID,
                        isFromGlobalCreate: true,
                        newIouRequestType: CONST.IOU.REQUEST_TYPE.MANUAL,
                        report: fakeReport,
                        parentReport: fakeParentReport,
                        currentDate,
                    });
                })
                .then(async () => {
                    expect(await getOnyxValue(`${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${CONST.IOU.OPTIMISTIC_TRANSACTION_ID}`)).toStrictEqual({
                        ...transactionResult,
                        currency: fakePersonalPolicy.outputCurrency,
                    });
                });
        });
    });

    describe('updateMoneyRequestAmountAndCurrency', () => {
        it('update the amount of the money request successfully', async () => {
            const fakeReport: Report = {
                ...createRandomReport(1),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID: '1',
                stateNum: CONST.REPORT.STATE_NUM.APPROVED,
                statusNum: CONST.REPORT.STATUS_NUM.APPROVED,
                managerID: RORY_ACCOUNT_ID,
            };
            const fakeTransaction: Transaction = {
                ...createRandomTransaction(1),
                reportID: fakeReport.reportID,
                amount: 100,
                currency: 'USD',
            };

            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction.transactionID}`, fakeTransaction);

            mockFetch?.pause?.();

            updateMoneyRequestAmountAndCurrency({
                transactionID: fakeTransaction.transactionID,
                transactionThreadReportID: fakeReport.reportID,
                amount: 20000,
                currency: CONST.CURRENCY.USD,
                taxAmount: 0,
                taxCode: '',
                policy: {
                    id: '123',
                    role: 'user',
                    type: CONST.POLICY.TYPE.TEAM,
                    name: '',
                    owner: '',
                    outputCurrency: '',
                    isPolicyExpenseChatEnabled: false,
                },
                policyTagList: {},
                policyCategories: {},
                transactions: {},
                transactionViolations: {},
            });

            await waitForBatchedUpdates();
            mockFetch?.succeed?.();
            await mockFetch?.resume?.();

            const updatedTransaction = await new Promise<OnyxEntry<Transaction>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.TRANSACTION,
                    waitForCollectionCallback: true,
                    callback: (transactions) => {
                        Onyx.disconnect(connection);
                        const newTransaction = transactions[`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction.transactionID}`];
                        resolve(newTransaction);
                    },
                });
            });
            expect(updatedTransaction?.modifiedAmount).toBe(20000);
        });

        it('update the amount of the money request failed', async () => {
            const fakeReport: Report = {
                ...createRandomReport(1),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID: '1',
                stateNum: CONST.REPORT.STATE_NUM.APPROVED,
                statusNum: CONST.REPORT.STATUS_NUM.APPROVED,
                managerID: RORY_ACCOUNT_ID,
            };
            const fakeTransaction: Transaction = {
                ...createRandomTransaction(1),
                reportID: fakeReport.reportID,
                amount: 100,
                currency: 'USD',
            };

            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction.transactionID}`, fakeTransaction);

            mockFetch?.pause?.();

            updateMoneyRequestAmountAndCurrency({
                transactionID: fakeTransaction.transactionID,
                transactionThreadReportID: fakeReport.reportID,
                amount: 20000,
                currency: CONST.CURRENCY.USD,
                taxAmount: 0,
                taxCode: '',
                policy: {
                    id: '123',
                    role: 'user',
                    type: CONST.POLICY.TYPE.TEAM,
                    name: '',
                    owner: '',
                    outputCurrency: '',
                    isPolicyExpenseChatEnabled: false,
                },
                policyTagList: {},
                policyCategories: {},
                transactions: {},
                transactionViolations: {},
            });

            await waitForBatchedUpdates();
            mockFetch?.fail?.();
            await mockFetch?.resume?.();

            const updatedTransaction = await new Promise<OnyxEntry<Transaction>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.TRANSACTION,
                    waitForCollectionCallback: true,
                    callback: (transactions) => {
                        Onyx.disconnect(connection);
                        const newTransaction = transactions[`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction.transactionID}`];
                        resolve(newTransaction);
                    },
                });
            });
            expect(updatedTransaction?.modifiedAmount).toBe(0);
        });
    });

    describe('cancelPayment', () => {
        const amount = 10000;
        const comment = '💸💸💸💸';
        const merchant = 'NASDAQ';

        afterEach(() => {
            mockFetch?.resume?.();
        });

        it('pendingAction is not null after canceling the payment failed', async () => {
            let expenseReport: OnyxEntry<Report>;
            let chatReport: OnyxEntry<Report>;

            // Given a signed in account, which owns a workspace, and has a policy expense chat
            Onyx.set(ONYXKEYS.SESSION, {email: CARLOS_EMAIL, accountID: CARLOS_ACCOUNT_ID});
            // Which owns a workspace
            await waitForBatchedUpdates();
            createWorkspace({
                policyOwnerEmail: CARLOS_EMAIL,
                makeMeAdmin: true,
                policyName: "Carlos's Workspace",
            });
            await waitForBatchedUpdates();

            // Get the policy expense chat report
            await getOnyxData({
                key: ONYXKEYS.COLLECTION.REPORT,
                waitForCollectionCallback: true,
                callback: (allReports) => {
                    chatReport = Object.values(allReports ?? {}).find((report) => report?.chatType === CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT);
                },
            });

            if (chatReport) {
                // When an IOU expense is submitted to that policy expense chat
                requestMoney({
                    report: chatReport,
                    participantParams: {
                        payeeEmail: RORY_EMAIL,
                        payeeAccountID: RORY_ACCOUNT_ID,
                        participant: {login: CARLOS_EMAIL, accountID: CARLOS_ACCOUNT_ID},
                    },
                    transactionParams: {
                        amount,
                        attendees: [],
                        currency: CONST.CURRENCY.USD,
                        created: '',
                        merchant,
                        comment,
                    },
                    shouldGenerateTransactionThreadReport: true,
                });
            }
            await waitForBatchedUpdates();

            // And given an expense report has now been created which holds the IOU
            await getOnyxData({
                key: ONYXKEYS.COLLECTION.REPORT,
                waitForCollectionCallback: true,
                callback: (allReports) => {
                    expenseReport = Object.values(allReports ?? {}).find((report) => report?.type === CONST.REPORT.TYPE.IOU);
                },
            });

            if (chatReport && expenseReport) {
                mockFetch?.pause?.();
                // And when the payment is cancelled
                cancelPayment(expenseReport, chatReport);
            }
            await waitForBatchedUpdates();

            mockFetch?.fail?.();

            await mockFetch?.resume?.();

            await getOnyxData({
                key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${expenseReport?.reportID}`,
                callback: (allReportActions) => {
                    const action = Object.values(allReportActions ?? {}).find((a) => a?.actionName === CONST.REPORT.ACTIONS.TYPE.REIMBURSEMENT_DEQUEUED);
                    expect(action?.pendingAction).toBe(CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD);
                },
            });
        });
    });

    describe('payMoneyRequest', () => {
        const amount = 10000;
        const comment = '💸💸💸💸';
        const merchant = 'NASDAQ';

        afterEach(() => {
            mockFetch?.resume?.();
        });

        it('pendingAction is not null after paying the money request', async () => {
            let expenseReport: OnyxEntry<Report>;
            let chatReport: OnyxEntry<Report>;

            // Given a signed in account, which owns a workspace, and has a policy expense chat
            Onyx.set(ONYXKEYS.SESSION, {email: CARLOS_EMAIL, accountID: CARLOS_ACCOUNT_ID});
            // Which owns a workspace
            await waitForBatchedUpdates();
            createWorkspace({
                policyOwnerEmail: CARLOS_EMAIL,
                makeMeAdmin: true,
                policyName: "Carlos's Workspace",
            });
            await waitForBatchedUpdates();

            // Get the policy expense chat report
            await getOnyxData({
                key: ONYXKEYS.COLLECTION.REPORT,
                waitForCollectionCallback: true,
                callback: (allReports) => {
                    chatReport = Object.values(allReports ?? {}).find((report) => report?.chatType === CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT);
                },
            });

            if (chatReport) {
                // When an IOU expense is submitted to that policy expense chat
                requestMoney({
                    report: chatReport,
                    participantParams: {
                        payeeEmail: RORY_EMAIL,
                        payeeAccountID: RORY_ACCOUNT_ID,
                        participant: {login: CARLOS_EMAIL, accountID: CARLOS_ACCOUNT_ID},
                    },
                    transactionParams: {
                        amount,
                        attendees: [],
                        currency: CONST.CURRENCY.USD,
                        created: '',
                        merchant,
                        comment,
                    },
                    shouldGenerateTransactionThreadReport: true,
                });
            }
            await waitForBatchedUpdates();

            // And given an expense report has now been created which holds the IOU
            await getOnyxData({
                key: ONYXKEYS.COLLECTION.REPORT,
                waitForCollectionCallback: true,
                callback: (allReports) => {
                    expenseReport = Object.values(allReports ?? {}).find((report) => report?.type === CONST.REPORT.TYPE.IOU);
                },
            });

            // When the expense report is paid elsewhere (but really, any payment option would work)
            if (chatReport && expenseReport) {
                mockFetch?.pause?.();
                payMoneyRequest(CONST.IOU.PAYMENT_TYPE.ELSEWHERE, chatReport, expenseReport);
            }
            await waitForBatchedUpdates();

            mockFetch?.fail?.();

            await mockFetch?.resume?.();

            await getOnyxData({
                key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${expenseReport?.reportID}`,
                callback: (allReportActions) => {
                    const action = Object.values(allReportActions ?? {}).find((a) => {
                        const originalMessage = isMoneyRequestAction(a) ? getOriginalMessage(a) : undefined;
                        return originalMessage?.type === 'pay';
                    });
                    expect(action?.pendingAction).toBe(CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD);
                },
            });
        });
    });

    describe('initSplitExpense', () => {
        it('should initialize split expense with correct transaction details', async () => {
            const transaction: Transaction = {
                transactionID: '123',
                amount: 100,
                currency: 'USD',
                merchant: 'Test Merchant',
                comment: {
                    comment: 'Test comment',
                    splitExpenses: [],
                    attendees: [],
                    type: CONST.TRANSACTION.TYPE.CUSTOM_UNIT,
                },
                category: 'Food',
                tag: 'lunch',
                created: DateUtils.getDBTime(),
                reportID: '456',
            };

            initSplitExpense(transaction);
            await waitForBatchedUpdates();

            const draftTransaction = await getOnyxValue(`${ONYXKEYS.COLLECTION.SPLIT_TRANSACTION_DRAFT}${transaction.transactionID}`);

            expect(draftTransaction).toBeTruthy();

            const splitExpenses = draftTransaction?.comment?.splitExpenses;
            expect(splitExpenses).toHaveLength(2);
            expect(draftTransaction?.amount).toBe(100);
            expect(draftTransaction?.currency).toBe('USD');
            expect(draftTransaction?.merchant).toBe('Test Merchant');
            expect(draftTransaction?.reportID).toBe(transaction.reportID);

            expect(splitExpenses?.[0].amount).toBe(50);
            expect(splitExpenses?.[0].description).toBe('Test comment');
            expect(splitExpenses?.[0].category).toBe('Food');
            expect(splitExpenses?.[0].tags).toEqual(['lunch']);

            expect(splitExpenses?.[1].amount).toBe(50);
            expect(splitExpenses?.[1].description).toBe('Test comment');
            expect(splitExpenses?.[1].category).toBe('Food');
            expect(splitExpenses?.[1].tags).toEqual(['lunch']);
        });
        it('should not initialize split expense for null transaction', async () => {
            const transaction: Transaction | undefined = undefined;

            initSplitExpense(transaction);
            await waitForBatchedUpdates();

            expect(transaction).toBeFalsy();
        });
    });

    describe('addSplitExpenseField', () => {
        it('should add new split expense field to draft transaction', async () => {
            const transaction: Transaction = {
                transactionID: '123',
                amount: 100,
                currency: 'USD',
                merchant: 'Test Merchant',
                comment: {
                    comment: 'Test comment',
                    splitExpenses: [],
                    attendees: [],
                    type: CONST.TRANSACTION.TYPE.CUSTOM_UNIT,
                },
                category: 'Food',
                tag: 'lunch',
                created: DateUtils.getDBTime(),
                reportID: '456',
            };

            const draftTransaction: Transaction = {
                transactionID: '123',
                amount: 100,
                currency: 'USD',
                merchant: 'Test Merchant',
                comment: {
                    comment: 'Test comment',
                    splitExpenses: [
                        {
                            transactionID: '789',
                            amount: 50,
                            description: 'Test comment',
                            category: 'Food',
                            tags: ['lunch'],
                            created: DateUtils.getDBTime(),
                        },
                    ],
                    attendees: [],
                    type: CONST.TRANSACTION.TYPE.CUSTOM_UNIT,
                },
                category: 'Food',
                tag: 'lunch',
                created: DateUtils.getDBTime(),
                reportID: '456',
            };

            addSplitExpenseField(transaction, draftTransaction);
            await waitForBatchedUpdates();

            const updatedDraftTransaction = await getOnyxValue(`${ONYXKEYS.COLLECTION.SPLIT_TRANSACTION_DRAFT}${transaction.transactionID}`);
            expect(updatedDraftTransaction).toBeTruthy();

            const splitExpenses = updatedDraftTransaction?.comment?.splitExpenses;
            expect(splitExpenses).toHaveLength(2);
            expect(splitExpenses?.[1].amount).toBe(0);
            expect(splitExpenses?.[1].description).toBe('Test comment');
            expect(splitExpenses?.[1].category).toBe('Food');
            expect(splitExpenses?.[1].tags).toEqual(['lunch']);
        });
    });

    describe('updateSplitExpenseAmountField', () => {
        it('should update amount expense field to draft transaction', async () => {
            const originalTransactionID = '123';
            const currentTransactionID = '789';
            const draftTransaction: Transaction = {
                transactionID: '234',
                amount: 100,
                currency: 'USD',
                merchant: 'Test Merchant',
                comment: {
                    comment: 'Test comment',
                    originalTransactionID,
                    splitExpenses: [
                        {
                            transactionID: currentTransactionID,
                            amount: 50,
                            description: 'Test comment',
                            category: 'Food',
                            tags: ['lunch'],
                            created: DateUtils.getDBTime(),
                        },
                    ],
                    attendees: [],
                    type: CONST.TRANSACTION.TYPE.CUSTOM_UNIT,
                },
                category: 'Food',
                tag: 'lunch',
                created: DateUtils.getDBTime(),
                reportID: '456',
            };

            updateSplitExpenseAmountField(draftTransaction, currentTransactionID, 20);
            await waitForBatchedUpdates();

            const updatedDraftTransaction = await getOnyxValue(`${ONYXKEYS.COLLECTION.SPLIT_TRANSACTION_DRAFT}${originalTransactionID}`);
            expect(updatedDraftTransaction).toBeTruthy();

            const splitExpenses = updatedDraftTransaction?.comment?.splitExpenses;
            expect(splitExpenses?.[0].amount).toBe(20);
        });
    });

    describe('replaceReceipt', () => {
        it('should replace the receipt of the transaction', async () => {
            const transactionID = '123';
            const file = new File([new Blob(['test'])], 'test.jpg', {type: 'image/jpeg'});
            file.source = 'test';
            const source = 'test';

            const transaction = {
                transactionID,
                receipt: {
                    source: 'test1',
                },
            };

            // Given a transaction with a receipt
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`, transaction);
            await waitForBatchedUpdates();

            // Given a snapshot of the transaction
            await Onyx.set(`${ONYXKEYS.COLLECTION.SNAPSHOT}${unapprovedCashHash}`, {
                // @ts-expect-error: Allow partial record in snapshot update
                data: {
                    [`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`]: transaction,
                },
            });
            await waitForBatchedUpdates();

            // When the receipt is replaced
            replaceReceipt({transactionID, file, source});
            await waitForBatchedUpdates();

            // Then the transaction should have the new receipt source
            const updatedTransaction = await new Promise<OnyxEntry<Transaction>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.TRANSACTION,
                    waitForCollectionCallback: true,
                    callback: (transactions) => {
                        Onyx.disconnect(connection);
                        const newTransaction = transactions[`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`];
                        resolve(newTransaction);
                    },
                });
            });
            expect(updatedTransaction?.receipt?.source).toBe(source);

            // Then the snapshot should have the new receipt source
            const updatedSnapshot = await new Promise<OnyxEntry<SearchResults>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.SNAPSHOT,
                    waitForCollectionCallback: true,
                    callback: (snapshots) => {
                        Onyx.disconnect(connection);
                        const newSnapshot = snapshots[`${ONYXKEYS.COLLECTION.SNAPSHOT}${unapprovedCashHash}`];
                        resolve(newSnapshot);
                    },
                });
            });

            expect(updatedSnapshot?.data?.[`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`]?.receipt?.source).toBe(source);
        });

        it('should add receipt if it does not exist', async () => {
            const transactionID = '123';
            const file = new File([new Blob(['test'])], 'test.jpg', {type: 'image/jpeg'});
            file.source = 'test';
            const source = 'test';

            const transaction = {
                transactionID,
            };

            // Given a transaction without a receipt
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`, transaction);
            await waitForBatchedUpdates();

            // Given a snapshot of the transaction
            await Onyx.set(`${ONYXKEYS.COLLECTION.SNAPSHOT}${unapprovedCashHash}`, {
                // @ts-expect-error: Allow partial record in snapshot update
                data: {
                    [`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`]: transaction,
                },
            });
            await waitForBatchedUpdates();

            // When the receipt is replaced
            replaceReceipt({transactionID, file, source});
            await waitForBatchedUpdates();

            // Then the transaction should have the new receipt source
            const updatedTransaction = await new Promise<OnyxEntry<Transaction>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.TRANSACTION,
                    waitForCollectionCallback: true,
                    callback: (transactions) => {
                        Onyx.disconnect(connection);
                        const newTransaction = transactions[`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`];
                        resolve(newTransaction);
                    },
                });
            });
            expect(updatedTransaction?.receipt?.source).toBe(source);

            // Then the snapshot should have the new receipt source
            const updatedSnapshot = await new Promise<OnyxEntry<SearchResults>>((resolve) => {
                const connection = Onyx.connect({
                    key: ONYXKEYS.COLLECTION.SNAPSHOT,
                    waitForCollectionCallback: true,
                    callback: (snapshots) => {
                        Onyx.disconnect(connection);
                        const newSnapshot = snapshots[`${ONYXKEYS.COLLECTION.SNAPSHOT}${unapprovedCashHash}`];
                        resolve(newSnapshot);
                    },
                });
            });

            expect(updatedSnapshot?.data?.[`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`]?.receipt?.source).toBe(source);
        });
    });

    describe('changeTransactionsReport', () => {
        it('should set the correct optimistic onyx data for reporting a tracked expense', async () => {
            let personalDetailsList: OnyxEntry<PersonalDetailsList>;
            let expenseReport: OnyxEntry<Report>;
            let transaction: OnyxEntry<Transaction>;

            // Given a signed in account, which owns a workspace, and has a policy expense chat
            Onyx.set(ONYXKEYS.SESSION, {email: CARLOS_EMAIL, accountID: CARLOS_ACCOUNT_ID});
            const creatorPersonalDetails = personalDetailsList?.[CARLOS_ACCOUNT_ID] ?? {accountID: CARLOS_ACCOUNT_ID};

            const policyID = generatePolicyID();
            createWorkspace({
                policyOwnerEmail: CARLOS_EMAIL,
                makeMeAdmin: true,
                policyName: "Carlos's Workspace",
                policyID,
            });
            createNewReport(creatorPersonalDetails, policyID);
            // Create a tracked expense
            const selfDMReport: Report = {
                ...createRandomReport(1),
                reportID: '10',
                chatType: CONST.REPORT.CHAT_TYPE.SELF_DM,
            };

            const amount = 100;

            trackExpense({
                report: selfDMReport,
                isDraftPolicy: true,
                action: CONST.IOU.ACTION.CREATE,
                participantParams: {
                    payeeEmail: RORY_EMAIL,
                    payeeAccountID: RORY_ACCOUNT_ID,
                    participant: {accountID: RORY_ACCOUNT_ID},
                },
                transactionParams: {
                    amount,
                    currency: CONST.CURRENCY.USD,
                    created: format(new Date(), CONST.DATE.FNS_FORMAT_STRING),
                    merchant: 'merchant',
                    billable: false,
                },
            });
            await getOnyxData({
                key: ONYXKEYS.COLLECTION.TRANSACTION,
                waitForCollectionCallback: true,
                callback: (allTransactions) => {
                    transaction = Object.values(allTransactions ?? {}).find((t) => !!t);
                },
            });

            await getOnyxData({
                key: ONYXKEYS.COLLECTION.REPORT,
                waitForCollectionCallback: true,
                callback: (allReports) => {
                    expenseReport = Object.values(allReports ?? {}).find((r) => r?.type === CONST.REPORT.TYPE.EXPENSE);
                },
            });

            let iouReportActionOnSelfDMReport: OnyxEntry<ReportAction>;
            let trackExpenseActionableWhisper: OnyxEntry<ReportAction>;

            await getOnyxData({
                key: ONYXKEYS.COLLECTION.REPORT_ACTIONS,
                waitForCollectionCallback: true,
                callback: (allReportActions) => {
                    iouReportActionOnSelfDMReport = Object.values(allReportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReport.reportID}`] ?? {}).find(
                        (r) => r?.actionName === CONST.REPORT.ACTIONS.TYPE.IOU,
                    );
                    trackExpenseActionableWhisper = Object.values(allReportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReport?.reportID}`] ?? {}).find(
                        (r) => r?.actionName === CONST.REPORT.ACTIONS.TYPE.ACTIONABLE_TRACK_EXPENSE_WHISPER,
                    );
                },
            });

            expect(isMoneyRequestAction(iouReportActionOnSelfDMReport) ? getOriginalMessage(iouReportActionOnSelfDMReport)?.IOUTransactionID : undefined).toBe(transaction?.transactionID);
            expect(trackExpenseActionableWhisper).toBeDefined();

            if (!transaction || !expenseReport) {
                return;
            }

            changeTransactionsReport([transaction?.transactionID], expenseReport?.reportID, false, CARLOS_ACCOUNT_ID, CARLOS_EMAIL);

            let updatedTransaction: OnyxEntry<Transaction>;
            let updatedIOUReportActionOnSelfDMReport: OnyxEntry<ReportAction>;
            let updatedTrackExpenseActionableWhisper: OnyxEntry<ReportAction>;
            let updatedExpenseReport: OnyxEntry<Report>;

            await getOnyxData({
                key: ONYXKEYS.COLLECTION.TRANSACTION,
                waitForCollectionCallback: true,
                callback: (allTransactions) => {
                    updatedTransaction = Object.values(allTransactions ?? {}).find((t) => t?.transactionID === transaction?.transactionID);
                },
            });

            await getOnyxData({
                key: ONYXKEYS.COLLECTION.REPORT_ACTIONS,
                waitForCollectionCallback: true,
                callback: (allReportActions) => {
                    updatedIOUReportActionOnSelfDMReport = Object.values(allReportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReport.reportID}`] ?? {}).find(
                        (r) => r?.actionName === CONST.REPORT.ACTIONS.TYPE.IOU,
                    );
                    updatedTrackExpenseActionableWhisper = Object.values(allReportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${selfDMReport?.reportID}`] ?? {}).find(
                        (r) => r?.actionName === CONST.REPORT.ACTIONS.TYPE.ACTIONABLE_TRACK_EXPENSE_WHISPER,
                    );
                },
            });

            await getOnyxData({
                key: ONYXKEYS.COLLECTION.REPORT,
                waitForCollectionCallback: true,
                callback: (allReports) => {
                    updatedExpenseReport = Object.values(allReports ?? {}).find((r) => r?.reportID === expenseReport?.reportID);
                },
            });

            expect(updatedTransaction?.reportID).toBe(expenseReport?.reportID);
            expect(isMoneyRequestAction(updatedIOUReportActionOnSelfDMReport) ? getOriginalMessage(updatedIOUReportActionOnSelfDMReport)?.IOUTransactionID : undefined).toBe(undefined);
            expect(updatedTrackExpenseActionableWhisper).toBe(undefined);
            expect(updatedExpenseReport?.nonReimbursableTotal).toBe(-amount);
            expect(updatedExpenseReport?.total).toBe(-amount);
            expect(updatedExpenseReport?.unheldNonReimbursableTotal).toBe(-amount);
        });

        describe('saveSplitTransactions', () => {
            it("should update split transaction's description correctly ", async () => {
                const amount = 10000;
                let expenseReport: OnyxEntry<Report>;
                let chatReport: OnyxEntry<Report>;
                let originalTransactionID;

                const policyID = generatePolicyID();
                createWorkspace({
                    policyOwnerEmail: CARLOS_EMAIL,
                    makeMeAdmin: true,
                    policyName: "Carlos's Workspace",
                    policyID,
                });

                await waitForBatchedUpdates();
                await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC});
                await waitForBatchedUpdates();
                await getOnyxData({
                    key: ONYXKEYS.COLLECTION.REPORT,
                    waitForCollectionCallback: true,
                    callback: (allReports) => {
                        chatReport = Object.values(allReports ?? {}).find((report) => report?.chatType === CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT);
                    },
                });
                requestMoney({
                    report: chatReport,
                    participantParams: {
                        payeeEmail: RORY_EMAIL,
                        payeeAccountID: RORY_ACCOUNT_ID,
                        participant: {login: CARLOS_EMAIL, accountID: CARLOS_ACCOUNT_ID, isPolicyExpenseChat: true, reportID: chatReport?.reportID},
                    },
                    transactionParams: {
                        amount,
                        attendees: [],
                        currency: CONST.CURRENCY.USD,
                        created: '',
                        merchant: 'NASDAQ',
                        comment: '*hey* `hey`',
                    },
                    shouldGenerateTransactionThreadReport: true,
                });
                await waitForBatchedUpdates();
                await getOnyxData({
                    key: ONYXKEYS.COLLECTION.REPORT,
                    waitForCollectionCallback: true,
                    callback: (allReports) => {
                        expenseReport = Object.values(allReports ?? {}).find((report) => report?.type === CONST.REPORT.TYPE.EXPENSE);
                    },
                });
                await getOnyxData({
                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${expenseReport?.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (allReportsAction) => {
                        const iouActions = Object.values(allReportsAction ?? {}).filter((reportAction): reportAction is ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU> =>
                            isMoneyRequestAction(reportAction),
                        );
                        const originalMessage = isMoneyRequestAction(iouActions?.at(0)) ? getOriginalMessage(iouActions?.at(0)) : undefined;
                        originalTransactionID = originalMessage?.IOUTransactionID;
                    },
                });

                const originalTransaction = await getOnyxValue(`${ONYXKEYS.COLLECTION.TRANSACTION}${originalTransactionID}`);
                const draftTransaction: Transaction = {
                    reportID: originalTransaction?.reportID ?? '456',
                    transactionID: originalTransaction?.transactionID ?? '234',
                    amount,
                    created: originalTransaction?.created ?? DateUtils.getDBTime(),
                    currency: CONST.CURRENCY.USD,
                    merchant: originalTransaction?.merchant ?? '',
                    comment: {
                        originalTransactionID,
                        comment: originalTransaction?.comment?.comment ?? '',
                        splitExpenses: [
                            {
                                transactionID: '235',
                                amount: amount / 2,
                                description: '<strong>hey</strong><br /><code>hey</code>',
                                created: DateUtils.getDBTime(),
                            },
                            {
                                transactionID: '234',
                                amount: amount / 2,
                                description: '*hey1* `hey`',
                                created: DateUtils.getDBTime(),
                            },
                        ],
                        attendees: [],
                        type: CONST.TRANSACTION.TYPE.CUSTOM_UNIT,
                    },
                };

                saveSplitTransactions(draftTransaction, -2);
                await waitForBatchedUpdates();

                const split1 = await getOnyxValue(`${ONYXKEYS.COLLECTION.TRANSACTION}235`);
                expect(split1?.comment?.comment).toBe('<strong>hey</strong><br /><code>hey</code>');
                const split2 = await getOnyxValue(`${ONYXKEYS.COLLECTION.TRANSACTION}234`);
                expect(split2?.comment?.comment).toBe('<strong>hey1</strong> <code>hey</code>');
            });

            it("should not create new expense report if the admin split the employee's expense", async () => {
                const amount = 10000;
                let expenseReport: OnyxEntry<Report>;
                let chatReport: OnyxEntry<Report>;
                let originalTransactionID;

                const policyID = generatePolicyID();
                createWorkspace({
                    policyOwnerEmail: RORY_EMAIL,
                    makeMeAdmin: true,
                    policyName: "Rory's Workspace",
                    policyID,
                });

                await waitForBatchedUpdates();
                await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC});
                await waitForBatchedUpdates();
                await getOnyxData({
                    key: ONYXKEYS.COLLECTION.REPORT,
                    waitForCollectionCallback: true,
                    callback: (allReports) => {
                        chatReport = Object.values(allReports ?? {}).find((report) => report?.chatType === CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT);
                    },
                });
                requestMoney({
                    report: chatReport,
                    participantParams: {
                        payeeEmail: CARLOS_EMAIL,
                        payeeAccountID: CARLOS_ACCOUNT_ID,
                        participant: {login: RORY_EMAIL, accountID: RORY_ACCOUNT_ID, isPolicyExpenseChat: true, reportID: chatReport?.reportID},
                    },
                    transactionParams: {
                        amount,
                        attendees: [],
                        currency: CONST.CURRENCY.USD,
                        created: '',
                        merchant: 'NASDAQ',
                        comment: '*hey* `hey`',
                    },
                    shouldGenerateTransactionThreadReport: true,
                });
                await waitForBatchedUpdates();
                await getOnyxData({
                    key: ONYXKEYS.COLLECTION.REPORT,
                    waitForCollectionCallback: true,
                    callback: (allReports) => {
                        expenseReport = Object.values(allReports ?? {}).find((report) => report?.type === CONST.REPORT.TYPE.EXPENSE);
                    },
                });
                await getOnyxData({
                    key: `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${expenseReport?.reportID}`,
                    waitForCollectionCallback: false,
                    callback: (allReportsAction) => {
                        const iouActions = Object.values(allReportsAction ?? {}).filter((reportAction): reportAction is ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU> =>
                            isMoneyRequestAction(reportAction),
                        );
                        const originalMessage = isMoneyRequestAction(iouActions?.at(0)) ? getOriginalMessage(iouActions?.at(0)) : undefined;
                        originalTransactionID = originalMessage?.IOUTransactionID;
                    },
                });

                const originalTransaction = await getOnyxValue(`${ONYXKEYS.COLLECTION.TRANSACTION}${originalTransactionID}`);
                const draftTransaction: Transaction = {
                    reportID: originalTransaction?.reportID ?? '456',
                    transactionID: originalTransaction?.transactionID ?? '234',
                    amount,
                    created: originalTransaction?.created ?? DateUtils.getDBTime(),
                    currency: CONST.CURRENCY.USD,
                    merchant: originalTransaction?.merchant ?? '',
                    comment: {
                        originalTransactionID,
                        comment: originalTransaction?.comment?.comment ?? '',
                        splitExpenses: [
                            {
                                transactionID: '235',
                                amount: amount / 2,
                                description: '<strong>hey</strong><br /><code>hey</code>',
                                created: DateUtils.getDBTime(),
                            },
                            {
                                transactionID: '234',
                                amount: amount / 2,
                                description: '*hey1* `hey`',
                                created: DateUtils.getDBTime(),
                            },
                        ],
                        attendees: [],
                        type: CONST.TRANSACTION.TYPE.CUSTOM_UNIT,
                    },
                };

                saveSplitTransactions(draftTransaction, -2);
                await waitForBatchedUpdates();

                const split1 = await getOnyxValue(`${ONYXKEYS.COLLECTION.TRANSACTION}235`);
                expect(split1?.reportID).toBe(expenseReport?.reportID);
                const split2 = await getOnyxValue(`${ONYXKEYS.COLLECTION.TRANSACTION}234`);
                expect(split2?.reportID).toBe(expenseReport?.reportID);
            });
        });
    });

    describe('getIOUReportActionToApproveOrPay', () => {
        it('should exclude deleted actions', async () => {
            const reportID = '1';
            const policyID = '2';
            const fakePolicy: Policy = {
                ...createRandomPolicy(Number(policyID)),
                approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC,
                type: CONST.POLICY.TYPE.TEAM,
            };

            const fakeReport: Report = {
                ...createRandomReport(Number(reportID)),
                type: CONST.REPORT.TYPE.EXPENSE,
                policyID,
                stateNum: CONST.REPORT.STATE_NUM.SUBMITTED,
                statusNum: CONST.REPORT.STATUS_NUM.SUBMITTED,
                managerID: RORY_ACCOUNT_ID,
                chatType: CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT,
            };
            const fakeTransaction1: Transaction = {
                ...createRandomTransaction(0),
                reportID,
                bank: CONST.EXPENSIFY_CARD.BANK,
                status: CONST.TRANSACTION.STATUS.PENDING,
            };
            const fakeTransaction2: Transaction = {
                ...createRandomTransaction(1),
                reportID,
                amount: 27,
                receipt: {
                    source: 'test',
                    state: CONST.IOU.RECEIPT_STATE.SCAN_FAILED,
                },
                merchant: CONST.TRANSACTION.PARTIAL_TRANSACTION_MERCHANT,
                modifiedMerchant: undefined,
            };
            const fakeTransaction3: Transaction = {
                ...createRandomTransaction(2),
                reportID,
                amount: 100,
            };

            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${fakeReport.reportID}`, fakeReport);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction1.transactionID}`, fakeTransaction1);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction2.transactionID}`, fakeTransaction2);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${fakeTransaction3.transactionID}`, fakeTransaction3);
            await Onyx.set(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, fakePolicy);
            await waitForBatchedUpdates();

            const deletedReportAction = {
                reportActionID: '0',
                actionName: CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW,
                created: '2024-08-08 18:70:44.171',
                childReportID: reportID,
            };

            const MOCK_REPORT_ACTIONS: ReportActions = {
                [deletedReportAction.reportActionID]: deletedReportAction,
                [reportID]: {
                    reportActionID: reportID,
                    actionName: CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW,
                    created: '2024-08-08 19:70:44.171',
                    childReportID: reportID,
                    message: [
                        {
                            type: 'TEXT',
                            text: 'Hello world!',
                        },
                    ],
                },
            };

            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${fakeReport.reportID}`, MOCK_REPORT_ACTIONS);

            expect(getIOUReportActionToApproveOrPay(fakeReport, undefined)).toMatchObject(MOCK_REPORT_ACTIONS[reportID]);
        });
    });
                }
                return Promise.resolve();
            });
            return Onyx.clear();
        });

        afterEach(() => {
            writeSpy.mockRestore();
        });

        const createMockTransaction = (id: string, reportID: string, amount = 100): Transaction => ({
            ...createRandomTransaction(Number(id)),
            transactionID: id,
            reportID,
            amount,
            created: '2024-01-01 12:00:00',
            currency: 'EUR',
            merchant: 'Test Merchant',
            modifiedMerchant: 'Updated Merchant',
            comment: {comment: 'Updated comment'},
            category: 'Travel',
            tag: 'UpdatedProject',
            billable: true,
            reimbursable: false,
        });

        const createMockReport = (reportID: string, total = 300): Report => ({
            ...createRandomReport(Number(reportID)),
            reportID,
            type: CONST.REPORT.TYPE.EXPENSE,
            total,
        });

        const createMockViolations = () => [
            {name: CONST.VIOLATIONS.DUPLICATED_TRANSACTION, type: CONST.VIOLATION_TYPES.VIOLATION},
            {name: CONST.VIOLATIONS.MISSING_CATEGORY, type: CONST.VIOLATION_TYPES.VIOLATION},
        ];

        const createMockIouAction = (transactionID: string, reportActionID: string, childReportID: string): ReportAction => ({
            reportActionID,
            actionName: CONST.REPORT.ACTIONS.TYPE.IOU,
            created: '2024-01-01 12:00:00',
            originalMessage: {
                IOUTransactionID: transactionID,
                type: CONST.IOU.REPORT_ACTION_TYPE.CREATE,
            } as OriginalMessageIOU,
            message: [{type: 'TEXT', text: 'Test IOU message'}],
            childReportID,
        });


    describe('getPerDiemExpenseInformation', () => {
        it('should return correct per diem expense information with new chat report', () => {
            // Given: Mock data for per diem expense
            const mockCustomUnit = {
                customUnitID: 'per_diem_123',
                customUnitRateID: 'rate_456',
                name: CONST.CUSTOM_UNITS.NAME_PER_DIEM_INTERNATIONAL,
                attributes: {
                    dates: {
                        start: '2024-01-15',
                        end: '2024-01-15',
                    },
                },
                subRates: [
                    {
                        id: 'breakfast_1',
                        name: 'Breakfast',
                        rate: 25,
                        quantity: 1,
                    },
                    {
                        id: 'lunch_1',
                        name: 'Lunch',
                        rate: 35,
                        quantity: 1,
                    },
                ],
                quantity: 1,
            };

            const mockParticipant = {
                accountID: 123,
                login: 'test@example.com',
                displayName: 'Test User',
                isPolicyExpenseChat: false,
                notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS,
                role: CONST.REPORT.ROLE.MEMBER,
            };

            const mockTransactionParams = {
                currency: 'USD',
                created: '2024-01-15',
                category: 'Travel',
                tag: 'Project A',
                customUnit: mockCustomUnit,
                billable: true,
                attendees: [],
                reimbursable: true,
                comment: 'Business trip per diem',
            };

            const mockParticipantParams = {
                payeeAccountID: 456,
                payeeEmail: 'payee@example.com',
                participant: mockParticipant,
            };

            const mockPolicyParams = {
                policy: createRandomPolicy(1),
                policyCategories: createRandomPolicyCategories(3),
                policyTagList: createRandomPolicyTags('tagList', 2),
            };

            // When: Call getPerDiemExpenseInformation
            const result = getPerDiemExpenseInformation({
                parentChatReport: {} as OnyxEntry<Report>,
                transactionParams: mockTransactionParams,
                participantParams: mockParticipantParams,
                policyParams: mockPolicyParams,
                recentlyUsedParams: {},
                moneyRequestReportID: '1',
            });

            // Then: Verify the result structure and key values
            expect(result).toMatchObject({
                payerAccountID: 123,
                payerEmail: 'test@example.com',
                billable: true,
                reimbursable: true,
            });

            // Verify chat report was created
            expect(result.chatReport).toBeDefined();
            expect(result.chatReport.reportID).toBeDefined();

            // Verify IOU report was created
            expect(result.iouReport).toBeDefined();
            expect(result.iouReport.reportID).toBeDefined();
            expect(result.iouReport.type).toBe(CONST.REPORT.TYPE.IOU);

            // Verify transaction was created with correct per diem data
            expect(result.transaction).toBeDefined();
            expect(result.transaction.transactionID).toBeDefined();
            expect(result.transaction.iouRequestType).toBe(CONST.IOU.REQUEST_TYPE.PER_DIEM);
            expect(result.transaction.hasEReceipt).toBe(true);
            expect(result.transaction.currency).toBe('USD');
            expect(result.transaction.category).toBe('Travel');
            expect(result.transaction.tag).toBe('Project A');
            expect(result.transaction.comment?.comment).toBe('Business trip per diem');

            // Verify IOU action was created
            expect(result.iouAction).toBeDefined();
            expect(result.iouAction.reportActionID).toBeDefined();
            expect(result.iouAction.actionName).toBe(CONST.REPORT.ACTIONS.TYPE.IOU);

            // Verify report preview action
            expect(result.reportPreviewAction).toBeDefined();
            expect(result.reportPreviewAction.reportActionID).toBeDefined();

            // Verify Onyx data structure
            expect(result.onyxData).toBeDefined();
            expect(result.onyxData.optimisticData).toBeDefined();
            expect(result.onyxData.successData).toBeDefined();
            expect(result.onyxData.failureData).toBeDefined();

            // Verify created action IDs for new reports
            expect(result.createdChatReportActionID).toBeDefined();
            expect(result.createdIOUReportActionID).toBeDefined();
        });

        it('should return correct per diem expense information with existing chat report', () => {
            // Given: Existing chat report
            const existingChatReport = {
                reportID: 'chat_123',
                chatType: CONST.REPORT.CHAT_TYPE.GROUP,
                participants: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    '123': {
                        accountID: 123,
                        role: CONST.REPORT.ROLE.MEMBER,
                        notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS,
                    },
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    '456': {
                        accountID: 456,
                        role: CONST.REPORT.ROLE.MEMBER,
                        notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS,
                    },
                },
                iouReportID: 'iou_456',
                type: CONST.REPORT.TYPE.CHAT,
            };

            const mockCustomUnit = {
                customUnitID: 'per_diem_789',
                customUnitRateID: 'rate_101',
                name: CONST.CUSTOM_UNITS.NAME_PER_DIEM_INTERNATIONAL,
                attributes: {
                    dates: {
                        start: '2024-01-20',
                        end: '2024-01-20',
                    },
                },
                subRates: [
                    {
                        id: 'dinner_1',
                        name: 'Dinner',
                        rate: 45,
                        quantity: 1,
                    },
                ],
                quantity: 2,
            };

            const mockParticipant = {
                accountID: 123,
                login: 'existing@example.com',
                displayName: 'Existing User',
                isPolicyExpenseChat: false,
                notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS,
                role: CONST.REPORT.ROLE.MEMBER,
            };

            const mockTransactionParams = {
                comment: 'Conference per diem',
                currency: 'USD',
                created: '2024-01-20',
                category: 'Meals',
                tag: 'Conference',
                customUnit: mockCustomUnit,
                billable: false,
                attendees: [],
                reimbursable: true,
            };

            const mockParticipantParams = {
                payeeAccountID: 456,
                payeeEmail: 'payee@example.com',
                participant: mockParticipant,
            };

            // When: Call getPerDiemExpenseInformation with existing chat report
            const result = getPerDiemExpenseInformation({
                parentChatReport: existingChatReport as OnyxEntry<Report>,
                transactionParams: mockTransactionParams as PerDiemExpenseTransactionParams,
                participantParams: mockParticipantParams as RequestMoneyParticipantParams,
                recentlyUsedParams: {},
            });

            // Then: Verify the result uses existing chat report
            expect(result.chatReport.reportID).toBe('chat_123');
            expect(result.chatReport.chatType).toBe(CONST.REPORT.CHAT_TYPE.GROUP);

            // Verify transaction has correct per diem data
            expect(result.transaction.iouRequestType).toBe(CONST.IOU.REQUEST_TYPE.PER_DIEM);
            expect(result.transaction.hasEReceipt).toBe(true);
            expect(result.transaction.currency).toBe('USD');
            expect(result.transaction.category).toBe('Meals');
            expect(result.transaction.tag).toBe('Conference');
            expect(result.transaction.comment?.comment).toBe('Conference per diem');

            // Verify no new chat report action ID since using existing
            expect(result.createdChatReportActionID).toBeUndefined();
        });

        it('should handle policy expense chat correctly', () => {
            // Given: Policy expense chat participant
            const mockParticipant = {
                accountID: 123,
                login: 'policy@example.com',
                displayName: 'Policy User',
                isPolicyExpenseChat: true,
                reportID: 'policy_chat_123',
                notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS,
                role: CONST.REPORT.ROLE.MEMBER,
            };

            const mockCustomUnit = {
                customUnitID: 'per_diem_policy',
                customUnitRateID: 'rate_policy',
                name: CONST.CUSTOM_UNITS.NAME_PER_DIEM_INTERNATIONAL,
                attributes: {
                    dates: {
                        start: '2024-01-25',
                        end: '2024-01-25',
                    },
                },
                subRates: [
                    {
                        id: 'lodging_1',
                        name: 'Lodging',
                        rate: 150,
                        quantity: 1,
                    },
                ],
                quantity: 1,
            };

            const mockTransactionParams = {
                comment: 'Policy per diem',
                currency: 'USD',
                created: '2024-01-25',
                category: 'Lodging',
                tag: 'Policy',
                customUnit: mockCustomUnit,
                billable: true,
                attendees: [],
                reimbursable: true,
            };

            const mockParticipantParams = {
                payeeAccountID: 456,
                payeeEmail: 'payee@example.com',
                participant: mockParticipant,
            };

            const mockPolicyParams = {
                policy: createRandomPolicy(2),
            };

            // When: Call getPerDiemExpenseInformation for policy expense chat
            const result = getPerDiemExpenseInformation({
                parentChatReport: {} as OnyxEntry<Report>,
                transactionParams: mockTransactionParams as PerDiemExpenseTransactionParams,
                participantParams: mockParticipantParams as RequestMoneyParticipantParams,
                policyParams: mockPolicyParams,
                recentlyUsedParams: {},
            });

            // Then: Verify policy expense chat handling
            expect(result.payerAccountID).toBe(123);
            expect(result.payerEmail).toBe('policy@example.com');
            expect(result.transaction.iouRequestType).toBe(CONST.IOU.REQUEST_TYPE.PER_DIEM);
            expect(result.transaction.hasEReceipt).toBe(true);
            expect(result.billable).toBe(true);
            expect(result.reimbursable).toBe(true);
        });
    });

    describe('getSendInvoiceInformation', () => {
        it('should return correct invoice information with new chat report', () => {
            // Given: Mock transaction data
            const mockTransaction = {
                transactionID: 'transaction_123',
                reportID: 'report_123',
                amount: 500,
                currency: 'USD',
                created: '2024-01-15',
                merchant: 'Test Company',
                category: 'Services',
                tag: 'Project B',
                taxCode: 'TAX001',
                taxAmount: 50,
                billable: true,
                comment: {
                    comment: 'Invoice for consulting services',
                },
                participants: [
                    {
                        accountID: 123,
                        isSender: true,
                        policyID: 'workspace_123',
                    },
                    {
                        accountID: 456,
                        isSender: false,
                    },
                ],
            };

            const currentUserAccountID = 123;
            const mockPolicy = createRandomPolicy(1);

            const mockPolicyCategories = {
                Services: {
                    name: 'Services',
                    enabled: true,
                },
            };

            const mockPolicyTagList = {
                tagList: {
                    name: 'tagList',
                    orderWeight: 0,
                    required: false,
                    tags: {
                        projectB: {
                            name: 'Project B',
                            enabled: true,
                        },
                    },
                },
            };

            // When: Call getSendInvoiceInformation
            const result = getSendInvoiceInformation(
                mockTransaction as OnyxEntry<Transaction>,
                currentUserAccountID,
                undefined, // invoiceChatReport
                undefined, // receipt
                mockPolicy,
                mockPolicyTagList as OnyxEntry<PolicyTagLists>,
                mockPolicyCategories,
                'Test Company Inc.',
                'https://testcompany.com',
                ['Services', 'Consulting'],
            );

            // Then: Verify the result structure and key values
            expect(result).toMatchObject({
                senderWorkspaceID: 'workspace_123',
                invoiceReportID: expect.any(String),
                transactionID: expect.any(String),
                transactionThreadReportID: expect.any(String),
                createdIOUReportActionID: expect.any(String),
                reportActionID: expect.any(String),
                createdChatReportActionID: expect.any(String),
                reportPreviewReportActionID: expect.any(String),
            });

            // Verify receiver information
            expect(result.receiver).toBeDefined();
            expect(result.receiver.accountID).toBe(123);

            // Verify invoice room (chat report)
            expect(result.invoiceRoom).toBeDefined();
            expect(result.invoiceRoom.reportID).toBeDefined();
            expect(result.invoiceRoom.chatType).toBe(CONST.REPORT.CHAT_TYPE.INVOICE);

            // Verify Onyx data structure
            expect(result.onyxData).toBeDefined();
            expect(result.onyxData.optimisticData).toBeDefined();
            expect(result.onyxData.successData).toBeDefined();
            expect(result.onyxData.failureData).toBeDefined();
        });

        it('should return correct invoice information with existing chat report', () => {
            // Given: Existing invoice chat report
            const existingInvoiceChatReport = {
                reportID: 'invoice_chat_123',
                chatType: CONST.REPORT.CHAT_TYPE.INVOICE,
                type: CONST.REPORT.TYPE.CHAT,
                participants: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    '123': {
                        accountID: 123,
                        role: CONST.REPORT.ROLE.MEMBER,
                        notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS,
                    },
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    '456': {
                        accountID: 456,
                        role: CONST.REPORT.ROLE.MEMBER,
                        notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS,
                    },
                },
                invoiceReceiver: {
                    type: 'individual',
                    accountID: 456,
                    displayName: 'Client Company',
                    login: 'client@example.com',
                },
            };

            const mockTransaction = {
                transactionID: 'transaction_456',
                reportID: 'report_456',
                amount: 750,
                currency: 'EUR',
                created: '2024-01-20',
                merchant: 'Client Company',
                category: 'Development',
                tag: 'Project C',
                taxCode: 'TAX002',
                taxAmount: 75,
                billable: true,
                comment: {
                    comment: 'Invoice for development work',
                },
                participants: [
                    {
                        accountID: 123,
                        isSender: true,
                        policyID: 'workspace_456',
                    },
                    {
                        accountID: 456,
                        isSender: false,
                    },
                ],
            };

            const currentUserAccountID = 123;

            // When: Call getSendInvoiceInformation with existing chat report
            const result = getSendInvoiceInformation(
                mockTransaction,
                currentUserAccountID,
                existingInvoiceChatReport as OnyxEntry<Report>,
                undefined, // receipt
                undefined, // policy
                undefined, // policyTagList
                undefined, // policyCategories
                'Client Company Ltd.',
                'https://clientcompany.com',
            );

            // Then: Verify the result uses existing chat report
            expect(result.invoiceRoom.reportID).toBe('invoice_chat_123');
            expect(result.invoiceRoom.chatType).toBe(CONST.REPORT.CHAT_TYPE.INVOICE);

            // Verify transaction data
            expect(result.transactionID).toBeDefined();
            expect(result.senderWorkspaceID).toBe('workspace_456');
        });

        it('should handle receipt attachment correctly', () => {
            // Given: Transaction with receipt
            const mockTransaction = {
                transactionID: 'transaction_789',
                reportID: 'report_789',
                amount: 300,
                currency: 'USD',
                created: '2024-01-25',
                merchant: 'Receipt Company',
                category: 'Equipment',
                tag: 'Hardware',
                taxCode: 'TAX003',
                taxAmount: 30,
                billable: true,
                comment: {
                    comment: 'Invoice with receipt',
                },
                participants: [
                    {
                        accountID: 123,
                        isSender: true,
                        policyID: 'workspace_789',
                    },
                    {
                        accountID: 456,
                        isSender: false,
                    },
                ],
            };

            const mockReceipt = {
                source: 'receipt_source_123',
                name: 'receipt.pdf',
                state: CONST.IOU.RECEIPT_STATE.SCAN_READY,
            };

            const currentUserAccountID = 123;

            // When: Call getSendInvoiceInformation with receipt
            const result = getSendInvoiceInformation(
                mockTransaction,
                currentUserAccountID,
                undefined, // invoiceChatReport
                mockReceipt,
                undefined, // policy
                undefined, // policyTagList
                undefined, // policyCategories
            );

            // Then: Verify receipt handling
            expect(result.transactionID).toBeDefined();
            expect(result.invoiceRoom).toBeDefined();
            expect(result.invoiceRoom.chatType).toBe(CONST.REPORT.CHAT_TYPE.INVOICE);

            // Verify Onyx data includes receipt information
            expect(result.onyxData).toBeDefined();
            expect(result.onyxData.optimisticData).toBeDefined();
        });

        it('should handle missing transaction data gracefully', () => {
            // Given: Minimal transaction data
            const mockTransaction = {
                transactionID: 'transaction_minimal',
                reportID: 'report_minimal',
                amount: 100,
                currency: 'USD',
                created: '2024-01-30',
                merchant: 'Minimal Company',
                participants: [
                    {
                        accountID: 123,
                        isSender: true,
                    },
                    {
                        accountID: 456,
                        isSender: false,
                    },
                ],
            };

            const currentUserAccountID = 123;

            // When: Call getSendInvoiceInformation with minimal data
            const result = getSendInvoiceInformation(mockTransaction, currentUserAccountID);

            // Then: Verify function handles missing data gracefully
            expect(result).toBeDefined();
            expect(result.transactionID).toBeDefined();
            expect(result.invoiceRoom).toBeDefined();
            expect(result.invoiceRoom.chatType).toBe(CONST.REPORT.CHAT_TYPE.INVOICE);
            expect(result.receiver).toBeDefined();
            expect(result.onyxData).toBeDefined();
        });
    });

    describe('updateMoneyRequestAttendees', () => {
        it('should update recent attendees', async () => {
            // Given a transaction
            const transaction = createRandomTransaction(1);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction.transactionID}`, transaction);

            // When updating the transaction attendees
            updateMoneyRequestAttendees(
                transaction.transactionID,
                '2',
                [
                    {avatarUrl: '', displayName: 'user 1', email: 'user1@gmail.com'},
                    {avatarUrl: '', displayName: 'user 2', email: 'user2@gmail.com'},
                    {avatarUrl: '', displayName: 'user 3', email: 'user3@gmail.com'},
                    {avatarUrl: '', displayName: 'user 4', email: 'user4@gmail.com'},
                    {avatarUrl: '', displayName: 'user 5', email: 'user5@gmail.com'},
                    {avatarUrl: '', displayName: 'user 6', email: 'user6@gmail.com'},
                ],
                undefined,
                undefined,
                undefined,
                undefined,
            );
            await waitForBatchedUpdates();

            // Then the recent attendees should be updated with a maximum of 5 attendees
            const recentAttendees = await new Promise<OnyxEntry<Attendee[]>>((resolve) => {
                const connection = Onyx.connectWithoutView({
                    key: ONYXKEYS.NVP_RECENT_ATTENDEES,
                    callback: (attendees) => {
                        Onyx.disconnect(connection);
                        resolve(attendees);
                    },
                });
            });
            expect(recentAttendees?.length).toBe(CONST.IOU.MAX_RECENT_REPORTS_TO_SHOW);
        });
    });

    describe('rejectMoneyRequest', () => {
        const amount = 10000;
        const comment = 'This expense is rejected';
        let chatReport: OnyxEntry<Report>;
        let iouReport: OnyxEntry<Report>;
        let transaction: OnyxEntry<Transaction>;
        let policy: OnyxEntry<Policy>;
        const TEST_USER_ACCOUNT_ID = 1;
        const MANAGER_ACCOUNT_ID = 2;
        const ADMIN_ACCOUNT_ID = 3;

        beforeEach(async () => {
            // Set up test data
            policy = createRandomPolicy(1);
            policy.role = CONST.POLICY.ROLE.ADMIN;
            policy.autoReporting = true;
            policy.autoReportingFrequency = CONST.POLICY.AUTO_REPORTING_FREQUENCIES.WEEKLY;

            chatReport = {
                ...createRandomReport(1),
                chatType: CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT,
                policyID: policy?.id,
                type: CONST.REPORT.TYPE.CHAT,
            };

            iouReport = {
                ...createRandomReport(2),
                type: CONST.REPORT.TYPE.IOU,
                ownerAccountID: TEST_USER_ACCOUNT_ID,
                managerID: MANAGER_ACCOUNT_ID,
                total: amount,
                currency: CONST.CURRENCY.USD,
                stateNum: CONST.REPORT.STATE_NUM.SUBMITTED,
                statusNum: CONST.REPORT.STATUS_NUM.SUBMITTED,
                policyID: policy?.id,
                chatReportID: chatReport?.reportID,
            };

            transaction = {
                ...createRandomTransaction(1),
                reportID: iouReport?.reportID,
                amount,
                currency: CONST.CURRENCY.USD,
                merchant: 'Test Merchant',
                transactionID: '1',
            };

            await Onyx.set(`${ONYXKEYS.COLLECTION.POLICY}${policy?.id}`, policy);
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${chatReport?.reportID}`, chatReport);
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${iouReport?.reportID}`, iouReport);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction?.transactionID}`, transaction);
            await Onyx.set(ONYXKEYS.SESSION, {accountID: ADMIN_ACCOUNT_ID});
            await waitForBatchedUpdates();
        });

        afterEach(async () => {
            await Onyx.clear();
            jest.clearAllMocks();
        });

        it('should reject a money request and return navigation route', async () => {
            // Given: An expense report (not IOU) for testing state update
            const expenseReport = {...iouReport, type: CONST.REPORT.TYPE.EXPENSE};
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${iouReport?.reportID}`, expenseReport);
            await waitForBatchedUpdates();

            // When: Reject the money request
            if (!transaction?.transactionID || !iouReport?.reportID) {
                throw new Error('Required transaction or report data is missing');
            }
            const result = rejectMoneyRequest(transaction.transactionID, iouReport.reportID, comment);

            // Then: Should return navigation route to chat report
            expect(result).toBe(ROUTES.REPORT_WITH_ID.getRoute(iouReport.reportID));
        });

        it('should add AUTO_REPORTED_REJECTED_EXPENSE violation for expense reports', async () => {
            // Given: An expense report (not IOU)
            const expenseReport = {...iouReport, type: CONST.REPORT.TYPE.EXPENSE};
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${iouReport?.reportID}`, expenseReport);
            await waitForBatchedUpdates();

            // When: Reject the money request
            if (!transaction?.transactionID || !iouReport?.reportID) {
                throw new Error('Required transaction or report data is missing');
            }
            rejectMoneyRequest(transaction.transactionID, iouReport.reportID, comment);
            await waitForBatchedUpdates();

            // Then: Verify violation is added
            const violations = await getOnyxValue(`${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${transaction?.transactionID}`);
            expect(violations).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: CONST.VIOLATIONS.AUTO_REPORTED_REJECTED_EXPENSE,
                        type: CONST.VIOLATION_TYPES.WARNING,
                        data: expect.objectContaining({
                            comment,
                        }),
                    }),
                ]),
            );
        });
    });

    describe('markRejectViolationAsResolved', () => {
        let transaction: OnyxEntry<Transaction>;
        let iouReport: OnyxEntry<Report>;

        beforeEach(async () => {
            transaction = createRandomTransaction(1);
            iouReport = createRandomReport(1);

            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction?.transactionID}`, transaction);
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${iouReport?.reportID}`, iouReport);
            await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${transaction?.transactionID}`, [
                {
                    name: CONST.VIOLATIONS.AUTO_REPORTED_REJECTED_EXPENSE,
                    type: CONST.VIOLATION_TYPES.WARNING,
                    data: {comment: 'Test reject reason'},
                },
            ]);
            await waitForBatchedUpdates();
        });

        afterEach(async () => {
            await Onyx.clear();
            jest.clearAllMocks();
        });

        it('should remove AUTO_REPORTED_REJECTED_EXPENSE violation', async () => {
            // When: Mark violation as resolved
            if (!transaction?.transactionID || !iouReport?.reportID) {
                throw new Error('Required transaction or report data is missing');
            }
            markRejectViolationAsResolved(transaction.transactionID, iouReport.reportID);
            await waitForBatchedUpdates();

            // Then: Verify violation is removed
            const violations = await getOnyxValue(`${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${transaction?.transactionID}`);
            expect(violations).not.toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: CONST.VIOLATIONS.AUTO_REPORTED_REJECTED_EXPENSE,
                    }),
                ]),
            );
        });
    });
});
