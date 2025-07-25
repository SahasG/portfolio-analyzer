import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import StrategyForm from '../StrategyForm';

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

const mockStrategy = {
  id: 1,
  name: 'Growth Strategy',
  description: 'Focus on high-growth technology stocks',
  risk_level: 'Medium',
  allocations: [
    { ticker: 'AAPL', target_percentage: 40.0 },
    { ticker: 'GOOGL', target_percentage: 35.0 },
    { ticker: 'MSFT', target_percentage: 25.0 }
  ]
};

const mockProps = {
  portfolioId: '1',
  onStrategyUpdate: jest.fn()
};

describe('StrategyForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders strategy form header', () => {
    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    expect(screen.getByText('Portfolio Strategy')).toBeInTheDocument();
    expect(screen.getByText('Define your investment strategy and target allocations')).toBeInTheDocument();
  });

  test('displays loading state when fetching strategy', () => {
    const axios = require('axios');
    axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading strategy...')).toBeInTheDocument();
  });

  test('displays existing strategy data', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: mockStrategy });

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Growth Strategy')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Focus on high-growth technology stocks')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Medium')).toBeInTheDocument();
    });
  });

  test('displays allocation table with existing data', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: mockStrategy });

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByDisplayValue('40')).toBeInTheDocument();
      expect(screen.getByDisplayValue('35')).toBeInTheDocument();
      expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    });
  });

  test('creates new strategy when none exists', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: null });

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g., Growth Strategy')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Describe your investment approach...')).toBeInTheDocument();
    });
  });

  test('adds new allocation row', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: mockStrategy });

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const addButton = screen.getByText('Add Allocation');
      fireEvent.click(addButton);
    });

    // Should have 4 allocation rows now (3 existing + 1 new)
    const tickerInputs = screen.getAllByPlaceholderText('Ticker');
    expect(tickerInputs).toHaveLength(4);
  });

  test('removes allocation row', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: mockStrategy });

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Find remove buttons (trash icons)
      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(button => 
        button.querySelector('svg') && button.getAttribute('title') === 'Remove allocation'
      );
      
      if (removeButton) {
        fireEvent.click(removeButton);
      }
    });

    // Should have 2 allocation rows now
    const tickerInputs = screen.getAllByPlaceholderText('Ticker');
    expect(tickerInputs).toHaveLength(2);
  });

  test('validates allocation percentages sum to 100', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: mockStrategy });

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Change one allocation to make total not equal 100
      const percentageInputs = screen.getAllByPlaceholderText('%');
      fireEvent.change(percentageInputs[0], { target: { value: '50' } });
    });

    const saveButton = screen.getByText('Save Strategy');
    fireEvent.click(saveButton);

    expect(screen.getByText('Allocations must sum to 100%')).toBeInTheDocument();
  });

  test('saves strategy successfully', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: mockStrategy });
    axios.put.mockResolvedValue({ data: { ...mockStrategy, name: 'Updated Strategy' } });

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('Growth Strategy');
      fireEvent.change(nameInput, { target: { value: 'Updated Strategy' } });
    });

    const saveButton = screen.getByText('Save Strategy');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        `http://localhost:5001/api/portfolios/1/strategy`,
        expect.objectContaining({
          name: 'Updated Strategy',
          description: 'Focus on high-growth technology stocks',
          risk_level: 'Medium'
        })
      );
    });
  });

  test('handles API error when saving', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: mockStrategy });
    axios.put.mockRejectedValue(new Error('API Error'));

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const saveButton = screen.getByText('Save Strategy');
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Error saving strategy/)).toBeInTheDocument();
    });
  });

  test('validates required fields', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: null });

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const saveButton = screen.getByText('Save Strategy');
      fireEvent.click(saveButton);
    });

    expect(screen.getByText('Strategy name is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  test('validates allocation ticker format', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: mockStrategy });

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const addButton = screen.getByText('Add Allocation');
      fireEvent.click(addButton);
    });

    // Add invalid ticker
    const tickerInputs = screen.getAllByPlaceholderText('Ticker');
    const newTickerInput = tickerInputs[tickerInputs.length - 1];
    fireEvent.change(newTickerInput, { target: { value: 'invalid ticker' } });

    const saveButton = screen.getByText('Save Strategy');
    fireEvent.click(saveButton);

    expect(screen.getByText('Invalid ticker format')).toBeInTheDocument();
  });

  test('displays risk level options correctly', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: null });

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const riskSelect = screen.getByLabelText('Risk Level');
      expect(riskSelect).toBeInTheDocument();
      
      // Check if options are available
      fireEvent.click(riskSelect);
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });
  });

  test('calculates total allocation percentage correctly', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: mockStrategy });

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Total: 100%')).toBeInTheDocument();
    });

    // Change an allocation
    const percentageInputs = screen.getAllByPlaceholderText('%');
    fireEvent.change(percentageInputs[0], { target: { value: '50' } });

    expect(screen.getByText('Total: 110%')).toBeInTheDocument();
  });

  test('handles empty allocation removal', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: mockStrategy });

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const addButton = screen.getByText('Add Allocation');
      fireEvent.click(addButton);
    });

    // Immediately remove the empty allocation
    const removeButtons = screen.getAllByRole('button');
    const lastRemoveButton = removeButtons[removeButtons.length - 1];
    
    if (lastRemoveButton && lastRemoveButton.querySelector('svg')) {
      fireEvent.click(lastRemoveButton);
    }

    // Should still have original 3 allocations
    const tickerInputs = screen.getAllByPlaceholderText('Ticker');
    expect(tickerInputs).toHaveLength(3);
  });

  test('calls onStrategyUpdate after successful save', async () => {
    const axios = require('axios');
    axios.get.mockResolvedValue({ data: mockStrategy });
    axios.put.mockResolvedValue({ data: { ...mockStrategy, name: 'Updated Strategy' } });

    render(<StrategyForm {...mockProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const saveButton = screen.getByText('Save Strategy');
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockProps.onStrategyUpdate).toHaveBeenCalled();
    });
  });
});
