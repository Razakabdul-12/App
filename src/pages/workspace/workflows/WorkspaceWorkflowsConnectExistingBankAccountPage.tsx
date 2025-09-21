import React, {useMemo} from 'react';
import {View} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItem from '@components/MenuItem';
import * as Expensicons from '@components/Icon/Expensicons';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useNetwork from '@hooks/useNetwork';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {WorkspaceSplitNavigatorParamList} from '@navigation/types';
import {formatPaymentMethods} from '@libs/PaymentUtils';
import {setWorkspaceReimbursement} from '@userActions/Policy/Policy';
import {navigateToBankAccountRoute} from '@userActions/ReimbursementAccount';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type {BankAccountList, PaymentMethod} from '@src/types/onyx';
import {getEmptyObject, isEmptyObject} from '@src/types/utils/EmptyObject';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

type WorkspaceWorkflowsConnectExistingBankAccountPageProps = PlatformStackScreenProps<WorkspaceSplitNavigatorParamList, typeof SCREENS.WORKSPACE.WORKFLOWS_CONNECT_EXISTING_BANK_ACCOUNT>;

function WorkspaceWorkflowsConnectExistingBankAccountPage({route}: WorkspaceWorkflowsConnectExistingBankAccountPageProps) {
    const policyID = route.params?.policyID;
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {canBeMissing: false});
    const policyName = policy?.name ?? '';
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const {isOffline} = useNetwork();
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [bankAccountList = getEmptyObject<BankAccountList>(), bankAccountListResult] = useOnyx(ONYXKEYS.BANK_ACCOUNT_LIST, {canBeMissing: true});
    const isLoadingBankAccountList = isLoadingOnyxValue(bankAccountListResult);

    const businessPaymentMethods = useMemo<PaymentMethod[]>(() => {
        let combinedPaymentMethods = formatPaymentMethods(isLoadingBankAccountList ? {} : bankAccountList, [], styles);
        combinedPaymentMethods = combinedPaymentMethods.filter(
            (paymentMethod) => (paymentMethod.accountData as {type?: string} | undefined)?.type === CONST.BANK_ACCOUNT.TYPE.BUSINESS,
        );

        if (!isOffline) {
            combinedPaymentMethods = combinedPaymentMethods.filter(
                (paymentMethod) =>
                    paymentMethod.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE || !isEmptyObject(paymentMethod.errors),
            );
        }

        return combinedPaymentMethods;
    }, [bankAccountList, isLoadingBankAccountList, isOffline, styles]);

    const handleAddBankAccountPress = () => {
        navigateToBankAccountRoute(route.params.policyID, ROUTES.WORKSPACE_WORKFLOWS.getRoute(route.params.policyID));
    };

    const handleItemPress = (methodID?: number) => {
        const newReimburserEmail = policy?.achAccount?.reimburser ?? policy?.owner ?? '';
        setWorkspaceReimbursement({
            policyID: route.params.policyID,
            reimbursementChoice: CONST.POLICY.REIMBURSEMENT_CHOICES.REIMBURSEMENT_YES,
            bankAccountID: methodID ?? CONST.DEFAULT_NUMBER_ID,
            reimburserEmail: newReimburserEmail,
        });
        Navigation.setNavigationActionToMicrotaskQueue(() => Navigation.goBack(ROUTES.WORKSPACE_WORKFLOWS.getRoute(policyID)));
    };

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            testID={WorkspaceWorkflowsConnectExistingBankAccountPage.displayName}
        >
            <HeaderWithBackButton
                title={translate('bankAccount.addBankAccount')}
                subtitle={policyName}
                onBackButtonPress={Navigation.goBack}
            />
            <ScrollView style={[styles.w100, shouldUseNarrowLayout ? [styles.pt3, styles.ph5, styles.pb5] : [styles.pt5, styles.ph8, styles.pb8]]}>
                <Text>{translate('workspace.bankAccount.chooseAnExisting')}</Text>
                <View style={[styles.mt5, shouldUseNarrowLayout ? styles.mhn5 : styles.mhn8]}>
                    {businessPaymentMethods.map((paymentMethod, index) => (
                        <MenuItem
                            key={paymentMethod.key ?? `${paymentMethod.methodID ?? index}`}
                            title={paymentMethod.title ?? ''}
                            description={paymentMethod.description}
                            icon={paymentMethod.icon}
                            iconHeight={paymentMethod.iconHeight ?? paymentMethod.iconSize}
                            iconWidth={paymentMethod.iconWidth ?? paymentMethod.iconSize}
                            iconStyles={paymentMethod.iconStyles}
                            onPress={() => handleItemPress(paymentMethod.methodID)}
                            iconRight={Expensicons.ArrowRight}
                            shouldShowRightIcon
                            disabled={paymentMethod.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE}
                            wrapperStyle={[shouldUseNarrowLayout ? styles.ph5 : styles.ph8, styles.pv3]}
                        />
                    ))}
                    <MenuItem
                        title={translate('bankAccount.addBankAccount')}
                        icon={Expensicons.Plus}
                        onPress={handleAddBankAccountPress}
                        iconRight={Expensicons.ArrowRight}
                        shouldShowRightIcon
                        wrapperStyle={[shouldUseNarrowLayout ? styles.ph5 : styles.ph8, styles.pv3]}
                    />
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

WorkspaceWorkflowsConnectExistingBankAccountPage.displayName = 'WorkspaceWorkflowsConnectExistingBankAccountPage';

export default WorkspaceWorkflowsConnectExistingBankAccountPage;
