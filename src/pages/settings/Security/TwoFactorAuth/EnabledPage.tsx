import React from 'react';
import {View} from 'react-native';
import * as Illustrations from '@components/Icon/Illustrations';
import MenuItem from '@components/MenuItem';
import ScrollView from '@components/ScrollView';
import Section from '@components/Section';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import TwoFactorAuthWrapper from './TwoFactorAuthWrapper';

function EnabledPage() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    return (
        <TwoFactorAuthWrapper
            stepName={CONST.TWO_FACTOR_AUTH_STEPS.ENABLED}
            title={translate('twoFactorAuth.headerTitle')}
            shouldEnableKeyboardAvoidingView={false}
        >
            <ScrollView>
                <Section
                    title={translate('twoFactorAuth.twoFactorAuthEnabled')}
                    icon={Illustrations.ShieldYellow}
                    containerStyles={[styles.twoFactorAuthSection, styles.mb0]}
                >
                    <View style={styles.mv3}>
                        <Text style={styles.textLabel}>{translate('twoFactorAuth.whatIsTwoFactorAuth')}</Text>
                    </View>
                </Section>
                <MenuItem
                    title={translate('twoFactorAuth.disableTwoFactorAuth')}
                    onPress={() => Navigation.navigate(ROUTES.SETTINGS_2FA_DISABLE)}
                />
            </ScrollView>
        </TwoFactorAuthWrapper>
    );
}

EnabledPage.displayName = 'EnabledPage';

export default EnabledPage;
