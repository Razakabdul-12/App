import React, {useCallback, useMemo} from 'react';
import {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import Button from '@components/Button';
import {CreditCardsNewGreen} from '@components/Icon/Illustrations';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {enableExpensifyCard} from '@libs/actions/Policy/Policy';
import {navigateToExpensifyCardPage} from '@libs/PolicyUtils';
import Text from '@components/Text';
import variables from '@styles/variables';
import type {Policy} from '@src/types/onyx';

type WorkspaceCompanyCardExpensifyCardPromotionBannerProps = {
    policy: OnyxEntry<Policy>;
};

function WorkspaceCompanyCardExpensifyCardPromotionBanner({policy}: WorkspaceCompanyCardExpensifyCardPromotionBannerProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const StyleUtils = useStyleUtils();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const policyID = policy?.id;
    const areExpensifyCardsEnabled = policy?.areExpensifyCardsEnabled;

    const handleLearnMore = useCallback(() => {
        if (!policyID) {
            return;
        }

        if (areExpensifyCardsEnabled) {
            navigateToExpensifyCardPage(policyID);
            return;
        }

        enableExpensifyCard(policyID, true, true);
    }, [policyID, areExpensifyCardsEnabled]);

    const rightComponent = useMemo(() => {
        const smallScreenStyle = shouldUseNarrowLayout ? [styles.flex0, styles.flexBasis100, styles.justifyContentCenter] : [];
        return (
            <View style={[styles.flexRow, styles.gap2, smallScreenStyle]}>
                <Button
                    success
                    onPress={handleLearnMore}
                    style={shouldUseNarrowLayout && styles.flex1}
                    text={translate('workspace.moreFeatures.companyCards.expensifyCardBannerLearnMoreButton')}
                />
            </View>
        );
    }, [styles, shouldUseNarrowLayout, translate, handleLearnMore]);

    return (
        <View style={[styles.ph4, styles.mb4]}>
            <View style={[styles.flexRow, styles.flexWrap, styles.alignItemsCenter, styles.gap3, styles.pv4, styles.ph5, styles.borderRadiusComponentLarge, styles.hoveredComponentBG]}>
                <CreditCardsNewGreen
                    width={variables.menuIconSize}
                    height={variables.menuIconSize}
                />
                <View style={[styles.flex1, styles.justifyContentCenter]}>
                    <Text style={StyleUtils.getTextColorStyle(theme.text)}>{translate('workspace.moreFeatures.companyCards.expensifyCardBannerTitle')}</Text>
                    <Text style={[styles.mt1, styles.textLabel]}>{translate('workspace.moreFeatures.companyCards.expensifyCardBannerSubtitle')}</Text>
                </View>
                {rightComponent}
            </View>
        </View>
    );
}

export default WorkspaceCompanyCardExpensifyCardPromotionBanner;
