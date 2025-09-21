import {CardStyleInterpolators} from '@react-navigation/stack';
import {accountIDSelector} from '@selectors/Session';
import React, {useCallback, useEffect, useMemo} from 'react';
import {View} from 'react-native';
import NoDropZone from '@components/DragAndDrop/NoDropZone';
import FocusTrapForScreens from '@components/FocusTrap/FocusTrapForScreen';
import useKeyboardShortcut from '@hooks/useKeyboardShortcut';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import {isMobileSafari} from '@libs/Browser';
import GoogleTagManager from '@libs/GoogleTagManager';
import useModalCardStyleInterpolator from '@libs/Navigation/AppNavigator/useModalCardStyleInterpolator';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import Animations from '@libs/Navigation/PlatformStackNavigation/navigationOptions/animation';
import type {PlatformStackNavigationOptions} from '@libs/Navigation/PlatformStackNavigation/types';
import type {OnboardingModalNavigatorParamList} from '@libs/Navigation/types';
import OnboardingPersonalDetails from '@pages/OnboardingPersonalDetails';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';
import Overlay from './Overlay';

const Stack = createPlatformStackNavigator<OnboardingModalNavigatorParamList>();

function OnboardingModalNavigator() {
    const styles = useThemeStyles();
    const {onboardingIsMediumOrLargerScreenWidth} = useResponsiveLayout();
    const outerViewRef = React.useRef<View>(null);
    const [, accountMetadata] = useOnyx(ONYXKEYS.ACCOUNT, {canBeMissing: true});

    const [accountID] = useOnyx(ONYXKEYS.SESSION, {
        selector: accountIDSelector,
        canBeMissing: false,
    });

    // Publish a sign_up event when we start the onboarding flow. This should track basic sign ups
    // as well as Google and Apple SSO.
    useEffect(() => {
        if (!accountID) {
            return;
        }

        GoogleTagManager.publishEvent(CONST.ANALYTICS.EVENT.SIGN_UP, accountID);
    }, [accountID]);

    const handleOuterClick = useCallback(() => {}, []);

    useKeyboardShortcut(CONST.KEYBOARD_SHORTCUTS.ESCAPE, handleOuterClick, {shouldBubble: true});

    const customInterpolator = useModalCardStyleInterpolator();
    const defaultScreenOptions = useMemo<PlatformStackNavigationOptions>(() => {
        return {
            headerShown: false,
            animation: Animations.SLIDE_FROM_RIGHT,
            gestureDirection: 'horizontal',
            web: {
                // The .forHorizontalIOS interpolator from `@react-navigation` is misbehaving on Safari, so we override it with Expensify custom interpolator
                cardStyleInterpolator: isMobileSafari() ? (props) => customInterpolator({props}) : CardStyleInterpolators.forHorizontalIOS,
                gestureDirection: 'horizontal',
                cardStyle: {
                    height: '100%',
                },
            },
        };
    }, [customInterpolator]);

    // If the account data is not loaded yet, we don't want to show the onboarding modal
    if (isLoadingOnyxValue(accountMetadata)) {
        return null;
    }

    return (
        <NoDropZone>
            <Overlay />
            <View
                ref={outerViewRef}
                onClick={handleOuterClick}
                style={styles.onboardingNavigatorOuterView}
            >
                <FocusTrapForScreens>
                    <View
                        onClick={(e) => e.stopPropagation()}
                        style={styles.OnboardingNavigatorInnerView(onboardingIsMediumOrLargerScreenWidth)}
                    >
                        <Stack.Navigator
                            screenOptions={defaultScreenOptions}
                            initialRouteName={SCREENS.ONBOARDING.PERSONAL_DETAILS}
                        >
                            <Stack.Screen
                                name={SCREENS.ONBOARDING.PERSONAL_DETAILS}
                                component={OnboardingPersonalDetails}
                            />
                        </Stack.Navigator>
                    </View>
                </FocusTrapForScreens>
            </View>
        </NoDropZone>
    );
}

OnboardingModalNavigator.displayName = 'OnboardingModalNavigator';

export default OnboardingModalNavigator;
