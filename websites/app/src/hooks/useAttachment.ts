import { useLocation, useSearchParams } from 'react-router-dom';
import { useScrollTop } from './useScrollTop';

/**
 * Set in the router state of a history entry that the app pushed to show an attachment. The
 * viewer's "Return" goes back one step when it is present (the browser Back button does the
 * same), and removes the attachment parameters otherwise (deep links, new tabs).
 */
export const ATTACHMENT_OPENED_IN_APP = 'attachmentOpenedInApp';

export const isAttachmentOpenedInApp = (state: unknown): boolean =>
  !!state && typeof state === 'object' && !!(state as Record<string, unknown>)[ATTACHMENT_OPENED_IN_APP];

/** Router state for the attachment entry: the page's own state (e.g. where an item page came from) plus the flag. */
export const attachmentEntryState = (state: unknown) => ({
  ...(state && typeof state === 'object' ? (state as Record<string, unknown>) : {}),
  [ATTACHMENT_OPENED_IN_APP]: true,
});

/**
 * Hook to handle opening attachments in a way that preserves existing URL parameters.
 * This ensures that when viewing an attachment from a modal (e.g., submit item modal),
 * the return button will take you back to the modal instead of the main page.
 *
 * The attachment gets its own history entry, so the browser Back button (or a back swipe)
 * closes it and returns to the page it was opened from.
 *
 * @returns A function to open an attachment by URL
 */
export const useAttachment = () => {
  const [, setSearchParams] = useSearchParams();
  const location = useLocation();
  const scrollTop = useScrollTop();

  const openAttachment = (url: string, isPolicy?: boolean) => {
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('attachment', url);
        newParams.delete('policyTx');
        if (isPolicy) {
          newParams.set('isPolicy', 'true');
        } else {
          newParams.delete('isPolicy');
        }
        return newParams;
      },
      { state: attachmentEntryState(location.state) },
    );
    scrollTop();
  };

  return openAttachment;
};
