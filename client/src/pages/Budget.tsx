import React, { useState, useEffect } from 'react';
import { Plus, Target, Edit2, Trash2, AlertCircle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface BudgetItem {
  _id: string;
  category: string;
  budgetAmount: number;
  spentAmount: number;
  month: string;
  year: number;
}

const Budget: React.FC = () => {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    category: '',
    budgetAmount: '',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/budget');
      setBudgets(response.data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast.error('Failed to fetch budget data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories/type/expense');
      const categoryNames = response.data.map((cat: any) => cat.name);
      setCategories(categoryNames);
      if (categoryNames.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: categoryNames[0] }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBudgets();
    setRefreshing(false);
    toast.success('Budget data refreshed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    try {
      const data = {
        ...formData,
        budgetAmount: parseFloat(formData.budgetAmount),
      };

      if (editingItem) {
        await axios.put(`/api/budget/${editingItem._id}`, data);
        toast.success('Budget updated successfully');
      } else {
        await axios.post('/api/budget', data);
        toast.success('Budget created successfully');
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({
        category: categories[0] || '',
        budgetAmount: '',
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear(),
      });
      fetchBudgets();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save budget');
    }
  };

  const handleEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      budgetAmount: item.budgetAmount.toString(),
      month: item.month,
      year: item.year,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await axios.delete(`/api/budget/${id}`);
        toast.success('Budget deleted successfully');
        fetchBudgets();
      } catch (error) {
        toast.error('Failed to delete budget');
      }
    }
  };

  const refreshBudgets = async () => {
    try {
      await axios.post('/api/budget/refresh');
      toast.success('Budget amounts refreshed');
      fetchBudgets();
    } catch (error) {
      toast.error('Failed to refresh budgets');
    }
  };

  const getBudgetStatus = (budget: BudgetItem) => {
    const percentage = budget.budgetAmount > 0 ? (budget.spentAmount / budget.budgetAmount) * 100 : 0;
    if (percentage >= 100) return { 
      color: 'text-red-600', 
      bg: 'bg-red-500', 
      bgLight: 'bg-red-50',
      status: 'Over Budget',
      icon: AlertCircle
    };
    if (percentage >= 80) return { 
      color: 'text-amber-600', 
      bg: 'bg-amber-500', 
      bgLight: 'bg-amber-50',
      status: 'Near Limit',
      icon: TrendingUp
    };
    return { 
      color: 'text-green-600', 
      bg: 'bg-green-500', 
      bgLight: 'bg-green-50',
      status: 'On Track',
      icon: Target
    };
  };

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.budgetAmount, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spentAmount, 0);
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
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
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-normal bg-gradient-to-r from-indigo-800 via-blue-700 to-gray-700 bg-clip-text text-transparent-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Budget Management
            </h1>
            <p className="mt-1 text-sm text-gray-600">Set and track your spending limits</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
                  category: categories[0] || '',
                  budgetAmount: '',
                  month: new Date().toLocaleString('default', { month: 'long' }),
                  year: new Date().getFullYear(),
                });
                setShowModal(true);
              }}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Budget
            </button>
          </div>
        </div>

        {/* Overall Budget Summary */}
        {budgets.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary-500" />
                Overall Budget Summary
              </h3>
              <p className="text-sm text-gray-600 mt-1">Total budget overview for all categories</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-blue-700">₹{totalBudget.toLocaleString()}</p>
                  <p className="text-sm text-blue-600 font-medium">Total Budget</p>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-100 rounded-xl border border-red-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-red-700">₹{totalSpent.toLocaleString()}</p>
                  <p className="text-sm text-red-600 font-medium">Total Spent</p>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border border-green-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-green-700">₹{Math.max(0, totalBudget - totalSpent).toLocaleString()}</p>
                  <p className="text-sm text-green-600 font-medium">Remaining</p>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl border border-amber-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <p className={`text-2xl font-bold ${
                    overallPercentage >= 100 ? 'text-red-700' : 
                    overallPercentage >= 80 ? 'text-amber-700' : 'text-green-700'
                  }`}>
                    {overallPercentage.toFixed(1)}%
                  </p>
                  <p className="text-sm text-amber-600 font-medium">Used</p>
                </div>
              </div>
              
              {/* Overall Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-gray-700">Overall Budget Progress</span>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    overallPercentage >= 100 ? 'bg-red-100 text-red-700' : 
                    overallPercentage >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {overallPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                  <div
                    className={`h-4 rounded-full transition-all duration-1000 ease-out ${
                      overallPercentage >= 100 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                      overallPercentage >= 80 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 
                      'bg-gradient-to-r from-green-500 to-green-600'
                    }`}
                    style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                  ></div>
                </div>
                {overallPercentage >= 100 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700 font-medium">
                      ⚠️ Budget exceeded by ₹{(totalSpent - totalBudget).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Budget Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {budgets.map((budget) => {
            const status = getBudgetStatus(budget);
            const percentage = budget.budgetAmount > 0 ? Math.min((budget.spentAmount / budget.budgetAmount) * 100, 100) : 0;
            const remaining = budget.budgetAmount - budget.spentAmount;
            const StatusIcon = status.icon;
            
            return (
              <div key={budget._id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 ${status.bgLight} rounded-2xl flex items-center justify-center shadow-md`}>
                      <StatusIcon className={`w-7 h-7 ${status.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{budget.category}</h3>
                      <p className="text-sm text-gray-600 font-medium">{budget.month} {budget.year}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(budget._id)}
                      className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Progress Section */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-gray-700">Progress</span>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      percentage >= 100 ? 'bg-red-100 text-red-700' : 
                      percentage >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className={`h-3 rounded-full transition-all duration-1000 ease-out ${status.bg}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Budget Details */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <span className="text-sm font-semibold text-blue-700">Budget Amount:</span>
                    <span className="font-bold text-blue-800 text-lg">₹{budget.budgetAmount.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200">
                    <span className="text-sm font-semibold text-red-700">Amount Spent:</span>
                    <span className="font-bold text-red-800 text-lg">₹{budget.spentAmount.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <span className="text-sm font-semibold text-green-700">Remaining:</span>
                    <span className={`font-bold text-lg ${
                      remaining >= 0 ? 'text-green-800' : 'text-red-800'
                    }`}>
                      ₹{Math.abs(remaining).toLocaleString()}
                      {remaining < 0 && (
                        <span className="text-xs ml-1 bg-red-100 text-red-700 px-2 py-1 rounded-full">
                          OVER
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Status Alert */}
                {percentage >= 80 && (
                  <div className={`mt-4 p-4 ${status.bgLight} rounded-xl flex items-center gap-3 border ${
                    percentage >= 100 ? 'border-red-200' : 'border-amber-200'
                  }`}>
                    <AlertCircle className={`w-5 h-5 ${status.color} flex-shrink-0`} />
                    <div>
                      <span className={`text-sm font-bold ${status.color}`}>{status.status}</span>
                      {percentage >= 100 && (
                        <p className="text-xs text-red-600 mt-1">
                          You've exceeded your budget by ₹{(budget.spentAmount - budget.budgetAmount).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {budgets.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Target className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">No budgets created yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Start by creating your first budget to track spending and stay on top of your financial goals
              </p>
              <button
                onClick={() => {
                  setFormData({
                    category: categories[0] || '',
                    budgetAmount: '',
                    month: new Date().toLocaleString('default', { month: 'long' }),
                    year: new Date().getFullYear(),
                  });
                  setShowModal(true);
                }}
                className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-8 py-4 rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg font-semibold text-lg"
              >
                Create Your First Budget
              </button>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-screen overflow-y-auto shadow-2xl">
              <h3 className="text-xl font-bold text-gray-800 mb-6">
                {editingItem ? 'Edit Budget' : 'Create Budget'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Budget Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.budgetAmount}
                    onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Month
                    </label>
                    <select
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                    >
                      {months.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Year
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                      min="2020"
                      max="2030"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingItem(null);
                    }}
                    className="flex-1 px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg font-medium"
                  >
                    {editingItem ? 'Update' : 'Create'} Budget
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Budget;