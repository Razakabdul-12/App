import {createRef} from 'react';
import type {RefObject} from 'react';
import type {GestureResponderEvent} from 'react-native';
import type {OnyxEntry, OnyxUpdate} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import type {ValueOf} from 'type-fest';
import * as API from '@libs/API';
import type {
    AddPaymentCardParams,
    DeletePaymentCardParams,
    MakeDefaultPaymentMethodParams,
    PaymentCardParams,
    SetInvoicingTransferBankAccountParams,
} from '@libs/API/parameters';
import {READ_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import * as CardUtils from '@libs/CardUtils';
import GoogleTagManager from '@libs/GoogleTagManager';
import Navigation from '@libs/Navigation/Navigation';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Route} from '@src/ROUTES';
import INPUT_IDS from '@src/types/form/AddPaymentCardForm';
import type {BankAccountList, FundList} from '@src/types/onyx';
import type {PaymentMethodType} from '@src/types/onyx/OriginalMessage';
import type PaymentMethod from '@src/types/onyx/PaymentMethod';
import type {OnyxData} from '@src/types/onyx/Request';

type KYCWallRef = {
    continueAction?: (event?: GestureResponderEvent | KeyboardEvent, iouPaymentType?: PaymentMethodType) => void;
};

/**
 * Sets up a ref to an instance of the KYC Wall component.
 */
const kycWallRef: RefObject<KYCWallRef | null> = createRef<KYCWallRef>();

/**
 * When we successfully add a payment method or pass the KYC checks we will continue with our setup action if we have one set.
 */
function continueSetup(fallbackRoute?: Route) {
    if (!kycWallRef.current?.continueAction) {
        Navigation.goBack(fallbackRoute);
        return;
    }

    // Close the screen (Add Debit Card, Add Bank Account, or Enable Payments) on success and continue with setup
    Navigation.goBack(fallbackRoute);
    kycWallRef.current.continueAction();
}

function setKYCWallSource(_source?: ValueOf<typeof CONST.KYC_WALL_SOURCE>, _chatReportID = '') {}

function getPaymentMethods() {
    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.IS_LOADING_PAYMENT_METHODS,
            value: true,
        },
    ];
    const successData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.IS_LOADING_PAYMENT_METHODS,
            value: false,
        },
    ];
    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.IS_LOADING_PAYMENT_METHODS,
            value: false,
        },
    ];

    return API.read(READ_COMMANDS.OPEN_PAYMENTS_PAGE, null, {
        optimisticData,
        successData,
        failureData,
    });
}

function getMakeDefaultPaymentOnyxData(
    bankAccountID: number,
    fundID: number,
    previousPaymentMethod?: PaymentMethod,
    currentPaymentMethod?: PaymentMethod,
    isOptimisticData = true,
): OnyxUpdate[] {
    const onyxData: OnyxUpdate[] = [];

    if (previousPaymentMethod?.methodID) {
        onyxData.push({
            onyxMethod: Onyx.METHOD.MERGE,
            key: previousPaymentMethod.accountType === CONST.PAYMENT_METHODS.PERSONAL_BANK_ACCOUNT ? ONYXKEYS.BANK_ACCOUNT_LIST : ONYXKEYS.FUND_LIST,
            value: {
                [previousPaymentMethod.methodID]: {
                    isDefault: !isOptimisticData,
                },
            },
        });
    }

    if (currentPaymentMethod?.methodID) {
        onyxData.push({
            onyxMethod: Onyx.METHOD.MERGE,
            key: currentPaymentMethod.accountType === CONST.PAYMENT_METHODS.PERSONAL_BANK_ACCOUNT ? ONYXKEYS.BANK_ACCOUNT_LIST : ONYXKEYS.FUND_LIST,
            value: {
                [currentPaymentMethod.methodID]: {
                    isDefault: isOptimisticData,
                },
            },
        });
    }

    return onyxData;
}

/**
 * Sets the default bank account or debit card for an Expensify Wallet
 *
 */
function makeDefaultPaymentMethod(bankAccountID: number, fundID: number, previousPaymentMethod?: PaymentMethod, currentPaymentMethod?: PaymentMethod) {
    const parameters: MakeDefaultPaymentMethodParams = {
        bankAccountID,
        fundID,
    };

    API.write(WRITE_COMMANDS.MAKE_DEFAULT_PAYMENT_METHOD, parameters, {
        optimisticData: getMakeDefaultPaymentOnyxData(bankAccountID, fundID, previousPaymentMethod, currentPaymentMethod, true),
        failureData: getMakeDefaultPaymentOnyxData(bankAccountID, fundID, previousPaymentMethod, currentPaymentMethod, false),
    });
}

/**
 * Calls the API to add a new card.
 *
 */
function addPaymentCard(accountID: number, params: PaymentCardParams) {
    const cardMonth = CardUtils.getMonthFromExpirationDateString(params.expirationDate);
    const cardYear = CardUtils.getYearFromExpirationDateString(params.expirationDate);

    const parameters: AddPaymentCardParams = {
        cardNumber: CardUtils.getMCardNumberString(params.cardNumber),
        cardYear,
        cardMonth,
        cardCVV: params.securityCode,
        addressName: params.nameOnCard,
        addressZip: params.addressZipCode,
        currency: CONST.PAYMENT_CARD_CURRENCY.USD,
        isP2PDebitCard: true,
    };

    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.ADD_PAYMENT_CARD_FORM,
            value: {isLoading: true},
        },
    ];

    const successData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.ADD_PAYMENT_CARD_FORM,
            value: {isLoading: false},
        },
    ];

    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.ADD_PAYMENT_CARD_FORM,
            value: {isLoading: false},
        },
    ];

    API.write(WRITE_COMMANDS.ADD_PAYMENT_CARD, parameters, {
        optimisticData,
        successData,
        failureData,
    });

    GoogleTagManager.publishEvent(CONST.ANALYTICS.EVENT.PAID_ADOPTION, accountID);
}

