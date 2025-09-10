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
      console.log('Fetching dashboard data for period:', period);
      
      const response = await axios.get(`/api/dashboard?period=${period}`);
      console.log('Dashboard data received:', response.data);
      
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
      // Get data for the last 8 weeks
      const weeklyAnalysis = [];
      const now = new Date();
      
      for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i));
        const weekEnd = endOfWeek(subWeeks(now, i));
        
        const [incomeResponse, expenseResponse] = await Promise.all([
          axios.get('/api/income'),
          axios.get('/api/expenses')
        ]);
        
        const weekIncome = incomeResponse.data
          .filter((item: any) => {
            const itemDate = new Date(item.date);
            return itemDate >= weekStart && itemDate <= weekEnd;
          })
          .reduce((sum: number, item: any) => sum + item.amount, 0);
          
        const weekExpenses = expenseResponse.data
          .filter((item: any) => {
            const itemDate = new Date(item.date);
            return itemDate >= weekStart && itemDate <= weekEnd;
          })
          .reduce((sum: number, item: any) => sum + item.amount, 0);
        
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

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      default: return 'This Month';
    }
  };

  const getPeriodDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return `${format(startOfWeek(now), 'MMM dd')} - ${format(endOfWeek(now), 'MMM dd, yyyy')}`;
      case 'month':
        return `${format(startOfMonth(now), 'MMM dd')} - ${format(endOfMonth(now), 'MMM dd, yyyy')}`;
      case 'year':
        return `${format(startOfYear(now), 'MMM dd')} - ${format(endOfYear(now), 'MMM dd, yyyy')}`;
      default:
        return format(now, 'MMM yyyy');
    }
  };

  // Enhanced chart data for weekly analysis
  const weeklyChartData = {
    labels: weeklyData.map(item => item.week),
    datasets: [
      {
        label: 'Income',
        data: weeklyData.map(item => item.income),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: '#10b981',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Expenses',
        data: weeklyData.map(item => item.expenses),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: '#ef4444',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  // Enhanced chart data for monthly analysis
  const monthlyChartData = {
    labels: data.monthlyData?.map(item => item.month) || [],
    datasets: [
      {
        label: 'Income',
        data: data.monthlyData?.map(item => item.income) || [],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: '#10b981',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Expenses',
        data: data.monthlyData?.map(item => item.expenses) || [],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: '#ef4444',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const doughnutData = {
    labels: data.categoryData?.map(item => item.name) || [],
    datasets: [
      {
        data: data.categoryData?.map(item => item.amount) || [],
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
          '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
          '#14b8a6', '#f472b6', '#a855f7', '#22c55e', '#fb7185'
        ],
        borderWidth: 0,
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
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ₹${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          callback: function(value: any) {
            return '₹' + value.toLocaleString();
          },
          font: {
            size: 11,
          },
          color: '#6b7280',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6b7280',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          font: {
            size: 11,
          },
          generateLabels: function(chart: any) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const value = data.datasets[0].data[i];
                const total = data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].backgroundColor[i],
                  pointStyle: 'circle',
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        cornerRadius: 12,
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `₹${context.parsed.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Calculate budget usage percentage correctly
  const budgetUsagePercentage = data.totalBudget > 0 ? (data.totalExpenses / data.totalBudget) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
   <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
  <div className="space-y-4 sm:space-y-6">
    {/* Header */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-normal bg-gradient-to-r from-indigo-800 via-blue-700 to-gray-700 bg-clip-text text-transparent">
  Financial Dashboard
</h1>

        <p className="mt-1 text-sm text-gray-600">
          Track your income, expenses, and savings with insights.
        </p>
            
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg font-medium"
               >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
              <Filter className="w-4 h-4 text-gray-500 ml-2" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border-0 bg-transparent px-2 py-1 text-sm focus:ring-0 focus:outline-none font-medium text-gray-700"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Period Summary Card */}
<div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
  {/* Header */}
  <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-100">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-500" />
          {getPeriodLabel()} Summary
        </h3>
        <p className="text-sm text-gray-600 mt-1">{getPeriodDateRange()}</p>
      </div>
      <Filter className="w-4 h-4 text-gray-500 ml-2" />
    </div>
  </div>

  {/* Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-6">
    {/* Income */}
    <div className="flex flex-col justify-between bg-gradient-to-br from-emerald-500 to-green-600 p-6 rounded-2xl shadow-md text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-emerald-100 text-sm font-medium">
            <a href="/income">Total Income</a>
          </p>
          <p className="text-2xl sm:text-3xl font-bold">
            <a href="/income">₹{data.totalIncome.toLocaleString()}</a>
          </p>
          <p className="text-emerald-200 text-xs mt-1">Current period</p>
        </div>
        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>

    {/* Expenses */}
    <div className="flex flex-col justify-between bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-2xl shadow-md text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-red-100 text-sm font-medium">
            <a href="/expenses">Total Expenses</a>
          </p>
          <p className="text-2xl sm:text-3xl font-bold">
            <a href="/expenses">₹{data.totalExpenses.toLocaleString()}</a>
          </p>
          <p className="text-red-200 text-xs mt-1">Current period</p>
        </div>
        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
          <TrendingDown className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>

    {/* Net Balance */}
    <div className="flex flex-col justify-between bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-md text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-blue-100 text-sm font-medium">Net Balance</p>
          <p className="text-2xl sm:text-3xl font-bold">
            ₹{data.balance.toLocaleString()}
          </p>
          <p className="text-blue-200 text-xs mt-1">Overview</p>
        </div>
        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
          <Activity className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>

    {/* Budget */}
    <div className="flex flex-col justify-between bg-gradient-to-br from-purple-500 to-violet-600 p-6 rounded-2xl shadow-md text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-purple-100 text-sm font-medium">
            <a href="/budget">Total Budget</a>
          </p>
          <p className="text-2xl sm:text-3xl font-bold">
            <a href="/budget">₹{data.totalBudget.toLocaleString()}</a>
          </p>
          <p className="text-purple-200 text-xs mt-1">Allocated</p>
        </div>
        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
          <Target className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  </div>



  </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Income vs Expenses Chart */}
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Income vs Expenses Analysis</h3>
                  <p className="text-sm text-gray-600">Compare your income and expenses over time</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartView('weekly')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      chartView === 'weekly'
                        ? 'bg-primary-500 text-white shadow-md transform scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 inline mr-1" />
                    Weekly
                  </button>
                  <button
                    onClick={() => setChartView('monthly')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      chartView === 'monthly'
                        ? 'bg-primary-500 text-white shadow-md transform scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Monthly
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="h-80">
                {chartView === 'weekly' && weeklyData.length > 0 ? (
                  <Bar data={weeklyChartData} options={barChartOptions} />
                ) : chartView === 'monthly' && data.monthlyData && data.monthlyData.length > 0 ? (
                  <Bar data={monthlyChartData} options={barChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h4 className="text-lg font-medium text-gray-600 mb-2">No Data Available</h4>
                      <p className="text-sm text-gray-500">
                        {chartView === 'weekly' ? 'No weekly data to display' : 'No monthly data to display'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Start adding income and expenses to see analytics</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expense Categories Breakdown */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary-500" />
                Expense Categories
              </h3>
              <p className="text-sm text-gray-600 mt-1">Breakdown by category</p>
            </div>
            
            <div className="p-6">
              <div className="h-80">
                {data.categoryData && data.categoryData.length > 0 ? (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <PieChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h4 className="text-lg font-medium text-gray-600 mb-2">No Categories</h4>
                      <p className="text-sm text-gray-500">No expense categories to display</p>
                      <p className="text-xs text-gray-400 mt-1">Add expenses to see category breakdown</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              Recent Transactions
            </h3>
            <p className="text-sm text-gray-600 mt-1">Latest financial activities</p>
          </div>
          
          <div className="p-6">
            {data.recentTransactions && data.recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {data.recentTransactions.slice(0, 5).map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 border border-gray-200 hover:border-blue-200 hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                        transaction.type === 'income' 
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                          : 'bg-gradient-to-br from-red-400 to-rose-500'
                      }`}>
                        {transaction.type === 'income' ? (
                          <TrendingUp className="w-6 h-6 text-white" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-base">{transaction.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
                            {transaction.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(transaction.date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-bold text-xl ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                      </p>
                      <p className={`text-xs font-medium ${
                        transaction.type === 'income' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {transaction.type === 'income' ? 'INCOME' : 'EXPENSE'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-700 mb-2">No Transactions Yet</h4>
                <p className="text-gray-500 mb-6">Start by adding your first income or expense</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => window.location.href = '/income'}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg font-medium"
                  >
                    Add Income
                  </button>
                  <button
                    onClick={() => window.location.href = '/expenses'}
                    className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-rose-700 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg font-medium"
                  >
                    Add Expense
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <h3 className="text-lg font-bold text-gray-800">Financial Summary</h3>
            <p className="text-sm text-gray-600 mt-1">Key metrics for the selected period</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <p className="text-lg font-bold text-blue-700">
                  {data.totalIncome > 0 && data.totalExpenses > 0 
                    ? ((data.totalIncome / data.totalExpenses) * 100).toFixed(1) 
                    : '0'}%
                </p>
                <p className="text-sm text-blue-600 font-medium">Income to Expense Ratio</p>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl border border-purple-200">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <p className="text-lg font-bold text-purple-700">
                  ₹{data.totalIncome > 0 ? (data.totalIncome / (data.recentTransactions.filter(t => t.type === 'income').length || 1)).toLocaleString() : '0'}
                </p>
                <p className="text-sm text-purple-600 font-medium">Avg Income per Entry</p>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-rose-50 to-pink-100 rounded-xl border border-rose-200">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
                <p className="text-lg font-bold text-rose-700">
                  ₹{data.totalExpenses > 0 ? (data.totalExpenses / (data.recentTransactions.filter(t => t.type === 'expense').length || 1)).toLocaleString() : '0'}
                </p>
                <p className="text-sm text-rose-600 font-medium">Avg Expense per Entry</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;