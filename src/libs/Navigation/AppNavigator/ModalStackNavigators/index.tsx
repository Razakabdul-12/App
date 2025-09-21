import {useRoute} from '@react-navigation/native';
import type {ParamListBase} from '@react-navigation/routers';
import React, {useCallback, useContext} from 'react';
import {View} from 'react-native';
import {WideRHPContext} from '@components/WideRHPContextProvider';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import Overlay from '@libs/Navigation/AppNavigator/Navigators/Overlay';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import Animations from '@libs/Navigation/PlatformStackNavigation/navigationOptions/animation';
import type {PlatformStackNavigationOptions} from '@libs/Navigation/PlatformStackNavigation/types';
import type {
    AddPersonalBankAccountNavigatorParamList,
    AddUnreportedExpensesParamList,
    ConsoleNavigatorParamList,
    DebugParamList,
    EditRequestNavigatorParamList,
    FlagCommentNavigatorParamList,
    MoneyRequestNavigatorParamList,
    NewReportWorkspaceSelectionNavigatorParamList,
    ParticipantsNavigatorParamList,
    ProfileNavigatorParamList,
    ReferralDetailsNavigatorParamList,
    ReportChangeApproverParamList,
    ReportChangeWorkspaceNavigatorParamList,
    ReportDescriptionNavigatorParamList,
    ReportDetailsNavigatorParamList,
    RoomMembersNavigatorParamList,
    SearchAdvancedFiltersParamList,
    SearchReportParamList,
    SearchSavedSearchParamList,
    SettingsNavigatorParamList,
    ShareNavigatorParamList,
    SignInNavigatorParamList,
    SplitDetailsNavigatorParamList,
    TwoFactorAuthNavigatorParamList,
    WorkspaceConfirmationNavigatorParamList,
} from '@navigation/types';
import type {Screen} from '@src/SCREENS';
import SCREENS from '@src/SCREENS';
import type ReactComponentModule from '@src/types/utils/ReactComponentModule';
import useModalStackScreenOptions from './useModalStackScreenOptions';

type Screens = Partial<Record<Screen, () => React.ComponentType>>;

const OPTIONS_PER_SCREEN: Partial<Record<Screen, PlatformStackNavigationOptions>> = {
    [SCREENS.SEARCH.REPORT_RHP]: {
        animation: Animations.NONE,
    },
    [SCREENS.SEARCH.MONEY_REQUEST_REPORT_HOLD_TRANSACTIONS]: {
        animation: Animations.NONE,
    },
    [SCREENS.SEARCH.TRANSACTION_HOLD_REASON_RHP]: {
        animation: Animations.NONE,
    },
    [SCREENS.SEARCH.TRANSACTIONS_CHANGE_REPORT_SEARCH_RHP]: {
        animation: Animations.NONE,
    },
};

/**
 * Create a modal stack navigator with an array of sub-screens.
 *
 * @param screens key/value pairs where the key is the name of the screen and the value is a function that returns the lazy-loaded component
 */
function createModalStackNavigator<ParamList extends ParamListBase>(screens: Screens): React.ComponentType {
    const ModalStackNavigator = createPlatformStackNavigator<ParamList>();

    function ModalStack() {
        const styles = useThemeStyles();
        const screenOptions = useModalStackScreenOptions();
        const {secondOverlayProgress, shouldRenderSecondaryOverlay} = useContext(WideRHPContext);
        const route = useRoute();

        // We have to use the isSmallScreenWidth instead of shouldUseNarrow layout, because we want to have information about screen width without the context of side modal.
        // eslint-disable-next-line rulesdir/prefer-shouldUseNarrowLayout-instead-of-isSmallScreenWidth
        const {isSmallScreenWidth} = useResponsiveLayout();

        const getScreenOptions = useCallback<typeof screenOptions>(
            ({route: optionRoute}) => {
                // Extend common options if they are defined for the screen.
                if (OPTIONS_PER_SCREEN[optionRoute.name as Screen]) {
                    return {...screenOptions({route: optionRoute}), ...OPTIONS_PER_SCREEN[optionRoute.name as Screen]};
                }
                return screenOptions({route: optionRoute});
            },
            [screenOptions],
        );

        return (
            // This container is necessary to hide card translation during transition. Without it the user would see un-clipped cards.
            <View style={styles.modalStackNavigatorContainer(isSmallScreenWidth)}>
                <ModalStackNavigator.Navigator>
                    {Object.keys(screens as Required<Screens>).map((name) => (
                        <ModalStackNavigator.Screen
                            key={name}
                            name={name}
                            getComponent={(screens as Required<Screens>)[name as Screen]}
                            // For some reason, screenOptions is not working with function as options so we have to pass it to every screen.
                            options={getScreenOptions}
                        />
                    ))}
                </ModalStackNavigator.Navigator>
                {!isSmallScreenWidth && shouldRenderSecondaryOverlay && route.name === SCREENS.RIGHT_MODAL.SEARCH_REPORT ? (
                    // This overlay is necessary to cover the gap under the narrow format RHP screen
                    <Overlay
                        progress={secondOverlayProgress}
                        hasMarginLeft
                    />
                ) : null}
            </View>
        );
    }

    ModalStack.displayName = 'ModalStack';

    return ModalStack;
}

