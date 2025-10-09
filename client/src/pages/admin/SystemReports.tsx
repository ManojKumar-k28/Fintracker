import React, { useState, useEffect } from 'react';
import { ChartBar as BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, Download, RefreshCw, Users, Target } from 'lucide-react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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

interface ReportData {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalRevenues: number;
    profitMargin: string;
    incomeStats: any;
    expenseStats: any;
  };
  trends: {
    income: any[];
    expenses: any[];
    groupBy: string;
  };
  mostUsedCategories: any[];
  topSpendingUsers: any[];
  period: {
    startDate: string;
    endDate: string;
  };
}

const SystemReports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    groupBy: 'month',
  });

  useEffect(() => {
    fetchReportData();
  }, [filters]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams(filters);

      const response = await axios.get(`/api/admin/reports/system?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReportData(response.data.data);
    } catch (error: any) {
      toast.error('Failed to fetch report data');
      console.error('Report data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReportData();
    setRefreshing(false);
    toast.success('Reports refreshed');
  };

  // Prepare chart data
  const trendChartData = {
    labels: reportData?.trends.income.map(item => 
      filters.groupBy === 'year' ? item._id.year : `${item._id.month}/${item._id.year}`
    ) || [],
    datasets: [
      {
        label: 'Income',
        data: reportData?.trends.income.map(item => item.income) || [],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: '#10b981',
        borderWidth: 2,
        borderRadius: 8,
      },
      {
        label: 'Expenses',
        data: reportData?.trends.expenses.map(item => item.expenses) || [],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: '#ef4444',
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const categoryChartData = {
    labels: reportData?.mostUsedCategories.map(cat => cat.name) || [],
    datasets: [
      {
        data: reportData?.mostUsedCategories.map(cat => cat.totalAmount) || [],
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
          '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
        ],
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            return `₹${context.parsed.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '₹' + value.toLocaleString();
          },
        },
      },
    },
  };

  if (loading && !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading system reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-800 to-blue-800 bg-clip-text text-transparent">
              System Reports
            </h1>
            <p className="text-gray-600 mt-1">Comprehensive financial analytics</p>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 transform hover:-translate-y-0.5 hover:shadow-md font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group By</label>
              <select
                value={filters.groupBy}
                onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
          </div>
        </div>

        {reportData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-lg text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Income</p>
                    <p className="text-2xl sm:text-3xl font-bold">₹{reportData.summary.totalIncome.toLocaleString()}</p>
                    <p className="text-green-200 text-xs mt-1">{reportData.summary.incomeStats.count} transactions</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-2xl shadow-lg text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                    <p className="text-2xl sm:text-3xl font-bold">₹{reportData.summary.totalExpenses.toLocaleString()}</p>
                    <p className="text-red-200 text-xs mt-1">{reportData.summary.expenseStats.count} transactions</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-lg text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Net Revenue</p>
                    <p className={`text-2xl sm:text-3xl font-bold ${
                      reportData.summary.totalRevenues >= 0 ? 'text-white' : 'text-red-200'
                    }`}>
                      ₹{reportData.summary.totalRevenues.toLocaleString()}
                    </p>
                    <p className="text-blue-200 text-xs mt-1">{reportData.summary.profitMargin}% margin</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-6 rounded-2xl shadow-lg text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Avg Transaction</p>
                    <p className="text-2xl sm:text-3xl font-bold">
                      ₹{Math.round(reportData.summary.expenseStats.avgAmount || 0).toLocaleString()}
                    </p>
                    <p className="text-purple-200 text-xs mt-1">Per expense</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-200" />
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Trend Chart */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Financial Trends ({filters.groupBy === 'month' ? 'Monthly' : 'Yearly'})
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Income vs Expenses over time</p>
                </div>
                
                <div className="p-6">
                  <div className="h-80">
                    {reportData.trends.income.length > 0 ? (
                      <Bar data={trendChartData} options={chartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p>No trend data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    Top Expense Categories
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Most used categories by amount</p>
                </div>
                
                <div className="p-6">
                  <div className="h-80">
                    {reportData.mostUsedCategories.length > 0 ? (
                      <Doughnut data={categoryChartData} options={{
                        ...chartOptions,
                        scales: undefined,
                        plugins: {
                          ...chartOptions.plugins,
                          legend: {
                            position: 'right' as const,
                            labels: {
                              padding: 15,
                              usePointStyle: true,
                              font: { size: 11 },
                            },
                          },
                        },
                      }} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p>No category data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Spending Users */}
            {reportData.topSpendingUsers.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    Top Spending Users
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Users with highest expenses</p>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reportData.topSpendingUsers.slice(0, 6).map((user, index) => (
                      <div key={user._id} className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-800">#{index + 1}</span>
                          <span className="text-lg font-bold text-indigo-600">
                            ₹{user.totalSpent.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{user.userName}</p>
                          <p className="text-sm text-gray-600">{user.userEmail}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {user.transactionCount} transactions
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Category Details */}
            {reportData.mostUsedCategories.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-500" />
                    Category Statistics
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Detailed breakdown by category</p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {reportData.mostUsedCategories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color || '#3b82f6' }}
                          ></div>
                          <div>
                            <p className="font-medium text-gray-800">{category.name}</p>
                            <p className="text-sm text-gray-600">{category.count} transactions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-800">₹{category.totalAmount.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">Avg: ₹{Math.round(category.avgAmount).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SystemReports;