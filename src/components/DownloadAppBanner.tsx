import React from 'react';
import {View} from 'react-native';
import type {LayoutChangeEvent} from 'react-native';
import useHasLoggedIntoMobileApp from '@hooks/useHasLoggedIntoMobileApp';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';
import Button from './Button';
import Text from './Text';
import {ExpensifyMobileApp} from './Icon/Illustrations';
import variables from '@styles/variables';

type DownloadAppBannerProps = {
    onLayout?: (e: LayoutChangeEvent) => void;
};

function DownloadAppBanner({onLayout}: DownloadAppBannerProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {hasLoggedIntoMobileApp, isLastMobileAppLoginLoaded} = useHasLoggedIntoMobileApp();

    if (!isLastMobileAppLoginLoaded || hasLoggedIntoMobileApp) {
        return null;
    }

    return (
        <View
            style={[styles.ph2, styles.mb2, styles.stickToBottom, styles.pt2]}
            onLayout={onLayout}
        >
            <View style={[styles.flexRow, styles.flexWrap, styles.alignItemsCenter, styles.gap3, styles.pv4, styles.ph5, styles.borderRadiusComponentNormal, styles.hoveredComponentBG]}>
                <ExpensifyMobileApp
                    width={variables.menuIconSize}
                    height={variables.menuIconSize}
                />
                <View style={[styles.flex1, styles.justifyContentCenter]}>
                    <Text style={styles.textStrong}>{translate('common.getTheApp')}</Text>
                    <Text style={[styles.mt1, styles.mutedTextLabel]}>{translate('common.scanReceiptsOnTheGo')}</Text>
                </View>
                <Button
                    small
                    success
                    text={translate('common.download')}
                    onPress={() => Navigation.navigate(ROUTES.SETTINGS_APP_DOWNLOAD_LINKS)}
                />
            </View>
        </View>
    );
}

export default DownloadAppBanner;
