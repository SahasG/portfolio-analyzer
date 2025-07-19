import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import PortfolioList from './components/PortfolioList';
import PortfolioDetail from './components/PortfolioDetail';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-100">
          {/* Page content */}
          <main className="py-8 px-4">
            <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6">
              <Routes>
                <Route path="/" element={<PortfolioList />} />
                <Route path="/portfolios" element={<PortfolioList />} />
                <Route path="/portfolios/:id" element={<PortfolioDetail />} />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