const MoneyRequestModalStackNavigator = createModalStackNavigator<MoneyRequestNavigatorParamList>({
    [SCREENS.MONEY_REQUEST.START]: () => require<ReactComponentModule>('../../../../pages/iou/request/IOURequestRedirectToStartPage').default,
    [SCREENS.MONEY_REQUEST.CREATE]: () => require<ReactComponentModule>('../../../../pages/iou/request/IOURequestStartPage').default,
    [SCREENS.MONEY_REQUEST.STEP_CONFIRMATION]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepConfirmation').default,
    [SCREENS.MONEY_REQUEST.STEP_AMOUNT]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepAmount').default,
    [SCREENS.MONEY_REQUEST.STEP_TAX_AMOUNT]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepTaxAmountPage').default,
    [SCREENS.MONEY_REQUEST.STEP_TAX_RATE]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepTaxRatePage').default,
    [SCREENS.MONEY_REQUEST.STEP_CATEGORY]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepCategory').default,
    [SCREENS.MONEY_REQUEST.STEP_CURRENCY]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepCurrency').default,
    [SCREENS.MONEY_REQUEST.STEP_DATE]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepDate').default,
    [SCREENS.MONEY_REQUEST.STEP_DESCRIPTION]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepDescription').default,
    [SCREENS.MONEY_REQUEST.STEP_DISTANCE]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepDistance').default,
    [SCREENS.MONEY_REQUEST.STEP_DISTANCE_RATE]: () => require<ReactComponentModule>('@pages/iou/request/step/IOURequestStepDistanceRate').default,
    [SCREENS.MONEY_REQUEST.STEP_MERCHANT]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepMerchant').default,
    [SCREENS.MONEY_REQUEST.STEP_PARTICIPANTS]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepParticipants').default,
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORIES_ROOT]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/WorkspaceCategoriesPage').default,
    [SCREENS.MONEY_REQUEST.EDIT_REPORT]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestEditReport').default,
    [SCREENS.MONEY_REQUEST.STEP_SCAN]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepScan').default,
    [SCREENS.MONEY_REQUEST.STEP_TAG]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepTag').default,
    [SCREENS.MONEY_REQUEST.STEP_WAYPOINT]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepWaypoint').default,
    [SCREENS.MONEY_REQUEST.STEP_SPLIT_PAYER]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepSplitPayer').default,
    [SCREENS.MONEY_REQUEST.STEP_SEND_FROM]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepSendFrom').default,
    [SCREENS.MONEY_REQUEST.STEP_REPORT]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepReport').default,
    [SCREENS.MONEY_REQUEST.STEP_COMPANY_INFO]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepCompanyInfo').default,
    [SCREENS.MONEY_REQUEST.HOLD]: () => require<ReactComponentModule>('../../../../pages/iou/HoldReasonPage').default,
    [SCREENS.MONEY_REQUEST.REJECT]: () => require<ReactComponentModule>('../../../../pages/iou/RejectReasonPage').default,
    [SCREENS.MONEY_REQUEST.STATE_SELECTOR]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/PersonalDetails/StateSelectionPage').default,
    [SCREENS.MONEY_REQUEST.STEP_ATTENDEES]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepAttendees').default,
    [SCREENS.MONEY_REQUEST.STEP_ACCOUNTANT]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepAccountant').default,
    [SCREENS.MONEY_REQUEST.STEP_UPGRADE]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepUpgrade').default,
    [SCREENS.MONEY_REQUEST.STEP_DESTINATION]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepDestination').default,
    [SCREENS.MONEY_REQUEST.STEP_TIME]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepTime').default,
    [SCREENS.MONEY_REQUEST.STEP_SUBRATE]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepSubrate').default,
    [SCREENS.MONEY_REQUEST.STEP_DESTINATION_EDIT]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepDestination').default,
    [SCREENS.MONEY_REQUEST.STEP_TIME_EDIT]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepTime').default,
    [SCREENS.MONEY_REQUEST.STEP_SUBRATE_EDIT]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepSubrate').default,
    [SCREENS.MONEY_REQUEST.RECEIPT_VIEW]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepScan/ReceiptView').default,
    [SCREENS.MONEY_REQUEST.SPLIT_EXPENSE]: () => require<ReactComponentModule>('../../../../pages/iou/SplitExpensePage').default,
    [SCREENS.MONEY_REQUEST.SPLIT_EXPENSE_EDIT]: () => require<ReactComponentModule>('../../../../pages/iou/SplitExpenseEditPage').default,
    [SCREENS.MONEY_REQUEST.DISTANCE_CREATE]: () => require<ReactComponentModule>('../../../../pages/iou/request/DistanceRequestStartPage').default,
    [SCREENS.MONEY_REQUEST.STEP_DISTANCE_MAP]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepDistanceMap').default,
    [SCREENS.MONEY_REQUEST.STEP_DISTANCE_MANUAL]: () => require<ReactComponentModule>('../../../../pages/iou/request/step/IOURequestStepDistanceManual').default,
});


const SplitDetailsModalStackNavigator = createModalStackNavigator<SplitDetailsNavigatorParamList>({
    [SCREENS.SPLIT_DETAILS.ROOT]: () => require<ReactComponentModule>('../../../../pages/iou/SplitBillDetailsPage').default,
});

const ProfileModalStackNavigator = createModalStackNavigator<ProfileNavigatorParamList>({
    [SCREENS.PROFILE_ROOT]: () => require<ReactComponentModule>('../../../../pages/ProfilePage').default,
});

