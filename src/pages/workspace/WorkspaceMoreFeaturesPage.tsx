import React, {useCallback, useEffect, useState} from 'react';
import {View} from 'react-native';
import ConfirmModal from '@components/ConfirmModal';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import * as Illustrations from '@components/Icon/Illustrations';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Section from '@components/Section';
import Text from '@components/Text';
import useCardFeeds from '@hooks/useCardFeeds';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import {getCompanyFeeds} from '@libs/CardUtils';
import {getLatestErrorField} from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {WorkspaceSplitNavigatorParamList} from '@libs/Navigation/types';
import { hasAccountingConnections, isControlPolicy} from '@libs/PolicyUtils';
import {enablePolicyCategories} from '@userActions/Policy/Category';
import {clearPolicyErrorField, enableCompanyCards, enablePolicyConnections, openPolicyMoreFeaturesPage} from '@userActions/Policy/Policy';
import {navigateToConciergeChat} from '@userActions/Report';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type {Errors, PendingAction} from '@src/types/onyx/OnyxCommon';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import type IconAsset from '@src/types/utils/IconAsset';
import AccessOrNotFoundWrapper from './AccessOrNotFoundWrapper';
import type {WithPolicyAndFullscreenLoadingProps} from './withPolicyAndFullscreenLoading';
import withPolicyAndFullscreenLoading from './withPolicyAndFullscreenLoading';
import ToggleSettingOptionRow from '@components/ToggleSettingOptionRow';

type WorkspaceMoreFeaturesPageProps = WithPolicyAndFullscreenLoadingProps & PlatformStackScreenProps<WorkspaceSplitNavigatorParamList, typeof SCREENS.WORKSPACE.MORE_FEATURES>;

type Item = {
    icon: IconAsset;
    titleTranslationKey: TranslationPaths;
    subtitleTranslationKey: TranslationPaths;
    isActive: boolean;
    disabled?: boolean;
    action: (isEnabled: boolean) => void;
    disabledAction?: () => void;
    pendingAction: PendingAction | undefined;
    errors?: Errors;
    onCloseError?: () => void;
};

type SectionObject = {
    titleTranslationKey: TranslationPaths;
    subtitleTranslationKey: TranslationPaths;
    items: Item[];
};

