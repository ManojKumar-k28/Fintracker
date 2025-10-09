import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  ChevronDown
} from 'lucide-react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import axios from 'axios';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, startOfYear, endOfYear } from 'date-fns';
import toast from 'react-hot-toast';
import '../styles/dashboard.css';
 // Import the CSS file

// ... (ChartJS registration and interface definitions remain the same)

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  totalBudget: number;
  balance: number;
  recentTransactions: any[];
  categoryData: any[];
  monthlyData: any[];
}


const Dashboard: React.FC = () => {
  // ... (All your state, useEffect, and handler logic remains exactly the same)
  const [data, setData] = useState<DashboardData>({
    totalIncome: 0,
    totalExpenses: 0,
    totalBudget: 0,
    balance: 0,
    recentTransactions: [],
    categoryData: [],
    monthlyData: [],
  });
  const [period, setPeriod] = useState('month');
  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchWeeklyData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/dashboard?period=${period}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyData = async () => {
    try {
      const weeklyAnalysis = [];
      const now = new Date();
      for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i));
        const weekEnd = endOfWeek(subWeeks(now, i));
        const [incomeResponse, expenseResponse] = await Promise.all([
          axios.get('/api/income'),
          axios.get('/api/expenses')
        ]);
        const weekIncome = incomeResponse.data.filter((item: any) => {
            const itemDate = new Date(item.date);
            return itemDate >= weekStart && itemDate <= weekEnd;
          }).reduce((sum: number, item: any) => sum + item.amount, 0);
        const weekExpenses = expenseResponse.data.filter((item: any) => {
            const itemDate = new Date(item.date);
            return itemDate >= weekStart && itemDate <= weekEnd;
          }).reduce((sum: number, item: any) => sum + item.amount, 0);
        weeklyAnalysis.push({
          week: format(weekStart, 'MMM dd'),
          income: weekIncome,
          expenses: weekExpenses,
          savings: weekIncome - weekExpenses,
        });
      }
      setWeeklyData(weeklyAnalysis);
    } catch (error) {
      console.error('Error fetching weekly data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchWeeklyData()]);
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const getPeriodLabel = (): string => {
    if (period === 'week') return 'This Week';
    if (period === 'year') return 'This Year';
    return 'This Month';
  };

  const getPeriodDateRange = (): string => {
    const now = new Date();
    if (period === 'week') {
      const start = startOfWeek(now);
      const end = endOfWeek(now);
      return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
    }
    if (period === 'year') {
      const start = startOfYear(now);
      const end = endOfYear(now);
      return `${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`;
    }
    // default month
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
  };

  const weeklyChartData = {
    labels: weeklyData.map((w: any) => w.week),
    datasets: [
      {
        label: 'Income',
        data: weeklyData.map((w: any) => w.income || 0),
        backgroundColor: 'rgba(34,197,94,0.8)',
        borderColor: 'rgba(34,197,94,1)',
      },
      {
        label: 'Expenses',
        data: weeklyData.map((w: any) => w.expenses || 0),
        backgroundColor: 'rgba(244,63,94,0.8)',
        borderColor: 'rgba(244,63,94,1)',
      },
    ],
  };

  const monthlyChartData = {
    labels: (data.monthlyData || []).map((m: any) => m.month),
    datasets: [
      {
        label: 'Income',
        data: (data.monthlyData || []).map((m: any) => m.income || 0),
        backgroundColor: 'rgba(34,197,94,0.8)',
        borderColor: 'rgba(34,197,94,1)',
      },
      {
        label: 'Expenses',
        data: (data.monthlyData || []).map((m: any) => m.expenses || 0),
        backgroundColor: 'rgba(244,63,94,0.8)',
        borderColor: 'rgba(244,63,94,1)',
      },
    ],
  };

  const doughnutData = {
    labels: (data.categoryData || []).map((c: any) => c.category || c.label || 'Unknown'),
    datasets: [
      {
        data: (data.categoryData || []).map((c: any) => c.amount || 0),
        backgroundColor: [
          '#60a5fa',
          '#34d399',
          '#f97316',
          '#f43f5e',
          '#a78bfa',
          '#f59e0b',
          '#06b6d4',
        ],
        hoverOffset: 8,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        stacked: false,
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
    },
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div>
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Financial Dashboard</h1>
            <p className="dashboard-subtitle">Track your income, expenses, and savings with insights.</p>
          </div>
          <div className="header-actions">
            <button onClick={handleRefresh} disabled={refreshing} className="refresh-button">
              <RefreshCw className={`icon ${refreshing ? 'spinning' : ''}`} style={{width: '1rem', height: '1rem'}} />
              Refresh
            </button>
            <div className="period-filter">
              <Filter className="icon" style={{width: '1rem', height: '1rem'}}/>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="period-select">
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Period Summary Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-content">
              <div>
                <h3 className="card-title">
                  <Calendar className="icon" style={{width: '1.25rem', height: '1.25rem'}}/>
                  {getPeriodLabel()} Summary
                </h3>
                <p className="card-subtitle">{getPeriodDateRange()}</p>
              </div>
            </div>
          </div>
          <div className="card-grid">
            {/* Income */}
            <div className="stat-card stat-card--income">
              <div className="stat-card-content">
                <div>
                  <p className="stat-card-title"><a href="/income">Total Income</a></p>
                  <p className="stat-card-value"><a href="/income">₹{data.totalIncome.toLocaleString()}</a></p>
                  <p className="stat-card-period">Current period</p>
                </div>
                <div className="stat-card-icon-wrapper">
                  <TrendingUp className="icon" style={{width: '1.5rem', height: '1.5rem'}}/>
                </div>
              </div>
            </div>
            {/* Expenses */}
            <div className="stat-card stat-card--expenses">
              <div className="stat-card-content">
                <div>
                  <p className="stat-card-title"><a href="/expenses">Total Expenses</a></p>
                  <p className="stat-card-value"><a href="/expenses">₹{data.totalExpenses.toLocaleString()}</a></p>
                  <p className="stat-card-period">Current period</p>
                </div>
                <div className="stat-card-icon-wrapper">
                  <TrendingDown className="icon" style={{width: '1.5rem', height: '1.5rem'}}/>
                </div>
              </div>
            </div>
            {/* Net Balance */}
            <div className="stat-card stat-card--balance">
              <div className="stat-card-content">
                <div>
                  <p className="stat-card-title">Net Balance</p>
<p
  className="stat-card-value"
  style={{
    fontSize: '2.25rem',
    fontWeight: 700,
    color: 'var(--white)',
  }}
>
  ₹{data.balance.toLocaleString()}
</p>

                  <p className="stat-card-period">Overview</p>
                </div>
                <div className="stat-card-icon-wrapper">
                  <Activity className="icon" style={{width: '1.5rem', height: '1.5rem'}}/>
                </div>
              </div>
            </div>
            {/* Budget */}
            <div className="stat-card stat-card--budget">
              <div className="stat-card-content">
                <div>
                  <p className="stat-card-title"><a href="/budget">Total Budget</a></p>
                  <p className="stat-card-value"><a href="/budget">₹{data.totalBudget.toLocaleString()}</a></p>
                  <p className="stat-card-period">Allocated</p>
                </div>
                <div className="stat-card-icon-wrapper">
                  <Target className="icon" style={{width: '1.5rem', height: '1.5rem'}}/>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-grid">
          {/* Income vs Expenses Chart */}
          <div className="card chart-card-large">
            <div className="card-header">
              <div className="chart-header-content">
                <div>
                  <h3 className="card-title">Income vs Expenses Analysis</h3>
                  <p className="card-subtitle">Compare your income and expenses over time</p>
                </div>
                <div className="chart-view-toggle">
                  <button onClick={() => setChartView('weekly')} className={`toggle-button ${chartView === 'weekly' ? 'active' : ''}`}>
                    <BarChart3 className="icon" style={{width: '1rem', height: '1rem'}}/> Weekly
                  </button>
                  <button onClick={() => setChartView('monthly')} className={`toggle-button ${chartView === 'monthly' ? 'active' : ''}`}>
                    <Calendar className="icon" style={{width: '1rem', height: '1rem'}}/> Monthly
                  </button>
                </div>
              </div>
            </div>
            <div className="chart-container">
              {chartView === 'weekly' && weeklyData.length > 0 ? (
                <Bar data={weeklyChartData} options={barChartOptions} />
              ) : chartView === 'monthly' && data.monthlyData?.length > 0 ? (
                <Bar data={monthlyChartData} options={barChartOptions} />
              ) : (
                <div className="empty-state">
                  <div>
                    <BarChart3 className="empty-state-icon" />
                    <h4 className="empty-state-title">No Data Available</h4>
                    <p className="empty-state-subtitle">{chartView === 'weekly' ? 'No weekly data to display' : 'No monthly data to display'}</p>
                    <p className="empty-state-info">Start adding income and expenses to see analytics</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Expense Categories Breakdown */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <PieChart className="icon" style={{width: '1.25rem', height: '1.25rem'}} /> Expense Categories
              </h3>
              <p className="card-subtitle">Breakdown by category</p>
            </div>
            <div className="chart-container">
              {data.categoryData?.length > 0 ? (
                <Doughnut data={doughnutData} options={doughnutOptions} />
              ) : (
                <div className="empty-state">
                  <div>
                    <PieChart className="empty-state-icon" />
                    <h4 className="empty-state-title">No Categories</h4>
                    <p className="empty-state-subtitle">No expense categories to display</p>
                    <p className="empty-state-info">Add expenses to see category breakdown</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Calendar className="icon" style={{width: '1.25rem', height: '1.25rem'}}/> Recent Transactions
            </h3>
            <p className="card-subtitle">Latest financial activities</p>
          </div>
          <div style={{padding: '1.5rem'}}>
            {data.recentTransactions?.length > 0 ? (
              <div className="transaction-list">
                {data.recentTransactions.slice(0, 5).map((transaction, index) => (
                  <div key={index} className="transaction-item">
                    <div className="transaction-item-main">
                      <div className={`transaction-icon-wrapper ${transaction.type}`}>
                        {transaction.type === 'income' ? <TrendingUp className="icon"/> : <TrendingDown className="icon"/>}
                      </div>
                      <div>
                        <p className="transaction-description">{transaction.description}</p>
                        <div className="transaction-details">
                          <span className="transaction-category">{transaction.category}</span>
                          <span className="transaction-date">{format(new Date(transaction.date), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="transaction-amount-wrapper">
                      <p className={`transaction-amount ${transaction.type}`}>
                        {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                      </p>
                      <p className={`transaction-type ${transaction.type}`}>
                        {transaction.type === 'income' ? 'INCOME' : 'EXPENSE'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-transactions">
                <div className="empty-state-icon-wrapper">
                  <Calendar className="empty-state-icon" />
                </div>
                <h4 className="empty-state-title">No Transactions Yet</h4>
                <p className="empty-state-subtitle">Start by adding your first income or expense</p>
                <div className="empty-state-actions">
                  <button onClick={() => window.location.href = '/income'} className="empty-state-button income">Add Income</button>
                  <button onClick={() => window.location.href = '/expenses'} className="empty-state-button expense">Add Expense</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;