const NewReportWorkspaceSelectionModalStackNavigator = createModalStackNavigator<NewReportWorkspaceSelectionNavigatorParamList>({
    [SCREENS.NEW_REPORT_WORKSPACE_SELECTION.ROOT]: () => require<ReactComponentModule>('../../../../pages/NewReportWorkspaceSelectionPage').default,
});

const ReportDetailsModalStackNavigator = createModalStackNavigator<ReportDetailsNavigatorParamList>({
    [SCREENS.REPORT_DETAILS.ROOT]: () => require<ReactComponentModule>('../../../../pages/ReportDetailsPage').default,
    [SCREENS.REPORT_DETAILS.SHARE_CODE]: () => require<ReactComponentModule>('../../../../pages/home/report/ReportDetailsShareCodePage').default,
    [SCREENS.REPORT_DETAILS.EXPORT]: () => require<ReactComponentModule>('../../../../pages/home/report/ReportDetailsExportPage').default,
});

const ReportChangeWorkspaceModalStackNavigator = createModalStackNavigator<ReportChangeWorkspaceNavigatorParamList>({
    [SCREENS.REPORT_CHANGE_WORKSPACE.ROOT]: () => require<ReactComponentModule>('../../../../pages/ReportChangeWorkspacePage').default,
});

const ReportChangeApproverModalStackNavigator = createModalStackNavigator<ReportChangeApproverParamList>({
    [SCREENS.REPORT_CHANGE_APPROVER.ROOT]: () => require<ReactComponentModule>('../../../../pages/ReportChangeApproverPage').default,
    [SCREENS.REPORT_CHANGE_APPROVER.ADD_APPROVER]: () => require<ReactComponentModule>('../../../../pages/ReportAddApproverPage').default,
});

const WorkspaceConfirmationModalStackNavigator = createModalStackNavigator<WorkspaceConfirmationNavigatorParamList>({
    [SCREENS.WORKSPACE_CONFIRMATION.ROOT]: () => require<ReactComponentModule>('../../../../pages/workspace/WorkspaceConfirmationPage').default,
});

const ReportDescriptionModalStackNavigator = createModalStackNavigator<ReportDescriptionNavigatorParamList>({
    [SCREENS.REPORT_DESCRIPTION_ROOT]: () => require<ReactComponentModule>('../../../../pages/ReportDescriptionPage').default,
});

const CategoriesModalStackNavigator = createModalStackNavigator({
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORIES_SETTINGS]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/WorkspaceCategoriesSettingsPage').default,
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORY_CREATE]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/CreateCategoryPage').default,
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORY_EDIT]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/EditCategoryPage').default,
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORY_SETTINGS]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/CategorySettingsPage').default,
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORIES_IMPORT]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/ImportCategoriesPage').default,
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORIES_IMPORTED]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/ImportedCategoriesPage').default,
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORY_PAYROLL_CODE]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/CategoryPayrollCodePage').default,
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORY_GL_CODE]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/CategoryGLCodePage').default,
});


const ReportParticipantsModalStackNavigator = createModalStackNavigator<ParticipantsNavigatorParamList>({
    [SCREENS.REPORT_PARTICIPANTS.ROOT]: () => require<ReactComponentModule>('../../../../pages/ReportParticipantsPage').default,
    [SCREENS.REPORT_PARTICIPANTS.INVITE]: () => require<ReactComponentModule>('../../../../pages/InviteReportParticipantsPage').default,
    [SCREENS.REPORT_PARTICIPANTS.DETAILS]: () => require<ReactComponentModule>('../../../../pages/ReportParticipantDetailsPage').default,
    [SCREENS.REPORT_PARTICIPANTS.ROLE]: () => require<ReactComponentModule>('../../../../pages/ReportParticipantRoleSelectionPage').default,
});

const RoomMembersModalStackNavigator = createModalStackNavigator<RoomMembersNavigatorParamList>({
    [SCREENS.ROOM_MEMBERS.ROOT]: () => require<ReactComponentModule>('../../../../pages/RoomMembersPage').default,
    [SCREENS.ROOM_MEMBERS.INVITE]: () => require<ReactComponentModule>('../../../../pages/RoomInvitePage').default,
    [SCREENS.ROOM_MEMBERS.DETAILS]: () => require<ReactComponentModule>('../../../../pages/RoomMemberDetailsPage').default,
});

const ConsoleModalStackNavigator = createModalStackNavigator<ConsoleNavigatorParamList>({
    [SCREENS.PUBLIC_CONSOLE_DEBUG]: () => require<ReactComponentModule>('../../../../pages/settings/AboutPage/ConsolePage').default,
});

