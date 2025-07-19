import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { FiAlertTriangle, FiArrowUp, FiInfo } from 'react-icons/fi';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
  TooltipItem
} from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface Recommendation {
  ticker: string;
  shares_to_buy: number;
  current_price: number;
  weekly_high: number;
  monthly_high: number;
  yearly_high: number;
}

interface ProjectedAllocation {
  ticker: string;
  value: number;
  percentage: number;
}

interface ProjectedPortfolio {
  total_value: number;
  allocations: ProjectedAllocation[];
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  projected_portfolio: ProjectedPortfolio;
}

const Recommendations = ({ availableCash, onCashUpdate }: { availableCash: number, onCashUpdate: (cash: number) => void }) => {
  const { id } = useParams<{ id: string }>();
  const [cashInput, setCashInput] = useState(availableCash.toString());
  const [showCashInput, setShowCashInput] = useState(false);

  // Synchronize cashInput with availableCash prop changes
  useEffect(() => {
    setCashInput(availableCash.toString());
  }, [availableCash]);

  const { data, isLoading, error, refetch } = useQuery<RecommendationsResponse>({
    queryKey: ['recommendations', id, availableCash],
    queryFn: async () => {
      const response = await axios.post(`http://localhost:5001/api/portfolios/${id}/recommendations`, {
        available_cash: availableCash
      });
      return response.data;
    },
    enabled: availableCash > 0,
    refetchOnWindowFocus: false
  });

  // Color palette for pie chart
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  // Prepare pie chart data - moved before conditional returns
  const pieChartData = useMemo(() => {
    if (!data?.projected_portfolio?.allocations) return null;

    const sortedAllocations = data.projected_portfolio.allocations
      .sort((a, b) => b.percentage - a.percentage);

    return {
      labels: sortedAllocations.map(alloc => alloc.ticker),
      datasets: [
        {
          data: sortedAllocations.map(alloc => alloc.percentage),
          backgroundColor: colors.slice(0, sortedAllocations.length),
          borderColor: colors.slice(0, sortedAllocations.length).map(color => color),
          borderWidth: 2,
        },
      ],
    };
  }, [data?.projected_portfolio?.allocations, colors]);

  const handleCashUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const newCash = parseFloat(cashInput);
    if (!isNaN(newCash) && newCash >= 0) {
      onCashUpdate(newCash);
      setShowCashInput(false);
      refetch();
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading recommendations...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        <p>Error loading recommendations: {error.message}</p>
      </div>
    );
  }

  if (!data || data.recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No recommendations available. Try adding more cash to invest.</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  };

  const getDipPercentage = (current: number, high: number) => {
    return ((high - current) / high * 100).toFixed(1);
  };

  const getBestDipInfo = (rec: Recommendation) => {
    const yearlyDip = ((rec.yearly_high - rec.current_price) / rec.yearly_high * 100);
    const monthlyDip = ((rec.monthly_high - rec.current_price) / rec.monthly_high * 100);
    const weeklyDip = ((rec.weekly_high - rec.current_price) / rec.weekly_high * 100);

    if (yearlyDip > 10) {
      return { type: 'yearly', percentage: yearlyDip.toFixed(1), high: rec.yearly_high };
    } else if (monthlyDip > 5) {
      return { type: 'monthly', percentage: monthlyDip.toFixed(1), high: rec.monthly_high };
    } else if (weeklyDip > 2) {
      return { type: 'weekly', percentage: weeklyDip.toFixed(1), high: rec.weekly_high };
    }
    return null;
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'pie'>) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const allocation = data?.projected_portfolio?.allocations.find(a => a.ticker === label);
            const valueFormatted = allocation ? formatCurrency(allocation.value) : '';
            return `${label}: ${value.toFixed(1)}% (${valueFormatted})`;
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Available to Invest</h3>
          <div className="flex items-center">
            <span className="text-2xl font-bold mr-2">{formatCurrency(availableCash)}</span>
            <button
              onClick={() => setShowCashInput(!showCashInput)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {showCashInput ? 'Cancel' : 'Edit'}
            </button>
          </div>
        </div>

        {showCashInput && (
          <form onSubmit={handleCashUpdate} className="flex space-x-2 mb-4">
            <input
              type="number"
              min="0"
              step="1"
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter amount to invest"
            />
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Update
            </button>
          </form>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">Recommended Buys</h3>
          <p className="text-sm text-gray-500">Based on your strategy and current market conditions</p>
        </div>
        <div className="divide-y divide-gray-200">
          {data.recommendations.map((rec) => {
            const dipInfo = getBestDipInfo(rec);
            return (
              <div key={rec.ticker} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{rec.ticker}</div>
                    <div className="text-sm text-gray-500">
                      {rec.shares_to_buy} share{rec.shares_to_buy !== 1 ? 's' : ''} × {formatCurrency(rec.current_price)} each
                    </div>
                    {dipInfo && (
                      <div className="text-xs text-blue-600 mt-1">
                        {dipInfo.percentage}% below {dipInfo.type} high ({formatCurrency(dipInfo.high)})
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(rec.shares_to_buy * rec.current_price)}</div>
                    {dipInfo && (
                      <div className="text-sm text-green-600 flex items-center justify-end">
                        {FiArrowUp({ className: "transform rotate-45 mr-1" })}
                        {dipInfo.type} dip opportunity
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data.projected_portfolio && pieChartData && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Projected Portfolio After Purchase</h3>
          <div className="space-y-6">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Value</span>
              <span className="font-medium">{formatCurrency(data.projected_portfolio.total_value)}</span>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-4">Portfolio Allocation</h4>
              <div className="h-80">
                <Pie data={pieChartData} options={pieChartOptions} />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500">Allocation Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.projected_portfolio.allocations
                  .sort((a, b) => b.percentage - a.percentage)
                  .map((alloc, index) => (
                    <div key={alloc.ticker} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: colors[index] }}
                        />
                        <span className="text-sm font-medium">{alloc.ticker}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatPercentage(alloc.percentage)}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(alloc.value)}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recommendations;
