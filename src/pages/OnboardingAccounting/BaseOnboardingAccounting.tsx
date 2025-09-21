import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {InteractionManager, View} from 'react-native';
import type {SvgProps} from 'react-native-svg';
import Button from '@components/Button';
import FixedFooter from '@components/FixedFooter';
import FormHelpMessage from '@components/FormHelpMessage';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import Icon from '@components/Icon';
import * as Expensicons from '@components/Icon/Expensicons';
import {PressableWithoutFeedback} from '@components/Pressable';
import RadioButtonWithLabel from '@components/RadioButtonWithLabel';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import type {ListItem} from '@components/SelectionList/types';
import Text from '@components/Text';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnboardingMessages from '@hooks/useOnboardingMessages';
import useOnyx from '@hooks/useOnyx';
import usePermissions from '@hooks/usePermissions';
import usePrevious from '@hooks/usePrevious';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {openOldDotLink} from '@libs/actions/Link';
import {createWorkspace, generatePolicyID} from '@libs/actions/Policy/Policy';
import {completeOnboarding} from '@libs/actions/Report';
import {setOnboardingAdminsChatReportID, setOnboardingPolicyID, setOnboardingUserReportedIntegration} from '@libs/actions/Welcome';
import Navigation from '@libs/Navigation/Navigation';
import {waitForIdle} from '@libs/Network/SequentialQueue';
import {navigateAfterOnboardingWithMicrotaskQueue} from '@libs/navigateAfterOnboarding';
import {shouldOnboardingRedirectToOldDot} from '@libs/OnboardingUtils';
import {isPaidGroupPolicy, isPolicyAdmin} from '@libs/PolicyUtils';
import variables from '@styles/variables';
import {closeReactNativeApp} from '@userActions/HybridApp';
import CONFIG from '@src/CONFIG';
import type {OnboardingAccounting} from '@src/CONST';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {BaseOnboardingAccountingProps} from './types';

type Integration = {
    key: OnboardingAccounting;
    icon: React.FC<SvgProps>;
    translationKey: TranslationPaths;
};

const integrations: Integration[] = [
    {
        key: 'quickbooksDesktop',
        icon: Expensicons.QBDSquare,
        translationKey: 'workspace.accounting.qbd',
    },
    {
        key: 'xero',
        icon: Expensicons.XeroCircle,
        translationKey: 'workspace.accounting.xero',
    },
    {
        key: 'intacct',
        icon: Expensicons.IntacctSquare,
        translationKey: 'workspace.accounting.intacct',
    },
    {
        key: 'sap',
        icon: Expensicons.SapSquare,
        translationKey: 'workspace.accounting.sap',
    },
    {
        key: 'oracle',
        icon: Expensicons.OracleSquare,
        translationKey: 'workspace.accounting.oracle',
    },
    {
        key: 'microsoftDynamics',
        icon: Expensicons.MicrosoftDynamicsSquare,
        translationKey: 'workspace.accounting.microsoftDynamics',
    },
];

type OnboardingListItem = ListItem & {
    keyForList: OnboardingAccounting;
};

