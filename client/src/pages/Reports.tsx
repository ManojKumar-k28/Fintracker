import React, { useState, useEffect } from 'react';
import { Download, FileText, Filter, Calendar, RefreshCw, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown, BarChart3 } from 'lucide-react';
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
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';

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

interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  category: string;
  date: string;
}

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'type' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [chartView, setChartView] = useState<'monthly' | 'category' | 'trend'>('monthly');

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      console.log('Fetching report data for date range:', dateRange);
      
      const response = await axios.get('/api/reports', {
        params: dateRange,
      });
      
      console.log('Report data received:', response.data);
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to fetch report data');
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

  // Sort and filter transactions
  const getSortedTransactions = () => {
    if (!reportData?.transactions) return [];
    
    let filtered = reportData.transactions;
    
    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((t: Transaction) => t.type === filterType);
    }
    
    // Sort transactions
    return filtered.sort((a: Transaction, b: Transaction) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  // Get daily totals for trend analysis
  const getDailyTotals = () => {
    if (!reportData?.transactions) return [];
    
    const dailyData: { [key: string]: { income: number; expense: number; date: string } } = {};
    
    reportData.transactions.forEach((transaction: Transaction) => {
      const dateKey = format(parseISO(transaction.date), 'yyyy-MM-dd');
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { income: 0, expense: 0, date: dateKey };
      }
      
      if (transaction.type === 'income') {
        dailyData[dateKey].income += transaction.amount;
      } else {
        dailyData[dateKey].expense += transaction.amount;
      }
    });
    
    return Object.values(dailyData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const exportToPDF = () => {
    if (!reportData) {
      toast.error('No data to export');
      return;
    }

    const doc = new jsPDF();
    const sortedTransactions = getSortedTransactions();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Financial Report', 20, 30);
    
    // Date range
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`Period: ${format(parseISO(dateRange.startDate), 'dd MMM yyyy')} to ${format(parseISO(dateRange.endDate), 'dd MMM yyyy')}`, 20, 45);
    
    // Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, 55, 180, 50);
    
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Financial Summary', 20, 70);
    
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Income: ₹${reportData.summary?.totalIncome?.toLocaleString() || 0}`, 20, 85);
    doc.text(`Total Expenses: ₹${reportData.summary?.totalExpenses?.toLocaleString() || 0}`, 20, 95);
    
    const netBalance = (reportData.summary?.totalIncome || 0) - (reportData.summary?.totalExpenses || 0);
    if (netBalance >= 0) {
      doc.setTextColor(0, 150, 0);
    } else {
      doc.setTextColor(200, 0, 0);
    }
    doc.text(`Net Balance: ₹${netBalance.toLocaleString()}`, 110, 85);
    
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Transactions: ${sortedTransactions.length}`, 110, 95);
    
    // Category Breakdown
    if (reportData.categoryData && reportData.categoryData.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Top Expense Categories', 20, 125);
      
      let yPos = 140;
      reportData.categoryData.slice(0, 8).forEach((category: any, index: number) => {
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`${index + 1}. ${category.name}: ₹${category.amount.toLocaleString()} (${category.percentage}%)`, 25, yPos);
        yPos += 12;
      });
    }
    
    // Transaction Details
    if (sortedTransactions.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Transaction Details', 20, 30);
      
      // Table headers
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('Date', 20, 50);
      doc.text('Type', 50, 50);
      doc.text('Description', 75, 50);
      doc.text('Category', 130, 50);
      doc.text('Amount', 170, 50);

      // start y position for rows (below headers)
      let yPos = 65;
      doc.line(20, 54, 190, 54);
      
      sortedTransactions.forEach((transaction: Transaction, index: number) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 40;
          
          // Repeat headers on new page
          doc.setFontSize(10);
          doc.setTextColor(80, 80, 80);
          doc.text('Date', 20, yPos);
          doc.text('Type', 50, yPos);
          doc.text('Description', 75, yPos);
          doc.text('Category', 130, yPos);
          doc.text('Amount', 170, yPos);
          doc.line(20, yPos + 2, 190, yPos + 2);
          yPos += 15;
        }
        
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        
        const dateStr = format(parseISO(transaction.date), 'dd/MM/yy');
        const typeStr = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
        const description = transaction.description.length > 20 ? transaction.description.substring(0, 20) + '...' : transaction.description;
        const category = transaction.category.length > 15 ? transaction.category.substring(0, 15) + '...' : transaction.category;
        
        doc.text(dateStr, 20, yPos);
        if (transaction.type === 'income') {
          doc.setTextColor(0, 150, 0);
        } else {
          doc.setTextColor(200, 0, 0);
        }
        doc.text(typeStr, 50, yPos);
        doc.setTextColor(60, 60, 60);
        doc.text(description, 75, yPos);
        doc.text(category, 130, yPos);
        if (transaction.type === 'income') {
          doc.setTextColor(0, 150, 0);
        } else {
          doc.setTextColor(200, 0, 0);
        }
        doc.text(`₹${transaction.amount.toLocaleString()}`, 170, yPos);
        
        yPos += 12;
      });
    }
    
    doc.save(`financial-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exported successfully');
  };

  const exportToExcel = () => {
    if (!reportData) {
      toast.error('No data to export');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const sortedTransactions = getSortedTransactions();
    
    // Summary sheet
    const summaryData = [
      ['Financial Report Summary'],
      ['Period', `${format(parseISO(dateRange.startDate), 'dd MMM yyyy')} to ${format(parseISO(dateRange.endDate), 'dd MMM yyyy')}`],
      ['Generated On', format(new Date(), 'dd MMM yyyy HH:mm')],
      [''],
      ['Metric', 'Value'],
      ['Total Income', reportData.summary?.totalIncome || 0],
      ['Total Expenses', reportData.summary?.totalExpenses || 0],
      ['Net Balance', (reportData.summary?.totalIncome || 0) - (reportData.summary?.totalExpenses || 0)],
      ['Income Transactions', reportData.summary?.incomeCount || 0],
      ['Expense Transactions', reportData.summary?.expenseCount || 0],
      ['Total Transactions', sortedTransactions.length],
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Transactions sheet
    if (sortedTransactions.length > 0) {
      const transactionData = [
        ['Date', 'Type', 'Description', 'Category', 'Amount'],
        ...sortedTransactions.map((t: Transaction) => [
          format(parseISO(t.date), 'dd/MM/yyyy'),
          t.type.charAt(0).toUpperCase() + t.type.slice(1),
          t.description,
          t.category,
          t.amount,
        ]),
      ];
      
      const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions');
    }
    
    // Category breakdown sheet
    if (reportData.categoryData && reportData.categoryData.length > 0) {
      const categoryData = [
        ['Category', 'Amount', 'Percentage', 'Transaction Count'],
        ...reportData.categoryData.map((cat: any) => [
          cat.name,
          cat.amount,
          cat.percentage + '%',
          cat.count,
        ]),
      ];
      
      const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');
    }
    
    // Daily summary sheet
    const dailyTotals = getDailyTotals();
    if (dailyTotals.length > 0) {
      const dailyData = [
        ['Date', 'Income', 'Expenses', 'Net Balance'],
        ...dailyTotals.map((day) => [
          format(parseISO(day.date), 'dd/MM/yyyy'),
          day.income,
          day.expense,
          day.income - day.expense,
        ]),
      ];
      
      const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Summary');
    }
    
    XLSX.writeFile(workbook, `financial-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel file exported successfully');
  };

  // Chart data preparation
  const categoryChartData = {
    labels: reportData?.categoryData?.map((c: any) => c.name) || [],
    datasets: [
      {
        data: reportData?.categoryData?.map((c: any) => c.amount) || [],
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

const monthlyChartData = {
    labels: reportData?.monthlyData?.map((m: any) => m.month) || [],
    datasets: [
      {
        label: 'Income',
        data: reportData?.monthlyData?.map((m: any) => m.income) || [],
        backgroundColor: '#10b981',
      },
      {
        label: 'Expenses',
        data: reportData?.monthlyData?.map((m: any) => m.expenses) || [],
        backgroundColor: '#ef4444',
      },
    ],
  };


  const trendChartData = {
    labels: getDailyTotals().map(day => format(parseISO(day.date), 'MMM dd')),
    datasets: [
      {
        label: 'Daily Income',
        data: getDailyTotals().map(day => day.income),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Daily Expenses',
        data: getDailyTotals().map(day => day.expense),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
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
    title: function (context: any) {
      // Use the x-axis label (e.g., "Jan 10")
      return context[0].label;
    },
    label: function (context: any) {
      let value;

      // For bar/line charts → parsed is {x, y}
      if (typeof context.parsed === 'object' && context.parsed !== null) {
        value = context.parsed.y;
      } else {
        value = context.parsed;
      }

      return `${context.dataset.label}: ₹${Number(value).toLocaleString()}`;
    },
  },
},

    },
    scales: chartView !== 'category' ? {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '₹' + value.toLocaleString();
          },
        },
      },
    } : undefined,
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortOrder === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-500" /> : 
      <ArrowDown className="w-4 h-4 text-blue-500" />;
  };

  const handleSort = (column: 'date' | 'amount' | 'type' | 'category') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const sortedTransactions = getSortedTransactions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-normal bg-gradient-to-r from-indigo-800 via-blue-700 to-gray-700 bg-clip-text text-transparent">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">Analyze your financial data and export reports</p>
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
            onClick={exportToPDF}
            className="flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Date Range:</span>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            />
            <span className="text-gray-500 text-center sm:text-left">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-xl shadow-lg text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Income</p>
                  <p className="text-2xl sm:text-3xl font-bold">₹{reportData.summary?.totalIncome?.toLocaleString() || 0}</p>
                  <p className="text-green-200 text-xs mt-1">{reportData.summary?.incomeCount || 0} transactions</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-xl shadow-lg text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                  <p className="text-2xl sm:text-3xl font-bold">₹{reportData.summary?.totalExpenses?.toLocaleString() || 0}</p>
                  <p className="text-red-200 text-xs mt-1">{reportData.summary?.expenseCount || 0} transactions</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-200" />
              </div>
            </div>
            
            <div className={`bg-gradient-to-br p-6 rounded-xl shadow-lg text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
              (reportData.summary?.netBalance || 0) >= 0 ? 'from-blue-500 to-indigo-600' : 'from-red-500 to-rose-600'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Net Balance</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    ₹{reportData.summary?.netBalance?.toLocaleString() || 0}
                  </p>
                  <p className="text-blue-200 text-xs mt-1">
                    {(reportData.summary?.netBalance || 0) >= 0 ? 'Surplus' : 'Deficit'}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-6 rounded-xl shadow-lg text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Total Transactions</p>
                  <p className="text-2xl sm:text-3xl font-bold">{sortedTransactions.length}</p>
                  <p className="text-purple-200 text-xs mt-1">All transactions</p>
                </div>
                <FileText className="w-8 h-8 text-purple-200" />
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Main Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Financial Analysis</h3>
                    <p className="text-sm text-gray-600">Visual representation of your financial data</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setChartView('monthly')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        chartView === 'monthly'
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setChartView('category')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        chartView === 'category'
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Categories
                    </button>
                    <button
                      onClick={() => setChartView('trend')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        chartView === 'trend'
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Trend
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="h-80">
                  {chartView === 'monthly' && reportData.monthlyData && reportData.monthlyData.length > 0 && (
                    <Bar data={monthlyChartData} options={chartOptions} />
                  )}
                  {chartView === 'category' && reportData.categoryData && reportData.categoryData.length > 0 && (
                    <Doughnut data={categoryChartData} options={chartOptions} />
                  )}
                  {chartView === 'trend' && getDailyTotals().length > 0 && (
                    <Line data={trendChartData} options={chartOptions} />
                  )}
                  {((chartView === 'monthly' && (!reportData.monthlyData || reportData.monthlyData.length === 0)) ||
                    (chartView === 'category' && (!reportData.categoryData || reportData.categoryData.length === 0)) ||
                    (chartView === 'trend' && getDailyTotals().length === 0)) && (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h4 className="text-lg font-medium text-gray-600 mb-2">No Data Available</h4>
                        <p className="text-sm text-gray-500">No data to display for the selected period</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
           {/* Top Categories - Combined income + expense */}
{reportData && (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
    <div className="p-6 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800">Top Categories</h3>
      <p className="text-sm text-gray-600 mt-1">Combined view showing income and expense per category</p>
    </div>

    <div className="p-6 overflow-x-auto">
      {(() => {
        const getCategorySummary = () => {
          if (!reportData?.transactions || reportData.transactions.length === 0) {
            return { income: [], expense: [], combined: [] };
          }

          const map: Record<string, { name: string; income: number; expense: number; count: number }> = {};

          reportData.transactions.forEach((t: Transaction) => {
            const key = t.category || 'Uncategorized';
            if (!map[key]) {
              map[key] = { name: key, income: 0, expense: 0, count: 0 };
            }
            if (t.type === 'income') {
              map[key].income += t.amount;
            } else {
              map[key].expense += t.amount;
            }
            map[key].count += 1;
          });

          const entries = Object.values(map);

          const income = entries
            .filter(e => e.income > 0)
            .sort((a, b) => b.income - a.income);

          const expense = entries
            .filter(e => e.expense > 0)
            .sort((a, b) => b.expense - a.expense);

          const combined = entries
            .map(e => ({ name: e.name, income: e.income, expense: e.expense, total: e.income + e.expense, count: e.count }))
            .sort((a, b) => b.total - a.total);

          return { income, expense, combined };
        };

        const { income: incomeCats, expense: expenseCats, combined: topCats } = getCategorySummary();

        return (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Income</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Expense</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {topCats && topCats.length > 0 ? (
                  topCats.slice(0, 10).map((c: any) => (
                    <tr key={c.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                        ₹{Number(c.income || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                        ₹{Number(c.expense || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold">
                        ₹{Number(c.total || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No category data available for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <div>Income categories: {incomeCats.length}</div>
              <div>Expense categories: {expenseCats.length}</div>
            </div>
          </>
        );
      })()}
    </div>
  </div>
)}
            </div>


          {/* Transaction List with Sorting */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Transaction Details</h3>
                  <p className="text-sm text-gray-600">Sortable list of all transactions</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    <option value="income">Income Only</option>
                    <option value="expense">Expenses Only</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {sortedTransactions.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center gap-2">
                          Date
                          {getSortIcon('date')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('type')}
                      >
                        <div className="flex items-center gap-2">
                          Type
                          {getSortIcon('type')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center gap-2">
                          Category
                          {getSortIcon('category')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('amount')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Amount
                          {getSortIcon('amount')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedTransactions.map((transaction: Transaction, index: number) => (
                      <tr key={transaction._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(parseISO(transaction.date), 'dd MMM yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === 'income' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.type === 'income' ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            )}
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={transaction.description}>
                            {transaction.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                            {transaction.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No transactions found</h3>
                  <p className="text-gray-600">No transactions available for the selected period and filters</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!reportData && !loading && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No report data available</h3>
          <p className="text-gray-600">Select a date range to generate reports</p>
        </div>
      )}
    </div>
  );
};

export default Reports;