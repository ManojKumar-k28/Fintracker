import React, { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, TrendingDown, ChartBar as BarChart3, Shield, Activity, Target, RefreshCw } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
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
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardData {
  userStats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    regularUsers: number;
  };
  financialOverview: {
    totalIncome: number;
    totalExpenses: number;
    totalRevenues: number;
    profitMargin: string;
    incomeStats: any;
    expenseStats: any;
  };
  mostUsedCategories: any[];
  recentActivity: any[];
  monthlyGrowth: any[];
}

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('📊 Fetching admin dashboard data...');
      const token = localStorage.getItem('adminToken');
      
      if (!token) {
        toast.error('Admin token not found. Please login again.');
        return;
      }

      const response = await axios.get('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Admin dashboard data received:', response.data);
      setData(response.data.data);
    } catch (error: any) {
      console.error('❌ Admin dashboard error:', error);
      
      if (error.response?.status === 401) {
        toast.error('Admin session expired. Please login again.');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin/login';
      } else {
        toast.error('Failed to fetch dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const monthlyChartData = {
    labels: data?.monthlyGrowth?.map(item => item.month) || [],
    datasets: [
      {
        label: 'Income',
        data: data?.monthlyGrowth?.map(item => item.income) || [],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: '#10b981',
        borderWidth: 2,
        borderRadius: 8,
      },
      {
        label: 'Expenses',
        data: data?.monthlyGrowth?.map(item => item.expenses) || [],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: '#ef4444',
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const categoryChartData = {
    labels: data?.mostUsedCategories?.map(cat => cat.name) || [],
    datasets: [
      {
        data: data?.mostUsedCategories?.map(cat => cat.totalAmount) || [],
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading admin dashboard...</p>
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
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-1">System overview and analytics</p>
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

        {/* Stats Cards */}
        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Users</p>
                    <p className="text-2xl sm:text-3xl font-bold">{data.userStats?.totalUsers || 0}</p>
                    <p className="text-blue-200 text-xs mt-1">
                      {data.userStats?.activeUsers || 0} active
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-lg text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Income</p>
                    <p className="text-2xl sm:text-3xl font-bold">₹{data.financialOverview?.totalIncome?.toLocaleString() || 0}</p>
                    <p className="text-green-200 text-xs mt-1">System wide</p>
                  </div>
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-2xl shadow-lg text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                    <p className="text-2xl sm:text-3xl font-bold">₹{data.financialOverview?.totalExpenses?.toLocaleString() || 0}</p>
                    <p className="text-red-200 text-xs mt-1">System wide</p>
                  </div>
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-6 rounded-2xl shadow-lg text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Net Revenue</p>
                    <p className={`text-2xl sm:text-3xl font-bold ${
                      (data.financialOverview?.totalRevenues || 0) >= 0 ? 'text-white' : 'text-red-200'
                    }`}>
                      ₹{data.financialOverview?.totalRevenues?.toLocaleString() || 0}
                    </p>
                    <p className="text-purple-200 text-xs mt-1">
                      {data.financialOverview?.profitMargin || 0}% margin
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Monthly Growth Chart */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Monthly Growth Trend
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Income vs Expenses over time</p>
                </div>
                
                <div className="p-6">
                  <div className="h-80">
                    {data.monthlyGrowth && data.monthlyGrowth.length > 0 ? (
                      <Bar data={monthlyChartData} options={chartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p>No monthly data available</p>
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
                    {data.mostUsedCategories && data.mostUsedCategories.length > 0 ? (
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

            {/* User Statistics */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  User Statistics
                </h3>
                <p className="text-sm text-gray-600 mt-1">Breakdown of user accounts</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{data.userStats?.totalUsers || 0}</p>
                    <p className="text-sm text-blue-600 font-medium">Total Users</p>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border border-green-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-green-700">{data.userStats?.activeUsers || 0}</p>
                    <p className="text-sm text-green-600 font-medium">Active Users</p>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-100 rounded-xl border border-red-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-red-700">{data.userStats?.inactiveUsers || 0}</p>
                    <p className="text-sm text-red-600 font-medium">Inactive Users</p>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl border border-purple-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-purple-700">{data.userStats?.adminUsers || 0}</p>
                    <p className="text-sm text-purple-600 font-medium">Admin Users</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  Recent System Activity
                </h3>
                <p className="text-sm text-gray-600 mt-1">Latest transactions across all users</p>
              </div>
              
              <div className="p-6">
                {data.recentActivity && data.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {data.recentActivity.slice(0, 8).map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 border border-gray-200 hover:border-blue-200">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                            activity.type === 'income' 
                              ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                              : 'bg-gradient-to-br from-red-400 to-rose-500'
                          }`}>
                            {activity.type === 'income' ? (
                              <TrendingUp className="w-6 h-6 text-white" />
                            ) : (
                              <TrendingDown className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{activity.description}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
                                {activity.categoryId?.name || 'Unknown Category'}
                              </span>
                              <span className="text-xs text-gray-500">
                                by {activity.userId?.name || 'Unknown User'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className={`font-bold text-lg ${
                            activity.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {activity.type === 'income' ? '+' : '-'}₹{activity.amount?.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(activity.date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Recent Activity</h3>
                    <p className="text-gray-600">System activity will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!data && !loading && (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Failed to Load Dashboard</h3>
            <p className="text-gray-600 mb-6">Unable to fetch admin dashboard data</p>
            <button
              onClick={fetchDashboardData}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg font-medium"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;