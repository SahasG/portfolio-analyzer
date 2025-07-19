import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { FiPlus, FiTrash2, FiAlertCircle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface StrategyAllocation {
  ticker: string;
  percentage: number;
}

interface StrategyResponse {
  id: number;
  allocations: StrategyAllocation[];
}

interface StrategyFormProps {
  portfolioId: string;
}

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
  message: string;
};

const StrategyForm: React.FC<StrategyFormProps> = ({ portfolioId }) => {
  const queryClient = useQueryClient();
  const [allocations, setAllocations] = useState<StrategyAllocation[]>([{ ticker: '', percentage: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { data: strategy, isLoading } = useQuery<StrategyResponse>({
    queryKey: ['strategy', portfolioId],
    queryFn: async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/portfolios/${portfolioId}/strategy`);
        return response.data;
      } catch (error: any) {
        console.error('Error fetching strategy:', error);
        throw error;
      }
    },
    refetchOnWindowFocus: false
  });

  // Update allocations when strategy data changes
  useEffect(() => {
    if (strategy?.allocations?.length) {
      setAllocations(strategy.allocations);
    } else {
      setAllocations([{ ticker: '', percentage: 0 }]);
    }
  }, [strategy]);

  const saveStrategy = useMutation<StrategyResponse, Error, StrategyAllocation[]>({
    mutationFn: async (newAllocations: StrategyAllocation[]) => {
      const validAllocations = newAllocations
        .filter(a => a.ticker.trim() !== '' && a.percentage > 0);
      
      const totalPercentage = validAllocations.reduce((sum: number, a: StrategyAllocation) => sum + a.percentage, 0);
      
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Allocations must add up to 100%');
      }

      const response = await axios.post(
        `http://localhost:5001/api/portfolios/${portfolioId}/strategy`,
        { allocations: validAllocations }
      );
      return response.data;
    },
    onSuccess: () => {
      setSuccess('Strategy saved successfully!');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['strategy', portfolioId] });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      setError(err.response?.data?.error || err.message || 'Failed to save strategy');
      setSuccess(null);
    }
  });

  const handleAddAllocation = () => {
    setAllocations([...allocations, { ticker: '', percentage: 0 }]);
  };

  const handleRemoveAllocation = (index: number) => {
    const newAllocations = [...allocations];
    newAllocations.splice(index, 1);
    setAllocations(newAllocations.length > 0 ? newAllocations : [{ ticker: '', percentage: 0 }]);
  };

  const handleAllocationChange = (index: number, field: keyof StrategyAllocation, value: string | number) => {
    const newAllocations = [...allocations];
    
    if (field === 'ticker') {
      newAllocations[index].ticker = (value as string).toUpperCase();
    } else if (field === 'percentage') {
      const numValue = parseFloat(value as string);
      if (!isNaN(numValue)) {
        newAllocations[index].percentage = Math.min(100, Math.max(0, numValue));
      }
    }
    
    setAllocations(newAllocations);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveStrategy.mutate(allocations);
  };

  const totalPercentage = allocations.reduce((sum, a) => sum + (a.percentage || 0), 0);
  const isFormValid = allocations.every(a => a.ticker.trim() !== '' && a.percentage > 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        {FiRefreshCw({ className: "animate-spin h-8 w-8 text-blue-500" })}
        <span className="ml-2">Loading strategy...</span>
      </div>
    );
  }

  // Error handling is now done via toast notifications

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {allocations.map((allocation, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-start">
              <div className="col-span-6 sm:col-span-4">
                <label htmlFor={`ticker-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Ticker
                </label>
                <input
                  type="text"
                  id={`ticker-${index}`}
                  value={allocation.ticker}
                  onChange={(e) => handleAllocationChange(index, 'ticker', e.target.value)}
                  placeholder="e.g., AAPL"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              
              <div className="col-span-4 sm:col-span-3">
                <label htmlFor={`percentage-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Allocation %
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="number"
                    id={`percentage-${index}`}
                    min="0"
                    max="100"
                    step="0.01"
                    value={allocation.percentage || ''}
                    onChange={(e) => handleAllocationChange(index, 'percentage', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
              
              <div className="col-span-2 sm:col-span-3 flex items-end h-10">
                {allocations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAllocation(index)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    title="Remove allocation"
                  >
                    {FiTrash2({ className: "h-4 w-4" })}
                    <span className="ml-1 sm:inline hidden">Remove</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <p className="text-sm text-gray-500">
              Total: <span className="font-medium">{totalPercentage.toFixed(2)}%</span>
              {Math.abs(totalPercentage - 100) > 0.1 && (
                <span className="ml-2 text-red-600">
                  (Must total 100%)
                </span>
              )}
            </p>
          </div>
          
          <div className="flex space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleAddAllocation}
              className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {FiPlus({ className: "-ml-1 mr-2 h-4 w-4" })}
              Add Allocation
            </button>

            <button
              type="submit"
              disabled={saveStrategy.isPending || !isFormValid || Math.abs(totalPercentage - 100) > 0.1}
              className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveStrategy.isPending ? (
                <>
                  {FiRefreshCw({ className: "animate-spin -ml-1 mr-2 h-4 w-4" })}
                  Saving...
                </>
              ) : (
                'Save Strategy'
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              {FiAlertCircle({ className: "h-5 w-5 text-red-400", "aria-hidden": "true" })}
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              {FiCheckCircle({ className: "h-5 w-5 text-green-400", "aria-hidden": "true" })}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyForm;
