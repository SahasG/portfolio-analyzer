import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import Recommendations from '../Recommendations';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Pie: () => <div data-testid="pie-chart">Pie Chart</div>,
}));

// Mock axios
jest.mock('axios');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockRecommendations = {
  recommendations: [
    {
      ticker: 'AAPL',
      current_price: 150.00,
      weekly_high: 155.00,
      monthly_high: 160.00,
      yearly_high: 180.00,
      dip_percentage: 16.67,
      recommended_shares: 6,
      investment_amount: 900.00,
      opportunity_type: 'yearly'
    },
    {
      ticker: 'GOOGL',
      current_price: 2800.00,
      weekly_high: 2850.00,
      monthly_high: 2900.00,
      yearly_high: 3000.00,
      dip_percentage: 6.67,
      recommended_shares: 0,
      investment_amount: 100.00,
      opportunity_type: 'monthly'
    }
  ],
  total_investment: 1000.00,
  remaining_cash: 0.00
};

const mockProps = {
  portfolioId: 1,
  availableCash: 1000,
  onCashUpdate: jest.fn()
};

describe('Recommendations Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders recommendations header', () => {
    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    expect(screen.getByText('Investment Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Smart investment suggestions based on multi-timeframe dip analysis')).toBeInTheDocument();
  });

  test('displays cash input with current value', () => {
    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const cashInput = screen.getByDisplayValue('1000');
    expect(cashInput).toBeInTheDocument();
    expect(screen.getByText('Available Cash')).toBeInTheDocument();
  });

  test('updates cash input value', () => {
    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const cashInput = screen.getByDisplayValue('1000');
    fireEvent.change(cashInput, { target: { value: '2000' } });

    expect(cashInput).toHaveValue('2000');
  });

  test('calls onCashUpdate when Update button is clicked', () => {
    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const cashInput = screen.getByDisplayValue('1000');
    fireEvent.change(cashInput, { target: { value: '2000' } });

    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);

    expect(mockProps.onCashUpdate).toHaveBeenCalledWith(2000);
  });

  test('fetches and displays recommendations', async () => {
    const axios = require('axios');
    axios.post.mockResolvedValue({ data: mockRecommendations });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const getRecommendationsButton = screen.getByText('Get Recommendations');
    fireEvent.click(getRecommendationsButton);

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
      expect(screen.getByText('16.67% dip from yearly high')).toBeInTheDocument();
    });
  });

  test('displays loading state during recommendation fetch', async () => {
    const axios = require('axios');
    axios.post.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const getRecommendationsButton = screen.getByText('Get Recommendations');
    fireEvent.click(getRecommendationsButton);

    expect(screen.getByText('Analyzing market opportunities...')).toBeInTheDocument();
  });

  test('handles API error gracefully', async () => {
    const axios = require('axios');
    axios.post.mockRejectedValue(new Error('API Error'));

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const getRecommendationsButton = screen.getByText('Get Recommendations');
    fireEvent.click(getRecommendationsButton);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching recommendations/)).toBeInTheDocument();
    });
  });

  test('displays pie chart when recommendations are loaded', async () => {
    const axios = require('axios');
    axios.post.mockResolvedValue({ data: mockRecommendations });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const getRecommendationsButton = screen.getByText('Get Recommendations');
    fireEvent.click(getRecommendationsButton);

    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  test('displays correct opportunity type colors', async () => {
    const axios = require('axios');
    axios.post.mockResolvedValue({ data: mockRecommendations });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const getRecommendationsButton = screen.getByText('Get Recommendations');
    fireEvent.click(getRecommendationsButton);

    await waitFor(() => {
      // Yearly opportunity should be green
      const yearlyElement = screen.getByText('yearly high');
      expect(yearlyElement).toHaveClass('text-green-600');

      // Monthly opportunity should be blue
      const monthlyElement = screen.getByText('monthly high');
      expect(monthlyElement).toHaveClass('text-blue-600');
    });
  });

  test('displays investment summary correctly', async () => {
    const axios = require('axios');
    axios.post.mockResolvedValue({ data: mockRecommendations });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const getRecommendationsButton = screen.getByText('Get Recommendations');
    fireEvent.click(getRecommendationsButton);

    await waitFor(() => {
      expect(screen.getByText('Investment Summary')).toBeInTheDocument();
      expect(screen.getByText('$1,000.00')).toBeInTheDocument(); // Total investment
      expect(screen.getByText('$0.00')).toBeInTheDocument(); // Remaining cash
    });
  });

  test('validates cash input for negative values', () => {
    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const cashInput = screen.getByDisplayValue('1000');
    fireEvent.change(cashInput, { target: { value: '-500' } });

    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);

    // Should not call onCashUpdate with negative value
    expect(mockProps.onCashUpdate).not.toHaveBeenCalled();
  });

  test('displays empty state when no recommendations available', async () => {
    const axios = require('axios');
    axios.post.mockResolvedValue({ 
      data: { 
        recommendations: [], 
        total_investment: 0, 
        remaining_cash: 1000 
      } 
    });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const getRecommendationsButton = screen.getByText('Get Recommendations');
    fireEvent.click(getRecommendationsButton);

    await waitFor(() => {
      expect(screen.getByText('No investment opportunities found')).toBeInTheDocument();
    });
  });

  test('formats currency values correctly', async () => {
    const axios = require('axios');
    axios.post.mockResolvedValue({ data: mockRecommendations });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const getRecommendationsButton = screen.getByText('Get Recommendations');
    fireEvent.click(getRecommendationsButton);

    await waitFor(() => {
      expect(screen.getByText('$150.00')).toBeInTheDocument(); // AAPL price
      expect(screen.getByText('$2,800.00')).toBeInTheDocument(); // GOOGL price
      expect(screen.getByText('$900.00')).toBeInTheDocument(); // Investment amount
    });
  });

  test('displays correct recommendation count', async () => {
    const axios = require('axios');
    axios.post.mockResolvedValue({ data: mockRecommendations });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const getRecommendationsButton = screen.getByText('Get Recommendations');
    fireEvent.click(getRecommendationsButton);

    await waitFor(() => {
      expect(screen.getByText('2 recommendations found')).toBeInTheDocument();
    });
  });

  test('handles zero cash input', () => {
    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    const cashInput = screen.getByDisplayValue('1000');
    fireEvent.change(cashInput, { target: { value: '0' } });

    const getRecommendationsButton = screen.getByText('Get Recommendations');
    fireEvent.click(getRecommendationsButton);

    // Should show message about needing cash to invest
    expect(screen.getByText('Please enter an amount greater than $0 to get recommendations')).toBeInTheDocument();
  });
});