function BaseOnboardingAccounting({shouldUseNativeStyles}: BaseOnboardingAccountingProps) {
    const styles = useThemeStyles();
    const theme = useTheme();
    const StyleUtils = useStyleUtils();
    const {translate} = useLocalize();
    const {onboardingMessages} = useOnboardingMessages();
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const {isBetaEnabled} = usePermissions();

    // We need to use isSmallScreenWidth, see navigateAfterOnboarding function comment
    // eslint-disable-next-line rulesdir/prefer-shouldUseNarrowLayout-instead-of-isSmallScreenWidth
    const {onboardingIsMediumOrLargerScreenWidth, isSmallScreenWidth} = useResponsiveLayout();
    const [onboardingPolicyID] = useOnyx(ONYXKEYS.ONBOARDING_POLICY_ID, {canBeMissing: true});
    const [onboardingPurposeSelected] = useOnyx(ONYXKEYS.ONBOARDING_PURPOSE_SELECTED, {canBeMissing: true});
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {canBeMissing: false});
    const [onboardingCompanySize] = useOnyx(ONYXKEYS.ONBOARDING_COMPANY_SIZE, {canBeMissing: true});
    const [onboardingAdminsChatReportID] = useOnyx(ONYXKEYS.ONBOARDING_ADMINS_CHAT_REPORT_ID, {canBeMissing: true});
    const [session] = useOnyx(ONYXKEYS.SESSION, {canBeMissing: false});
    const [onboardingUserReportedIntegration] = useOnyx(ONYXKEYS.ONBOARDING_USER_REPORTED_INTEGRATION, {canBeMissing: true});

    const [userReportedIntegration, setUserReportedIntegration] = useState<OnboardingAccounting | undefined>(onboardingUserReportedIntegration ?? undefined);
    const [error, setError] = useState('');

    const paidGroupPolicy = Object.values(allPolicies ?? {}).find((policy) => isPaidGroupPolicy(policy) && isPolicyAdmin(policy, session?.email));
    const [onboarding] = useOnyx(ONYXKEYS.NVP_ONBOARDING, {canBeMissing: true});
    const {isOffline} = useNetwork();
    const isLoading = onboarding?.isLoading;
    const prevIsLoading = usePrevious(isLoading);

    const isVsb = onboarding?.signupQualifier === CONST.ONBOARDING_SIGNUP_QUALIFIERS.VSB;

    // Set onboardingPolicyID and onboardingAdminsChatReportID if a workspace is created by the backend for OD signup
    useEffect(() => {
        if (!paidGroupPolicy || onboardingPolicyID) {
            return;
        }
        setOnboardingAdminsChatReportID(paidGroupPolicy.chatReportIDAdmins?.toString());
        setOnboardingPolicyID(paidGroupPolicy.id);
    }, [paidGroupPolicy, onboardingPolicyID]);

    useEffect(() => {
        if (!!isLoading || !prevIsLoading) {
            return;
        }

        if (CONFIG.IS_HYBRID_APP) {
            closeReactNativeApp({shouldSetNVP: true});
            return;
        }
        waitForIdle().then(() => {
            openOldDotLink(CONST.OLDDOT_URLS.INBOX, true);
        });
    }, [isLoading, prevIsLoading]);

    const accountingOptions: OnboardingListItem[] = useMemo(() => {
        const createAccountingOption = (integration: Integration): OnboardingListItem => ({
            keyForList: integration.key,
            text: translate(integration.translationKey),
            leftElement: (
                <Icon
                    src={integration.icon}
                    width={variables.iconSizeExtraLarge}
                    height={variables.iconSizeExtraLarge}
                    additionalStyles={[StyleUtils.getAvatarBorderStyle(CONST.AVATAR_SIZE.DEFAULT, CONST.ICON_TYPE_AVATAR), styles.mr3]}
                />
            ),
            isSelected: userReportedIntegration === integration.key,
        });

        const noneAccountingOption: OnboardingListItem = {
            keyForList: null,
            text: translate('onboarding.accounting.none'),
            leftElement: (
                <Icon
                    src={Expensicons.CircleSlash}
                    width={variables.iconSizeNormal}
                    height={variables.iconSizeNormal}
                    fill={theme.icon}
                    additionalStyles={[StyleUtils.getAvatarBorderStyle(CONST.AVATAR_SIZE.DEFAULT, CONST.ICON_TYPE_AVATAR), styles.mr3, styles.onboardingSmallIcon]}
                />
            ),
            isSelected: userReportedIntegration === null,
        };

        const othersAccountingOption: OnboardingListItem = {
            keyForList: 'other',
            text: translate('workspace.accounting.other'),
            leftElement: (
                <Icon
                    src={Expensicons.Connect}
                    width={variables.iconSizeNormal}
                    height={variables.iconSizeNormal}
                    fill={theme.icon}
                    additionalStyles={[StyleUtils.getAvatarBorderStyle(CONST.AVATAR_SIZE.DEFAULT, CONST.ICON_TYPE_AVATAR), styles.mr3, styles.onboardingSmallIcon]}
                />
            ),
            isSelected: userReportedIntegration === 'other',
        };

        return [...integrations.map(createAccountingOption), othersAccountingOption, noneAccountingOption];
    }, [StyleUtils, styles.mr3, styles.onboardingSmallIcon, theme.icon, translate, userReportedIntegration]);

    const handleContinue = useCallback(() => {
        if (userReportedIntegration === undefined) {
            setError(translate('onboarding.errorSelection'));
            return;
        }

        if (!onboardingPurposeSelected || !onboardingCompanySize) {
            return;
        }

        setOnboardingUserReportedIntegration(userReportedIntegration);

        const shouldCreateWorkspace = !onboardingPolicyID && !paidGroupPolicy;
        const newUserReportedIntegration = userReportedIntegration ?? undefined;
        const {adminsChatReportID, policyID} = shouldCreateWorkspace
            ? createWorkspace({
                  policyOwnerEmail: undefined,
                  makeMeAdmin: true,
                  policyName: '',
                  policyID: generatePolicyID(),
                  engagementChoice: CONST.ONBOARDING_CHOICES.MANAGE_TEAM,
                  currency: currentUserPersonalDetails?.localCurrencyCode ?? '',
                  file: undefined,
                  shouldAddOnboardingTasks: false,
                  companySize: onboardingCompanySize,
                  userReportedIntegration: newUserReportedIntegration,
              })
            : {adminsChatReportID: onboardingAdminsChatReportID, policyID: onboardingPolicyID};

        if (shouldCreateWorkspace) {
            setOnboardingAdminsChatReportID(adminsChatReportID);
            setOnboardingPolicyID(policyID);
        }

        completeOnboarding({
            engagementChoice: onboardingPurposeSelected,
            onboardingMessage: onboardingMessages[onboardingPurposeSelected],
            adminsChatReportID,
            onboardingPolicyID: policyID,
            companySize: onboardingCompanySize,
            userReportedIntegration: newUserReportedIntegration,
            firstName: currentUserPersonalDetails?.firstName,
            lastName: currentUserPersonalDetails?.lastName,
            shouldSkipTestDriveModal: !!policyID && !adminsChatReportID,
        });

        if (shouldOnboardingRedirectToOldDot(onboardingCompanySize, newUserReportedIntegration)) {
            return;
        }

        InteractionManager.runAfterInteractions(() => {
            setOnboardingAdminsChatReportID();
            setOnboardingPolicyID();
        });

        navigateAfterOnboardingWithMicrotaskQueue(
            isSmallScreenWidth,
            isBetaEnabled(CONST.BETAS.DEFAULT_ROOMS),
            policyID,
            adminsChatReportID,
            (session?.email ?? '').includes('+'),
        );
    }, [
        userReportedIntegration,
        translate,
        onboardingPurposeSelected,
        onboardingCompanySize,
        onboardingPolicyID,
        paidGroupPolicy,
        onboardingAdminsChatReportID,
        onboardingMessages,
        currentUserPersonalDetails,
        isSmallScreenWidth,
        isBetaEnabled,
        session?.email,
    ]);

    const handleIntegrationSelect = useCallback((integrationKey: OnboardingAccounting | null) => {
        setUserReportedIntegration(integrationKey);
        setError('');
    }, []);

    const renderOption = useCallback(
        (item: OnboardingListItem) => (
            <PressableWithoutFeedback
                key={item.keyForList ?? ''}
                onPress={() => handleIntegrationSelect(item.keyForList)}
                accessibilityLabel={item.text}
                accessible={false}
                hoverStyle={styles.hoveredComponentBG}
                style={[styles.onboardingAccountingItem, isSmallScreenWidth && styles.flexBasis100]}
            >
                <RadioButtonWithLabel
                    isChecked={!!item.isSelected}
                    onPress={() => handleIntegrationSelect(item.keyForList)}
                    wrapperStyle={[styles.ml0]}
                    labelElement={
                        <View style={[styles.alignItemsCenter, styles.flexRow]}>
                            {item.leftElement}
                            <Text style={styles.textStrong}>{item.text}</Text>
                        </View>
                    }
                />
            </PressableWithoutFeedback>
        ),
        [
            handleIntegrationSelect,
            isSmallScreenWidth,
            styles.alignItemsCenter,
            styles.flexBasis100,
            styles.flexRow,
            styles.ml0,
            styles.onboardingAccountingItem,
            styles.textStrong,
            styles.hoveredComponentBG,
            styles.activeComponentBG,
        ],
    );

    return (
        <ScreenWrapper
            testID="BaseOnboardingAccounting"
            style={[styles.defaultModalContainer, shouldUseNativeStyles && styles.pt8]}
            shouldEnableMaxHeight
        >
            <HeaderWithBackButton
                shouldShowBackButton={!isVsb}
                progressBarPercentage={80}
                onBackButtonPress={() => Navigation.goBack(ROUTES.ONBOARDING_EMPLOYEES.getRoute())}
            />
            <View style={[onboardingIsMediumOrLargerScreenWidth && styles.mt5, onboardingIsMediumOrLargerScreenWidth ? styles.mh8 : styles.mh5]}>
                <Text style={[styles.textHeadlineH1, styles.mb5]}>{translate('onboarding.accounting.title')}</Text>
            </View>
            <ScrollView style={[onboardingIsMediumOrLargerScreenWidth ? styles.mh8 : styles.mh5, styles.pt3, styles.pb8]}>
                <View style={[styles.flexRow, styles.flexWrap, styles.gap3, styles.mb3]}>{accountingOptions.map(renderOption)}</View>
            </ScrollView>
            <FixedFooter style={[styles.pt3, styles.ph5]}>
                {!!error && (
                    <FormHelpMessage
                        style={[styles.ph1, styles.mb2]}
                        isError
                        message={error}
                    />
                )}

                <Button
                    success
                    large
                    text={translate('common.continue')}
                    onPress={handleContinue}
                    isLoading={isLoading}
                    isDisabled={isOffline && shouldOnboardingRedirectToOldDot(onboardingCompanySize, userReportedIntegration)}
                    pressOnEnter
                />
            </FixedFooter>
        </ScreenWrapper>
    );
}

BaseOnboardingAccounting.displayName = 'BaseOnboardingAccounting';

export default BaseOnboardingAccounting;
