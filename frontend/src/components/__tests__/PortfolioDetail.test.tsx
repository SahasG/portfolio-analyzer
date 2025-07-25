import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import PortfolioDetail from '../PortfolioDetail';

// Mock Chart.js
jest.mock('chart.js/auto', () => ({
  Chart: {
    register: jest.fn(),
  },
}));

jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>,
}));

// Mock axios
jest.mock('axios');

const createWrapper = (initialRoute = '/portfolios/1') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const mockPortfolio = {
  id: 1,
  name: 'Tech Portfolio',
  stocks: [
    {
      id: 1,
      ticker: 'AAPL',
      shares: 10,
      average_price: 145.00,
      current_price: 150.00,
      value: 1500.00,
      pl_dollar: 50.00,
      pl_percent: 3.45
    },
    {
      id: 2,
      ticker: 'GOOGL',
      shares: 5,
      average_price: 2800.00,
      current_price: 2900.00,
      value: 14500.00,
      pl_dollar: 500.00,
      pl_percent: 3.57
    }
  ],
  total_value: 16000.00,
  total_pl: 550.00,
  total_pl_percent: 3.56
};

const mockHistoricalData = [
  { date: '2024-07-20', total_value: 15500.00, total_pl: 300.00, total_pl_percent: 1.97 },
  { date: '2024-07-21', total_value: 15800.00, total_pl: 400.00, total_pl_percent: 2.60 },
  { date: '2024-07-22', total_value: 16000.00, total_pl: 550.00, total_pl_percent: 3.56 }
];

const mockSentimentData = {
  ticker: 'AAPL',
  articles: [
    {
      title: 'Apple Reports Strong Q3 Earnings',
      text: 'Apple Inc. reported better than expected earnings...',
      url: 'https://example.com/news/1',
      publishedDate: '2024-07-24T10:00:00Z',
      site: 'Reuters',
      sentiment: {
        sentiment: 'positive',
        compound: 0.6,
        confidence: 0.6
      }
    }
  ],
  overall_sentiment: {
    sentiment: 'positive',
    compound: 0.6,
    confidence: 0.6,
    article_count: 1,
    sentiment_distribution: { positive: 1, negative: 0, neutral: 0 }
  }
};

