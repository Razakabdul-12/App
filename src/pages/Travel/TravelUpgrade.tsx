import type {StackScreenProps} from '@react-navigation/stack';
import React, {useState} from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import ConfirmationPage from '@components/ConfirmationPage';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import Modal from '@components/Modal';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import type {WorkspaceConfirmationSubmitFunctionParams} from '@components/WorkspaceConfirmationForm';
import WorkspaceConfirmationForm from '@components/WorkspaceConfirmationForm';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import type {TravelNavigatorParamList} from '@libs/Navigation/types';
import {createDraftWorkspace, createWorkspace} from '@src/libs/actions/Policy/Policy';
import CONST from '@src/CONST';
import type SCREENS from '@src/SCREENS';

type TravelUpgradeProps = StackScreenProps<TravelNavigatorParamList, typeof SCREENS.TRAVEL.UPGRADE>;

function TravelUpgrade({route}: TravelUpgradeProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();

    const [isUpgraded, setIsUpgraded] = useState(false);
    const [shouldShowConfirmation, setShouldShowConfirmation] = useState(false);

    const onSubmit = (params: WorkspaceConfirmationSubmitFunctionParams) => {
        createDraftWorkspace('', false, params.name, params.policyID, params.currency, params.avatarFile as File);
        setShouldShowConfirmation(false);
        setIsUpgraded(true);
        createWorkspace({
            policyOwnerEmail: '',
            makeMeAdmin: false,
            policyName: params.name,
            policyID: params.policyID,
            engagementChoice: undefined,
            currency: params.currency,
            file: params.avatarFile as File,
        });
    };

    const onClose = () => {
        setShouldShowConfirmation(false);
    };

    return (
        <ScreenWrapper
            shouldShowOfflineIndicator
            testID={TravelUpgrade.displayName}
            offlineIndicatorStyle={styles.mtAuto}
        >
            <HeaderWithBackButton
                title={translate('common.upgrade')}
                onBackButtonPress={() => Navigation.goBack(route.params.backTo)}
            />
            <Modal
                type={CONST.MODAL.MODAL_TYPE.RIGHT_DOCKED}
                isVisible={shouldShowConfirmation}
                onClose={onClose}
                onModalHide={onClose}
                onBackdropPress={() => {
                    onClose();
                    Navigation.dismissModal();
                }}
                enableEdgeToEdgeBottomSafeAreaPadding
            >
                <ScreenWrapper
                    style={[styles.pb0]}
                    includePaddingTop={false}
                    enableEdgeToEdgeBottomSafeAreaPadding
                    shouldKeyboardOffsetBottomSafeAreaPadding
                    testID={TravelUpgrade.displayName}
                >
                    <WorkspaceConfirmationForm
                        onSubmit={onSubmit}
                        onBackButtonPress={onClose}
                    />
                </ScreenWrapper>
            </Modal>
            <ScrollView contentContainerStyle={styles.flexGrow1}>
                {isUpgraded ? (
                    <ConfirmationPage
                        heading={translate('workspace.upgrade.completed.headline')}
                        descriptionComponent={
                            <Text style={[styles.textAlignCenter, styles.w100]}>{translate('workspace.upgrade.completed.travelMessage')}</Text>
                        }
                        shouldShowButton
                        onButtonPress={() => Navigation.goBack()}
                        buttonText={translate('workspace.upgrade.completed.gotIt')}
                        containerStyle={[styles.flexGrow1, styles.justifyContentCenter]}
                    />
                ) : (
                    <View style={[styles.flexGrow1, styles.justifyContentCenter, styles.ph5]}>
                        <Text style={[styles.textAlignCenter, styles.mb5]}>{translate('travel.subtitle')}</Text>
                        <Button
                            success
                            large
                            text={translate('common.upgrade')}
                            onPress={() => setShouldShowConfirmation(true)}
                            disabled={isOffline}
                        />
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
}

TravelUpgrade.displayName = 'TravelUpgrade';

export default TravelUpgrade;
