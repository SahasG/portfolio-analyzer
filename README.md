# 📊 Portfolio Analyzer

A comprehensive web application for managing investment portfolios, analyzing asset allocation, and receiving intelligent rebalancing recommendations. Track your investments, visualize allocations, and optimize your portfolio strategy with real-time market data.

<div align="center">
  <img src="images/PortfolioScreenshot.png" alt="Portfolio Analyzer Screenshot" width="800"/>
  <p><em>Portfolio Analyzer Dashboard</em></p>
</div>

## ✨ Features

- **Portfolio Management**: Add, view, and remove stock holdings
- **Real-time Market Data**: Get current stock prices and performance metrics
- **Visual Analytics**: Interactive pie charts and allocation graphs
- **Smart Rebalancing**: Get data-driven recommendations for portfolio optimization
- **Strategy Planning**: Define and track investment strategies
- **Dip Detection**: Identify buying opportunities based on price movements
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Tech Stack

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Chart.js** for data visualization
- **React Router** for navigation

### Backend
- **Python** with **Flask**
- **SQLAlchemy** ORM
- **Alembic** for database migrations
- **RESTful API** architecture

### Data
- **Financial Modeling Prep API** for market data
- **SQLite** database (can be configured for PostgreSQL/MySQL)

## 🛠️ Installation

### Prerequisites
- Node.js (v16 or later)
- Python (3.8 or later)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/SahasG/portfolio-analyzer.git
   cd portfolio-analyzer
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your API key
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Initialize the database**
   ```bash
   cd ../backend
   flask db upgrade
   ```

## 🚦 Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   flask run
   ```

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## 🔧 Configuration

Create a `.env` file in the `backend` directory with the following variables:

```
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URL=sqlite:///portfolio.db
SECRET_KEY=your-secret-key
FMP_API_KEY=your-financial-modeling-prep-api-key
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get access token

### Portfolios
- `GET /api/portfolios` - Get all portfolios for the current user
- `POST /api/portfolios` - Create a new portfolio
- `GET /api/portfolios/<id>` - Get portfolio details
- `PUT /api/portfolios/<id>` - Update a portfolio
- `DELETE /api/portfolios/<id>` - Delete a portfolio

### Stocks
- `GET /api/portfolios/<portfolio_id>/stocks` - Get all stocks in a portfolio
- `POST /api/portfolios/<portfolio_id>/stocks` - Add a stock to a portfolio
- `DELETE /api/portfolios/<portfolio_id>/stocks/<stock_id>` - Remove a stock from a portfolio

### Strategies
- `GET /api/portfolios/<portfolio_id>/strategy` - Get portfolio strategy
- `POST /api/portfolios/<portfolio_id>/strategy` - Set portfolio strategy

### Recommendations
- `POST /api/portfolios/<portfolio_id>/recommendations` - Get rebalancing recommendations

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Financial Modeling Prep for providing stock market data
- The open-source community for amazing tools and libraries

---

<div align="center">
  Made with ❤️ and ☕ by Sahas
</div>
