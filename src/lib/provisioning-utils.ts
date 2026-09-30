import type { RequestStageConfiguration } from '@/generated/models/request-stage-configuration-model';
import type { WorkflowStageOption } from '@/generated/models/workflow-stage-option-model';
import type { RequestUserStatusKey } from '@/generated/models/request-user-model';

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
const activityDateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });
const easternDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
});

export const formatDate = (value?: string) => value ? dateTimeFormatter.format(new Date(value)) : '—';
export const formatActivityDate = (value: string) => activityDateFormatter.format(new Date(value));
export const formatEasternDate = (value?: string) => value ? easternDateFormatter.format(new Date(value)) : '—';
export const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'The Dataverse operation failed.';
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const sameDataverseId = (first?: string, second?: string) =>
  Boolean(first && second && first.toLowerCase() === second.toLowerCase());

export const hasDuplicateValues = (values: string[]) => {
  const populatedValues = values.filter((value: string) => value.length > 0);
  return new Set(populatedValues).size !== populatedValues.length;
};

export const isDuplicateDraftUserField = (
  users: { name: string; email: string; bsc: string; roleIds: string[] }[],
  index: number,
  field: 'email' | 'bsc',
) => {
  const value = field === 'email'
    ? normalizeEmail(users[index]?.email ?? '')
    : (users[index]?.bsc.trim() ?? '');
  return value.length > 0 && users.some(
    (user: { name: string; email: string; bsc: string; roleIds: string[] }, userIndex: number) =>
      userIndex !== index
      && (field === 'email' ? normalizeEmail(user.email) : user.bsc.trim()) === value,
  );
};

export const workflowStageOptionForConfiguration = (
  stage: RequestStageConfiguration,
  options: WorkflowStageOption[],
) => options.find(
  (option: WorkflowStageOption) =>
    option.stageName.trim().toLowerCase() === stage.stageName.trim().toLowerCase(),
);

export const statusForWorkflowStage = (
  stage: RequestStageConfiguration,
  options: WorkflowStageOption[],
): RequestUserStatusKey => {
  const stageType = String(
    workflowStageOptionForConfiguration(stage, options)?.stageTypeKey ?? stage.stageTypeKey,
  ).replace(/[\s_-]/g, '').toLowerCase();
  if (stageType === 'completed') return 'Notified';
  if (stageType === 'notify' || stageType === 'notificationready' || stageType === 'notificationsent') {
    return stageType === 'notificationready' ? 'NotificationReady' : 'Notified';
  }
  if (stageType === 'accessassigned' || stageType === 'accessconfirmation') return 'AccessConfirmed';
  if (stageType === 'sync' || stageType === 'gccsync') return 'GCCSyncComplete';
  return 'Provisioned';
};

export const sanitizeTemplateHtml = (html: string) => {
  if (typeof DOMParser === 'undefined') return html;
  const allowedTags = new Set(['A', 'B', 'BLOCKQUOTE', 'BR', 'DIV', 'EM', 'I', 'LI', 'OL', 'P', 'STRONG', 'U', 'UL']);
  const alignmentTags = new Set(['DIV', 'LI', 'P']);
  const indentTags = new Set(['BLOCKQUOTE', 'DIV', 'LI', 'OL', 'P', 'UL']);
  const alignments = new Set(['left', 'center', 'right', 'justify']);
  const documentNode = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = documentNode.body.firstElementChild;
  if (!root) return '';
  Array.from(root.querySelectorAll('script, style, iframe, object, embed, img, svg')).forEach(
    (element: Element) => element.remove(),
  );
  Array.from(root.querySelectorAll('*')).reverse().forEach((element: Element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }
    const styleAlignment = element instanceof HTMLElement ? element.style.textAlign.trim().toLowerCase() : '';
    const attributeAlignment = element.getAttribute('align')?.trim().toLowerCase() ?? '';
    const alignment = alignments.has(styleAlignment)
      ? styleAlignment
      : alignments.has(attributeAlignment) ? attributeAlignment : '';
    const rawMarginLeft = element instanceof HTMLElement ? element.style.marginLeft.trim().toLowerCase() : '';
    const marginMatch = rawMarginLeft.match(/^(\d+(?:\.\d+)?)px$/);
    const marginValue = marginMatch ? Number(marginMatch[1]) : 0;
    const marginLeft = marginValue > 0 && marginValue <= 240 ? `${marginValue}px` : '';
    Array.from(element.attributes).forEach((attribute: Attr) => {
      const attributeName = attribute.name.toLowerCase();
      if (!(element.tagName === 'A' && ['href', 'title'].includes(attributeName))) {
        element.removeAttribute(attribute.name);
      }
    });
    const safeStyles: string[] = [];
    if (alignmentTags.has(element.tagName) && alignment) safeStyles.push(`text-align: ${alignment}`);
    if (indentTags.has(element.tagName) && marginLeft) safeStyles.push(`margin-left: ${marginLeft}`);
    if (safeStyles.length) element.setAttribute('style', safeStyles.join('; '));
    if (element.tagName === 'A') {
      const href = element.getAttribute('href')?.trim() ?? '';
      if (!/^(https?:|mailto:|\{\{)/i.test(href)) element.removeAttribute('href');
      else {
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });
  return root.innerHTML;
};
