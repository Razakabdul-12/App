import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useMemo} from 'react';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {updateQuickbooksOnlineSyncClasses, updateQuickbooksOnlineSyncCustomers, updateQuickbooksOnlineSyncLocations} from '@libs/actions/connections/QuickbooksOnline';
import {updateXeroMappings} from '@libs/actions/connections/Xero';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import {canModifyPlan, getPerDiemCustomUnit, isControlPolicy} from '@libs/PolicyUtils';
import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import {enablePerDiem} from '@userActions/Policy/PerDiem';
import CONST from '@src/CONST';
import {enableCompanyCards, setPolicyPreventMemberCreatedTitle, upgradeToCorporate} from '@src/libs/actions/Policy/Policy';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import UpgradeConfirmation from './UpgradeConfirmation';
import UpgradeIntro from './UpgradeIntro';

type WorkspaceUpgradePageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.UPGRADE>;

function getFeatureNameAlias(featureName: string) {
    return featureName;
}

function WorkspaceUpgradePage({route}: WorkspaceUpgradePageProps) {
    const styles = useThemeStyles();
    const policyID = route.params?.policyID;

    const featureNameAlias = route.params?.featureName && getFeatureNameAlias(route.params.featureName);

    const feature = useMemo(
        () =>
            Object.values(CONST.UPGRADE_FEATURE_INTRO_MAPPING)
                .filter((value) => value.id !== CONST.UPGRADE_FEATURE_INTRO_MAPPING.policyPreventMemberChangingTitle.id)
                .find((f) => f.alias === featureNameAlias),
        [featureNameAlias],
    );
    const {translate} = useLocalize();
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {canBeMissing: true});
    const {isOffline} = useNetwork();

    const canPerformUpgrade = useMemo(() => canModifyPlan(policyID), [policyID]);
    const isUpgraded = useMemo(() => isControlPolicy(policy), [policy]);

    const perDiemCustomUnit = getPerDiemCustomUnit(policy);

    const goBack = useCallback(() => {
        if ((!feature && featureNameAlias !== CONST.UPGRADE_FEATURE_INTRO_MAPPING.policyPreventMemberChangingTitle.alias) || !policyID) {
            Navigation.dismissModal();
            return;
        }
        switch (feature?.id) {
            case CONST.UPGRADE_FEATURE_INTRO_MAPPING.approvals.id:
                Navigation.goBack();
                if (route.params.backTo) {
                    Navigation.navigate(route.params.backTo);
                }
                return;
            case CONST.UPGRADE_FEATURE_INTRO_MAPPING.companyCards.id:
                Navigation.navigate(ROUTES.WORKSPACE_COMPANY_CARDS_ADD_NEW.getRoute(policyID, ROUTES.WORKSPACE_COMPANY_CARDS_SELECT_FEED.getRoute(policyID)));
                return;
            case CONST.UPGRADE_FEATURE_INTRO_MAPPING.perDiem.id:
                return Navigation.goBack(ROUTES.WORKSPACE_MORE_FEATURES.getRoute(policyID));
            default:
                return route.params.backTo ? Navigation.goBack(route.params.backTo) : Navigation.goBack();
        }
    }, [feature, policyID, route.params?.backTo, route.params?.featureName, featureNameAlias]);

    const onUpgradeToCorporate = () => {
        if (!canPerformUpgrade || !policy) {
            return;
        }

        upgradeToCorporate(policy.id, feature?.name);
    };

    const confirmUpgrade = useCallback(() => {
        if (!policyID) {
            return;
        }
        if (!feature) {
            if (featureNameAlias === CONST.UPGRADE_FEATURE_INTRO_MAPPING.policyPreventMemberChangingTitle.alias) {
                setPolicyPreventMemberCreatedTitle(policyID, true);
            }
            return;
        }
        switch (feature.id) {
           
            case CONST.UPGRADE_FEATURE_INTRO_MAPPING.companyCards.id:
                enableCompanyCards(policyID, true, false);
                break;
            case CONST.UPGRADE_FEATURE_INTRO_MAPPING.perDiem.id:
                enablePerDiem(policyID, true, perDiemCustomUnit?.customUnitID, false);
                break;
            default:
        }
    }, [feature, perDiemCustomUnit?.customUnitID, policyID, featureNameAlias]);

    useFocusEffect(
        useCallback(() => {
            return () => {
                if (!isUpgraded || !canPerformUpgrade) {
                    return;
                }
                confirmUpgrade();
            };
        }, [isUpgraded, canPerformUpgrade, confirmUpgrade]),
    );

    if (!canPerformUpgrade) {
        return <NotFoundPage />;
    }

    return (
        <ScreenWrapper
            shouldShowOfflineIndicator
            testID="workspaceUpgradePage"
            offlineIndicatorStyle={styles.mtAuto}
        >
            <HeaderWithBackButton
                title={translate('common.upgrade')}
                onBackButtonPress={() => {
                    if (isUpgraded) {
                        goBack();
                    } else {
                        Navigation.goBack();
                    }
                }}
            />
            <ScrollView contentContainerStyle={styles.flexGrow1}>
                {!!policy && isUpgraded && (
                    <UpgradeConfirmation
                        afterUpgradeAcknowledged={goBack}
                        policyName={policy.name}
                    />
                )}
                {!isUpgraded && (
                    <UpgradeIntro
                        policyID={policyID}
                        feature={feature}
                        onUpgrade={onUpgradeToCorporate}
                        buttonDisabled={isOffline}
                        loading={policy?.isPendingUpgrade}
                        backTo={route.params.backTo}
                    />
                )}
            </ScrollView>
        </ScreenWrapper>
    );
}

export default WorkspaceUpgradePage;
