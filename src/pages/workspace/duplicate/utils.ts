import type {LocaleContextProps} from '@components/LocaleContextProvider';
import {getCorrectedAutoReportingFrequency, getWorkflowApprovalsUnavailable} from '@libs/PolicyUtils';
import {getAutoReportingFrequencyDisplayNames} from '@pages/workspace/workflows/WorkspaceAutoReportingFrequencyPage';
import type {AutoReportingFrequencyKey} from '@pages/workspace/workflows/WorkspaceAutoReportingFrequencyPage';
import {isAuthenticationError} from '@userActions/connections';
import CONST from '@src/CONST';
import type {Policy} from '@src/types/onyx';
import type {ConnectionName} from '@src/types/onyx/Policy';

function getWorkflowRules(policy: Policy | undefined, translate: LocaleContextProps['translate']) {
    const total: string[] = [];
    const {bankAccountID} = policy?.achAccount ?? {};
    const hasDelayedSubmissionError = !!(policy?.errorFields?.autoReporting ?? policy?.errorFields?.autoReportingFrequency);
    const hasApprovalError = !!policy?.errorFields?.approvalMode;
    const shouldShowBankAccount = !!bankAccountID && policy?.reimbursementChoice === CONST.POLICY.REIMBURSEMENT_CHOICES.REIMBURSEMENT_YES;

    if (policy?.autoReportingFrequency !== CONST.POLICY.AUTO_REPORTING_FREQUENCIES.INSTANT && !hasDelayedSubmissionError) {
        const title =
            getAutoReportingFrequencyDisplayNames(translate)[(getCorrectedAutoReportingFrequency(policy) as AutoReportingFrequencyKey) ?? CONST.POLICY.AUTO_REPORTING_FREQUENCIES.WEEKLY];
        total.push(`${title} ${translate('workspace.duplicateWorkspace.delayedSubmission')}`);
    }
    if ([CONST.POLICY.APPROVAL_MODE.BASIC, CONST.POLICY.APPROVAL_MODE.ADVANCED].some((approvalMode) => approvalMode === policy?.approvalMode) && !hasApprovalError) {
        total.push(translate('common.approvals'));
    }
    if (policy?.reimbursementChoice !== CONST.POLICY.REIMBURSEMENT_CHOICES.REIMBURSEMENT_NO) {
        if (shouldShowBankAccount) {
            total.push(`1 ${translate('workspace.duplicateWorkspace.reimbursementAccount')}`);
        } else {
            total.push(translate('common.payments'));
        }
    }
    return total.length > 0 ? total : null;
}

function getAllValidConnectedIntegration(policy: Policy | undefined, accountingIntegrations?: ConnectionName[]) {
    return (accountingIntegrations ?? Object.values(CONST.POLICY.CONNECTIONS.NAME)).filter(
        (integration) => !!policy?.connections?.[integration] && !isAuthenticationError(policy, integration),
    );
}

export {getWorkflowRules, getAllValidConnectedIntegration};
