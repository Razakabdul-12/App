import type {RefObject} from 'react';
import React, {useContext, useMemo, useRef, useState} from 'react';
import type {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import AccountingConnectionConfirmationModal from '@components/AccountingConnectionConfirmationModal';
import useLocalize from '@hooks/useLocalize';
import {removePolicyConnection} from '@libs/actions/connections';
import {getAdminPoliciesConnectedToSageIntacct} from '@libs/actions/Policy/Policy';
import Navigation from '@libs/Navigation/Navigation';
import navigateToSubscription from '@navigation/helpers/navigateToSubscription';
import {isControlPolicy} from '@libs/PolicyUtils';
import getPlatform from '@libs/getPlatform';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {ConnectionName} from '@src/types/onyx/Policy';
import type Policy from '@src/types/onyx/Policy';
import type ChildrenProps from '@src/types/utils/ChildrenProps';
import {getAccountingIntegrationData} from './utils';

type ActiveIntegration = {
    name: ConnectionName;
    shouldDisconnectIntegrationBeforeConnecting?: boolean;
    integrationToDisconnect?: ConnectionName;
};

type ActiveIntegrationState = ActiveIntegration & {key: number};

type AccountingContextType = {
    activeIntegration?: ActiveIntegration;
    startIntegrationFlow: (activeIntegration: ActiveIntegration) => void;

    /*
     * This stores refs to integration buttons, so the PopoverMenu can be positioned correctly
     */
    popoverAnchorRefs: RefObject<Record<string, RefObject<View | null>>>;
};

const popoverAnchorRefsInitialValue = Object.values(CONST.POLICY.CONNECTIONS.NAME).reduce(
    (acc, key) => {
        acc[key] = {current: null};
        return acc;
    },
    {} as Record<ConnectionName, RefObject<View | null>>,
);

const defaultAccountingContext = {
    activeIntegration: undefined,
    startIntegrationFlow: () => {},
    popoverAnchorRefs: {
        current: popoverAnchorRefsInitialValue,
    },
};

const AccountingContext = React.createContext<AccountingContextType>(defaultAccountingContext);

type AccountingContextProviderProps = ChildrenProps & {
    policy: OnyxEntry<Policy>;
};

function AccountingContextProvider({children, policy}: AccountingContextProviderProps) {
    const popoverAnchorRefs = useRef<Record<string, RefObject<View | null>>>(defaultAccountingContext.popoverAnchorRefs.current);
    const [activeIntegration, setActiveIntegration] = useState<ActiveIntegrationState>();
    const {translate} = useLocalize();
    const policyID = policy?.id;

    const startIntegrationFlow = React.useCallback(
        (newActiveIntegration: ActiveIntegration) => {
            if (!policyID) {
                return;
            }

            const shouldPromptForSubscription =
                !isControlPolicy(policy) &&
                [
                    CONST.POLICY.CONNECTIONS.NAME.NETSUITE,
                    CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT,
                    CONST.POLICY.CONNECTIONS.NAME.QBD,
                ].includes(newActiveIntegration.name);

            if (shouldPromptForSubscription) {
                const {integrationToDisconnect, shouldDisconnectIntegrationBeforeConnecting} = newActiveIntegration;
                let backToRoute: string | undefined;

                switch (newActiveIntegration.name) {
                    case CONST.POLICY.CONNECTIONS.NAME.NETSUITE:
                        backToRoute = integrationToDisconnect
                            ? ROUTES.POLICY_ACCOUNTING.getRoute(
                                  policyID,
                                  newActiveIntegration.name,
                                  integrationToDisconnect,
                                  shouldDisconnectIntegrationBeforeConnecting,
                              )
                            : ROUTES.POLICY_ACCOUNTING_NETSUITE_TOKEN_INPUT.getRoute(policyID);
                        break;
                    case CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT: {
                        if (integrationToDisconnect) {
                            backToRoute = ROUTES.POLICY_ACCOUNTING.getRoute(
                                policyID,
                                newActiveIntegration.name,
                                integrationToDisconnect,
                                shouldDisconnectIntegrationBeforeConnecting,
                            );
                            break;
                        }

                        const hasPoliciesConnectedToSageIntacct = !!getAdminPoliciesConnectedToSageIntacct().length;
                        backToRoute = hasPoliciesConnectedToSageIntacct
                            ? ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_EXISTING_CONNECTIONS.getRoute(policyID)
                            : ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_PREREQUISITES.getRoute(policyID);
                        break;
                    }
                    case CONST.POLICY.CONNECTIONS.NAME.QBD: {
                        if (integrationToDisconnect) {
                            backToRoute = ROUTES.POLICY_ACCOUNTING.getRoute(
                                policyID,
                                newActiveIntegration.name,
                                integrationToDisconnect,
                                shouldDisconnectIntegrationBeforeConnecting,
                            );
                            break;
                        }

                        const platform = getPlatform(true);
                        const isMobile = [CONST.PLATFORM.MOBILE_WEB, CONST.PLATFORM.IOS, CONST.PLATFORM.ANDROID].some((value) => value === platform);
                        backToRoute = isMobile
                            ? ROUTES.POLICY_ACCOUNTING_QUICKBOOKS_DESKTOP_SETUP_REQUIRED_DEVICE_MODAL.getRoute(policyID)
                            : ROUTES.POLICY_ACCOUNTING_QUICKBOOKS_DESKTOP_SETUP_MODAL.getRoute(policyID);
                        break;
                    }
                    default:
                        backToRoute = undefined;
                }

                navigateToSubscription(backToRoute);
                return;
            }
            setActiveIntegration({
                ...newActiveIntegration,
                key: Math.random(),
            });
        },
        [policy, policyID, translate],
    );

    const closeConfirmationModal = () => {
        setActiveIntegration((prev) => {
            if (prev) {
                return {
                    ...prev,
                    shouldDisconnectIntegrationBeforeConnecting: false,
                    integrationToDisconnect: undefined,
                };
            }
            return undefined;
        });
    };

    const accountingContext = useMemo(
        () => ({
            activeIntegration,
            startIntegrationFlow,
            popoverAnchorRefs,
        }),
        [activeIntegration, startIntegrationFlow],
    );

    const renderActiveIntegration = () => {
        if (!policyID || !activeIntegration) {
            return null;
        }

        return getAccountingIntegrationData(activeIntegration.name, policyID, translate, policy, activeIntegration.key)?.setupConnectionFlow;
    };

    const shouldShowConfirmationModal = !!activeIntegration?.shouldDisconnectIntegrationBeforeConnecting && !!activeIntegration?.integrationToDisconnect;

    return (
        <AccountingContext.Provider value={accountingContext}>
            {children}
            {!shouldShowConfirmationModal && renderActiveIntegration()}
            {shouldShowConfirmationModal && (
                <AccountingConnectionConfirmationModal
                    onConfirm={() => {
                        if (!policyID || !activeIntegration?.integrationToDisconnect) {
                            return;
                        }
                        removePolicyConnection(policy, activeIntegration?.integrationToDisconnect);
                        closeConfirmationModal();
                    }}
                    integrationToConnect={activeIntegration?.name}
                    onCancel={() => {
                        setActiveIntegration(undefined);
                    }}
                />
            )}
        </AccountingContext.Provider>
    );
}

function useAccountingContext() {
    return useContext(AccountingContext);
}

export default AccountingContext;
export {AccountingContextProvider, useAccountingContext};
