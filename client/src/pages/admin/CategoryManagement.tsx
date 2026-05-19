import React, { useState, useEffect } from 'react';
import { Tags, Plus, CreditCard as Edit2, Trash2, Search, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Category {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  isDefault: boolean;
  createdBy?: {
    name: string;
    email: string;
  };
  usage?: {
    incomeTransactions: number;
    expenseTransactions: number;
    totalTransactions: number;
  };
  createdAt: string;
}

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [filters, setFilters] = useState({ search: '', type: '' });

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#3b82f6',
  });

  const colorOptions = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#14b8a6', '#f472b6', '#a855f7', '#22c55e', '#fb7185'
  ];

  const ITEMS_PER_PAGE = 10;
  const [incomePage, setIncomePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);

  useEffect(() => {
    fetchCategories();
  }, [filters]);

  useEffect(() => {
    setIncomePage(1);
    setExpensePage(1);
  }, [categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      if (!token) {
        toast.error('Admin token not found. Please login again.');
        return;
      }

      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.type) params.append('type', filters.type);

      const response = await axios.get(`/api/admin/categories?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCategories(response.data.data.categories);
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Admin session expired. Please login again.');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin/login';
      } else {
        toast.error('Failed to fetch categories');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCategories();
    toast.success('Categories refreshed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      if (editingCategory) {
        await axios.patch(`/api/admin/categories/${editingCategory._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Category updated successfully');
      } else {
        await axios.post('/api/admin/categories', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Category created successfully');
      }

      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '', type: 'expense', color: '#3b82f6' });
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color,
    });
    setShowModal(true);
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (window.confirm(`Are you sure you want to delete category "${categoryName}"?`)) {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.delete(`/api/admin/categories/${categoryId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Category deleted successfully');
        fetchCategories();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete category');
      }
    }
  };

  // Full list
  const incomeCategoriesAll = categories.filter(cat => cat.type === 'income');
  const expenseCategoriesAll = categories.filter(cat => cat.type === 'expense');

  // Paginated list
  const incomeCategories = incomeCategoriesAll.slice((incomePage - 1) * ITEMS_PER_PAGE, incomePage * ITEMS_PER_PAGE);
  const expenseCategories = expenseCategoriesAll.slice((expensePage - 1) * ITEMS_PER_PAGE, expensePage * ITEMS_PER_PAGE);

  const renderPagination = (
    totalItems: number,
    currentPage: number,
    onPageChange: (page: number) => void
  ) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center items-center gap-2 mt-4 flex-wrap">
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 rounded-full text-sm ${
              currentPage === page
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-purple-100'
            }`}
          >
            {page}
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-lg">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-800 to-blue-800 bg-clip-text text-transparent">
              Category Management
            </h1>
            <p className="text-gray-600 mt-1">Manage your categories with ease</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setEditingCategory(null);
                setFormData({ name: '', type: 'expense', color: '#3b82f6' });
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search categories..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
        </div>

        {/* Category Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Income */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-6 bg-green-50 border-b flex items-center gap-2">
              <TrendingUp className="text-green-600 w-5 h-5" />
              <h3 className="text-lg font-semibold text-green-800">
                Income Categories ({incomeCategoriesAll.length})
              </h3>
            </div>
            <div className="p-6 space-y-3">
              {incomeCategories.length > 0 ? (
                <>
                  {incomeCategories.map((cat) => (
                    <div
                      key={cat._id}
                      className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <div>
                          <p className="text-gray-800 font-medium">{cat.name}</p>
                          {cat.usage && (
                            <p className="text-xs text-gray-500">
                              {cat.usage.totalTransactions} transactions
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(cat)} className="p-2 hover:bg-blue-50 rounded text-blue-500">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cat._id, cat.name)} className="p-2 hover:bg-red-50 rounded text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {renderPagination(incomeCategoriesAll.length, incomePage, setIncomePage)}
                </>
              ) : (
                <p className="text-center text-sm text-gray-500">No income categories found.</p>
              )}
            </div>
          </div>

          {/* Expense */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-6 bg-red-50 border-b flex items-center gap-2">
              <TrendingDown className="text-red-600 w-5 h-5" />
              <h3 className="text-lg font-semibold text-red-800">
                Expense Categories ({expenseCategoriesAll.length})
              </h3>
            </div>
            <div className="p-6 space-y-3">
              {expenseCategories.length > 0 ? (
                <>
                  {expenseCategories.map((cat) => (
                    <div
                      key={cat._id}
                      className="flex justify-between items-center p-4 bg-red-50 rounded-lg border border-red-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <div>
                          <p className="text-gray-800 font-medium">{cat.name}</p>
                          {cat.usage && (
                            <p className="text-xs text-gray-500">
                              {cat.usage.totalTransactions} transactions
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(cat)} className="p-2 hover:bg-blue-50 rounded text-blue-500">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cat._id, cat.name)} className="p-2 hover:bg-red-50 rounded text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {renderPagination(expenseCategoriesAll.length, expensePage, setExpensePage)}
                </>
              ) : (
                <p className="text-center text-sm text-gray-500">No expense categories found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Name</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Type</label>
                  <div className="flex gap-4">
                    {['income', 'expense'].map((type) => (
                      <label key={type} className="flex items-center text-sm gap-2">
                        <input
                          type="radio"
                          value={type}
                          checked={formData.type === type}
                          onChange={(e) =>
                            setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })
                          }
                        />
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-6 h-6 rounded-full border-2 ${
                          formData.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingCategory(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg"
                  >
                    {editingCategory ? 'Update' : 'Create'}
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

export default CategoryManagement;