const SettingsModalStackNavigator = createModalStackNavigator<SettingsNavigatorParamList>({
    [SCREENS.SETTINGS.SHARE_CODE]: () => require<ReactComponentModule>('../../../../pages/ShareCodePage').default,
    [SCREENS.SETTINGS.PROFILE.PRONOUNS]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/PronounsPage').default,
    [SCREENS.SETTINGS.PROFILE.DISPLAY_NAME]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/DisplayNamePage').default,
    [SCREENS.SETTINGS.PROFILE.TIMEZONE]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/TimezoneInitialPage').default,
    [SCREENS.SETTINGS.PROFILE.TIMEZONE_SELECT]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/TimezoneSelectPage').default,
    [SCREENS.SETTINGS.PROFILE.LEGAL_NAME]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/PersonalDetails/LegalNamePage').default,
    [SCREENS.SETTINGS.PROFILE.DATE_OF_BIRTH]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/PersonalDetails/DateOfBirthPage').default,
    [SCREENS.SETTINGS.PROFILE.PHONE_NUMBER]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/PersonalDetails/PhoneNumberPage').default,
    [SCREENS.SETTINGS.PROFILE.ADDRESS]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/PersonalDetails/PersonalAddressPage').default,
    [SCREENS.SETTINGS.PROFILE.ADDRESS_COUNTRY]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/PersonalDetails/CountrySelectionPage').default,
    [SCREENS.SETTINGS.PROFILE.ADDRESS_STATE]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/PersonalDetails/StateSelectionPage').default,
    [SCREENS.SETTINGS.PROFILE.CONTACT_METHODS]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/Contacts/ContactMethodsPage').default,
    [SCREENS.SETTINGS.PROFILE.CONTACT_METHOD_DETAILS]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/Contacts/ContactMethodDetailsPage').default,
    [SCREENS.SETTINGS.PROFILE.NEW_CONTACT_METHOD]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/Contacts/NewContactMethodPage').default,
    [SCREENS.SETTINGS.PROFILE.CONTACT_METHOD_VERIFY_ACCOUNT]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/Contacts/VerifyAccountPage').default,
    [SCREENS.SETTINGS.PREFERENCES.PRIORITY_MODE]: () => require<ReactComponentModule>('../../../../pages/settings/Preferences/PriorityModePage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.ROOT]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/PolicyAccountingPage').default,
    [SCREENS.SETTINGS.PREFERENCES.LANGUAGE]: () => require<ReactComponentModule>('../../../../pages/settings/Preferences/LanguagePage').default,
    [SCREENS.SETTINGS.PREFERENCES.THEME]: () => require<ReactComponentModule>('../../../../pages/settings/Preferences/ThemePage').default,
    [SCREENS.SETTINGS.PREFERENCES.PAYMENT_CURRENCY]: () => require<ReactComponentModule>('../../../../pages/settings/Preferences/PaymentCurrencyPage').default,
    [SCREENS.SETTINGS.CLOSE]: () => require<ReactComponentModule>('../../../../pages/settings/Security/CloseAccountPage').default,
    [SCREENS.SETTINGS.APP_DOWNLOAD_LINKS]: () => require<ReactComponentModule>('../../../../pages/settings/AppDownloadLinks').default,
    [SCREENS.SETTINGS.CONSOLE]: () => require<ReactComponentModule>('../../../../pages/settings/AboutPage/ConsolePage').default,
    [SCREENS.SETTINGS.SHARE_LOG]: () => require<ReactComponentModule>('../../../../pages/settings/AboutPage/ShareLogPage').default,
    [SCREENS.SETTINGS.PROFILE.STATUS]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/CustomStatus/StatusPage').default,
    [SCREENS.SETTINGS.PROFILE.STATUS_CLEAR_AFTER]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/CustomStatus/StatusClearAfterPage').default,
    [SCREENS.SETTINGS.PROFILE.STATUS_CLEAR_AFTER_DATE]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/CustomStatus/SetDatePage').default,
    [SCREENS.SETTINGS.PROFILE.STATUS_CLEAR_AFTER_TIME]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/CustomStatus/SetTimePage').default,
    [SCREENS.SETTINGS.PROFILE.VACATION_DELEGATE]: () => require<ReactComponentModule>('../../../../pages/settings/Profile/CustomStatus/VacationDelegatePage').default,
    [SCREENS.WORKSPACE.INVITE]: () => require<ReactComponentModule>('../../../../pages/workspace/WorkspaceInvitePage').default,
    [SCREENS.WORKSPACE.MEMBERS_IMPORT]: () => require<ReactComponentModule>('../../../../pages/workspace/members/ImportMembersPage').default,
    [SCREENS.WORKSPACE.MEMBERS_IMPORTED]: () => require<ReactComponentModule>('../../../../pages/workspace/members/ImportedMembersPage').default,
    [SCREENS.WORKSPACE.MEMBERS_IMPORTED_CONFIRMATION]: () => require<ReactComponentModule>('../../../../pages/workspace/members/ImportedMembersConfirmationPage').default,
    [SCREENS.WORKSPACE.INVITE_MESSAGE]: () => require<ReactComponentModule>('../../../../pages/workspace/WorkspaceInviteMessagePage').default,
    [SCREENS.WORKSPACE.INVITE_MESSAGE_ROLE]: () => require<ReactComponentModule>('../../../../pages/workspace/WorkspaceInviteMessageRolePage').default,
    [SCREENS.WORKSPACE.NAME]: () => require<ReactComponentModule>('../../../../pages/workspace/WorkspaceNamePage').default,
    [SCREENS.WORKSPACE.DESCRIPTION]: () => require<ReactComponentModule>('../../../../pages/workspace/WorkspaceOverviewDescriptionPage').default,
    [SCREENS.WORKSPACE.SHARE]: () => require<ReactComponentModule>('../../../../pages/workspace/WorkspaceOverviewSharePage').default,
    [SCREENS.WORKSPACE.CURRENCY]: () => require<ReactComponentModule>('../../../../pages/workspace/WorkspaceOverviewCurrencyPage').default,
    [SCREENS.WORKSPACE.CATEGORY_SETTINGS]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/CategorySettingsPage').default,
    [SCREENS.WORKSPACE.ADDRESS]: () => require<ReactComponentModule>('../../../../pages/workspace/WorkspaceOverviewAddressPage').default,
    [SCREENS.WORKSPACE.PLAN]: () => require<ReactComponentModule>('../../../../pages/workspace/WorkspaceOverviewPlanTypePage').default,
    [SCREENS.WORKSPACE.CATEGORIES_SETTINGS]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/WorkspaceCategoriesSettingsPage').default,
    [SCREENS.WORKSPACE.CATEGORIES_IMPORT]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/ImportCategoriesPage').default,
    [SCREENS.WORKSPACE.CATEGORIES_IMPORTED]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/ImportedCategoriesPage').default,
    [SCREENS.WORKSPACE.MEMBER_DETAILS]: () => require<ReactComponentModule>('../../../../pages/workspace/members/WorkspaceMemberDetailsPage').default,
    [SCREENS.WORKSPACE.MEMBER_CUSTOM_FIELD]: () => require<ReactComponentModule>('../../../../pages/workspace/members/WorkspaceMemberCustomFieldPage').default,
    [SCREENS.WORKSPACE.MEMBER_NEW_CARD]: () => require<ReactComponentModule>('../../../../pages/workspace/members/WorkspaceMemberNewCardPage').default,
    [SCREENS.WORKSPACE.OWNER_CHANGE_CHECK]: () => require<ReactComponentModule>('@pages/workspace/members/WorkspaceOwnerChangeWrapperPage').default,
    [SCREENS.WORKSPACE.OWNER_CHANGE_SUCCESS]: () => require<ReactComponentModule>('../../../../pages/workspace/members/WorkspaceOwnerChangeSuccessPage').default,
    [SCREENS.WORKSPACE.OWNER_CHANGE_ERROR]: () => require<ReactComponentModule>('../../../../pages/workspace/members/WorkspaceOwnerChangeErrorPage').default,
    [SCREENS.WORKSPACE.CATEGORY_CREATE]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/CreateCategoryPage').default,
    [SCREENS.WORKSPACE.CATEGORY_EDIT]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/EditCategoryPage').default,
    [SCREENS.WORKSPACE.CATEGORY_PAYROLL_CODE]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/CategoryPayrollCodePage').default,
    [SCREENS.WORKSPACE.CATEGORY_GL_CODE]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/CategoryGLCodePage').default,
    [SCREENS.WORKSPACE.CATEGORY_DEFAULT_TAX_RATE]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/CategoryDefaultTaxRatePage').default,
    [SCREENS.WORKSPACE.CATEGORY_FLAG_AMOUNTS_OVER]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/CategoryFlagAmountsOverPage').default,
    [SCREENS.WORKSPACE.CATEGORY_DESCRIPTION_HINT]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/CategoryDescriptionHintPage').default,
    [SCREENS.WORKSPACE.CATEGORY_REQUIRE_RECEIPTS_OVER]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/CategoryRequireReceiptsOverPage').default,
    [SCREENS.WORKSPACE.CATEGORY_APPROVER]: () => require<ReactComponentModule>('../../../../pages/workspace/categories/CategoryApproverPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_COMPANY_CARD_EXPENSE_ACCOUNT_SELECT]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopCompanyCardExpenseAccountSelectPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_COMPANY_CARD_EXPENSE_ACCOUNT_COMPANY_CARD_SELECT]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopCompanyCardExpenseAccountSelectCardPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_NON_REIMBURSABLE_DEFAULT_VENDOR_SELECT]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopNonReimbursableDefaultVendorSelectPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_COMPANY_CARD_EXPENSE_ACCOUNT]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopCompanyCardExpenseAccountPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_EXPORT_DATE_SELECT]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopExportDateSelectPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_EXPORT_PREFERRED_EXPORTER]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopPreferredExporterConfigurationPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_EXPORT_OUT_OF_POCKET_EXPENSES_ACCOUNT_SELECT]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopOutOfPocketExpenseAccountSelectPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_EXPORT_OUT_OF_POCKET_EXPENSES]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopOutOfPocketExpenseConfigurationPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_EXPORT_OUT_OF_POCKET_EXPENSES_SELECT]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopOutOfPocketExpenseEntitySelectPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_EXPORT]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopExportPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_ADVANCED]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/advanced/QuickbooksDesktopAdvancedPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_SETUP_MODAL]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/QuickBooksDesktopSetupPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_SETUP_REQUIRED_DEVICE_MODAL]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/RequireQuickBooksDesktopPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_TRIGGER_FIRST_SYNC]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/QuickBooksDesktopSetupFlowSyncPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_IMPORT]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopImportPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_CHART_OF_ACCOUNTS]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopChartOfAccountsPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_CLASSES]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopClassesPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_CLASSES_DISPLAYED_AS]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopClassesDisplayedAsPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_CUSTOMERS]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopCustomersPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_CUSTOMERS_DISPLAYED_AS]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopCustomersDisplayedAsPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_ITEMS]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopItemsPage').default,
    [SCREENS.REIMBURSEMENT_ACCOUNT]: () => require<ReactComponentModule>('../../../../pages/ReimbursementAccount/ReimbursementAccountPage').default,
    [SCREENS.REIMBURSEMENT_ACCOUNT_ENTER_SIGNER_INFO]: () => require<ReactComponentModule>('../../../../pages/ReimbursementAccount/EnterSignerInfo').default,
    [SCREENS.KEYBOARD_SHORTCUTS]: () => require<ReactComponentModule>('../../../../pages/KeyboardShortcutsPage').default,

    [SCREENS.WORKSPACE.ACCOUNTING.XERO_IMPORT]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/XeroImportPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_ORGANIZATION]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/XeroOrganizationConfigurationPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_CHART_OF_ACCOUNTS]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/import/XeroChartOfAccountsPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_CUSTOMER]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/import/XeroCustomerConfigurationPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_TAXES]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/XeroTaxesConfigurationPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_TRACKING_CATEGORIES]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/XeroTrackingCategoryConfigurationPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_MAP_TRACKING_CATEGORY]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/XeroMapTrackingCategoryConfigurationPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_EXPORT]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/export/XeroExportConfigurationPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_EXPORT_PURCHASE_BILL_DATE_SELECT]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/export/XeroPurchaseBillDateSelectPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_EXPORT_BANK_ACCOUNT_SELECT]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/export/XeroBankAccountSelectPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_ADVANCED]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/advanced/XeroAdvancedPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_AUTO_SYNC]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/advanced/XeroAutoSyncPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_ACCOUNTING_METHOD]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/advanced/XeroAccountingMethodPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_BILL_STATUS_SELECTOR]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/export/XeroPurchaseBillStatusSelectorPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_INVOICE_ACCOUNT_SELECTOR]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/advanced/XeroInvoiceAccountSelectorPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_EXPORT_PREFERRED_EXPORTER_SELECT]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/export/XeroPreferredExporterSelectPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_BILL_PAYMENT_ACCOUNT_SELECTOR]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/xero/advanced/XeroBillPaymentAccountSelectorPage').default,

    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_PREREQUISITES]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/SageIntacctPrerequisitesPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.ENTER_SAGE_INTACCT_CREDENTIALS]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/EnterSageIntacctCredentialsPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.EXISTING_SAGE_INTACCT_CONNECTIONS]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/ExistingConnectionsPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_ENTITY]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/SageIntacctEntityPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_EXPORT]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/export/SageIntacctExportPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_PREFERRED_EXPORTER]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/export/SageIntacctPreferredExporterPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_EXPORT_DATE]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/export/SageIntacctDatePage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_REIMBURSABLE_EXPENSES]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/export/SageIntacctReimbursableExpensesPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_NON_REIMBURSABLE_EXPENSES]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/export/SageIntacctNonReimbursableExpensesPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_REIMBURSABLE_DESTINATION]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/export/SageIntacctReimbursableExpensesDestinationPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_NON_REIMBURSABLE_DESTINATION]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/export/SageIntacctNonReimbursableExpensesDestinationPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_DEFAULT_VENDOR]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/export/SageIntacctDefaultVendorPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_NON_REIMBURSABLE_CREDIT_CARD_ACCOUNT]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/export/SageIntacctNonReimbursableCreditCardAccountPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_ADVANCED]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/advanced/SageIntacctAdvancedPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_AUTO_SYNC]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/advanced/SageIntacctAutoSyncPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_ACCOUNTING_METHOD]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/advanced/SageIntacctAccountingMethodPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_PAYMENT_ACCOUNT]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/advanced/SageIntacctPaymentAccountPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.CARD_RECONCILIATION]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/reconciliation/CardReconciliationPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.RECONCILIATION_ACCOUNT_SETTINGS]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/reconciliation/ReconciliationAccountSettingsPage').default,
     [SCREENS.WORKSPACE.COMPANY_CARDS_ASSIGN_CARD]: () => require<ReactComponentModule>('../../../../pages/workspace/companyCards/assignCard/AssignCardFeedPage').default,
       [SCREENS.WORKSPACE.COMPANY_CARDS_ADD_NEW]: () => require<ReactComponentModule>('../../../../pages/workspace/companyCards/addNew/AddNewCardPage').default,
    [SCREENS.WORKSPACE.COMPANY_CARDS_TRANSACTION_START_DATE]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/companyCards/assignCard/TransactionStartDateSelectorPage').default,
    [SCREENS.WORKSPACE.COMPANY_CARD_DETAILS]: () => require<ReactComponentModule>('../../../../pages/workspace/companyCards/WorkspaceCompanyCardDetailsPage').default,
    [SCREENS.WORKSPACE.COMPANY_CARD_NAME]: () => require<ReactComponentModule>('../../../../pages/workspace/companyCards/WorkspaceCompanyCardEditCardNamePage').default,
    [SCREENS.WORKSPACE.COMPANY_CARD_EXPORT]: () => require<ReactComponentModule>('../../../../pages/workspace/companyCards/WorkspaceCompanyCardAccountSelectCardPage').default,
    [SCREENS.WORKSPACE.COMPANY_CARDS_SETTINGS]: () => require<ReactComponentModule>('../../../../pages/workspace/companyCards/WorkspaceCompanyCardsSettingsPage').default,
    [SCREENS.WORKSPACE.COMPANY_CARDS_SETTINGS_FEED_NAME]: () => require<ReactComponentModule>('../../../../pages/workspace/companyCards/WorkspaceCompanyCardsSettingsFeedNamePage').default,
    [SCREENS.WORKSPACE.COMPANY_CARDS_SETTINGS_STATEMENT_CLOSE_DATE]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/companyCards/WorkspaceCompanyCardStatementCloseDatePage').default,
    [SCREENS.SETTINGS.ADD_PAYMENT_CARD_CHANGE_CURRENCY]: () => require<ReactComponentModule>('../../../../pages/settings/PaymentCard/ChangeCurrency').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_IMPORT]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/import/SageIntacctImportPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_TOGGLE_MAPPING]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/import/SageIntacctToggleMappingsPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_MAPPING_TYPE]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/import/SageIntacctMappingsTypePage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_IMPORT_TAX]: () => require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/import/SageIntacctImportTaxPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_IMPORT_TAX_MAPPING]: () => {
        return require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/import/SageIntacctImportTaxMappingPage').default;
    },
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_USER_DIMENSIONS]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/import/SageIntacctUserDimensionsPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_ADD_USER_DIMENSION]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/import/SageIntacctAddUserDimensionPage').default,
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_EDIT_USER_DIMENSION]: () =>
        require<ReactComponentModule>('../../../../pages/workspace/accounting/intacct/import/SageIntacctEditUserDimensionsPage').default,
   });