/**
 * Calls the API to add a new card.
 *
 */
/**
 * Calls the API to add a new SCA (GBP or EUR) card.
 * Updates verify3dsSubscription Onyx key with a new authentication link for 3DS.
 */
function addPaymentCardSCA(params: AddPaymentCardParams, onyxData: OnyxData = {}) {
    API.write(WRITE_COMMANDS.ADD_PAYMENT_CARD_SCA, params, onyxData);
}

/**
 * Resets the values for the add payment card form back to their initial states
 */
function clearPaymentCardFormErrorAndSubmit() {
    Onyx.set(ONYXKEYS.FORMS.ADD_PAYMENT_CARD_FORM, {
        isLoading: false,
        errors: undefined,
        [INPUT_IDS.SETUP_COMPLETE]: false,
        [INPUT_IDS.NAME_ON_CARD]: '',
        [INPUT_IDS.CARD_NUMBER]: '',
        [INPUT_IDS.EXPIRATION_DATE]: '',
        [INPUT_IDS.SECURITY_CODE]: '',
        [INPUT_IDS.ADDRESS_STREET]: '',
        [INPUT_IDS.ADDRESS_ZIP_CODE]: '',
        [INPUT_IDS.ADDRESS_STATE]: '',
        [INPUT_IDS.ACCEPT_TERMS]: '',
        [INPUT_IDS.CURRENCY]: CONST.PAYMENT_CARD_CURRENCY.USD,
    });
}

/**
 * Properly updates the nvp_privateStripeCustomerID onyx data for 3DS payment
 *
 */
function verifySetupIntent(accountID: number, isVerifying = true) {
    API.write(WRITE_COMMANDS.VERIFY_SETUP_INTENT, {accountID, isVerifying});
}



/**
 * Looks through each payment method to see if there is an existing error
 *
 */
function hasPaymentMethodError(bankList: OnyxEntry<BankAccountList>, fundList: OnyxEntry<FundList>): boolean {
    const combinedPaymentMethods = {...bankList, ...fundList};

    return Object.values(combinedPaymentMethods).some((item) => Object.keys(item.errors ?? {}).length);
}

type PaymentListKey =
    | typeof ONYXKEYS.BANK_ACCOUNT_LIST
    | typeof ONYXKEYS.FUND_LIST
    | typeof ONYXKEYS.CARD_LIST
    | `${typeof ONYXKEYS.COLLECTION.WORKSPACE_CARDS_LIST}${string}_${typeof CONST.EXPENSIFY_CARD.BANK}`;

/**
 * Clears the error for the specified payment item
 * @param paymentListKey The onyx key for the provided payment method
 * @param paymentMethodID
 */
function clearDeletePaymentMethodError(paymentListKey: PaymentListKey, paymentMethodID: number) {
    Onyx.merge(paymentListKey, {
        [paymentMethodID]: {
            pendingAction: null,
            errors: null,
        },
    });
}

/**
 * If there was a failure adding a payment method, clearing it removes the payment method from the list entirely
 * @param paymentListKey The onyx key for the provided payment method
 * @param paymentMethodID
 */
function clearAddPaymentMethodError(paymentListKey: PaymentListKey, paymentMethodID: number) {
    Onyx.merge(paymentListKey, {
        [paymentMethodID]: null,
    });
}

function deletePaymentCard(fundID: number) {
    const parameters: DeletePaymentCardParams = {
        fundID,
    };

    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.FUND_LIST}`,
            value: {[fundID]: {pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE}},
        },
    ];

    API.write(WRITE_COMMANDS.DELETE_PAYMENT_CARD, parameters, {
        optimisticData,
    });
}

/**
 *  Sets the default bank account to use for receiving payouts from
 *
 */
function setInvoicingTransferBankAccount(bankAccountID: number, policyID: string, previousBankAccountID: number) {
    const parameters: SetInvoicingTransferBankAccountParams = {
        bankAccountID,
        policyID,
    };

    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                invoice: {
                    bankAccount: {
                        transferBankAccountID: bankAccountID,
                    },
                },
            },
        },
    ];

    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                invoice: {
                    bankAccount: {
                        transferBankAccountID: previousBankAccountID,
                    },
                },
            },
        },
    ];

    API.write(WRITE_COMMANDS.SET_INVOICING_TRANSFER_BANK_ACCOUNT, parameters, {
        optimisticData,
        failureData,
    });
}

export {
    deletePaymentCard,
    addPaymentCard,
    getPaymentMethods,
    makeDefaultPaymentMethod,
    kycWallRef,
    continueSetup,
    clearPaymentCardFormErrorAndSubmit,
    hasPaymentMethodError,
    clearDeletePaymentMethodError,
    clearAddPaymentMethodError,
    verifySetupIntent,
    addPaymentCardSCA,
    setInvoicingTransferBankAccount,
    setKYCWallSource,
};
