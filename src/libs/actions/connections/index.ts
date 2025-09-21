import {differenceInMinutes, isValid, parseISO} from 'date-fns';
import type {OnyxEntry, OnyxUpdate} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import * as API from '@libs/API';
import type {RemovePolicyConnectionParams, UpdateManyPolicyConnectionConfigurationsParams} from '@libs/API/parameters';
import {READ_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import * as ErrorUtils from '@libs/ErrorUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ConnectionName, Connections, PolicyConnectionName, PolicyConnectionSyncProgress} from '@src/types/onyx/Policy';
import type Policy from '@src/types/onyx/Policy';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

function removePolicyConnection(policy: Policy, connectionName: PolicyConnectionName) {
    const policyID = policy.id;
    const workspaceAccountID = policy?.workspaceAccountID ?? CONST.DEFAULT_NUMBER_ID;

    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    [connectionName]: null,
                },
            },
        },
        {
            onyxMethod: Onyx.METHOD.SET,
            key: `${ONYXKEYS.COLLECTION.POLICY_CONNECTION_SYNC_PROGRESS}${policyID}`,
            value: null,
        },
        {
            onyxMethod: Onyx.METHOD.SET,
            key: `${ONYXKEYS.COLLECTION.EXPENSIFY_CARD_CONTINUOUS_RECONCILIATION_CONNECTION}${workspaceAccountID}`,
            value: null,
        },
        {
            onyxMethod: Onyx.METHOD.SET,
            key: `${ONYXKEYS.COLLECTION.EXPENSIFY_CARD_USE_CONTINUOUS_RECONCILIATION}${workspaceAccountID}`,
            value: null,
        },
    ];

    const successData: OnyxUpdate[] = [];
    const failureData: OnyxUpdate[] = [];
    const parameters: RemovePolicyConnectionParams = {
        policyID,
        connectionName,
    };
    API.write(WRITE_COMMANDS.REMOVE_POLICY_CONNECTION, parameters, {optimisticData, successData, failureData});
}

/**
 * This method returns read command and stage in progress for a given accounting integration.
 *
 * @param policyID - ID of the policy for which the sync is needed
 * @param connectionName - Name of the connection
 */
function getSyncConnectionParameters(connectionName: PolicyConnectionName) {
    return undefined;
}

/**
 * This method helps in syncing policy to the connected accounting integration.
 *
 * @param policy - Policy for which the sync is needed
 * @param connectionName - Name of the connection
 * @param forceDataRefresh - If true, it will trigger a full data refresh
 */
