import { useQuery } from '@tanstack/react-query';
import { getContext } from '@microsoft/power-apps/app';

/** Retrieves the current Power Apps user identity through React Query. */
export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const context = await getContext();
      return context.user;
    },
  });
};