function WorkspaceMoreFeaturesPage({policy, route}: WorkspaceMoreFeaturesPageProps) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const {translate} = useLocalize();
    const hasAccountingConnection = hasAccountingConnections(policy);
    const isAccountingEnabled = !!policy?.areConnectionsEnabled || !isEmptyObject(policy?.connections);
    const policyID = policy?.id;
    const [cardFeeds] = useCardFeeds(policyID);
    const [isOrganizeWarningModalOpen, setIsOrganizeWarningModalOpen] = useState(false);
    const [isIntegrateWarningModalOpen, setIsIntegrateWarningModalOpen] = useState(false);
    const [isDisableCompanyCardsWarningModalOpen, setIsDisableCompanyCardsWarningModalOpen] = useState(false);


    const [allTransactionViolations] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS, {canBeMissing: true});
    const [policyTagLists] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY_TAGS}${policy?.id}`, {canBeMissing: true});

    const onDisabledOrganizeSwitchPress = useCallback(() => {
        if (!hasAccountingConnection) {
            return;
        }
        setIsOrganizeWarningModalOpen(true);
    }, [hasAccountingConnection]);


    const manageItems: Item[] = [
       
    ];

    const organizeItems: Item[] = [
        {
            icon: Illustrations.FolderOpen,
            titleTranslationKey: 'workspace.moreFeatures.categories.title',
            subtitleTranslationKey: 'workspace.moreFeatures.categories.subtitle',
            isActive: policy?.areCategoriesEnabled ?? false,
            disabled: hasAccountingConnection,
            disabledAction: onDisabledOrganizeSwitchPress,
            pendingAction: policy?.pendingFields?.areCategoriesEnabled,
            action: (isEnabled: boolean) => {
                if (!policyID) {
                    return;
                }
                enablePolicyCategories(policyID, isEnabled, policyTagLists, allTransactionViolations, true);
            },
        },
      
    ];

    const integrateItems: Item[] = [
        {
            icon: Illustrations.Accounting,
            titleTranslationKey: 'workspace.moreFeatures.connections.title',
            subtitleTranslationKey: 'workspace.moreFeatures.connections.subtitle',
            isActive: isAccountingEnabled,
            pendingAction: policy?.pendingFields?.areConnectionsEnabled,
            disabledAction: () => {
                if (!hasAccountingConnection) {
                    return;
                }
                setIsIntegrateWarningModalOpen(true);
            },
            action: (isEnabled: boolean) => {
                if (!policyID) {
                    return;
                }
                enablePolicyConnections(policyID, isEnabled);
            },
            disabled: hasAccountingConnection,
            errors: getLatestErrorField(policy ?? {}, CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED),
            onCloseError: () => {
                if (!policyID) {
                    return;
                }
                clearPolicyErrorField(policyID, CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED);
            },
        },
    ];

    const sections: SectionObject[] = [
        {
            titleTranslationKey: 'workspace.moreFeatures.integrateSection.title',
            subtitleTranslationKey: 'workspace.moreFeatures.integrateSection.subtitle',
            items: integrateItems,
        },
        {
            titleTranslationKey: 'workspace.moreFeatures.organizeSection.title',
            subtitleTranslationKey: 'workspace.moreFeatures.organizeSection.subtitle',
            items: organizeItems,
        },
   
       
    ];

    const renderItem = useCallback(
        (item: Item) => (
            <View
                key={item.titleTranslationKey}
                style={[styles.workspaceSectionMoreFeaturesItem, shouldUseNarrowLayout && styles.flexBasis100, shouldUseNarrowLayout && StyleUtils.getMinimumWidth(0)]}
            >
                <ToggleSettingOptionRow
                    icon={item.icon}
                    disabled={item.disabled}
                    disabledAction={item.disabledAction}
                    title={translate(item.titleTranslationKey)}
                    titleStyle={styles.textStrong}
                    subtitle={translate(item.subtitleTranslationKey)}
                    switchAccessibilityLabel={translate(item.subtitleTranslationKey)}
                    isActive={item.isActive}
                    pendingAction={item.pendingAction}
                    onToggle={item.action}
                    showLockIcon={item.disabled}
                    errors={item.errors}
                    onCloseError={item.onCloseError}
                />
            </View>
        ),
        [styles, StyleUtils, shouldUseNarrowLayout, translate],
    );

    /** Used to fill row space in the Section items when there are odd number of items to create equal margins for last odd item. */
    const sectionRowFillerItem = useCallback(
        (section: SectionObject) => {
            if (section.items.length % 2 === 0) {
                return null;
            }

            return (
                <View
                    key="section-filler-col"
                    aria-hidden
                    accessibilityElementsHidden
                    style={[
                        styles.workspaceSectionMoreFeaturesItem,
                        shouldUseNarrowLayout && StyleUtils.getMinimumWidth(0),
                        styles.p0,
                        styles.mt0,
                        styles.visibilityHidden,
                        styles.bgTransparent,
                    ]}
                />
            );
        },
        [styles, StyleUtils, shouldUseNarrowLayout],
    );

    const renderSection = useCallback(
        (section: SectionObject) => (
            <View
                key={section.titleTranslationKey}
                style={[styles.mt3, shouldUseNarrowLayout ? styles.workspaceSectionMobile : {}]}
            >
                <Section
                    containerStyles={[styles.ph1, styles.pv0, styles.bgTransparent, styles.noBorderRadius]}
                    childrenStyles={[styles.flexRow, styles.flexWrap, styles.columnGap3]}
                    renderTitle={() => <Text style={styles.mutedNormalTextLabel}>{translate(section.titleTranslationKey)}</Text>}
                    subtitleMuted
                >
                    {section.items.map(renderItem)}
                    {sectionRowFillerItem(section)}
                </Section>
            </View>
        ),
        [shouldUseNarrowLayout, styles, renderItem, translate, sectionRowFillerItem],
    );

    const fetchFeatures = useCallback(() => {
        openPolicyMoreFeaturesPage(route.params.policyID);
    }, [route.params.policyID]);

    useEffect(() => {
        fetchFeatures();
        // eslint-disable-next-line react-compiler/react-compiler
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useNetwork({onReconnect: fetchFeatures});

    return (
        <AccessOrNotFoundWrapper
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.PAID]}
            policyID={route.params.policyID}
        >
            <ScreenWrapper
                enableEdgeToEdgeBottomSafeAreaPadding
                style={[styles.defaultModalContainer]}
                testID={WorkspaceMoreFeaturesPage.displayName}
                shouldShowOfflineIndicatorInWideScreen
            >
                <HeaderWithBackButton
                    icon={Illustrations.Gears}
                    shouldUseHeadlineHeader
                    title={translate('workspace.common.moreFeatures')}
                    shouldShowBackButton={shouldUseNarrowLayout}
                    onBackButtonPress={() => Navigation.goBack()}
                />

                <ScrollView addBottomSafeAreaPadding>
                    <Text style={[styles.ph5, styles.mb5, styles.mt3, styles.textSupporting, styles.workspaceSectionMobile]}>{translate('workspace.moreFeatures.subtitle')}</Text>
                    {sections.map(renderSection)}
                </ScrollView>

                <ConfirmModal
                    title={translate('workspace.moreFeatures.connectionsWarningModal.featureEnabledTitle')}
                    onConfirm={() => {
                        if (!policyID) {
                            return;
                        }
                        setIsOrganizeWarningModalOpen(false);
                        Navigation.navigate(ROUTES.POLICY_ACCOUNTING.getRoute(policyID));
                    }}
                    onCancel={() => setIsOrganizeWarningModalOpen(false)}
                    isVisible={isOrganizeWarningModalOpen}
                    prompt={translate('workspace.moreFeatures.connectionsWarningModal.featureEnabledText')}
                    confirmText={translate('workspace.moreFeatures.connectionsWarningModal.manageSettings')}
                    cancelText={translate('common.cancel')}
                />
                <ConfirmModal
                    title={translate('workspace.moreFeatures.connectionsWarningModal.featureEnabledTitle')}
                    onConfirm={() => {
                        if (!policyID) {
                            return;
                        }
                        setIsIntegrateWarningModalOpen(false);
                        Navigation.navigate(ROUTES.POLICY_ACCOUNTING.getRoute(policyID));
                    }}
                    onCancel={() => setIsIntegrateWarningModalOpen(false)}
                    isVisible={isIntegrateWarningModalOpen}
                    prompt={translate('workspace.moreFeatures.connectionsWarningModal.disconnectText')}
                    confirmText={translate('workspace.moreFeatures.connectionsWarningModal.manageSettings')}
                    cancelText={translate('common.cancel')}
                />
                <ConfirmModal
                    title={translate('workspace.moreFeatures.companyCards.disableCardTitle')}
                    isVisible={isDisableCompanyCardsWarningModalOpen}
                    onConfirm={() => {
                        setIsDisableCompanyCardsWarningModalOpen(false);
                        navigateToConciergeChat();
                    }}
                    onCancel={() => setIsDisableCompanyCardsWarningModalOpen(false)}
                    prompt={translate('workspace.moreFeatures.companyCards.disableCardPrompt')}
                    confirmText={translate('workspace.moreFeatures.companyCards.disableCardButton')}
                    cancelText={translate('common.cancel')}
                />
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

WorkspaceMoreFeaturesPage.displayName = 'WorkspaceMoreFeaturesPage';

export default withPolicyAndFullscreenLoading(WorkspaceMoreFeaturesPage);
