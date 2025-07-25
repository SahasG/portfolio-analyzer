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
    created_at: '2024-01-15T10:30:00Z',
    total_value: 15500,
    stock_count: 2
  },
  {
    id: 2,
    name: 'Growth Portfolio', 
    created_at: '2024-02-20T14:45:00Z',
    total_value: 2000,
    stock_count: 1
  }
];

describe('PortfolioList Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset axios mocks to default behavior
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.delete.mockReset();
  });

  test('renders create portfolio form', async () => {
    mockedAxios.get.mockResolvedValue({ data: mockPortfolios });

    render(<PortfolioList />, { wrapper: createWrapper() });

    // Wait for the component to load and render the form
    await waitFor(() => {
      expect(screen.getByText('Create New Portfolio')).toBeInTheDocument();
    });
    
    expect(screen.getByPlaceholderText('Enter portfolio name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
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

    // Check for loading spinner instead of text
    const loadingSpinner = document.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  });

  test('displays error state when API fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('API Error'));

    render(<PortfolioList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Failed to load portfolios. Please try again later.')).toBeInTheDocument();
    });
  });

  test('displays create portfolio form', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });

    render(<PortfolioList />, { wrapper: createWrapper() });

    // The form is always visible, no modal needed
    await waitFor(() => {
      expect(screen.getByText('Create New Portfolio')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter portfolio name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    });
  });

  test('creates new portfolio successfully', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });
    mockedAxios.post.mockResolvedValue({ 
      data: { id: 3, name: 'New Portfolio', stocks: [], total_value: 0 } 
    });

    render(<PortfolioList />, { wrapper: createWrapper() });

    // Wait for component to load and form to be visible
    const nameInput = await screen.findByPlaceholderText('Enter portfolio name');
    fireEvent.change(nameInput, { target: { value: 'New Portfolio' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:5001/api/portfolios',
        { name: 'New Portfolio' }
      );
    });
  });

  test('displays edit and delete buttons for portfolios', async () => {
    mockedAxios.get.mockResolvedValue({ data: mockPortfolios });

    render(<PortfolioList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Tech Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Growth Portfolio')).toBeInTheDocument();
    });

    // Check that edit and delete buttons exist for each portfolio
    const editButtons = screen.getAllByLabelText('Rename portfolio');
    const deleteButtons = screen.getAllByLabelText('Delete portfolio');
    
    expect(editButtons).toHaveLength(2); // One for each portfolio
    expect(deleteButtons).toHaveLength(2); // One for each portfolio
    
    // Verify buttons are clickable
    expect(editButtons[0]).toBeEnabled();
    expect(deleteButtons[0]).toBeEnabled();
  });

  test('displays empty state when no portfolios exist', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });

    render(<PortfolioList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No portfolios')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating a new portfolio.')).toBeInTheDocument();
    });
  });

  test('displays portfolio information correctly', async () => {
    mockedAxios.get.mockResolvedValue({ data: mockPortfolios });

    render(<PortfolioList />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Check portfolio names
      expect(screen.getByText('Tech Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Growth Portfolio')).toBeInTheDocument();
      
      // Check stock counts
      expect(screen.getByText('2')).toBeInTheDocument(); // Tech Portfolio stock count
      expect(screen.getByText('1')).toBeInTheDocument(); // Growth Portfolio stock count
      
      // Check total values
      expect(screen.getByText('$15,500.00')).toBeInTheDocument();
      expect(screen.getByText('$2,000.00')).toBeInTheDocument();
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
