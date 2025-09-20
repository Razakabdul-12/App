import React, {useContext, useMemo} from 'react';
import {View} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';
import {DelegateNoAccessContext} from '@components/DelegateNoAccessModalProvider';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import * as Expensicons from '@components/Icon/Expensicons';
import * as Illustrations from '@components/Icon/Illustrations';
import {LockedAccountContext} from '@components/LockedAccountModalProvider';
import LottieAnimations from '@components/LottieAnimations';
import MenuItemList from '@components/MenuItemList';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Section from '@components/Section';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import useWaitForNavigation from '@hooks/useWaitForNavigation';
import Navigation from '@libs/Navigation/Navigation';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type IconAsset from '@src/types/utils/IconAsset';

type BaseMenuItemType = {
    translationKey: TranslationPaths;
    icon: IconAsset;
    iconRight?: IconAsset;
    action: () => Promise<void> | void;
    link?: string;
    wrapperStyle?: StyleProp<ViewStyle>;
};

function SecuritySettingsPage() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const waitForNavigate = useWaitForNavigation();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const [account] = useOnyx(ONYXKEYS.ACCOUNT, {canBeMissing: true});
    const isUserValidated = account?.validated;

    const {isAccountLocked, showLockedAccountModal} = useContext(LockedAccountContext);
    const {isDelegateAccessRestricted, showDelegateNoAccessModal} = useContext(DelegateNoAccessContext);

    const securityMenuItems = useMemo(() => {
        const baseMenuItems: BaseMenuItemType[] = [
            {
                translationKey: 'twoFactorAuth.headerTitle',
                icon: Expensicons.Shield,
                action: () => {
                    if (isDelegateAccessRestricted) {
                        showDelegateNoAccessModal();
                        return;
                    }
                    if (isAccountLocked) {
                        showLockedAccountModal();
                        return;
                    }
                    if (!isUserValidated) {
                        Navigation.navigate(ROUTES.SETTINGS_2FA_VERIFY_ACCOUNT.getRoute());
                        return;
                    }
                    Navigation.navigate(ROUTES.SETTINGS_2FA_ROOT.getRoute());
                },
            },
        ];

        if (isAccountLocked) {
            baseMenuItems.push({
                translationKey: 'lockAccountPage.unlockAccount',
                icon: Expensicons.UserLock,
                action: waitForNavigate(() => Navigation.navigate(ROUTES.SETTINGS_UNLOCK_ACCOUNT)),
            });
        } else {
            baseMenuItems.push({
                translationKey: 'lockAccountPage.reportSuspiciousActivity',
                icon: Expensicons.UserLock,
                action: waitForNavigate(() => Navigation.navigate(ROUTES.SETTINGS_LOCK_ACCOUNT)),
            });
        }

        baseMenuItems.push({
            translationKey: 'closeAccountPage.closeAccount',
            icon: Expensicons.ClosedSign,
            action: () => {
                if (isDelegateAccessRestricted) {
                    showDelegateNoAccessModal();
                    return;
                }

                if (isAccountLocked) {
                    showLockedAccountModal();
                    return;
                }
                Navigation.navigate(ROUTES.SETTINGS_CLOSE);
            },
        });
        return baseMenuItems.map((item) => ({
            key: item.translationKey,
            title: translate(item.translationKey),
            icon: item.icon,
            onPress: item.action,
            shouldShowRightIcon: true,
            link: '',
            wrapperStyle: [styles.sectionMenuItemTopDescription],
        }));
    }, [
        isAccountLocked,
        isDelegateAccessRestricted,
        isUserValidated,
        showDelegateNoAccessModal,
        showLockedAccountModal,
        waitForNavigate,
        translate,
        styles.sectionMenuItemTopDescription,
    ]);

    
    return (
        <ScreenWrapper
            testID={SecuritySettingsPage.displayName}
            includeSafeAreaPaddingBottom={false}
            shouldEnablePickerAvoiding={false}
            shouldShowOfflineIndicatorInWideScreen
        >
            {({safeAreaPaddingBottomStyle}) => (
                <>
                    <HeaderWithBackButton
                        title={translate('initialSettingsPage.security')}
                        shouldShowBackButton={shouldUseNarrowLayout}
                        onBackButtonPress={Navigation.popToSidebar}
                        icon={Illustrations.LockClosed}
                        shouldUseHeadlineHeader
                        shouldDisplaySearchRouter
                    />
                    <ScrollView contentContainerStyle={styles.pt3}>
                        <View style={[styles.flex1, shouldUseNarrowLayout ? styles.workspaceSectionMobile : styles.workspaceSection]}>
                            <View style={safeAreaPaddingBottomStyle}>
                                <Section
                                    title={translate('securityPage.title')}
                                    subtitle={translate('securityPage.subtitle')}
                                    isCentralPane
                                    subtitleMuted
                                    illustration={LottieAnimations.Safe}
                                    titleStyles={styles.accountSettingsSectionTitle}
                                    childrenStyles={styles.pt5}
                                >
                                    <MenuItemList
                                        menuItems={securityMenuItems}
                                        shouldUseSingleExecution
                                    />
                                </Section>
                            </View>
                        </View>
                    </ScrollView>
                </>
            )}
        </ScreenWrapper>
    );
}

SecuritySettingsPage.displayName = 'SettingSecurityPage';

export default SecuritySettingsPage;
