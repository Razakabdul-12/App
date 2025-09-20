import HybridAppModule from '@expensify/react-native-hybrid-app';
import Onyx from 'react-native-onyx';
import type {OnyxEntry, OnyxUpdate} from 'react-native-onyx';
import * as API from '@libs/API';
import {SIDE_EFFECT_REQUEST_COMMANDS} from '@libs/API/types';
import * as ErrorUtils from '@libs/ErrorUtils';
import Log from '@libs/Log';
import * as NetworkStore from '@libs/Network/NetworkStore';
import * as SequentialQueue from '@libs/Network/SequentialQueue';
import CONFIG from '@src/CONFIG';
import ONYXKEYS from '@src/ONYXKEYS';
import type {DelegatedAccess} from '@src/types/onyx/Account';
import type Credentials from '@src/types/onyx/Credentials';
import type Response from '@src/types/onyx/Response';
import type Session from '@src/types/onyx/Session';
import {confirmReadyToOpenApp, openApp} from './App';
import {getCurrentUserAccountID} from './Report';
import updateSessionAuthTokens from './Session/updateSessionAuthTokens';
import updateSessionUser from './Session/updateSessionUser';

let credentials: Credentials = {};
Onyx.connect({
    key: ONYXKEYS.CREDENTIALS,
    callback: (value) => (credentials = value ?? {}),
});

let stashedCredentials: Credentials = {};
Onyx.connect({
    key: ONYXKEYS.STASHED_CREDENTIALS,
    callback: (value) => (stashedCredentials = value ?? {}),
});

let session: Session = {};
Onyx.connect({
    key: ONYXKEYS.SESSION,
    callback: (value) => (session = value ?? {}),
});

let stashedSession: Session = {};
Onyx.connect({
    key: ONYXKEYS.STASHED_SESSION,
    callback: (value) => (stashedSession = value ?? {}),
});

let activePolicyID: OnyxEntry<string>;
Onyx.connect({
    key: ONYXKEYS.NVP_ACTIVE_POLICY_ID,
    callback: (newActivePolicyID) => {
        activePolicyID = newActivePolicyID;
    },
});

const KEYS_TO_PRESERVE_DELEGATE_ACCESS = [
    ONYXKEYS.NVP_TRY_FOCUS_MODE,
    ONYXKEYS.PREFERRED_THEME,
    ONYXKEYS.NVP_PREFERRED_LOCALE,
    ONYXKEYS.ARE_TRANSLATIONS_LOADING,
    ONYXKEYS.SESSION,
    ONYXKEYS.STASHED_SESSION,
    ONYXKEYS.HAS_LOADED_APP,
    ONYXKEYS.STASHED_CREDENTIALS,
    ONYXKEYS.HYBRID_APP,

    // We need to preserve the sidebar loaded state since we never unmount the sidebar when connecting as a delegate
    // This allows the report screen to load correctly when the delegate token expires and the delegate is returned to their original account.
    ONYXKEYS.IS_SIDEBAR_LOADED,
    ONYXKEYS.NETWORK,
    ONYXKEYS.SHOULD_USE_STAGING_SERVER,
    ONYXKEYS.IS_DEBUG_MODE_ENABLED,
];

type WithDelegatedAccess = {
    // Optional keeps call sites clean, but still encourages passing `account?.delegatedAccess`.
    delegatedAccess: DelegatedAccess | undefined;
};

type WithOldDotFlag = {
    isFromOldDot?: boolean;
};

// Clear delegator-level errors
type ClearDelegatorErrorsParams = WithDelegatedAccess;

// Is connected as delegate?
type IsConnectedAsDelegateParams = WithDelegatedAccess;

// Connect as delegate
type ConnectParams = WithDelegatedAccess & WithOldDotFlag & {email: string};

/**
 * Connects the user as a delegate to another account.
 * Returns a Promise that resolves to true on success, false on failure, or undefined if not applicable.
 */