const TwoFactorAuthenticatorStackNavigator = createModalStackNavigator<TwoFactorAuthNavigatorParamList>({
    [SCREENS.TWO_FACTOR_AUTH.ROOT]: () => require<ReactComponentModule>('../../../../pages/settings/Security/TwoFactorAuth/TwoFactorAuthPage').default,
    [SCREENS.TWO_FACTOR_AUTH.VERIFY]: () => require<ReactComponentModule>('../../../../pages/settings/Security/TwoFactorAuth/VerifyPage').default,
    [SCREENS.TWO_FACTOR_AUTH.VERIFY_ACCOUNT]: () => require<ReactComponentModule>('../../../../pages/settings/Security/TwoFactorAuth/VerifyAccountPage').default,
    [SCREENS.TWO_FACTOR_AUTH.DISABLED]: () => require<ReactComponentModule>('../../../../pages/settings/Security/TwoFactorAuth/DisabledPage').default,
    [SCREENS.TWO_FACTOR_AUTH.DISABLE]: () => require<ReactComponentModule>('../../../../pages/settings/Security/TwoFactorAuth/DisablePage').default,
    [SCREENS.TWO_FACTOR_AUTH.SUCCESS]: () => require<ReactComponentModule>('../../../../pages/settings/Security/TwoFactorAuth/SuccessPage').default,
});

