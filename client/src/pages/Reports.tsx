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
      const response = await axios.get('/api/reports', {
        params: dateRange,
      });
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

  // Helper to process all transactions and return categorized breakdowns
  const getCategoryBreakdown = () => {
    if (!reportData?.transactions) {
      return { incomeCategories: [], expenseCategories: [], combinedCategories: [] };
    }

    const categoryMap: { [key: string]: { name: string; income: number; expense: number; count: number } } = {};
    let totalIncome = 0;
    let totalExpense = 0;

    reportData.transactions.forEach((t: Transaction) => {
      const category = t.category || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = { name: category, income: 0, expense: 0, count: 0 };
      }

      if (t.type === 'income') {
        categoryMap[category].income += t.amount;
        totalIncome += t.amount;
      } else {
        categoryMap[category].expense += t.amount;
        totalExpense += t.amount;
      }
      categoryMap[category].count += 1;
    });

    const allCategories = Object.values(categoryMap);

    const incomeCategories = allCategories
      .filter(c => c.income > 0)
      .map(c => ({
        name: c.name,
        amount: c.income,
        count: reportData.transactions.filter((t: Transaction) => t.category === c.name && t.type === 'income').length,
        percentage: totalIncome > 0 ? ((c.income / totalIncome) * 100).toFixed(2) : '0.00'
      }))
      .sort((a, b) => b.amount - a.amount);
    
    const expenseCategories = allCategories
      .filter(c => c.expense > 0)
      .map(c => ({
        name: c.name,
        amount: c.expense,
        count: reportData.transactions.filter((t: Transaction) => t.category === c.name && t.type === 'expense').length,
        percentage: totalExpense > 0 ? ((c.expense / totalExpense) * 100).toFixed(2) : '0.00'
      }))
      .sort((a, b) => b.amount - a.amount);
    
    const combinedCategories = allCategories
      .map(c => ({ ...c, total: c.income + c.expense }))
      .sort((a, b) => b.total - a.total);

    return { incomeCategories, expenseCategories, combinedCategories };
  };

  // Sort and filter transactions
  const getSortedTransactions = () => {
    if (!reportData?.transactions) return [];
    
    let filtered = reportData.transactions;
    
    if (filterType !== 'all') {
      filtered = filtered.filter((t: Transaction) => t.type === filterType);
    }
    
    return filtered.sort((a: Transaction, b: Transaction) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date': aValue = new Date(a.date); bValue = new Date(b.date); break;
        case 'amount': aValue = a.amount; bValue = b.amount; break;
        default: aValue = a[sortBy]; bValue = b[sortBy];
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
    const { incomeCategories, expenseCategories } = getCategoryBreakdown();
    
    // Header & Date Range
    doc.setFontSize(20);
    doc.text('Financial Report', 20, 30);
    doc.setFontSize(12);
    doc.text(`Period: ${format(parseISO(dateRange.startDate), 'dd MMM yyyy')} to ${format(parseISO(dateRange.endDate), 'dd MMM yyyy')}`, 20, 45);
    
    // Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, 55, 180, 50);
    doc.setFontSize(14);
    doc.text('Financial Summary', 20, 70);
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Income: ₹${reportData.summary?.totalIncome?.toLocaleString() || 0}`, 20, 85);
    doc.text(`Total Expenses: ₹${reportData.summary?.totalExpenses?.toLocaleString() || 0}`, 20, 95);
    
    const netBalance = (reportData.summary?.totalIncome || 0) - (reportData.summary?.totalExpenses || 0);
    doc.setTextColor(netBalance >= 0 ? 'green' : 'red');
    doc.text(`Net Balance: ₹${netBalance.toLocaleString()}`, 110, 85);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Transactions: ${sortedTransactions.length}`, 110, 95);
    
    let yPos = 120; // Start position for category breakdowns
    
    // Expense Category Breakdown
    if (expenseCategories.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Top Expense Categories', 20, yPos);
      yPos += 15;
      
      expenseCategories.slice(0, 8).forEach((category: any, index: number) => {
        if (yPos > 270) { doc.addPage(); yPos = 30; }
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`${index + 1}. ${category.name}: ₹${category.amount.toLocaleString()} (${category.percentage}%)`, 25, yPos);
        yPos += 10;
      });
    }

    yPos += 15; // Add space

    // Income Category Breakdown
    if (incomeCategories.length > 0) {
      if (yPos > 250) { doc.addPage(); yPos = 30; }
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Top Income Categories', 20, yPos);
      yPos += 15;
      
      incomeCategories.slice(0, 8).forEach((category: any, index: number) => {
        if (yPos > 270) { doc.addPage(); yPos = 30; }
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`${index + 1}. ${category.name}: ₹${category.amount.toLocaleString()} (${category.percentage}%)`, 25, yPos);
        yPos += 10;
      });
    }
    
    // Transaction Details
    if (sortedTransactions.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Transaction Details', 20, 30);
      
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('Date', 20, 50);
      doc.text('Type', 50, 50);
      doc.text('Description', 75, 50);
      doc.text('Category', 130, 50);
      doc.text('Amount', 170, 50, { align: 'right' });
      doc.line(20, 54, 190, 54);
      
      let transYPos = 65;
      sortedTransactions.forEach((transaction: Transaction) => {
        if (transYPos > 270) {
          doc.addPage();
          transYPos = 40;
          doc.setFontSize(10);
          doc.setTextColor(80, 80, 80);
          doc.text('Date', 20, transYPos);
          doc.text('Type', 50, transYPos);
          doc.text('Description', 75, transYPos);
          doc.text('Category', 130, transYPos);
          doc.text('Amount', 170, transYPos, { align: 'right' });
          doc.line(20, transYPos + 4, 190, transYPos + 4);
          transYPos += 15;
        }
        
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        const dateStr = format(parseISO(transaction.date), 'dd/MM/yy');
        const typeStr = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
        const description = doc.splitTextToSize(transaction.description, 50)[0];
        const category = transaction.category;
        
        doc.text(dateStr, 20, transYPos);
        doc.setTextColor(transaction.type === 'income' ? 'green' : 'red');
        doc.text(typeStr, 50, transYPos);
        doc.setTextColor(60, 60, 60);
        doc.text(description, 75, transYPos);
        doc.text(category, 130, transYPos);
        doc.setTextColor(transaction.type === 'income' ? 'green' : 'red');
        doc.text(`₹${transaction.amount.toLocaleString()}`, 190, transYPos, { align: 'right' });
        
        transYPos += 12;
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
    const { incomeCategories, expenseCategories } = getCategoryBreakdown();
    
    // Summary Sheet
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['Financial Report Summary'],
      ['Period', `${format(parseISO(dateRange.startDate), 'dd MMM yyyy')} to ${format(parseISO(dateRange.endDate), 'dd MMM yyyy')}`],
      [],
      ['Metric', 'Value'],
      ['Total Income', reportData.summary?.totalIncome || 0],
      ['Total Expenses', reportData.summary?.totalExpenses || 0],
      ['Net Balance', reportData.summary?.netBalance || 0],
      ['Total Transactions', sortedTransactions.length],
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Transactions Sheet
    if (sortedTransactions.length > 0) {
      const transactionSheet = XLSX.utils.json_to_sheet(
        sortedTransactions.map((t: Transaction) => ({
          Date: format(parseISO(t.date), 'yyyy-MM-dd'),
          Type: t.type,
          Description: t.description,
          Category: t.category,
          Amount: t.amount,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions');
    }
    
    // Income Categories Sheet
    if (incomeCategories.length > 0) {
      const incomeCatSheet = XLSX.utils.json_to_sheet(
        incomeCategories.map(cat => ({
          'Category': cat.name,
          'Total Amount': cat.amount,
          'Transaction Count': cat.count,
          'Percentage of Total Income': `${cat.percentage}%`,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, incomeCatSheet, 'Income Categories');
    }

    // Expense Categories Sheet
    if (expenseCategories.length > 0) {
      const expenseCatSheet = XLSX.utils.json_to_sheet(
        expenseCategories.map(cat => ({
          'Category': cat.name,
          'Total Amount': cat.amount,
          'Transaction Count': cat.count,
          'Percentage of Total Expense': `${cat.percentage}%`,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, expenseCatSheet, 'Expense Categories');
    }
    
    // *** NEW: Daily Summary Sheet ***
    const dailyTotals = getDailyTotals();
    if (dailyTotals.length > 0) {
      const dailySheet = XLSX.utils.json_to_sheet(
        dailyTotals.map(day => ({
          Date: format(parseISO(day.date), 'yyyy-MM-dd'),
          Income: day.income,
          Expenses: day.expense,
          'Net Balance': day.income - day.expense,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Summary');
    }
    
    XLSX.writeFile(workbook, `financial-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel file exported successfully');
  };

  // Prepare data right before rendering
  const sortedTransactions = getSortedTransactions();
  const dailyTotals = getDailyTotals();
  const { incomeCategories, expenseCategories, combinedCategories } = getCategoryBreakdown();

  // Chart data preparation
  const categoryChartDataSource = filterType === 'income' ? incomeCategories : (filterType === 'expense' ? expenseCategories : []);
  const categoryChartData = {
    labels: categoryChartDataSource.map((c: any) => c.name),
    datasets: [{
      label: filterType === 'income' ? 'Income' : 'Expenses',
      data: categoryChartDataSource.map((c: any) => c.amount),
      backgroundColor: [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', 
        '#84cc16', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#f472b6'
      ],
      borderWidth: 0,
      hoverOffset: 8,
    }],
  };

  const monthlyChartData = {
    labels: reportData?.monthlyData?.map((m: any) => m.month) || [],
    datasets: [
      { label: 'Income', data: reportData?.monthlyData?.map((m: any) => m.income) || [], backgroundColor: '#10b981' },
      { label: 'Expenses', data: reportData?.monthlyData?.map((m: any) => m.expenses) || [], backgroundColor: '#ef4444' },
    ],
  };

  const trendChartData = {
    labels: dailyTotals.map(day => format(parseISO(day.date), 'MMM dd')),
    datasets: [
      { label: 'Daily Income', data: dailyTotals.map(day => day.income), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 },
      { label: 'Daily Expenses', data: dailyTotals.map(day => day.expense), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { padding: 20, usePointStyle: true } },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ₹${Number(context.parsed.y || context.parsed).toLocaleString()}`,
        },
      },
    },
    scales: chartView !== 'category' ? {
      y: { beginAtZero: true, ticks: { callback: (value: any) => '₹' + value.toLocaleString() } },
    } : undefined,
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4 text-blue-500" /> : <ArrowDown className="w-4 h-4 text-blue-500" />;
  };

  const handleSort = (column: 'date' | 'amount' | 'type' | 'category') => {
    setSortOrder(sortBy === column ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'desc');
    setSortBy(column);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-normal bg-gradient-to-r from-indigo-800 via-blue-700 to-gray-700 bg-clip-text text-transparent">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">Analyze your financial data and export reports</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all duration-200 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button>
          <button onClick={exportToPDF} className="flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-200"><FileText className="w-4 h-4" />PDF</button>
          <button onClick={exportToExcel} className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all duration-200"><Download className="w-4 h-4" />Excel</button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-gray-500" /><span className="font-medium text-gray-700">Date Range:</span></div>
          <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"/>
          <span className="text-gray-500">to</span>
          <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"/>
        </div>
      </div>

      {reportData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-xl shadow-lg text-white"><div className="flex justify-between items-center"><div><p className="text-sm font-medium">Total Income</p><p className="text-3xl font-bold">₹{reportData.summary?.totalIncome?.toLocaleString() || 0}</p></div><TrendingUp className="w-8 h-8 opacity-70" /></div></div>
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-xl shadow-lg text-white"><div className="flex justify-between items-center"><div><p className="text-sm font-medium">Total Expenses</p><p className="text-3xl font-bold">₹{reportData.summary?.totalExpenses?.toLocaleString() || 0}</p></div><TrendingDown className="w-8 h-8 opacity-70" /></div></div>
            <div className={`bg-gradient-to-br p-6 rounded-xl shadow-lg text-white ${(reportData.summary?.netBalance || 0) >= 0 ? 'from-blue-500 to-indigo-600' : 'from-yellow-500 to-orange-600'}`}><div className="flex justify-between items-center"><div><p className="text-sm font-medium">Net Balance</p><p className="text-3xl font-bold">₹{reportData.summary?.netBalance?.toLocaleString() || 0}</p></div><BarChart3 className="w-8 h-8 opacity-70" /></div></div>
            <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-6 rounded-xl shadow-lg text-white"><div className="flex justify-between items--center"><div><p className="text-sm font-medium">Transactions</p><p className="text-3xl font-bold">{sortedTransactions.length}</p></div><FileText className="w-8 h-8 opacity-70" /></div></div>
          </div>

          {/* Charts & Categories Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Main Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Financial Analysis</h3>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  {['monthly', 'category', 'trend'].map(view => (
                    <button key={view} onClick={() => setChartView(view as any)} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${chartView === view ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>{view.charAt(0).toUpperCase() + view.slice(1)}</button>
                  ))}
                </div>
              </div>
              <div className="p-6 h-80">
                {chartView === 'monthly' && monthlyChartData.labels.length > 0 && <Bar data={monthlyChartData} options={chartOptions} />}
                {chartView === 'category' && categoryChartDataSource.length > 0 && <Doughnut data={categoryChartData} options={chartOptions} />}
                {chartView === 'trend' && trendChartData.labels.length > 0 && <Line data={trendChartData} options={chartOptions} />}
                {((chartView === 'monthly' && monthlyChartData.labels.length === 0) || (chartView === 'category' && categoryChartDataSource.length === 0) || (chartView === 'trend' && trendChartData.labels.length === 0)) &&
                  <div className="flex items-center justify-center h-full text-gray-500"><div className="text-center"><BarChart3 className="w-16 h-16 mx-auto text-gray-300" /><h4 className="mt-2 text-lg">No Data Available</h4><p className="text-sm">No data to display for the selected view and period.</p></div></div>}
              </div>
            </div>

            {/* Top Categories Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200"><h3 className="text-lg font-semibold text-gray-800">Category Summary</h3></div>
              <div className="p-6 overflow-y-auto h-96">
                {combinedCategories.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50"><tr className="text-left text-gray-500">
                      <th className="p-2 font-medium">Category</th>
                      <th className="p-2 font-medium text-right">Income</th>
                      <th className="p-2 font-medium text-right">Expense</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {combinedCategories.map(c => (
                        <tr key={c.name}><td className="p-2">{c.name}</td>
                          <td className="p-2 text-right text-green-600">₹{c.income.toLocaleString()}</td>
                          <td className="p-2 text-right text-red-600">₹{c.expense.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500"><div className="text-center">No category data for this period.</div></div>
                )}
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Transaction Details</h3>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500">
                <option value="all">All Types</option>
                <option value="income">Income Only</option>
                <option value="expense">Expenses Only</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              {sortedTransactions.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50"><tr>
                    {[{label: 'Date', key: 'date'}, {label: 'Type', key: 'type'}, {label: 'Description', key: null}, {label: 'Category', key: 'category'}, {label: 'Amount', key: 'amount'}].map(h => (
                      <th key={h.label} onClick={() => h.key && handleSort(h.key as any)} className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${h.key && 'cursor-pointer hover:bg-gray-100'} ${h.key === 'amount' ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-2 ${h.key === 'amount' && 'justify-end'}`}>{h.label} {h.key && getSortIcon(h.key)}</div>
                      </th>
                    ))}
                  </tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedTransactions.map((t: Transaction) => (
                      <tr key={t._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">{format(parseISO(t.date), 'dd MMM yyyy')}</td>
                        <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.type}</span></td>
                        <td className="px-6 py-4 text-sm max-w-xs truncate">{t.description}</td>
                        <td className="px-6 py-4 text-sm">{t.category}</td>
                        <td className={`px-6 py-4 text-sm font-medium text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12"><FileText className="w-16 h-16 text-gray-300 mx-auto" /><h3 className="mt-2 text-lg">No transactions found</h3><p className="text-gray-600">No transactions match the selected filters.</p></div>
              )}
            </div>
          </div>
        </>
      ) : (
        !loading && <div className="text-center py-12"><FileText className="w-16 h-16 text-gray-300 mx-auto" /><h3 className="mt-2 text-lg">No Report Data</h3><p className="text-gray-600">Select a date range to generate a report.</p></div>
      )}
    </div>
  );
};

export default Reports;