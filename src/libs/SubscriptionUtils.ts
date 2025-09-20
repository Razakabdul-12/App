import {fromUnixTime, isAfter} from 'date-fns';
import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import {isPolicyOwner} from '@libs/PolicyUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {BillingGraceEndPeriod, Policy} from '@src/types/onyx';

let currentUserAccountID = CONST.DEFAULT_NUMBER_ID;
Onyx.connect({
    key: ONYXKEYS.SESSION,
    callback: (value) => {
        currentUserAccountID = value?.accountID ?? CONST.DEFAULT_NUMBER_ID;
    },
});

let amountOwed: OnyxEntry<number>;
Onyx.connect({
    key: ONYXKEYS.NVP_PRIVATE_AMOUNT_OWED,
    callback: (value) => {
        amountOwed = value;
    },
});

let ownerBillingGraceEndPeriod: OnyxEntry<number>;
Onyx.connect({
    key: ONYXKEYS.NVP_PRIVATE_OWNER_BILLING_GRACE_PERIOD_END,
    callback: (value) => {
        ownerBillingGraceEndPeriod = value;
    },
});

let userBillingGraceEndPeriodCollection: OnyxCollection<BillingGraceEndPeriod>;
Onyx.connect({
    key: ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END,
    callback: (value) => {
        userBillingGraceEndPeriodCollection = value;
    },
    waitForCollectionCallback: true,
});

let allPolicies: OnyxCollection<Policy>;
Onyx.connect({
    key: ONYXKEYS.COLLECTION.POLICY,
    callback: (value) => {
        allPolicies = value;
    },
    waitForCollectionCallback: true,
});

/**
 * Whether the user's billable actions should be restricted.
 */
function shouldRestrictUserBillableActions(policyID: string): boolean {
    const currentDate = new Date();

    const policy = allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`];

    // This logic will be executed if the user is a workspace's non-owner (normal user or admin).
    // We should restrict the workspace's non-owner actions if it's member of a workspace where the owner is
    // past due and is past its grace period end.
    for (const [entryKey, userBillingGracePeriodEnd] of Object.entries(userBillingGraceEndPeriodCollection ?? {})) {
        if (!userBillingGracePeriodEnd) {
            continue;
        }

        if (isAfter(currentDate, fromUnixTime(userBillingGracePeriodEnd.value))) {
            // Extracts the owner account ID from the collection member key.
            const ownerAccountID = Number(entryKey.slice(ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END.length));

            if (isPolicyOwner(policy, ownerAccountID)) {
                return true;
            }
        }
    }

    // If it reached here it means that the user is actually the workspace's owner.
    // We should restrict the workspace's owner actions if it's past its grace period end date and it's owing some amount.
    if (
        isPolicyOwner(policy, currentUserAccountID) &&
        ownerBillingGraceEndPeriod &&
        amountOwed !== undefined &&
        amountOwed > 0 &&
        isAfter(currentDate, fromUnixTime(ownerBillingGraceEndPeriod))
    ) {
        return true;
    }

    return false;
}

export {shouldRestrictUserBillableActions};
