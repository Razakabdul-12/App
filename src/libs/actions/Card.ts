import Onyx from 'react-native-onyx';
import type {OnyxUpdate} from 'react-native-onyx';
import * as API from '@libs/API';
import type {
    ActivatePhysicalExpensifyCardParams,
    ReportVirtualExpensifyCardFraudParams,
    RequestReplacementExpensifyCardParams,
    RevealExpensifyCardDetailsParams,
} from '@libs/API/parameters';
import {SIDE_EFFECT_REQUEST_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Card, CompanyCardFeed} from '@src/types/onyx';
import type {ExpensifyCardDetails} from '@src/types/onyx/Card';
import type {ConnectionName} from '@src/types/onyx/Policy';

type ReplacementReason = 'damaged' | 'stolen';

function reportVirtualExpensifyCardFraud(card: Card, validateCode: string) {
    const cardID = card?.cardID ?? CONST.DEFAULT_NUMBER_ID;
    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.REPORT_VIRTUAL_CARD_FRAUD,
            value: {
                cardID,
                isLoading: true,
                errors: null,
            },
        },
    ];

    const successData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.REPORT_VIRTUAL_CARD_FRAUD,
            value: {
                isLoading: false,
            },
        },
    ];

    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.REPORT_VIRTUAL_CARD_FRAUD,
            value: {
                isLoading: false,
            },
        },
    ];

    const parameters: ReportVirtualExpensifyCardFraudParams = {
        cardID,
        validateCode,
    };

    API.write(WRITE_COMMANDS.REPORT_VIRTUAL_EXPENSIFY_CARD_FRAUD, parameters, {
        optimisticData,
        successData,
        failureData,
    });
}

/**
 * Call the API to deactivate the card and request a new one
 * @param cardID - id of the card that is going to be replaced
 * @param reason - reason for replacement
 */
function requestReplacementExpensifyCard(cardID: number, reason: ReplacementReason, validateCode: string) {
    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.REPORT_PHYSICAL_CARD_FORM,
            value: {
                isLoading: true,
                errors: null,
            },
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.VALIDATE_ACTION_CODE,
            value: {
                validateCodeSent: null,
            },
        },
    ];

    const successData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.REPORT_PHYSICAL_CARD_FORM,
            value: {
                isLoading: false,
            },
        },
    ];

    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.REPORT_PHYSICAL_CARD_FORM,
            value: {
                isLoading: false,
            },
        },
    ];

    const parameters: RequestReplacementExpensifyCardParams = {
        cardID,
        reason,
        validateCode,
    };

    API.write(WRITE_COMMANDS.REQUEST_REPLACEMENT_EXPENSIFY_CARD, parameters, {
        optimisticData,
        successData,
        failureData,
    });
}

/**
 * Activates the physical Expensify card based on the last four digits of the card number
 */
function activatePhysicalExpensifyCard(cardLastFourDigits: string, cardID: number) {
    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.CARD_LIST,
            value: {
                [cardID]: {
                    errors: null,
                    isLoading: true,
                },
            },
        },
    ];

    const successData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.CARD_LIST,
            value: {
                [cardID]: {
                    isLoading: false,
                },
            },
        },
    ];

    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.CARD_LIST,
            value: {
                [cardID]: {
                    isLoading: false,
                },
            },
        },
    ];

    const parameters: ActivatePhysicalExpensifyCardParams = {
        cardLastFourDigits,
        cardID,
    };

    // eslint-disable-next-line rulesdir/no-api-side-effects-method
    API.makeRequestWithSideEffects(SIDE_EFFECT_REQUEST_COMMANDS.ACTIVATE_PHYSICAL_EXPENSIFY_CARD, parameters, {
        optimisticData,
        successData,
        failureData,
    }).then((response) => {
        if (!response) {
            return;
        }
        if (response.pin) {
            Onyx.set(ONYXKEYS.ACTIVATED_CARD_PIN, response.pin);
        }
    });
}

/**
 * Clears errors for a specific cardID
 */
function clearCardListErrors(cardID: number) {
    Onyx.merge(ONYXKEYS.CARD_LIST, {[cardID]: {errors: null, isLoading: false}});
}

/**
 * Clears the PIN for an activated card
 */
function clearActivatedCardPin() {
    Onyx.set(ONYXKEYS.ACTIVATED_CARD_PIN, '');
}

function clearReportVirtualCardFraudForm() {
    Onyx.merge(ONYXKEYS.FORMS.REPORT_VIRTUAL_CARD_FRAUD, {cardID: null, isLoading: false, errors: null});
}

