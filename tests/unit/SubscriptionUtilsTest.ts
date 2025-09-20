import {addDays, getUnixTime, subDays} from 'date-fns';
import Onyx from 'react-native-onyx';
import {shouldRestrictUserBillableActions} from '@libs/SubscriptionUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import createRandomPolicy from '../utils/collections/policies';

const billingGraceEndPeriod = {
    value: 0,
};

describe('SubscriptionUtils', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
    });

    describe('shouldRestrictUserBillableActions', () => {
        it('should return false if the policy is not found', async () => {
            await Onyx.multiSet({
                [ONYXKEYS.SESSION]: {email: '', accountID: 1},
            });

            expect(shouldRestrictUserBillableActions('1')).toBeFalsy();
        });

        it('should return false if the user is a non-owner of a workspace that is not in the shared NVP collection', async () => {
            const policyID = '1001';
            const ownerAccountID = 2001;

            await Onyx.multiSet({
                [`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END}${ownerAccountID}` as const]: {
                    ...billingGraceEndPeriod,
                    value: getUnixTime(subDays(new Date(), 3)),
                },
                [`${ONYXKEYS.COLLECTION.POLICY}${policyID}` as const]: {
                    ...createRandomPolicy(Number(policyID)),
                    ownerAccountID: 2002,
                },
            });

            expect(shouldRestrictUserBillableActions(policyID)).toBeFalsy();
        });

        it("should return false if the user is a workspace's non-owner that is not past due billing", async () => {
            const policyID = '1001';
            const ownerAccountID = 2001;

            await Onyx.multiSet({
                [`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END}${ownerAccountID}` as const]: {
                    ...billingGraceEndPeriod,
                    value: getUnixTime(addDays(new Date(), 3)),
                },
                [`${ONYXKEYS.COLLECTION.POLICY}${policyID}` as const]: {
                    ...createRandomPolicy(Number(policyID)),
                    ownerAccountID,
                },
            });

            expect(shouldRestrictUserBillableActions(policyID)).toBeFalsy();
        });

        it("should return true if the user is a workspace's non-owner that is past due billing", async () => {
            const policyID = '1001';
            const ownerAccountID = 2001;

            await Onyx.multiSet({
                [`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END}${ownerAccountID}` as const]: {
                    ...billingGraceEndPeriod,
                    value: getUnixTime(subDays(new Date(), 3)),
                },
                [`${ONYXKEYS.COLLECTION.POLICY}${policyID}` as const]: {
                    ...createRandomPolicy(Number(policyID)),
                    ownerAccountID,
                },
            });

            expect(shouldRestrictUserBillableActions(policyID)).toBeTruthy();
        });

        it("should return false if the user is the workspace's owner but is not past due billing", async () => {
            const accountID = 1;
            const policyID = '1001';

            await Onyx.multiSet({
                [ONYXKEYS.SESSION]: {email: '', accountID},
                [ONYXKEYS.NVP_PRIVATE_OWNER_BILLING_GRACE_PERIOD_END]: getUnixTime(addDays(new Date(), 3)),
                [`${ONYXKEYS.COLLECTION.POLICY}${policyID}` as const]: {
                    ...createRandomPolicy(Number(policyID)),
                    ownerAccountID: accountID,
                },
            });

            expect(shouldRestrictUserBillableActions(policyID)).toBeFalsy();
        });

        it("should return false if the user is the workspace's owner that is past due billing but isn't owing any amount", async () => {
            const accountID = 1;
            const policyID = '1001';

            await Onyx.multiSet({
                [ONYXKEYS.SESSION]: {email: '', accountID},
                [ONYXKEYS.NVP_PRIVATE_OWNER_BILLING_GRACE_PERIOD_END]: getUnixTime(subDays(new Date(), 3)),
                [ONYXKEYS.NVP_PRIVATE_AMOUNT_OWED]: 0,
                [`${ONYXKEYS.COLLECTION.POLICY}${policyID}` as const]: {
                    ...createRandomPolicy(Number(policyID)),
                    ownerAccountID: accountID,
                },
            });

            expect(shouldRestrictUserBillableActions(policyID)).toBeFalsy();
        });

        it("should return true if the user is the workspace's owner that is past due billing and is owing some amount", async () => {
            const accountID = 1;
            const policyID = '1001';

            await Onyx.multiSet({
                [ONYXKEYS.SESSION]: {email: '', accountID},
                [ONYXKEYS.NVP_PRIVATE_OWNER_BILLING_GRACE_PERIOD_END]: getUnixTime(subDays(new Date(), 3)),
                [ONYXKEYS.NVP_PRIVATE_AMOUNT_OWED]: 8010,
                [`${ONYXKEYS.COLLECTION.POLICY}${policyID}` as const]: {
                    ...createRandomPolicy(Number(policyID)),
                    ownerAccountID: accountID,
                },
            });

            expect(shouldRestrictUserBillableActions(policyID)).toBeTruthy();
        });

        it("should return false if the user is past due billing but is not the workspace's owner", async () => {
            const accountID = 1;
            const policyID = '1001';

            await Onyx.multiSet({
                [ONYXKEYS.SESSION]: {email: '', accountID},
                [ONYXKEYS.NVP_PRIVATE_OWNER_BILLING_GRACE_PERIOD_END]: getUnixTime(subDays(new Date(), 3)),
                [ONYXKEYS.NVP_PRIVATE_AMOUNT_OWED]: 8010,
                [`${ONYXKEYS.COLLECTION.POLICY}${policyID}` as const]: {
                    ...createRandomPolicy(Number(policyID)),
                    ownerAccountID: 2,
                },
            });

            expect(shouldRestrictUserBillableActions(policyID)).toBeFalsy();
        });
    });
});
