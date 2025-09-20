import {findFocusedRoute} from '@react-navigation/native';
import type {NavigatorScreenParams} from '@react-navigation/native';
import getIsNarrowLayout from '@libs/getIsNarrowLayout';
import type {NavigationPartialRoute, SettingsSplitNavigatorParamList} from '@libs/Navigation/types';
import SCREENS from '@src/SCREENS';
import {getSettingsTabStateFromSessionStorage} from './lastVisitedTabPathUtils';

/**
 * Returns the Settings screen that should be opened on the Account tab.
 */
export default function getAccountTabScreenToOpen(): NavigatorScreenParams<SettingsSplitNavigatorParamList> {
    if (getIsNarrowLayout()) {
        return {screen: SCREENS.SETTINGS.ROOT};
    }

    const settingsTabState = getSettingsTabStateFromSessionStorage();
    if (!settingsTabState) {
        return {screen: SCREENS.SETTINGS.PROFILE.ROOT, params: {}};
    }

    const focusedRoute = findFocusedRoute(settingsTabState) as NavigationPartialRoute<keyof SettingsSplitNavigatorParamList> | undefined;
    if (!focusedRoute) {
        return {screen: SCREENS.SETTINGS.PROFILE.ROOT, params: {}};
    }

    return {screen: focusedRoute.name};
}
