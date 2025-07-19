import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { 
  FiTrash2, 
  FiPlus, 
  FiRefreshCw, 
  FiAlertCircle, 
  FiTrendingUp,
  FiLoader,
  FiPackage,
  FiArrowLeft
} from 'react-icons/fi';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import StrategyForm from './StrategyForm';
import Recommendations from './Recommendations';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

// Set ChartJS default font
ChartJS.defaults.font.family = 'Inter, system-ui, -apple-system, sans-serif';
ChartJS.defaults.font.size = 12;

// Helper function to safely parse numeric values
const parseNumeric = (value: string | number | undefined): number => {
  if (value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

// Format currency values
const formatCurrency = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(isNaN(num) ? 0 : num);
};

// Format percentage values
const formatPercentage = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return '0.00%';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(isNaN(num) ? 0 : num / 100);
};

// Format PL percentage with proper typing
const formatPLPercentage = (plPercent: number | string | undefined | null): string => {
  if (plPercent === undefined || plPercent === null) return '0.00%';
  const value = typeof plPercent === 'string' ? parseFloat(plPercent) : plPercent;
  if (isNaN(value)) return '0.00%';
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatPercentage(value)}`;
};

// Interfaces
type TabType = 'stocks' | 'strategy' | 'recommendations';

interface Stock {
  id: number;
  ticker: string;
  shares: number | string;
  average_price: number | string;
  current_price?: number | string;
  value?: number | string;
  pl_dollar?: number | string;
  pl_percent: number | string;
  created_at: string;
  updated_at: string;
}

interface Portfolio {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  stocks: Stock[];
  total_value: number | string;
  total_pl: number | string;
  total_pl_percent: number | string;
}

interface ApiError {
  message: string;
  error?: string;
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
}

// Chart data types
interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: readonly string[];
    borderWidth: number;
  }[];
}

interface ChartTooltipContext {
  label: string;
  raw: number;
  dataset: {
    data: number[];
  };
}

// Color palette for charts
const CHART_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
  '#F97316', // orange-500
] as const;

const PortfolioDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('stocks');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [availableCash, setAvailableCash] = useState(10000);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch portfolio data
  const fetchPortfolio = async (portfolioId: string): Promise<Portfolio> => {
    const { data } = await axios.get<Portfolio>(`http://localhost:5001/api/portfolios/${portfolioId}`);
    return {
      ...data,
      stocks: data.stocks || [],
      total_value: data.total_value || 0,
      total_pl: data.total_pl || 0,
      total_pl_percent: data.total_pl_percent || 0
    };
  };

  // Query hooks
  const { 
    data: portfolio, 
    isLoading, 
    error: queryError,
    refetch 
  } = useQuery<Portfolio, Error>({
    queryKey: ['portfolio', id],
    queryFn: () => id ? fetchPortfolio(id) : Promise.reject(new Error('No portfolio ID')),
    enabled: !!id,
  });

  // Mutation hooks
  const addStockMutation = useMutation({
    mutationFn: async (newStock: { ticker: string; shares: string; average_price: string }) => {
      const response = await axios.post(`http://localhost:5001/api/portfolios/${id}/stocks`, newStock);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', id] });
      setTicker('');
      setShares('');
      setAveragePrice('');
      setError(null);
    },
    onError: (error: AxiosError<ApiError>) => {
      setError(error.response?.data?.error || 'Failed to add stock');
    }
  });

  const deleteStockMutation = useMutation({
    mutationFn: async (stockId: string) => {
      const response = await axios.delete(`http://localhost:5001/api/portfolios/${id}/stocks/${stockId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', id] });
    },
    onError: (error: AxiosError<ApiError>) => {
      setError(error.response?.data?.error || 'Failed to delete stock');
    }
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.delete(`http://localhost:5001/api/portfolios/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      navigate('/portfolios');
    },
    onError: (error: AxiosError<ApiError>) => {
      setError(error.response?.data?.error || 'Failed to delete portfolio');
    }
  });

  // Event handlers
  const handleRefresh = async () => {
    if (!id) return;
    try {
      setIsRefreshing(true);
      await refetch();
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh portfolio data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !shares || !averagePrice) {
      setError('Please fill in all fields');
      return;
    }
    addStockMutation.mutate({
      ticker: ticker.toUpperCase(),
      shares,
      average_price: averagePrice,
    });
  };

  // Handle stock deletion
  const handleDeleteStock = (stockId: number) => {
    deleteStockMutation.mutate(stockId.toString(), {
      onError: (error) => {
        console.error('Error deleting stock:', error);
        setError('Failed to delete stock');
      }
    });
  };

  // Handle portfolio deletion
  const handleDeletePortfolio = () => {
    if (!portfolio) return;
    if (window.confirm('Are you sure you want to delete this portfolio? This action cannot be undone.')) {
      deletePortfolioMutation.mutate(undefined, {
        onSuccess: () => {
          navigate('/portfolios');
        },
        onError: (error) => {
          console.error('Error deleting portfolio:', error);
          setError('Failed to delete portfolio');
        }
      });
    }
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    if (!portfolio) return null;
    
    switch (activeTab) {
      case 'stocks':
        return (
          <div className="space-y-6">
            {/* Add Stock Form */}
            <div className="bg-white shadow-xl rounded-xl border-2 border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Add Stock</h3>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 mb-1">
                        Ticker
                      </label>
                      <input
                        type="text"
                        id="ticker"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. AAPL"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="shares" className="block text-sm font-medium text-gray-700 mb-1">
                        Shares
                      </label>
                      <input
                        type="number"
                        id="shares"
                        value={shares}
                        onChange={(e) => setShares(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. 10"
                        min="0"
                        step="0.0001"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="averagePrice" className="block text-sm font-medium text-gray-700 mb-1">
                        Average Price
                      </label>
                      <input
                        type="number"
                        id="averagePrice"
                        value={averagePrice}
                        onChange={(e) => setAveragePrice(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. 150.25"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="submit"
                      disabled={addStockMutation.isPending}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addStockMutation.isPending ? (
                        <>
                          {FiLoader({ className: "animate-spin -ml-1 mr-2 h-4 w-4" })}
                          Adding...
                        </>
                      ) : (
                        <>
                          {FiPlus({ className: "-ml-1 mr-2 h-4 w-4" })}
                          Add Stock
                        </>
                      )}
                    </button>
                    {error && (
                      <p className="ml-4 text-sm text-red-600">{error}</p>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Stocks Table */}
            <div className="bg-white shadow-xl rounded-xl border-2 border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Stocks</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ticker
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shares
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg. Price
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Price
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P/L ($)
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P/L (%)
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {portfolio.stocks && portfolio.stocks.length > 0 ? (
                      portfolio.stocks.map((stock) => (
                        <tr key={stock.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {stock.ticker}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {parseFloat(stock.shares.toString()).toLocaleString(undefined, {
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {formatCurrency(stock.average_price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {stock.current_price ? formatCurrency(stock.current_price) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {stock.value ? formatCurrency(stock.value) : 'N/A'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                            parseNumeric(stock.pl_dollar) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {stock.pl_dollar ? formatCurrency(stock.pl_dollar) : 'N/A'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                            parseNumeric(stock.pl_percent) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {stock.pl_percent ? formatPLPercentage(stock.pl_percent) : 'N/A'}
                          </td>
                           <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                             <button
                               onClick={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 handleDeleteStock(stock.id);
                               }}
                               className="text-red-600 hover:text-red-900 p-1 rounded"
                               disabled={deleteStockMutation.isPending}
                               type="button"
                             >
                               {FiTrash2({ className: "h-5 w-5" })}
                             </button>
                           </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
// ...
                          No stocks found. Add your first stock to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Portfolio Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Portfolio Distribution */}
              <div className="bg-white shadow-xl rounded-xl border-2 border-gray-100 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolio Distribution</h3>
                <div className="h-64">
                  <Doughnut
                    data={{
                      labels: portfolio.stocks?.map((stock) => stock.ticker) || [],
                      datasets: [
                        {
                          data: portfolio.stocks?.map((stock) => 
                            typeof stock.value === 'number' ? stock.value : 
                            typeof stock.value === 'string' ? parseFloat(stock.value) || 0 : 0
                          ) || [],
                          backgroundColor: CHART_COLORS,
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right' as const,
                        },
                        tooltip: {
                          callbacks: {
                            label: function (context) {
                              const label = context.label || '';
                              const value = context.raw as number;
                              const total = Array.isArray(context.dataset.data) 
                                ? context.dataset.data.reduce((a: number, b: number) => a + b, 0)
                                : 0;
                              const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                              return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              {/* Performance Summary */}
              <div className="bg-white shadow-xl rounded-xl border-2 border-gray-100 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Total Value</span>
                    <span className="text-sm font-medium text-gray-900">
                      {portfolio.total_value ? formatCurrency(portfolio.total_value) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Total P/L ($)</span>
                    <span className={`text-sm font-medium ${
                      parseNumeric(portfolio.total_pl) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {portfolio.total_pl ? formatCurrency(portfolio.total_pl) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Total P/L (%)</span>
                    <span className={`text-sm font-medium ${
                      parseNumeric(portfolio.total_pl_percent) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {portfolio.total_pl_percent ? formatPLPercentage(portfolio.total_pl_percent) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'strategy':
        return (
          <div className="bg-white shadow-xl rounded-xl border-2 border-gray-100 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolio Strategy</h3>
            <StrategyForm portfolioId={id!} />
          </div>
        );
      case 'recommendations':
        return (
          <Recommendations 
            availableCash={availableCash} 
            onCashUpdate={(cash) => setAvailableCash(cash)} 
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (queryError) {
    const errorMsg = queryError instanceof Error ? queryError.message : 'An error occurred';
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            {FiAlertCircle({ className: "h-5 w-5 text-red-400", "aria-hidden": "true" })}
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Error loading portfolio: {errorMsg}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="text-center py-12">
        {FiTrendingUp({ className: "mx-auto h-12 w-12 text-gray-300" })}
        <h2 className="mt-2 text-xl font-medium text-gray-900">Portfolio not found</h2>
        <p className="mt-2 text-gray-600">The requested portfolio could not be found.</p>
        <button
          onClick={() => navigate('/portfolios')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back to Portfolios
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 max-w-7xl mx-auto">
      {/* Back button and title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/portfolios')} className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900">
            {FiArrowLeft({ className: "mr-2 h-4 w-4" })}
            Back to Portfolios
          </button>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{portfolio.name}</h1>
          {portfolio.description && <p className="mt-1 text-sm text-gray-600">{portfolio.description}</p>}
        </div>
        <div className="flex space-x-2">
          <button onClick={handleRefresh} disabled={isRefreshing} className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {FiRefreshCw({ className: `mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}` })}
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
            {FiTrash2({ className: "mr-2 h-4 w-4" })}
            Delete Portfolio
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              {FiAlertCircle({ className: "h-5 w-5 text-red-400", "aria-hidden": "true" })}
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white overflow-hidden shadow-lg rounded-xl border-2 border-gray-100 transition-all hover:shadow-xl">
          <div className="px-6 py-6">
            <dt className="text-base font-medium text-gray-600">Total Stocks</dt>
            <dd className="mt-2 text-4xl font-bold text-gray-900">{portfolio.stocks.length}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow-lg rounded-xl border-2 border-gray-100 transition-all hover:shadow-xl">
          <div className="px-6 py-6">
            <dt className="text-base font-medium text-gray-600">Last Updated</dt>
            <dd className="mt-2 text-2xl font-semibold text-gray-900">{new Date().toLocaleTimeString()}</dd>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mt-8">
        <nav className="flex space-x-8 border-b border-gray-200">
          {(['stocks', 'strategy', 'recommendations'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  {FiAlertCircle({ className: "h-6 w-6 text-red-600" })}
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Delete portfolio</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete this portfolio? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handleDeletePortfolio}
                  disabled={deletePortfolioMutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletePortfolioMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioDetail;