const AddPersonalBankAccountModalStackNavigator = createModalStackNavigator<AddPersonalBankAccountNavigatorParamList>({
    [SCREENS.ADD_PERSONAL_BANK_ACCOUNT_ROOT]: () => require<ReactComponentModule>('../../../../pages/AddPersonalBankAccountPage').default,
});

const FlagCommentStackNavigator = createModalStackNavigator<FlagCommentNavigatorParamList>({
    [SCREENS.FLAG_COMMENT_ROOT]: () => require<ReactComponentModule>('../../../../pages/FlagCommentPage').default,
});

const EditRequestStackNavigator = createModalStackNavigator<EditRequestNavigatorParamList>({
    [SCREENS.EDIT_REQUEST.REPORT_FIELD]: () => require<ReactComponentModule>('../../../../pages/EditReportFieldPage').default,
});

const SignInModalStackNavigator = createModalStackNavigator<SignInNavigatorParamList>({
    [SCREENS.SIGN_IN_ROOT]: () => require<ReactComponentModule>('../../../../pages/signin/SignInModal').default,
});
const ReferralModalStackNavigator = createModalStackNavigator<ReferralDetailsNavigatorParamList>({
    [SCREENS.REFERRAL_DETAILS]: () => require<ReactComponentModule>('../../../../pages/ReferralDetailsPage').default,
});

