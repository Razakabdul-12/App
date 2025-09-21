import CONST from '@src/CONST';
import type {QBDNonReimbursableExportAccountType} from '@src/types/onyx/Policy';
import {translateLocal} from './Localize';

function getQBDNonReimbursableExportAccountType(exportDestination: QBDNonReimbursableExportAccountType | undefined): string {
    switch (exportDestination) {
        case CONST.QUICKBOOKS_DESKTOP_NON_REIMBURSABLE_EXPORT_ACCOUNT_TYPE.CHECK:
            return translateLocal('workspace.qbd.bankAccount');
        case CONST.QUICKBOOKS_DESKTOP_NON_REIMBURSABLE_EXPORT_ACCOUNT_TYPE.CREDIT_CARD:
            return translateLocal('workspace.qbd.creditCardAccount');
        case CONST.QUICKBOOKS_DESKTOP_NON_REIMBURSABLE_EXPORT_ACCOUNT_TYPE.VENDOR_BILL:
            return translateLocal('workspace.qbd.accountsPayable');
        default:
            return translateLocal('workspace.qbd.account');
    }
}

export {getQBDNonReimbursableExportAccountType};