describe('PortfolioDetail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders portfolio detail with loading state', () => {
    const axios = require('axios');
    axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<PortfolioDetail />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading portfolio...')).toBeInTheDocument();
  });

  test('renders portfolio detail with data', async () => {
    const axios = require('axios');
    axios.get.mockImplementation((url: string) => {
      if (url.includes('/history')) {
        return Promise.resolve({ data: mockHistoricalData });
      }
      return Promise.resolve({ data: mockPortfolio });
    });

    render(<PortfolioDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Tech Portfolio')).toBeInTheDocument();
      expect(screen.getByText('$16,000.00')).toBeInTheDocument();
      expect(screen.getByText('+$550.00')).toBeInTheDocument();
    });
  });

  test('displays stock list correctly', async () => {
    const axios = require('axios');
    axios.get.mockImplementation((url: string) => {
      if (url.includes('/history')) {
        return Promise.resolve({ data: mockHistoricalData });
      }
      return Promise.resolve({ data: mockPortfolio });
    });

    render(<PortfolioDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
      expect(screen.getByText('10 shares')).toBeInTheDocument();
      expect(screen.getByText('5 shares')).toBeInTheDocument();
    });
  });

  test('switches between tabs correctly', async () => {
    const axios = require('axios');
    axios.get.mockImplementation((url: string) => {
      if (url.includes('/history')) {
        return Promise.resolve({ data: mockHistoricalData });
      }
      return Promise.resolve({ data: mockPortfolio });
    });

    render(<PortfolioDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Tech Portfolio')).toBeInTheDocument();
    });

    // Test tab switching
    const strategyTab = screen.getByText('Strategy');
    fireEvent.click(strategyTab);
    expect(screen.getByText('Portfolio Strategy')).toBeInTheDocument();

    const recommendationsTab = screen.getByText('Recommendations');
    fireEvent.click(recommendationsTab);
    expect(screen.getByText('Investment Recommendations')).toBeInTheDocument();
  });

  test('opens add stock modal', async () => {
    const axios = require('axios');
    axios.get.mockImplementation((url: string) => {
      if (url.includes('/history')) {
        return Promise.resolve({ data: mockHistoricalData });
      }
      return Promise.resolve({ data: mockPortfolio });
    });

    render(<PortfolioDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      const addButton = screen.getByText('Add Stock');
      fireEvent.click(addButton);
    });

    expect(screen.getByText('Add New Stock')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., AAPL')).toBeInTheDocument();
  });

  test('adds new stock successfully', async () => {
    const axios = require('axios');
    axios.get.mockImplementation((url: string) => {
      if (url.includes('/history')) {
        return Promise.resolve({ data: mockHistoricalData });
      }
      return Promise.resolve({ data: mockPortfolio });
    });
    axios.post.mockResolvedValue({
      data: {
        id: 3,
        ticker: 'MSFT',
        shares: 8,
        average_price: 300.00,
        current_price: 310.00,
        value: 2480.00,
        pl_dollar: 80.00,
        pl_percent: 3.33
      }
    });

    render(<PortfolioDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      const addButton = screen.getByText('Add Stock');
      fireEvent.click(addButton);
    });

    // Fill in the form
    const tickerInput = screen.getByPlaceholderText('e.g., AAPL');
    const sharesInput = screen.getByPlaceholderText('e.g., 10');
    const priceInput = screen.getByPlaceholderText('e.g., 150.00');

    fireEvent.change(tickerInput, { target: { value: 'MSFT' } });
    fireEvent.change(sharesInput, { target: { value: '8' } });
    fireEvent.change(priceInput, { target: { value: '300.00' } });

    // Submit the form
    const submitButton = screen.getByText('Add Stock');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:5001/api/portfolios/1/stocks',
        {
          ticker: 'MSFT',
          shares: 8,
          average_price: 300.00
        }
      );
    });
  });

  test('deletes stock successfully', async () => {
    const axios = require('axios');
    axios.get.mockImplementation((url: string) => {
      if (url.includes('/history')) {
        return Promise.resolve({ data: mockHistoricalData });
      }
      return Promise.resolve({ data: mockPortfolio });
    });
    axios.delete.mockResolvedValue({ data: { message: 'Stock deleted successfully' } });

    render(<PortfolioDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    // Find and click delete button (trash icon)
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('title') === 'Delete stock'
    );

    if (deleteButton) {
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          'http://localhost:5001/api/portfolios/1/stocks/1'
        );
      });
    }
  });

  test('displays historical performance chart', async () => {
    const axios = require('axios');
    axios.get.mockImplementation((url: string) => {
      if (url.includes('/history')) {
        return Promise.resolve({ data: mockHistoricalData });
      }
      return Promise.resolve({ data: mockPortfolio });
    });

    render(<PortfolioDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Performance Summary')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  test('displays sentiment analysis tab', async () => {
    const axios = require('axios');
    axios.get.mockImplementation((url) => {
      if (url.includes('/history')) {
        return Promise.resolve({ data: mockHistoricalData });
      }
      if (url.includes('/news-sentiment')) {
        return Promise.resolve({ data: mockSentimentData });
      }
      return Promise.resolve({ data: mockPortfolio });
    });

    render(<PortfolioDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      const sentimentTab = screen.getByText('Sentiment');
      fireEvent.click(sentimentTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Market Sentiment Analysis')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    const axios = require('axios');
    axios.get.mockRejectedValue(new Error('API Error'));

    render(<PortfolioDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Error loading portfolio/)).toBeInTheDocument();
    });
  });

  test('displays correct P/L colors', async () => {
    const axios = require('axios');
    axios.get.mockImplementation((url: string) => {
      if (url.includes('/history')) {
        return Promise.resolve({ data: mockHistoricalData });
      }
      return Promise.resolve({ data: mockPortfolio });
    });

    render(<PortfolioDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Positive P/L should be green
      const positiveElement = screen.getByText('+$550.00');
      expect(positiveElement).toHaveClass('text-green-600');
    });
  });

  test('validates stock form inputs', async () => {
    const axios = require('axios');
    axios.get.mockImplementation((url: string) => {
      if (url.includes('/history')) {
        return Promise.resolve({ data: mockHistoricalData });
      }
      return Promise.resolve({ data: mockPortfolio });
    });

    render(<PortfolioDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      const addButton = screen.getByText('Add Stock');
      fireEvent.click(addButton);
    });

    // Try to submit empty form
    const submitButton = screen.getByText('Add Stock');
    fireEvent.click(submitButton);

    // Should show validation errors
    expect(screen.getByText('Ticker is required')).toBeInTheDocument();
    expect(screen.getByText('Shares must be greater than 0')).toBeInTheDocument();
    expect(screen.getByText('Average price must be greater than 0')).toBeInTheDocument();
  });
});
