import Navigation from '@libs/Navigation/Navigation';
import {FEATURE_IDS} from '@src/CONST';
import replaceCompanyCardsRoute from './replaceCompanyCardsRoute';

/**
 * If export company card value is changed to unsupported - we should redirect user directly to card details view
 * If not, just regular go back
 */
function goBackFromExportConnection(shouldGoBackToSpecificRoute: boolean, backTo?: string) {
    if (!(shouldGoBackToSpecificRoute && backTo?.includes(FEATURE_IDS.COMPANY_CARDS))) {
        return Navigation.goBack();
    }
    const companyCardDetailsPage = replaceCompanyCardsRoute(backTo);
    return Navigation.goBack(companyCardDetailsPage, {compareParams: false});
}

export default goBackFromExportConnection;
