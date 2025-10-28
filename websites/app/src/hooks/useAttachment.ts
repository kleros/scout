import { useSearchParams } from 'react-router-dom';
import { useScrollTop } from './useScrollTop';

/**
 * Hook to handle opening attachments in a way that preserves existing URL parameters.
 * This ensures that when viewing an attachment from a modal (e.g., submit item modal),
 * the return button will take you back to the modal instead of the main page.
 *
 * @returns A function to open an attachment by URL
 */
export const useAttachment = () => {
  const [, setSearchParams] = useSearchParams();
  const scrollTop = useScrollTop();

  const openAttachment = (url: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('attachment', url);
      return newParams;
    });
    scrollTop();
  };

  return openAttachment;
};
