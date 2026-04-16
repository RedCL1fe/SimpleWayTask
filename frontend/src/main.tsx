import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={ruRU}
        theme={{
          token: {
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            colorPrimary: '#6366f1',
            colorSuccess: '#22c55e',
            colorWarning: '#f59e0b',
            colorError: '#ef4444',
            borderRadius: 10,
            colorBgContainer: '#ffffff',
          },
          components: {
            Layout: {
              headerBg: '#0f172a',
              siderBg: '#1e293b',
              bodyBg: '#f1f5f9',
            },
            Menu: {
              darkItemBg: '#1e293b',
              darkItemSelectedBg: '#6366f1',
              darkItemHoverBg: '#334155',
            },
          },
        }}
      >
        <AntApp>
          <App />
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
