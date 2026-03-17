import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Kategoriler nadiren değişir; uzun cache ile tekrar istek azalır
queryClient.setQueryDefaults(['categories'], {
  staleTime: 15 * 60 * 1000, // 15 dakika taze kabul et
  gcTime: 60 * 60 * 1000,    // 1 saat cache'te tut
});
