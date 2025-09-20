import React from 'react';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {ReportDescriptionNavigatorParamList} from '@navigation/types';
import type SCREENS from '@src/SCREENS';
import type {WithReportOrNotFoundProps} from './home/report/withReportOrNotFound';
import withReportOrNotFound from './home/report/withReportOrNotFound';
import RoomDescriptionPage from './RoomDescriptionPage';

type ReportDescriptionPageProps = WithReportOrNotFoundProps & PlatformStackScreenProps<ReportDescriptionNavigatorParamList, typeof SCREENS.REPORT_DESCRIPTION_ROOT>;

function ReportDescriptionPage(props: ReportDescriptionPageProps) {

    // eslint-disable-next-line react/jsx-props-no-spreading
    return <RoomDescriptionPage {...props} />;
}

ReportDescriptionPage.displayName = 'ReportDescriptionPage';

export default withReportOrNotFound()(ReportDescriptionPage);
