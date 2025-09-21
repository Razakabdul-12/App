import React from 'react';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import ScreenWrapper from '@components/ScreenWrapper';
import useThemeStyles from '@hooks/useThemeStyles';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SearchFullscreenNavigatorParamList} from '@libs/Navigation/types';
import type SCREENS from '@src/SCREENS';

type SearchMoneyRequestPageProps = PlatformStackScreenProps<SearchFullscreenNavigatorParamList, typeof SCREENS.SEARCH.MONEY_REQUEST_REPORT>;

function SearchMoneyRequestReportPage({}: SearchMoneyRequestPageProps) {
    const styles = useThemeStyles();

    return (
        <ScreenWrapper
            testID={SearchMoneyRequestReportPage.displayName}
            shouldEnableMaxHeight
            headerGapStyles={styles.searchHeaderGap}
            offlineIndicatorStyle={styles.mtAuto}
        >
            <FullPageNotFoundView
                shouldShow
                shouldShowLink={false}
                titleKey="report.chatRemovedTitle"
                subtitleKey="report.chatRemovedSubtitle"
            />
        </ScreenWrapper>
    );
}

SearchMoneyRequestReportPage.displayName = 'SearchMoneyRequestReportPage';

export default SearchMoneyRequestReportPage;