/**
 * Makes an API call to get virtual card details (pan, cvv, expiration date, address)
 * This function purposefully uses `makeRequestWithSideEffects` method. For security reason
 * card details cannot be persisted in Onyx and have to be asked for each time a user want's to
 * reveal them.
 *
 * @param cardID - virtual card ID
 *
 * @returns promise with card details object
 */
function revealVirtualCardDetails(cardID: number, validateCode: string): Promise<ExpensifyCardDetails> {
    return new Promise((resolve, reject) => {
        const parameters: RevealExpensifyCardDetailsParams = {cardID, validateCode};

        const optimisticData: OnyxUpdate[] = [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.ACCOUNT,
                value: {isLoading: true},
            },
        ];

        const successData: OnyxUpdate[] = [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.ACCOUNT,
                value: {isLoading: false},
            },
        ];

        const failureData: OnyxUpdate[] = [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.ACCOUNT,
                value: {isLoading: false},
            },
        ];

        // eslint-disable-next-line rulesdir/no-api-side-effects-method
        API.makeRequestWithSideEffects(SIDE_EFFECT_REQUEST_COMMANDS.REVEAL_EXPENSIFY_CARD_DETAILS, parameters, {
            optimisticData,
            successData,
            failureData,
        })
            .then((response) => {
                if (response?.jsonCode !== CONST.JSON_CODE.SUCCESS) {
                    if (response?.jsonCode === CONST.JSON_CODE.INCORRECT_MAGIC_CODE) {
                        // eslint-disable-next-line prefer-promise-reject-errors
                        reject('validateCodeForm.error.incorrectMagicCode');
                        return;
                    }

                    // eslint-disable-next-line prefer-promise-reject-errors
                    reject('cardPage.cardDetailsLoadingFailure');
                    return;
                }
                resolve(response as ExpensifyCardDetails);
            })
            // eslint-disable-next-line prefer-promise-reject-errors
            .catch(() => reject('cardPage.cardDetailsLoadingFailure'));
    });
}

function toggleContinuousReconciliation(workspaceAccountID: number, shouldUseContinuousReconciliation: boolean, connectionName: ConnectionName, oldConnectionName?: ConnectionName) {
    const parameters = shouldUseContinuousReconciliation
        ? {
              workspaceAccountID,
              shouldUseContinuousReconciliation,
              expensifyCardContinuousReconciliationConnection: connectionName,
          }
        : {
              workspaceAccountID,
              shouldUseContinuousReconciliation,
          };

    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.EXPENSIFY_CARD_USE_CONTINUOUS_RECONCILIATION}${workspaceAccountID}`,
            value: shouldUseContinuousReconciliation,
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.EXPENSIFY_CARD_CONTINUOUS_RECONCILIATION_CONNECTION}${workspaceAccountID}`,
            value: connectionName,
        },
    ];

    const successData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.EXPENSIFY_CARD_USE_CONTINUOUS_RECONCILIATION}${workspaceAccountID}`,
            value: shouldUseContinuousReconciliation,
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.EXPENSIFY_CARD_CONTINUOUS_RECONCILIATION_CONNECTION}${workspaceAccountID}`,
            value: connectionName,
        },
    ];

    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.EXPENSIFY_CARD_USE_CONTINUOUS_RECONCILIATION}${workspaceAccountID}`,
            value: !shouldUseContinuousReconciliation,
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.EXPENSIFY_CARD_CONTINUOUS_RECONCILIATION_CONNECTION}${workspaceAccountID}`,
            value: oldConnectionName ?? null,
        },
    ];

    API.write(WRITE_COMMANDS.TOGGLE_CARD_CONTINUOUS_RECONCILIATION, parameters, {
        optimisticData,
        successData,
        failureData,
    });
}

function updateSelectedFeed(feed: CompanyCardFeed, policyID: string | undefined) {
    if (!policyID) {
        return;
    }

    Onyx.update([
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.LAST_SELECTED_FEED}${policyID}`,
            value: feed,
        },
    ]);
}

export {
    requestReplacementExpensifyCard,
    activatePhysicalExpensifyCard,
    clearCardListErrors,
    clearReportVirtualCardFraudForm,
    reportVirtualExpensifyCardFraud,
    revealVirtualCardDetails,
    clearActivatedCardPin,
    toggleContinuousReconciliation,
    updateSelectedFeed,
};
export type {ReplacementReason};
