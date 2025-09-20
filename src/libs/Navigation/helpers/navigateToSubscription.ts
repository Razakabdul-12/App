import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';

function navigateToSubscription(backTo?: string) {
    const route = ROUTES.SETTINGS_SUBSCRIPTION.getRoute(backTo ?? Navigation.getActiveRoute());
    Navigation.navigate(route);
}

export default navigateToSubscription;