function syncConnection(policy: Policy | undefined, connectionName: PolicyConnectionName | undefined, _forceDataRefresh = false) {
    if (!connectionName || !policy) {
        return;
    }
    const syncConnectionData = getSyncConnectionParameters(connectionName);

    if (!syncConnectionData) {
        return;
    }
    const policyID = policy.id;
    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY_CONNECTION_SYNC_PROGRESS}${policyID}`,
            value: {
                stageInProgress: syncConnectionData?.stageInProgress,
                connectionName,
                timestamp: new Date().toISOString(),
            },
        },
    ];

    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.SET,
            key: `${ONYXKEYS.COLLECTION.POLICY_CONNECTION_SYNC_PROGRESS}${policyID}`,
            value: null,
        },
    ];

    const parameters = {
        policyID,
        idempotencyKey: policyID,
    };

    API.read(syncConnectionData.readCommand, parameters, {
        optimisticData,
        failureData,
    });
}

function updateManyPolicyConnectionConfigs<TConnectionName extends ConnectionName, TConfigUpdate extends Partial<Connections[TConnectionName]['config']>>(
    policyID: string | undefined,
    connectionName: TConnectionName,
    configUpdate: TConfigUpdate,
    configCurrentData: TConfigUpdate,
) {
    if (!policyID) {
        return;
    }
    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    [connectionName]: {
                        config: {
                            ...configUpdate,
                            pendingFields: Object.fromEntries(Object.keys(configUpdate).map((settingName) => [settingName, CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE])),
                            errorFields: Object.fromEntries(Object.keys(configUpdate).map((settingName) => [settingName, null])),
                        },
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
                connections: {
                    [connectionName]: {
                        config: {
                            ...configCurrentData,
                            pendingFields: Object.fromEntries(Object.keys(configUpdate).map((settingName) => [settingName, null])),
                            errorFields: Object.fromEntries(
                                Object.keys(configUpdate).map((settingName) => [settingName, ErrorUtils.getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage')]),
                            ),
                        },
                    },
                },
            },
        },
    ];

    const successData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    [connectionName]: {
                        config: {
                            pendingFields: Object.fromEntries(Object.keys(configUpdate).map((settingName) => [settingName, null])),
                            errorFields: Object.fromEntries(Object.keys(configUpdate).map((settingName) => [settingName, null])),
                        },
                    },
                },
            },
        },
    ];

    const parameters: UpdateManyPolicyConnectionConfigurationsParams = {
        policyID,
        connectionName,
        configUpdate: JSON.stringify(configUpdate),
        idempotencyKey: Object.keys(configUpdate).join(','),
    };
    API.write(WRITE_COMMANDS.UPDATE_MANY_POLICY_CONNECTION_CONFIGS, parameters, {optimisticData, failureData, successData});
}

function hasSynchronizationErrorMessage(policy: OnyxEntry<Policy>, connectionName: PolicyConnectionName, isSyncInProgress: boolean): boolean {
    const connection = policy?.connections?.[connectionName];

    if (isSyncInProgress || isEmptyObject(connection?.lastSync) || connection?.lastSync?.isSuccessful !== false || !connection?.lastSync?.errorDate) {
        return false;
    }
    return true;
}

function isAuthenticationError(policy: OnyxEntry<Policy>, connectionName: PolicyConnectionName) {
    const connection = policy?.connections?.[connectionName];
    return connection?.lastSync?.isAuthenticationError === true;
}

function isConnectionUnverified(policy: OnyxEntry<Policy>, connectionName: PolicyConnectionName): boolean {
    // A verified connection is one that has been successfully synced at least once
    // We'll always err on the side of considering a connection as verified connected even if we can't find a lastSync property saying as such
    // i.e. this is a property that is explicitly set to false, not just missing
    // If the connection has no lastSync property, we'll consider it unverified
    if (isEmptyObject(policy?.connections?.[connectionName]?.lastSync)) {
        return true;
    }

    return !(policy?.connections?.[connectionName]?.lastSync?.isConnected ?? true);
}

function setConnectionError(policyID: string, connectionName: PolicyConnectionName, errorMessage?: string) {
    Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
        connections: {
            [connectionName]: {
                lastSync: {
                    isSuccessful: false,
                    isConnected: false,
                    errorDate: new Date().toISOString(),
                    errorMessage,
                },
            },
        },
    });
}

function copyExistingPolicyConnection(connectedPolicyID: string, targetPolicyID: string, connectionName: ConnectionName) {
    const stageInProgress = null;

    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY_CONNECTION_SYNC_PROGRESS}${targetPolicyID}`,
            value: {
                stageInProgress,
                connectionName,
                timestamp: new Date().toISOString(),
            },
        },
    ];
    API.write(
        WRITE_COMMANDS.COPY_EXISTING_POLICY_CONNECTION,
        {
            policyID: connectedPolicyID,
            targetPolicyID,
            connectionName,
        },
        {optimisticData},
    );
}

function isConnectionInProgress(connectionSyncProgress: OnyxEntry<PolicyConnectionSyncProgress>, policy?: OnyxEntry<Policy>): boolean {
    if (!policy || !connectionSyncProgress) {
        return false;
    }

    const lastSyncProgressDate = parseISO(connectionSyncProgress?.timestamp ?? '');
    return (
        !!connectionSyncProgress?.stageInProgress &&
        (connectionSyncProgress.stageInProgress !== CONST.POLICY.CONNECTIONS.SYNC_STAGE_NAME.JOB_DONE || !policy?.connections?.[connectionSyncProgress.connectionName]) &&
        isValid(lastSyncProgressDate) &&
        differenceInMinutes(new Date(), lastSyncProgressDate) < CONST.POLICY.CONNECTIONS.SYNC_STAGE_TIMEOUT_MINUTES
    );
}

export {
    removePolicyConnection,
    updateManyPolicyConnectionConfigs,
    isAuthenticationError,
    syncConnection,
    copyExistingPolicyConnection,
    isConnectionUnverified,
    isConnectionInProgress,
    hasSynchronizationErrorMessage,
    setConnectionError,
};
