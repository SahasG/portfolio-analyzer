const React = require('react');

module.exports = {
  useNavigate: () => jest.fn(),
  useParams: () => ({ id: '1' }),
  useLocation: () => ({ pathname: '/' }),
  BrowserRouter: ({ children }) => React.createElement('div', { 'data-testid': 'browser-router' }, children),
  MemoryRouter: ({ children }) => React.createElement('div', { 'data-testid': 'memory-router' }, children),
  Routes: ({ children }) => React.createElement('div', { 'data-testid': 'routes' }, children),
  Route: ({ children }) => React.createElement('div', { 'data-testid': 'route' }, children),
  Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
  NavLink: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children)
};
