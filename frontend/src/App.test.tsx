import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app without crashing', () => {
  render(<App />);
  // Just verify the app renders without errors
  expect(document.body).toBeInTheDocument();
});