function connect({email, delegatedAccess, isFromOldDot = false}: ConnectParams) {
    if (!delegatedAccess?.delegators && !isFromOldDot) {
        return;
    }

    Onyx.set(ONYXKEYS.STASHED_CREDENTIALS, credentials);
    Onyx.set(ONYXKEYS.STASHED_SESSION, session);

    const previousAccountID = getCurrentUserAccountID();

    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                delegatedAccess: {
                    errorFields: {
                        connect: {
                            [email]: null,
                        },
                    },
                },
            },
        },
    ];

    const successData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                delegatedAccess: {
                    errorFields: {
                        connect: {
                            [email]: null,
                        },
                    },
                },
            },
        },
    ];

    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                delegatedAccess: {
                    errorFields: {
                        connect: {
                            [email]: ErrorUtils.getMicroSecondOnyxErrorWithTranslationKey('delegate.genericError'),
                        },
                    },
                },
            },
        },
    ];

    // We need to access the authToken directly from the response to update the session
    // eslint-disable-next-line rulesdir/no-api-side-effects-method
    return API.makeRequestWithSideEffects(SIDE_EFFECT_REQUEST_COMMANDS.CONNECT_AS_DELEGATE, {to: email}, {optimisticData, successData, failureData})
        .then((response) => {
            if (!response?.restrictedToken || !response?.encryptedAuthToken) {
                Log.alert('[Delegate] No auth token returned while connecting as a delegate');
                Onyx.update(failureData);
                return;
            }
            if (!activePolicyID && CONFIG.IS_HYBRID_APP) {
                Log.alert('[Delegate] Unable to access activePolicyID');
                Onyx.update(failureData);
                return;
            }
            const restrictedToken = response.restrictedToken;
            const policyID = activePolicyID;

            return SequentialQueue.waitForIdle()
                .then(() => Onyx.clear(KEYS_TO_PRESERVE_DELEGATE_ACCESS))
                .then(() => {
                    // Update authToken in Onyx and in our local variables so that API requests will use the new authToken
                    updateSessionAuthTokens(response?.restrictedToken, response?.encryptedAuthToken);

                    NetworkStore.setAuthToken(response?.restrictedToken ?? null);
                    confirmReadyToOpenApp();
                    return openApp().then(() => {
                        if (!CONFIG.IS_HYBRID_APP || !policyID) {
                            return true;
                        }
                        HybridAppModule.switchAccount({
                            newDotCurrentAccountEmail: email,
                            authToken: restrictedToken,
                            policyID,
                            accountID: String(previousAccountID),
                        });
                        return true;
                    });
                });
        })
        .catch((error) => {
            Log.alert('[Delegate] Error connecting as delegate', {error});
            Onyx.update(failureData);
            return false;
        });
}

function disconnect() {
    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                delegatedAccess: {
                    errorFields: {disconnect: null},
                },
            },
        },
    ];

    const successData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                delegatedAccess: {
                    errorFields: undefined,
                },
            },
        },
    ];

    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.ACCOUNT,
            value: {
                delegatedAccess: {
                    errorFields: {disconnect: ErrorUtils.getMicroSecondOnyxErrorWithTranslationKey('delegate.genericError')},
                },
            },
        },
    ];

    // We need to access the authToken directly from the response to update the session
    // eslint-disable-next-line rulesdir/no-api-side-effects-method
    API.makeRequestWithSideEffects(SIDE_EFFECT_REQUEST_COMMANDS.DISCONNECT_AS_DELEGATE, {}, {optimisticData, successData, failureData})
        .then((response) => {
            if (!response?.authToken || !response?.encryptedAuthToken) {
                Log.alert('[Delegate] No auth token returned while disconnecting as a delegate');
                restoreDelegateSession(stashedSession);
                return;
            }

            if (!response?.requesterID || !response?.requesterEmail) {
                Log.alert('[Delegate] No requester data returned while disconnecting as a delegate');
                restoreDelegateSession(stashedSession);
                return;
            }

            const requesterEmail = response.requesterEmail;
            const authToken = response.authToken;
            return SequentialQueue.waitForIdle()
                .then(() => Onyx.clear(KEYS_TO_PRESERVE_DELEGATE_ACCESS))
                .then(() => {
                    Onyx.set(ONYXKEYS.CREDENTIALS, {
                        ...stashedCredentials,
                        accountID: response.requesterID,
                    });
                    Onyx.set(ONYXKEYS.SESSION, {
                        ...stashedSession,
                        accountID: response.requesterID,
                        email: requesterEmail,
                        authToken,
                        encryptedAuthToken: response.encryptedAuthToken,
                    });
                    Onyx.set(ONYXKEYS.STASHED_CREDENTIALS, {});
                    Onyx.set(ONYXKEYS.STASHED_SESSION, {});

                    NetworkStore.setAuthToken(response?.authToken ?? null);

                    confirmReadyToOpenApp();
                    openApp().then(() => {
                        if (!CONFIG.IS_HYBRID_APP) {
                            return;
                        }
                        HybridAppModule.switchAccount({
                            newDotCurrentAccountEmail: requesterEmail,
                            authToken,
                            policyID: '',
                            accountID: '',
                        });
                    });
                });
        })
        .catch((error) => {
            Log.alert('[Delegate] Error disconnecting as a delegate', {error});
        });
}

function clearDelegatorErrors({delegatedAccess}: ClearDelegatorErrorsParams) {
    if (!delegatedAccess?.delegators) {
        return;
    }
    Onyx.merge(ONYXKEYS.ACCOUNT, {delegatedAccess: {delegators: delegatedAccess.delegators.map((delegator) => ({...delegator, errorFields: undefined}))}});
}

function isConnectedAsDelegate({delegatedAccess}: IsConnectedAsDelegateParams) {
    return !!delegatedAccess?.delegate;
}

function restoreDelegateSession(authenticateResponse: Response) {
    Onyx.clear(KEYS_TO_PRESERVE_DELEGATE_ACCESS).then(() => {
        updateSessionAuthTokens(authenticateResponse?.authToken, authenticateResponse?.encryptedAuthToken);
        updateSessionUser(authenticateResponse?.accountID, authenticateResponse?.email);

        NetworkStore.setAuthToken(authenticateResponse.authToken ?? null);
        NetworkStore.setIsAuthenticating(false);

        confirmReadyToOpenApp();
        openApp();
    });
}

export {
    connect,
    disconnect,
    clearDelegatorErrors,
    restoreDelegateSession,
    isConnectedAsDelegate,
    KEYS_TO_PRESERVE_DELEGATE_ACCESS,
};
