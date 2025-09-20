import type {OnyxCollection} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import * as PolicyUtils from '@libs/PolicyUtils';
import {getTagArrayFromName} from '@libs/TransactionUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PolicyTagLists} from '@src/types/onyx';
import type RecentlyUsedTags from '@src/types/onyx/RecentlyUsedTags';

let allPolicyTags: OnyxCollection<PolicyTagLists> = {};
Onyx.connect({
    key: ONYXKEYS.COLLECTION.POLICY_TAGS,
    waitForCollectionCallback: true,
    callback: (value) => {
        allPolicyTags = value ?? {};
    },
});

let allRecentlyUsedTags: OnyxCollection<RecentlyUsedTags> = {};
Onyx.connect({
    key: ONYXKEYS.COLLECTION.POLICY_RECENTLY_USED_TAGS,
    waitForCollectionCallback: true,
    callback: (val) => {
        allRecentlyUsedTags = val ?? {};
    },
});

function buildOptimisticPolicyRecentlyUsedTags(policyID?: string, transactionTags?: string): RecentlyUsedTags {
    if (!policyID || !transactionTags) {
        return {};
    }

    const policyTags = allPolicyTags?.[`${ONYXKEYS.COLLECTION.POLICY_TAGS}${policyID}`] ?? {};
    const policyTagKeys = PolicyUtils.getSortedTagKeys(policyTags);
    const policyRecentlyUsedTags = allRecentlyUsedTags?.[`${ONYXKEYS.COLLECTION.POLICY_RECENTLY_USED_TAGS}${policyID}`] ?? {};
    const newOptimisticPolicyRecentlyUsedTags: RecentlyUsedTags = {};

    getTagArrayFromName(transactionTags).forEach((tag, index) => {
        if (!tag) {
            return;
        }

        const tagListKey = policyTagKeys.at(index) ?? '';
        const existingTags = policyRecentlyUsedTags[tagListKey] ?? [];
        newOptimisticPolicyRecentlyUsedTags[tagListKey] = [...new Set([tag, ...existingTags])];
    });

    return newOptimisticPolicyRecentlyUsedTags;
}

function getPolicyTagsData(policyID: string | undefined) {
    return allPolicyTags?.[`${ONYXKEYS.COLLECTION.POLICY_TAGS}${policyID}`] ?? {};
}

export {buildOptimisticPolicyRecentlyUsedTags, getPolicyTagsData};
