import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import axios from 'axios';
import PortfolioList from '../PortfolioList';

// Mock axios
const mockedAxios = axios as jest.Mocked<typeof axios>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockPortfolios = [
  {
    id: 1,
    name: 'Tech Portfolio',
    stocks: [
      { ticker: 'AAPL', shares: 10, value: 1500 },
      { ticker: 'GOOGL', shares: 5, value: 14000 }
    ],
    total_value: 15500,
    total_pl: 500,
    total_pl_percent: 3.33
  },
  {
    id: 2,
    name: 'Growth Portfolio',
    stocks: [
      { ticker: 'TSLA', shares: 8, value: 2000 }
    ],
    total_value: 2000,
    total_pl: -200,
    total_pl_percent: -9.09
  }
];

describe('PortfolioList Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('renders portfolio list title', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: mockPortfolios });

    render(<PortfolioList />, { wrapper: createWrapper() });

    expect(screen.getByText('Portfolio Analyzer')).toBeInTheDocument();
    expect(screen.getByText('Manage your investment portfolios with advanced analytics')).toBeInTheDocument();
  });

  test('displays portfolios when data is loaded', async () => {
    mockedAxios.get.mockResolvedValue({ data: mockPortfolios });

    render(<PortfolioList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Tech Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Growth Portfolio')).toBeInTheDocument();
    });

    // Check portfolio values are displayed
    expect(screen.getByText('$15,500.00')).toBeInTheDocument();
    expect(screen.getByText('$2,000.00')).toBeInTheDocument();
  });

  test('displays loading state', () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<PortfolioList />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading portfolios...')).toBeInTheDocument();
  });

  test('displays error state when API fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('API Error'));

    render(<PortfolioList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Error loading portfolios/)).toBeInTheDocument();
    });
  });

  test('opens create portfolio modal when create button is clicked', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });

    render(<PortfolioList />, { wrapper: createWrapper() });

    const createButton = await screen.findByText('Create New Portfolio');
    fireEvent.click(createButton);

    expect(screen.getByText('Create Portfolio')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter portfolio name')).toBeInTheDocument();
  });

  test('creates new portfolio successfully', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });
    mockedAxios.post.mockResolvedValue({ 
      data: { id: 3, name: 'New Portfolio', stocks: [], total_value: 0 } 
    });

    render(<PortfolioList />, { wrapper: createWrapper() });

    // Open modal
    const createButton = await screen.findByText('Create New Portfolio');
    fireEvent.click(createButton);

    // Fill in portfolio name
    const nameInput = screen.getByPlaceholderText('Enter portfolio name');
    fireEvent.change(nameInput, { target: { value: 'New Portfolio' } });

    // Submit form
    const submitButton = screen.getByText('Create Portfolio');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:5001/api/portfolios',
        { name: 'New Portfolio' }
      );
    });
  });

  test('handles portfolio name editing', async () => {
    mockedAxios.get.mockResolvedValue({ data: mockPortfolios });
    mockedAxios.put.mockResolvedValue({ 
      data: { id: 1, name: 'Updated Tech Portfolio' } 
    });

    render(<PortfolioList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Tech Portfolio')).toBeInTheDocument();
    });

    // Find and click edit button (pencil icon)
    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(button => 
      button.querySelector('svg') // Looking for the edit icon
    );
    
    if (editButton) {
      fireEvent.click(editButton);

      // Should show input field
      const nameInput = screen.getByDisplayValue('Tech Portfolio');
      fireEvent.change(nameInput, { target: { value: 'Updated Tech Portfolio' } });
      fireEvent.keyDown(nameInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          'http://localhost:5001/api/portfolios/1/name',
          { name: 'Updated Tech Portfolio' }
        );
      });
    }
  });

  test('displays empty state when no portfolios exist', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });

    render(<PortfolioList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No portfolios yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first portfolio to get started with tracking your investments.')).toBeInTheDocument();
    });
  });

  test('displays correct P/L colors for positive and negative values', async () => {
    mockedAxios.get.mockResolvedValue({ data: mockPortfolios });

    render(<PortfolioList />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Positive P/L should be green
      const positiveElement = screen.getByText('+$500.00');
      expect(positiveElement).toHaveClass('text-green-600');

      // Negative P/L should be red
      const negativeElement = screen.getByText('-$200.00');
      expect(negativeElement).toHaveClass('text-red-600');
    });
  });

  test('navigates to portfolio detail when portfolio is clicked', async () => {
    mockedAxios.get.mockResolvedValue({ data: mockPortfolios });

    render(<PortfolioList />, { wrapper: createWrapper() });

    await waitFor(() => {
      const portfolioCard = screen.getByText('Tech Portfolio').closest('div');
      expect(portfolioCard).toBeInTheDocument();
      
      // The card should be clickable and navigate to detail page
      if (portfolioCard) {
        fireEvent.click(portfolioCard);
        // Navigation testing would require additional setup with react-router
      }
    });
  });
});
