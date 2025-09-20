import React, {useCallback, useMemo, useRef, useState} from 'react';
import Button from '@components/Button';
import ConfirmationPage from '@components/ConfirmationPage';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {usePersonalDetails} from '@components/OnyxListItemProvider';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import WorkspaceConfirmationForm from '@components/WorkspaceConfirmationForm';
import type {WorkspaceConfirmationSubmitFunctionParams} from '@components/WorkspaceConfirmationForm';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import type CreateWorkspaceParams from '@libs/API/parameters/CreateWorkspaceParams';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {MoneyRequestNavigatorParamList} from '@libs/Navigation/types';
import {getParticipantsOption} from '@libs/OptionsListUtils';
import {setCustomUnitRateID, setMoneyRequestParticipants} from '@userActions/IOU';
import CONST from '@src/CONST';
import * as Policy from '@src/libs/actions/Policy/Policy';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import {View} from 'react-native';

type IOURequestStepUpgradeProps = PlatformStackScreenProps<MoneyRequestNavigatorParamList, typeof SCREENS.MONEY_REQUEST.STEP_UPGRADE>;

function IOURequestStepUpgrade({
    route: {
        params: {transactionID, action, reportID, shouldSubmitExpense, upgradePath},
    },
}: IOURequestStepUpgradeProps) {
    const styles = useThemeStyles();

    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const personalDetails = usePersonalDetails();

    const [transaction] = useOnyx(`${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${transactionID}`, {canBeMissing: true});

    const [isUpgraded, setIsUpgraded] = useState(false);
    const [showConfirmationForm, setShowConfirmationForm] = useState(false);
    const policyDataRef = useRef<CreateWorkspaceParams | null>(null);
    const isCategorizing = upgradePath === CONST.UPGRADE_PATHS.CATEGORIES;

   
    const [session] = useOnyx(ONYXKEYS.SESSION, {canBeMissing: false});

    const onWorkspaceConfirmationSubmit = (params: WorkspaceConfirmationSubmitFunctionParams) => {
        const policyData = Policy.createWorkspace({
            policyOwnerEmail: undefined,
            makeMeAdmin: false,
            policyName: params.name,
            policyID: params.policyID,
            currency: params.currency,
            file: params.avatarFile as File,
            engagementChoice: CONST.ONBOARDING_CHOICES.TRACK_WORKSPACE,
        });
        policyDataRef.current = policyData;
        setShowConfirmationForm(false);
        setIsUpgraded(true);
    };

    return (
        <ScreenWrapper
            shouldShowOfflineIndicator
            testID="workspaceUpgradePage"
            offlineIndicatorStyle={styles.mtAuto}
        >
            {(!!isUpgraded || !showConfirmationForm) && (
                <HeaderWithBackButton
                    title={translate('common.upgrade')}
                    onBackButtonPress={() => Navigation.goBack()}
                />
            )}
            {!showConfirmationForm && (
                <ScrollView contentContainerStyle={styles.flexGrow1}>
                   
                  
                </ScrollView>
            )}
            {!isUpgraded && showConfirmationForm && (
                <WorkspaceConfirmationForm
                    policyOwnerEmail={session?.email ?? ''}
                    onSubmit={onWorkspaceConfirmationSubmit}
                    onBackButtonPress={() => setShowConfirmationForm(false)}
                    addBottomSafeAreaPadding={false}
                />
            )}
        </ScreenWrapper>
    );
}

export default IOURequestStepUpgrade;