const SearchReportModalStackNavigator = createModalStackNavigator<SearchReportParamList>({
    [SCREENS.SEARCH.REPORT_RHP]: () => require<ReactComponentModule>('../../../../pages/home/ReportScreen').default,
    [SCREENS.SEARCH.MONEY_REQUEST_REPORT_HOLD_TRANSACTIONS]: () => require<ReactComponentModule>('../../../../pages/Search/SearchHoldReasonPage').default,
    [SCREENS.SEARCH.TRANSACTION_HOLD_REASON_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchHoldReasonPage').default,
    [SCREENS.SEARCH.TRANSACTIONS_CHANGE_REPORT_SEARCH_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchTransactionsChangeReport').default,
});

const SearchAdvancedFiltersModalStackNavigator = createModalStackNavigator<SearchAdvancedFiltersParamList>({
    [SCREENS.SEARCH.ADVANCED_FILTERS_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_TYPE_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersTypePage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_GROUP_BY_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersGroupByPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_STATUS_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersStatusPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_DATE_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersDatePage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_SUBMITTED_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersSubmittedPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_APPROVED_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersApprovedPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_PAID_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersPaidPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_EXPORTED_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersExportedPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_POSTED_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersPostedPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_WITHDRAWN_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersWithdrawnPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_CURRENCY_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersCurrencyPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_GROUP_CURRENCY_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersGroupCurrencyPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_DESCRIPTION_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersDescriptionPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_MERCHANT_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersMerchantPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_REPORT_ID_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersReportIDPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_AMOUNT_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersAmountPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_TOTAL_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersTotalPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_CATEGORY_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersCategoryPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_KEYWORD_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersKeywordPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_CARD_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersCardPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_TAX_RATE_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersTaxRatePage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_EXPENSE_TYPE_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersExpenseTypePage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_WITHDRAWAL_TYPE_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersWithdrawalTypePage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_TAG_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersTagPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_HAS_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersHasPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_FROM_RHP]: () => require<ReactComponentModule>('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersFromPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_TO_RHP]: () => require<ReactComponentModule>('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersToPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_IN_RHP]: () => require<ReactComponentModule>('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersInPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_TITLE_RHP]: () => require<ReactComponentModule>('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersTitlePage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_ASSIGNEE_RHP]: () => require<ReactComponentModule>('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersAssigneePage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_BILLABLE_RHP]: () => require<ReactComponentModule>('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersBillablePage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_REIMBURSABLE_RHP]: () => require<ReactComponentModule>('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersReimbursablePage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_WORKSPACE_RHP]: () => require<ReactComponentModule>('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersWorkspacePage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_PURCHASE_AMOUNT_RHP]: () => require<ReactComponentModule>('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersPurchaseAmountPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_PURCHASE_CURRENCY_RHP]: () => require<ReactComponentModule>('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersPurchaseCurrencyPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_WITHDRAWAL_ID_RHP]: () => require<ReactComponentModule>('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersWithdrawalIDPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_ACTION_RHP]: () => require<ReactComponentModule>('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersActionPage').default,
    [SCREENS.SEARCH.ADVANCED_FILTERS_ATTENDEE_RHP]: () => require<ReactComponentModule>('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersAttendeePage').default,
});

const SearchSavedSearchModalStackNavigator = createModalStackNavigator<SearchSavedSearchParamList>({
    [SCREENS.SEARCH.SAVED_SEARCH_RENAME_RHP]: () => require<ReactComponentModule>('../../../../pages/Search/SavedSearchRenamePage').default,
});

const RestrictedActionModalStackNavigator = createModalStackNavigator<SearchReportParamList>({
    [SCREENS.RESTRICTED_ACTION_ROOT]: () => require<ReactComponentModule>('../../../../pages/RestrictedAction/Workspace/WorkspaceRestrictedActionPage').default,
});

const ShareModalStackNavigator = createModalStackNavigator<ShareNavigatorParamList>({
    [SCREENS.SHARE.ROOT]: () => require<ReactComponentModule>('@pages/Share/ShareRootPage').default,
    [SCREENS.SHARE.SHARE_DETAILS]: () => require<ReactComponentModule>('@pages/Share/ShareDetailsPage').default,
    [SCREENS.SHARE.SUBMIT_DETAILS]: () => require<ReactComponentModule>('@pages/Share/SubmitDetailsPage').default,
});

const AddUnreportedExpenseModalStackNavigator = createModalStackNavigator<AddUnreportedExpensesParamList>({
    [SCREENS.ADD_UNREPORTED_EXPENSES_ROOT]: () => require<ReactComponentModule>('../../../../pages/AddUnreportedExpense').default,
});

const DebugModalStackNavigator = createModalStackNavigator<DebugParamList>({
    [SCREENS.DEBUG.REPORT]: () => require<ReactComponentModule>('../../../../pages/Debug/Report/DebugReportPage').default,
    [SCREENS.DEBUG.REPORT_ACTION]: () => require<ReactComponentModule>('../../../../pages/Debug/ReportAction/DebugReportActionPage').default,
    [SCREENS.DEBUG.REPORT_ACTION_CREATE]: () => require<ReactComponentModule>('../../../../pages/Debug/ReportAction/DebugReportActionCreatePage').default,
    [SCREENS.DEBUG.DETAILS_CONSTANT_PICKER_PAGE]: () => require<ReactComponentModule>('../../../../pages/Debug/DebugDetailsConstantPickerPage').default,
    [SCREENS.DEBUG.DETAILS_DATE_TIME_PICKER_PAGE]: () => require<ReactComponentModule>('../../../../pages/Debug/DebugDetailsDateTimePickerPage').default,
    [SCREENS.DEBUG.TRANSACTION]: () => require<ReactComponentModule>('../../../../pages/Debug/Transaction/DebugTransactionPage').default,
    [SCREENS.DEBUG.TRANSACTION_VIOLATION_CREATE]: () => require<ReactComponentModule>('../../../../pages/Debug/TransactionViolation/DebugTransactionViolationCreatePage').default,
    [SCREENS.DEBUG.TRANSACTION_VIOLATION]: () => require<ReactComponentModule>('../../../../pages/Debug/TransactionViolation/DebugTransactionViolationPage').default,
});

export {
    AddPersonalBankAccountModalStackNavigator,
    EditRequestStackNavigator,
    FlagCommentStackNavigator,
    MoneyRequestModalStackNavigator,
    ProfileModalStackNavigator,
    ReferralModalStackNavigator,
    NewReportWorkspaceSelectionModalStackNavigator,
    ReportDescriptionModalStackNavigator,
    ReportDetailsModalStackNavigator,
    ReportChangeWorkspaceModalStackNavigator,
    ReportChangeApproverModalStackNavigator,
    ReportParticipantsModalStackNavigator,
    RoomMembersModalStackNavigator,
    SettingsModalStackNavigator,
    TwoFactorAuthenticatorStackNavigator,
    SignInModalStackNavigator,
    CategoriesModalStackNavigator,
    SplitDetailsModalStackNavigator,

    SearchReportModalStackNavigator,
    RestrictedActionModalStackNavigator,
    SearchAdvancedFiltersModalStackNavigator,
    ShareModalStackNavigator,
    SearchSavedSearchModalStackNavigator,
    DebugModalStackNavigator,
    WorkspaceConfirmationModalStackNavigator,
    ConsoleModalStackNavigator,
    AddUnreportedExpenseModalStackNavigator,
};
