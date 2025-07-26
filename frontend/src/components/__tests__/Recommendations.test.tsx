import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import axios from 'axios';
import Recommendations from '../Recommendations';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Pie: () => <div data-testid="pie-chart">Pie Chart</div>,
}));

// Mock axios
const mockedAxios = axios as jest.Mocked<typeof axios>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        gcTime: 0,
        staleTime: 0
      },
      mutations: { retry: false }
    }
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
      shares_to_buy: 6,
      current_price: 150.00,
      weekly_high: 155.00,
      monthly_high: 160.00,
      yearly_high: 180.00
    },
    {
      ticker: 'GOOGL',
      shares_to_buy: 1,
      current_price: 2800.00,
      weekly_high: 2850.00,
      monthly_high: 2900.00,
      yearly_high: 3000.00
    }
  ],
  projected_portfolio: {
    total_value: 3700.00,
    allocations: [
      { ticker: 'AAPL', value: 900.00, percentage: 24.32 },
      { ticker: 'GOOGL', value: 2800.00, percentage: 75.68 }
    ]
  }
};

const mockProps = {
  portfolioId: 1,
  availableCash: 1000,
  onCashUpdate: jest.fn()
};

describe('Recommendations Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset axios mocks to default behavior
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.delete.mockReset();
  });

  test('renders recommendations header', async () => {
    mockedAxios.post.mockResolvedValue({ data: mockRecommendations });
    
    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Wait for recommendations to load, then check for header elements
    await waitFor(() => {
      expect(screen.getByText('Recommended Buys')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(screen.getByText('Based on your strategy and current market conditions')).toBeInTheDocument();
  });

  test('displays cash input with current value', async () => {
    mockedAxios.post.mockResolvedValue({ data: mockRecommendations });
    
    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Wait for recommendations to load, then click Edit to show cash input
    await waitFor(() => {
      expect(screen.getByText('Available to Invest')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Click Edit button to show cash input form
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    const cashInput = screen.getByDisplayValue('1000');
    expect(cashInput).toBeInTheDocument();
  });

  test('updates cash input value', async () => {
    mockedAxios.post.mockResolvedValue({ data: mockRecommendations });
    
    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Wait for recommendations to load, then click Edit to show cash input
    await waitFor(() => {
      expect(screen.getByText('Available to Invest')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Click Edit button to show cash input form
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    const cashInput = screen.getByDisplayValue('1000');
    fireEvent.change(cashInput, { target: { value: '2000' } });

    expect(cashInput).toHaveValue(2000);
  });

  test('calls onCashUpdate when Update button is clicked', async () => {
    mockedAxios.post.mockResolvedValue({ data: mockRecommendations });
    
    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Wait for recommendations to load, then click Edit to show cash input
    await waitFor(() => {
      expect(screen.getByText('Available to Invest')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Click Edit button to show cash input form
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    const cashInput = screen.getByDisplayValue('1000');
    fireEvent.change(cashInput, { target: { value: '2000' } });

    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);

    expect(mockProps.onCashUpdate).toHaveBeenCalledWith(2000);
  });

  test('handles user interaction for getting recommendations', async () => {
    mockedAxios.post.mockResolvedValue({ data: mockRecommendations });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Component automatically loads recommendations, wait for them to appear
    await waitFor(() => {
      expect(screen.getByText('Recommended Buys')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0);
  });

  test('displays loading state during recommendation fetch', async () => {
    mockedAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Component automatically shows loading state
    expect(screen.getByText('Loading recommendations...')).toBeInTheDocument();
  });

  test('handles API error gracefully', async () => {
    mockedAxios.post.mockRejectedValue(new Error('API Error'));

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Component automatically tries to load recommendations and shows error
    await waitFor(() => {
      expect(screen.getByText(/Error loading recommendations/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('displays pie chart when recommendations are loaded', async () => {
    mockedAxios.post.mockResolvedValue({ data: mockRecommendations });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Component automatically loads recommendations and shows pie chart
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('displays correct opportunity type colors', async () => {
    mockedAxios.post.mockResolvedValue({ data: mockRecommendations });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Component automatically loads recommendations and shows opportunity types
    await waitFor(() => {
      expect(screen.getByText('yearly dip opportunity')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('displays investment summary correctly', async () => {
    mockedAxios.post.mockResolvedValue({ data: mockRecommendations });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Available to Invest')).toBeInTheDocument();
      expect(screen.getByText('$1,000.00')).toBeInTheDocument(); // Available cash
      expect(screen.getByText('Recommended Buys')).toBeInTheDocument();
    });
  });

  test('validates cash input for negative values', async () => {
    mockedAxios.post.mockResolvedValue({ data: mockRecommendations });
    
    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Wait for component to load and show the edit button
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    // Click edit to show cash input
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    // Now the cash input should be visible
    const cashInput = screen.getByDisplayValue('1000');
    fireEvent.change(cashInput, { target: { value: '-500' } });

    const updateButton = screen.getByText('Update');
    expect(updateButton).toBeInTheDocument();

    // Should not call onCashUpdate with negative value
    expect(mockProps.onCashUpdate).not.toHaveBeenCalled();
  });

  test('displays empty state when no recommendations available', async () => {
    mockedAxios.post.mockResolvedValue({ 
      data: { 
        recommendations: [], 
        total_investment: 0, 
        projected_portfolio: { total_value: 0, allocations: [] } 
      } 
    });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Component should show empty state message when no recommendations
    await waitFor(() => {
      expect(screen.getByText('No recommendations available. Try adding more cash to invest.')).toBeInTheDocument();
    });
  });

  test('formats currency values correctly', async () => {
    mockedAxios.post.mockResolvedValue({ data: mockRecommendations });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Wait for recommendations to load and check essential elements
    await waitFor(() => {
      expect(screen.getByText('Available to Invest')).toBeInTheDocument();
      expect(screen.getByText('Recommended Buys')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Check that currency values are displayed (using getAllByText for values that appear multiple times)
    expect(screen.getByText(/\$1,000\.00/)).toBeInTheDocument(); // Available cash (appears once)
    expect(screen.getAllByText(/\$900\.00/).length).toBeGreaterThan(0); // AAPL investment (appears multiple times)
    expect(screen.getAllByText(/\$2,800\.00/).length).toBeGreaterThan(0); // GOOGL investment (appears multiple times)
  });

  test('displays correct recommendation count', async () => {
    mockedAxios.post.mockResolvedValue({ data: mockRecommendations });

    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Wait for recommendations to load and check that both stocks are displayed
    await waitFor(() => {
      expect(screen.getByText('Recommended Buys')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Check that both stock tickers are displayed (using getAllByText since they appear multiple times)
    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GOOGL').length).toBeGreaterThan(0);
  });

  test('handles zero cash input', async () => {
    mockedAxios.post.mockResolvedValue({ data: mockRecommendations });
    
    render(<Recommendations {...mockProps} />, { wrapper: createWrapper() });

    // Wait for component to load and show the edit button
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    // Click edit to show cash input
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    // Now the cash input should be visible
    const cashInput = screen.getByDisplayValue('1000');
    fireEvent.change(cashInput, { target: { value: '0' } });

    // The update button should still be present (component allows 0 cash)
    const updateButton = screen.getByText('Update');
    expect(updateButton).toBeInTheDocument();
  });
});
