import React, {useMemo,useCallback} from 'react';
import type {GestureResponderEvent} from 'react-native';
import {usePersonalDetails, useSession} from '@components/OnyxListItemProvider';
import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';
import {showContextMenuForReport} from '@components/ShowContextMenuContext';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useTransactionViolations from '@hooks/useTransactionViolations';
import ControlSelection from '@libs/ControlSelection';
import {convertToDisplayString} from '@libs/CurrencyUtils';
import {canUseTouchScreen} from '@libs/DeviceCapabilities';
import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import Navigation from '@libs/Navigation/Navigation';
import {getOriginalMessage, isMoneyRequestAction as isMoneyRequestActionReportActionsUtils} from '@libs/ReportActionsUtils';
import {getTransactionDetails} from '@libs/ReportUtils';
import {getOriginalTransactionWithSplitInfo, isCardTransaction} from '@libs/TransactionUtils';
import {clearWalletTermsError} from '@userActions/PaymentMethods';
import {clearIOUError} from '@userActions/Report';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import TransactionPreviewContent from './TransactionPreviewContent';
import type {TransactionPreviewProps} from './types';

function TransactionPreview(props: TransactionPreviewProps) {
    const {translate} = useLocalize();
    const {
        allReports,
        action,
        chatReportID,
        reportID,
        contextMenuAnchor,
        checkIfContextMenuActive = () => {},
        shouldDisplayContextMenu,
        iouReportID,
        transactionID: transactionIDFromProps,
        onPreviewPressed,
        reportPreviewAction,
        contextAction,
    } = props;

    const report = allReports?.[`${ONYXKEYS.COLLECTION.REPORT}${iouReportID}`];
    const isMoneyRequestAction = isMoneyRequestActionReportActionsUtils(action);
    const transactionID = transactionIDFromProps ?? (isMoneyRequestAction ? getOriginalMessage(action)?.IOUTransactionID : undefined);
    const [transaction] = useOnyx(`${ONYXKEYS.COLLECTION.TRANSACTION}${getNonEmptyStringOnyxID(transactionID)}`, {canBeMissing: true});
    const violations = useTransactionViolations(transaction?.transactionID);
    const [walletTerms] = useOnyx(ONYXKEYS.WALLET_TERMS, {canBeMissing: true});
    const session = useSession();
    const chatReport = allReports?.[`${ONYXKEYS.COLLECTION.REPORT}${chatReportID}`];
    const personalDetails = usePersonalDetails();

    const sessionAccountID = session?.accountID;

    const transactionDetails = useMemo(() => getTransactionDetails(transaction), [transaction]);
    const {amount: requestAmount, currency: requestCurrency} = transactionDetails ?? {};

    const showContextMenu = (event: GestureResponderEvent) => {
        if (!shouldDisplayContextMenu) {
            return;
        }
        showContextMenuForReport(event, contextMenuAnchor, contextAction ? chatReportID : reportID, contextAction ?? action, checkIfContextMenuActive);
    };

    const offlineWithFeedbackOnClose = useCallback(() => {
        clearWalletTermsError();
        clearIOUError(chatReportID);
    }, [chatReportID]);

    const transactionPreview = transaction;

    const {originalTransaction, isBillSplit} = getOriginalTransactionWithSplitInfo(transaction);

    const iouAction = action;

    // See description of `transactionRawAmount` prop for more context
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const transactionRawAmount = (transaction?.modifiedAmount || transaction?.amount) ?? 0;

    const shouldDisableOnPress = isBillSplit && isEmptyObject(transaction);
    const isTransactionMadeWithCard = isCardTransaction(transaction);
    const showCashOrCardTranslation = isTransactionMadeWithCard ? 'iou.card' : 'iou.cash';

    if (onPreviewPressed) {
        return (
            <PressableWithoutFeedback
                onPress={shouldDisableOnPress ? undefined : props.onPreviewPressed}
                onPressIn={() => canUseTouchScreen() && ControlSelection.block()}
                onPressOut={() => ControlSelection.unblock()}
                onLongPress={showContextMenu}
                shouldUseHapticsOnLongPress
                accessibilityLabel={isBillSplit ? translate('iou.split') : translate(showCashOrCardTranslation)}
                accessibilityHint={convertToDisplayString(requestAmount, requestCurrency)}
            >
                <TransactionPreviewContent
                    /* eslint-disable-next-line react/jsx-props-no-spreading */
                    {...props}
                    action={iouAction}
                    isBillSplit={isBillSplit && !transaction?.comment?.originalTransactionID}
                    chatReport={chatReport}
                    personalDetails={personalDetails}
                    transaction={transactionPreview}
                    transactionRawAmount={transactionRawAmount}
                    report={report}
                    violations={violations}
                    offlineWithFeedbackOnClose={offlineWithFeedbackOnClose}
                    sessionAccountID={sessionAccountID}
                    walletTermsErrors={walletTerms?.errors}
                />
            </PressableWithoutFeedback>
        );
    }

    return (
        <TransactionPreviewContent
            /* eslint-disable-next-line react/jsx-props-no-spreading */
            {...props}
            action={iouAction}
            isBillSplit={isBillSplit}
            chatReport={chatReport}
            personalDetails={personalDetails}
            transaction={originalTransaction}
            transactionRawAmount={transactionRawAmount}
            report={report}
            violations={violations}
            offlineWithFeedbackOnClose={offlineWithFeedbackOnClose}
            sessionAccountID={sessionAccountID}
            walletTermsErrors={walletTerms?.errors}
            reportPreviewAction={reportPreviewAction}
        />
    );
}

TransactionPreview.displayName = 'TransactionPreview';

export default TransactionPreview;
