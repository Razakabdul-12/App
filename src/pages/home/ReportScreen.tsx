import React from 'react';
import {View} from 'react-native';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

function ReportScreen() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    return (
        <ScreenWrapper
            testID={ReportScreen.displayName}
            shouldEnableMaxHeight
        >
            <View style={[styles.flex1, styles.alignItemsCenter, styles.justifyContentCenter, styles.ph5]}>
                <Text style={[styles.textAlignCenter, styles.textHeadlineH1]}>
                    {translate('report.chatRemovedTitle')}
                </Text>
                <Text style={[styles.mt2, styles.textAlignCenter, styles.textSupporting]}>
                    {translate('report.chatRemovedSubtitle')}
                </Text>
            </View>
        </ScreenWrapper>
    );
}

ReportScreen.displayName = 'ReportScreen';

export default ReportScreen;
