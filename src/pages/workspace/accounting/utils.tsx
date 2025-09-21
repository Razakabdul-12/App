import React from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import type {LocaleContextProps} from '@components/LocaleContextProvider';
import Text from '@components/Text';
import TextLink from '@components/TextLink';
import {isAuthenticationError} from '@libs/actions/connections';
import {translateLocal} from '@libs/Localize';
import type {ThemeStyles} from '@styles/index';
import CONST from '@src/CONST';
import type {Policy} from '@src/types/onyx';
import type {PolicyConnectionName} from '@src/types/onyx/Policy';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import type {AccountingIntegration} from './types';

function getAccountingIntegrationData(
    _connectionName: PolicyConnectionName,
    _policyID: string,
    _translate: LocaleContextProps['translate'],
    _policy?: Policy,
    _key?: number,
): AccountingIntegration | undefined {
    return undefined;
}

function getSynchronizationErrorMessage(
    policy: OnyxEntry<Policy>,
    connectionName: PolicyConnectionName,
    isSyncInProgress: boolean,
    translate: LocaleContextProps['translate'],
    styles?: ThemeStyles,
): React.ReactNode | undefined {
    if (isAuthenticationError(policy, connectionName)) {
        return (
            <Text style={[styles?.formError]}>
                <Text style={[styles?.formError]}>{translate('workspace.common.authenticationError', {connectionName: CONST.POLICY.CONNECTIONS.NAME_USER_FRIENDLY[connectionName]})} </Text>
                {connectionName in CONST.POLICY.CONNECTIONS.AUTH_HELP_LINKS && (
                    <>
                        <TextLink
                            style={[styles?.link, styles?.fontSizeLabel]}
                            href={CONST.POLICY.CONNECTIONS.AUTH_HELP_LINKS[connectionName as keyof typeof CONST.POLICY.CONNECTIONS.AUTH_HELP_LINKS]}
                        >
                            {translate('workspace.common.learnMore')}
                        </TextLink>
                        .
                    </>
                )}
            </Text>
        );
    }

    const syncError = translateLocal('workspace.accounting.syncError', {connectionName});

    const connection = policy?.connections?.[connectionName];
    if (isSyncInProgress || isEmptyObject(connection?.lastSync) || connection?.lastSync?.isSuccessful !== false || !connection?.lastSync?.errorDate) {
        return;
    }

    return `${syncError} ("${connection?.lastSync?.errorMessage}")`;
}

export {getAccountingIntegrationData, getSynchronizationErrorMessage};
