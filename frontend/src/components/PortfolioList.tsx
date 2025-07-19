import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FiPlus, FiFolder, FiClock, FiArrowRight, FiTrash2, FiEdit2 } from 'react-icons/fi';

interface Portfolio {
  id: number;
  name: string;
  created_at: string;
  total_value?: number;
  stock_count?: number;
}

const PortfolioList: React.FC = () => {
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingPortfolio, setEditingPortfolio] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const queryClient = useQueryClient();

  const { data: portfolios = [], isLoading, isError } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:5001/api/portfolios');
      return response.data;
    },
  });

  const createPortfolio = useMutation({
    mutationFn: async (name: string) => {
      const response = await axios.post('http://localhost:5001/api/portfolios', { name });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setNewPortfolioName('');
      setError(null);
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to create portfolio');
    }
  });

  const deletePortfolio = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`http://localhost:5001/api/portfolios/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });

  const renamePortfolio = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await axios.put(`http://localhost:5001/api/portfolios/${id}`, { name });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setEditingPortfolio(null);
      setEditName('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioName.trim()) return;
    createPortfolio.mutate(newPortfolioName.trim());
  };

  const handleRenameStart = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio.id);
    setEditName(portfolio.name);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editingPortfolio) return;
    renamePortfolio.mutate({ id: editingPortfolio, name: editName.trim() });
  };

  const handleRenameCancel = () => {
    setEditingPortfolio(null);
    setEditName('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Failed to load portfolios. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      </div>

      {/* Create Portfolio Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Portfolio</h2>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={newPortfolioName}
              onChange={(e) => setNewPortfolioName(e.target.value)}
              placeholder="Enter portfolio name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create
          </button>
        </form>
      </div>

      {/* Portfolios Grid */}
      {portfolios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((portfolio) => (
            <div key={portfolio.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  {editingPortfolio === portfolio.id ? (
                    <form onSubmit={handleRenameSubmit} className="flex-1 mr-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 text-lg font-medium border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            handleRenameCancel();
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            handleRenameSubmit(e);
                          }
                        }}
                        onBlur={(e) => {
                          // Only cancel if the user didn't submit the form
                          setTimeout(() => {
                            if (editingPortfolio === portfolio.id) {
                              handleRenameCancel();
                            }
                          }, 150);
                        }}
                        autoFocus
                        required
                      />
                    </form>
                  ) : (
                    <h3 className="text-lg font-medium text-gray-900">{portfolio.name}</h3>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRenameStart(portfolio);
                      }}
                      className="text-gray-400 hover:text-indigo-600"
                      aria-label="Rename portfolio"
                      title="Rename portfolio"
                    >
                      {FiEdit2({})}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete ${portfolio.name}?`)) {
                          deletePortfolio.mutate(portfolio.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-600"
                      aria-label="Delete portfolio"
                      title="Delete portfolio"
                    >
                      {FiTrash2({ className: "h-5 w-5" })}
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stocks:</span>
                    <span className="font-medium">{portfolio.stock_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created:</span>
                    <span className="font-medium">{formatDate(portfolio.created_at)}</span>
                  </div>
                  {portfolio.total_value !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Value:</span>
                      <span className="font-medium">${portfolio.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 flex justify-end border-t border-gray-100">
                <Link
                  to={`/portfolios/${portfolio.id}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center"
                >
                  View Details
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          {FiFolder({ className: "mx-auto h-12 w-12 text-gray-400" })}
          <h3 className="mt-2 text-lg font-medium text-gray-900">No portfolios</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new portfolio.</p>
        </div>
      )}
    </div>
  );
};

export default PortfolioList;
