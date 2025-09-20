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
import {setTransactionReport} from '@libs/actions/Transaction';
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
    const isDistanceRateUpgrade = upgradePath === CONST.UPGRADE_PATHS.DISTANCE_RATES;
    const isCategorizing = upgradePath === CONST.UPGRADE_PATHS.CATEGORIES;
    const isReporting = upgradePath === CONST.UPGRADE_PATHS.REPORTS;

    const upgradeContent = useMemo(() => {
        switch (upgradePath) {
            case CONST.UPGRADE_PATHS.DISTANCE_RATES:
                return {
                    title: translate('workspace.upgrade.distanceRates.title'),
                    description: translate('workspace.upgrade.distanceRates.description'),
                };
            case CONST.UPGRADE_PATHS.CATEGORIES:
                return {
                    title: translate('workspace.upgrade.categories.title'),
                    description: translate('workspace.upgrade.categories.description'),
                };
            case CONST.UPGRADE_PATHS.REPORTS:
                return {
                    title: translate('workspace.upgrade.reportFields.title'),
                    description: translate('workspace.upgrade.reportFields.description'),
                };
            default:
                return {
                    title: translate('workspace.upgrade.upgradeToUnlock'),
                    description: translate('workspace.upgrade.commonFeatures.note'),
                };
        }
    }, [translate, upgradePath]);

    const afterUpgradeAcknowledged = useCallback(() => {
        const expenseReportID = policyDataRef.current?.expenseChatReportID ?? reportID;
        const policyID = policyDataRef.current?.policyID;
        if (shouldSubmitExpense) {
            setMoneyRequestParticipants(transactionID, [
                {
                    selected: true,
                    accountID: 0,
                    isPolicyExpenseChat: true,
                    reportID: expenseReportID,
                    policyID: policyDataRef.current?.policyID,
                    searchText: policyDataRef.current?.policyName,
                },
            ]);
        }
        Navigation.goBack();

        switch (upgradePath) {
            case CONST.UPGRADE_PATHS.DISTANCE_RATES: {
                if (!policyID || !reportID) {
                    return;
                }
                setTransactionReport(transactionID, {reportID: expenseReportID}, true);
                // Let the confirmation step decide the distance rate because policy data is not fully available at this step
                setCustomUnitRateID(transactionID, '-1');
                Navigation.setParams({reportID: expenseReportID});
                Navigation.navigate(ROUTES.WORKSPACE_CREATE_DISTANCE_RATE.getRoute(policyID, transactionID, expenseReportID));
                break;
            }
            case CONST.UPGRADE_PATHS.CATEGORIES:
                Navigation.navigate(ROUTES.MONEY_REQUEST_STEP_CATEGORY.getRoute(action, CONST.IOU.TYPE.SUBMIT, transactionID, reportID, ROUTES.REPORT_WITH_ID.getRoute(reportID)));
                break;
            default:
        }
    }, [action, reportID, shouldSubmitExpense, transactionID, upgradePath]);

    const adminParticipant = useMemo(() => {
        const participant = transaction?.participants?.[0];
        if (!isDistanceRateUpgrade || !participant?.accountID) {
            return;
        }

        return getParticipantsOption(participant, personalDetails);
    }, [isDistanceRateUpgrade, transaction?.participants, personalDetails]);

    const onUpgrade = useCallback(() => {
        if (isCategorizing || isReporting) {
            setShowConfirmationForm(true);
            return;
        }
        const policyData = Policy.createWorkspace({
            policyOwnerEmail: undefined,
            policyName: undefined,
            policyID: undefined,
            engagementChoice: CONST.ONBOARDING_CHOICES.TRACK_WORKSPACE,
            currency: currentUserPersonalDetails?.localCurrencyCode ?? '',
            areDistanceRatesEnabled: isDistanceRateUpgrade,
            adminParticipant,
        });
        setIsUpgraded(true);
        policyDataRef.current = policyData;
    }, [isCategorizing, isReporting, currentUserPersonalDetails?.localCurrencyCode, isDistanceRateUpgrade, adminParticipant]);

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
                    {!!isUpgraded && (
                        <ConfirmationPage
                            heading={
                                isCategorizing || isReporting
                                    ? translate('workspace.upgrade.completed.createdWorkspace')
                                    : translate('workspace.upgrade.completed.headline')
                            }
                            descriptionComponent={
                                <Text style={[styles.textAlignCenter, styles.w100]}>
                                    {isCategorizing || isReporting
                                        ? translate('workspace.upgrade.completed.categorizeMessage')
                                        : isDistanceRateUpgrade
                                          ? translate('workspace.upgrade.completed.distanceRateMessage')
                                          : translate('workspace.upgrade.completed.headline')}
                                </Text>
                            }
                            shouldShowButton
                            onButtonPress={afterUpgradeAcknowledged}
                            buttonText={translate('workspace.upgrade.completed.gotIt')}
                            containerStyle={[styles.flexGrow1, styles.justifyContentCenter]}
                        />
                    )}
                    {!isUpgraded && (
                        <View style={[styles.flexGrow1, styles.justifyContentCenter, styles.ph5]}>
                            <Text style={[styles.textAlignCenter, styles.textHeadlineH2, styles.mb3]}>{upgradeContent.title}</Text>
                            <Text style={[styles.textAlignCenter, styles.mb5]}>{upgradeContent.description}</Text>
                            <Button
                                success
                                large
                                text={translate('common.upgrade')}
                                onPress={onUpgrade}
                                disabled={isOffline}
                            />
                        </View>
                    )}
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
