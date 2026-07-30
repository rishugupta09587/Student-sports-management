import * as React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppLayout } from '@/components/layout/AppLayout';
import { ThemeProvider } from '@/hooks/use-theme';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PageLoader } from '@/components/shared/PageLoader';

const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'));
const StudentListPage = React.lazy(() => import('@/pages/students/StudentListPage'));
const StudentFormPage = React.lazy(() => import('@/pages/students/StudentFormPage'));
const StudentDetailPage = React.lazy(() => import('@/pages/students/StudentDetailPage'));
const ReportsPage = React.lazy(() => import('@/pages/reports/ReportsPage'));
const ReportHistoryPage = React.lazy(() => import('@/pages/reports/ReportHistoryPage'));
const TemplatesPage = React.lazy(() => import('@/pages/templates/TemplatesPage'));
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <BrowserRouter>
            <React.Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/students" element={<StudentListPage />} />
                  <Route path="/students/new" element={<StudentFormPage />} />
                  <Route path="/students/:id" element={<StudentDetailPage />} />
                  <Route path="/students/:id/edit" element={<StudentFormPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/reports/history" element={<ReportHistoryPage />} />
                  <Route path="/templates" element={<TemplatesPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </React.Suspense>
          </BrowserRouter>
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
