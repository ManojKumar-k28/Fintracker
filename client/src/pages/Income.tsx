import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, Edit2, Trash2, Calendar, DollarSign, BarChart3, PieChart, RefreshCw } from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
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
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

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

interface IncomeItem {
  _id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

interface Category {
  _id: string;
  name: string;
  type: string;
  color: string;
}

const Income: React.FC = () => {
  const [income, setIncome] = useState<IncomeItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<IncomeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<'category' | 'monthly' | 'trend'>('category');
  const [refreshing, setRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchIncome();
    fetchCategories();
  }, []);

  const fetchIncome = async () => {
    try {
      const response = await axios.get('/api/income');
      setIncome(response.data);
    } catch (error) {
      console.error('Error fetching income:', error);
      toast.error('Failed to fetch income data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories/type/income');
      setCategories(response.data);
      if (response.data.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: response.data[0].name }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchIncome();
    setRefreshing(false);
    toast.success('Income data refreshed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (editingItem) {
        await axios.put(`/api/income/${editingItem._id}`, data);
        toast.success('Income updated successfully');
      } else {
        await axios.post('/api/income', data);
        toast.success('Income added successfully');
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({
        description: '',
        amount: '',
        category: categories[0]?.name || '',
        date: new Date().toISOString().split('T')[0],
      });
      fetchIncome();
    } catch (error) {
      toast.error('Failed to save income');
    }
  };

  const handleEdit = (item: IncomeItem) => {
    setEditingItem(item);
    setFormData({
      description: item.description,
      amount: item.amount.toString(),
      category: item.category,
      date: new Date(item.date).toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this income?')) {
      try {
        await axios.delete(`/api/income/${id}`);
        toast.success('Income deleted successfully');
        fetchIncome();
      } catch (error) {
        toast.error('Failed to delete income');
      }
    }
  };

  // Calculate statistics
  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
  const currentMonthIncome = income
    .filter(item => {
      const itemDate = new Date(item.date);
      const now = new Date();
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, item) => sum + item.amount, 0);

  const averageIncome = income.length > 0 ? totalIncome / income.length : 0;

  // Prepare chart data
  const categoryData = categories.map(category => {
    const categoryIncome = income
      .filter(item => item.category === category.name)
      .reduce((sum, item) => sum + item.amount, 0);
    return {
      name: category.name,
      amount: categoryIncome,
      color: category.color,
    };
  }).filter(item => item.amount > 0);

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const monthlyIncome = income
      .filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= monthStart && itemDate <= monthEnd;
      })
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      month: format(date, 'MMM yyyy'),
      amount: monthlyIncome,
    };
  });

  const categoryChartData = {
    labels: categoryData.map(item => item.name),
    datasets: [
      {
        data: categoryData.map(item => item.amount),
        backgroundColor: categoryData.map(item => item.color),
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const monthlyChartData = {
    labels: monthlyData.map(item => item.month),
    datasets: [
      {
        label: 'Income',
        data: monthlyData.map(item => item.amount),
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: '#10b981',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const barChartData = {
    labels: categoryData.map(item => item.name),
    datasets: [
      {
        label: 'Income by Category',
        data: categoryData.map(item => item.amount),
        backgroundColor: categoryData.map(item => item.color + '80'),
        borderColor: categoryData.map(item => item.color),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
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
          font: {
            size: 12,
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
    scales: chartView !== 'category' ? {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function (value: any) {
            return '₹' + value.toLocaleString();
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    } : undefined,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-success-500"></div>
      </div>
    );
  }

  return (
   <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-normal bg-gradient-to-r from-indigo-800 via-blue-700 to-gray-700 bg-clip-text text-transparent">Income Management</h1>
          <p className="mt-1 text-sm text-gray-600">Track and manage your income sources</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all duration-200 disabled:opacity-50 transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({
                description: '',
                amount: '',
                category: categories[0]?.name || '',
                date: new Date().toISOString().split('T')[0],
              });
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-success-500 to-success-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg font-medium"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Add Income</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-success-50 to-success-100 p-4 sm:p-6 rounded-xl shadow-sm border border-success-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-success-600 font-medium">Total Income</p>
              <p className="text-lg sm:text-2xl font-bold text-success-700">₹{totalIncome.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success-500 rounded-lg flex items-center justify-center shadow-lg">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-xl shadow-sm border border-blue-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-blue-600 font-medium">This Month</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-700">₹{currentMonthIncome.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 sm:p-6 rounded-xl shadow-sm border border-purple-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-purple-600 font-medium">Average Income</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-700">₹{averageIncome.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-lg flex items-center justify-center shadow-lg">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 sm:p-6 rounded-xl shadow-sm border border-amber-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-amber-600 font-medium">Total Entries</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-700">{income.length}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {income.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-800">Income Analytics</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setChartView('category')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${chartView === 'category'
                      ? 'bg-success-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <PieChart className="w-4 h-4 inline mr-1" />
                  Categories
                </button>
                <button
                  onClick={() => setChartView('monthly')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${chartView === 'monthly'
                      ? 'bg-success-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <BarChart3 className="w-4 h-4 inline mr-1" />
                  Monthly
                </button>
                <button
                  onClick={() => setChartView('trend')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${chartView === 'trend'
                      ? 'bg-success-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Trend
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="h-64 sm:h-80">
              {chartView === 'category' && categoryData.length > 0 && (
                <Doughnut data={categoryChartData} options={chartOptions} />
              )}
              {chartView === 'monthly' && (
                <Bar data={barChartData} options={chartOptions} />
              )}
              {chartView === 'trend' && (
                <Line data={monthlyChartData} options={chartOptions} />
              )}
              {categoryData.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No income data to display</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Income List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Recent Income</h3>
        </div>

        <div className="p-4 sm:p-6">
          {income.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {income.slice(0, 10).map((item) => (
                <div key={item._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-success-50 hover:to-success-100 transition-all duration-200 border border-gray-200 hover:border-success-200">
                  <div className="flex items-center gap-3 mb-2 sm:mb-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-success-400 to-success-600 rounded-lg flex items-center justify-center shadow-md">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm sm:text-base">{item.description}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs sm:text-sm text-gray-600 bg-white px-2 py-1 rounded-full">{item.category}</span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(item.date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <p className="font-bold text-success-600 text-lg">+₹{item.amount.toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-success-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No income recorded yet</h3>
              <p className="text-gray-600 mb-6">Start tracking your income to see insights and analytics</p>
              <button
                onClick={() => {
                  setFormData({
                    description: '',
                    amount: '',
                    category: categories[0]?.name || '',
                    date: new Date().toISOString().split('T')[0],
                  });
                  setShowModal(true);
                }}
                className="bg-gradient-to-r from-success-500 to-success-600 text-white px-6 py-3 rounded-lg hover:from-success-600 hover:to-success-700 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg font-medium"
              >
                Add Your First Income
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">
              {editingItem ? 'Edit Income' : 'Add Income'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-success-500 focus:border-transparent transition-all duration-200"
                  placeholder="e.g., Monthly salary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-success-500 focus:border-transparent transition-all duration-200"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-success-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-success-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                   className="flex items-center justify-center gap-2 bg-gradient-to-r from-success-500 to-success-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg font-medium"
                >
                  {editingItem ? 'Update' : 'Add'} Income
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Income;