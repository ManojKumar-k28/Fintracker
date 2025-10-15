import React, { useState, useEffect } from 'react';
import { Plus, Tags, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Category {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#3b82f6',
  });

  // For separate pagination state
  const [incomePage, setIncomePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);

  const itemsPerPage = 10;

  const colorOptions = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/categories');
      setCategories(response.data);
    } catch (error) {
      toast.error('Failed to fetch categories');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`/api/categories/${editingItem._id}`, formData);
        toast.success('Category updated');
      } else {
        await axios.post('/api/categories', formData);
        toast.success('Category created');
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({ name: '', type: 'expense', color: '#3b82f6' });
      fetchCategories();
    } catch (error) {
      toast.error('Error saving category');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await axios.delete(`/api/categories/${id}`);
        toast.success('Category deleted');
        fetchCategories();
      } catch (error) {
        toast.error('Error deleting category');
      }
    }
  };

  const handleEdit = (item: Category) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      color: item.color,
    });
    setShowModal(true);
  };

  // Split categories
  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Paginated categories
  const paginatedIncomeCategories = incomeCategories.slice(
    (incomePage - 1) * itemsPerPage,
    incomePage * itemsPerPage
  );

  const paginatedExpenseCategories = expenseCategories.slice(
    (expensePage - 1) * itemsPerPage,
    expensePage * itemsPerPage
  );

  useEffect(() => {
    setIncomePage(1);
    setExpensePage(1);
  }, [categories]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-gray-700 text-transparent bg-clip-text">
            Category Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">Organize your income and expense categories wisely</p>
        </div>

        <button
          onClick={() => {
            setShowModal(true);
            setEditingItem(null);
            setFormData({ name: '', type: 'expense', color: '#3b82f6' });
          }}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Category Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Income */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b flex items-center gap-2">
            <div className="w-8 h-8 bg-success-100 text-success-600 flex justify-center items-center rounded">
              <Tags className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-lg">Income Categories</h2>
          </div>
          <div className="p-4">
            {paginatedIncomeCategories.length > 0 ? (
              <div className="space-y-3">
                {paginatedIncomeCategories.map((cat) => (
                  <div key={cat._id} className="bg-gray-50 rounded-lg px-4 py-3 flex justify-between items-center">
                    <div className="flex gap-3 items-center">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(cat)} className="hover:text-blue-600 px-2">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cat._id)} className="hover:text-red-500 px-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center">No income categories yet.</p>
            )}

            {/* Pagination */}
            {incomeCategories.length > itemsPerPage && (
              <div className="flex justify-center space-x-2 mt-4">
                {Array.from({ length: Math.ceil(incomeCategories.length / itemsPerPage) }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setIncomePage(i + 1)}
                    className={`w-8 h-8 rounded-full text-sm ${
                      i + 1 === incomePage
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 hover:bg-primary-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expense */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 text-red-600 flex justify-center items-center rounded">
              <Tags className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-lg">Expense Categories</h2>
          </div>
          <div className="p-4">
            {paginatedExpenseCategories.length > 0 ? (
              <div className="space-y-3">
                {paginatedExpenseCategories.map((cat) => (
                  <div key={cat._id} className="bg-gray-50 rounded-lg px-4 py-3 flex justify-between items-center">
                    <div className="flex gap-3 items-center">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(cat)} className="hover:text-blue-600 px-2">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cat._id)} className="hover:text-red-500 px-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center">No expense categories yet.</p>
            )}

            {/* Pagination */}
            {expenseCategories.length > itemsPerPage && (
              <div className="flex justify-center space-x-2 mt-4">
                {Array.from({ length: Math.ceil(expenseCategories.length / itemsPerPage) }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setExpensePage(i + 1)}
                    className={`w-8 h-8 rounded-full text-sm ${
                      i + 1 === expensePage
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 hover:bg-primary-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editingItem ? 'Edit Category' : 'Add Category'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1 w-full border px-3 py-2 rounded-lg focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Type</label>
                <div className="flex gap-4 mt-1">
                  {['income', 'expense'].map((type) => (
                    <label key={type} className="flex items-center gap-1 text-sm">
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
                <label className="text-sm font-medium mb-1 block">Select Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  {editingItem ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;