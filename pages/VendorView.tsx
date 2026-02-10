import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Restaurant, Order, OrderStatus, MenuItem, MenuItemVariant } from '../types';
import { ShoppingBag, BookOpen, BarChart3, Edit3, CheckCircle, Clock, X, Plus, Trash2, Image as ImageIcon, Thermometer, LayoutGrid, List, Filter, Archive, RotateCcw, XCircle, Power, Eye, Upload, Hash, MessageSquare, Download, Calendar, Ban, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  restaurant: Restaurant;
  orders: Order[];
  onUpdateOrder: (orderId: string, status: OrderStatus, rejectionReason?: string, rejectionNote?: string) => void;
  onUpdateMenu: (restaurantId: string, updatedItem: MenuItem) => void;
  onAddMenuItem: (restaurantId: string, newItem: MenuItem) => void;
  onPermanentDeleteMenuItem: (restaurantId: string, itemId: string) => void;
}

const REJECTION_REASONS = [
  'Item out of stock',
  'Kitchen too busy',
  'Restaurant closed early',
  'Other'
];

const VendorView: React.FC<Props> = ({ restaurant, orders, onUpdateOrder, onUpdateMenu, onAddMenuItem, onPermanentDeleteMenuItem }) => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'MENU' | 'REPORTS'>('ORDERS');
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'ONGOING_ALL'>( 'ONGOING_ALL');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  
  // Rejection State
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>(REJECTION_REASONS[0]);
  const [rejectionNote, setRejectionNote] = useState<string>('');

  // Menu View Options
  const [menuViewMode, setMenuViewMode] = useState<'grid' | 'list'>('grid');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<string>('All');
  const [menuStatusFilter, setMenuStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  // Report Filters & Pagination
  const [reportStatus, setReportStatus] = useState<'ALL' | OrderStatus>('ALL');
  const [reportStart, setReportStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First of current month
    return d.toISOString().split('T')[0];
  });
  const [reportEnd, setReportEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(30);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Unified Form State
  const [formItem, setFormItem] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    image: '',
    category: 'Main',
    sizes: [],
    tempOptions: { enabled: false, hot: 0, cold: 0 }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['All', ...new Set(restaurant.menu.map(item => item.category))];

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'ONGOING_ALL') return o.status === OrderStatus.PENDING || o.status === OrderStatus.ONGOING;
    return o.status === orderFilter;
  });

  const currentMenu = restaurant.menu.filter(item => {
    const statusMatch = menuStatusFilter === 'ACTIVE' ? !item.isArchived : !!item.isArchived;
    const categoryMatch = menuCategoryFilter === 'All' || item.category === menuCategoryFilter;
    return statusMatch && categoryMatch;
  });

  // Report logic
  const filteredReports = useMemo(() => {
    return orders.filter(o => {
      const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
      const matchesDate = orderDate >= reportStart && orderDate <= reportEnd;
      const matchesStatus = reportStatus === 'ALL' || o.status === reportStatus;
      return matchesDate && matchesStatus;
    });
  }, [orders, reportStart, reportEnd, reportStatus]);

  // Reset page when data or entry limit changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredReports.length, entriesPerPage, reportStatus, reportStart, reportEnd]);

  const totalPages = Math.ceil(filteredReports.length / entriesPerPage);
  const paginatedReports = useMemo(() => {
    const startIdx = (currentPage - 1) * entriesPerPage;
    return filteredReports.slice(startIdx, startIdx + entriesPerPage);
  }, [filteredReports, currentPage, entriesPerPage]);

  const handleDownloadReport = () => {
    if (filteredReports.length === 0) return;
    
    const headers = ['Order ID', 'Time', 'Status', 'Items', 'Total'];
    const rows = filteredReports.map(o => [
      o.id,
      new Date(o.timestamp).toLocaleString(),
      o.status,
      o.items.map(i => `${i.name} (x${i.quantity})`).join('; '),
      o.total.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_report_${reportStart}_to_${reportEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmRejection = () => {
    if (rejectingOrderId) {
      onUpdateOrder(rejectingOrderId, OrderStatus.CANCELLED, rejectionReason, rejectionNote);
      setRejectingOrderId(null);
      setRejectionReason(REJECTION_REASONS[0]);
      setRejectionNote('');
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormItem({
      name: '',
      description: '',
      price: 0,
      image: '',
      category: 'Main',
      sizes: [],
      tempOptions: { enabled: false, hot: 0, cold: 0 }
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormItem({
      ...item,
      sizes: item.sizes ? [...item.sizes] : [],
      tempOptions: item.tempOptions ? { ...item.tempOptions } : { enabled: false, hot: 0, cold: 0 }
    });
    setIsFormModalOpen(true);
  };

  const handleAddSize = () => {
    setFormItem({
      ...formItem,
      sizes: [...(formItem.sizes || []), { name: '', price: 0 }]
    });
  };

  const handleRemoveSize = (index: number) => {
    setFormItem({
      ...formItem,
      sizes: formItem.sizes?.filter((_, i) => i !== index)
    });
  };

  const handleSizeChange = (index: number, field: 'name' | 'price', value: string | number) => {
    const updatedSizes = [...(formItem.sizes || [])];
    updatedSizes[index] = { ...updatedSizes[index], [field]: value };
    setFormItem({ ...formItem, sizes: updatedSizes });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormItem({ ...formItem, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItem.name || !formItem.price) return;

    const itemToSave: MenuItem = {
      id: editingItem ? editingItem.id : `m_${Date.now()}`,
      name: formItem.name || '',
      description: formItem.description || '',
      price: Number(formItem.price),
      image: formItem.image || `https://picsum.photos/seed/${formItem.name}/400/300`,
      category: formItem.category || 'Main',
      isArchived: editingItem ? editingItem.isArchived : false,
      sizes: formItem.sizes,
      tempOptions: formItem.tempOptions?.enabled ? formItem.tempOptions : undefined
    };

    if (editingItem) {
      onUpdateMenu(restaurant.id, itemToSave);
    } else {
      onAddMenuItem(restaurant.id, itemToSave);
    }
    
    setIsFormModalOpen(false);
  };

  const handleArchiveItem = (item: MenuItem) => {
    onUpdateMenu(restaurant.id, { ...item, isArchived: true });
  };

  const handleRestoreItem = (item: MenuItem) => {
    onUpdateMenu(restaurant.id, { ...item, isArchived: false });
  };

  const handlePermanentDelete = (itemId: string) => {
    if (confirm('Are you sure you want to permanently delete this item?')) {
      onPermanentDeleteMenuItem(restaurant.id, itemId);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden dark:bg-gray-900 transition-colors">
      <aside className="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col transition-colors">
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <img src={restaurant.logo} className="w-10 h-10 rounded-lg shadow-sm" />
            <h2 className="font-bold text-gray-900 dark:text-white truncate">{restaurant.name}</h2>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('ORDERS')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'ORDERS' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
          >
            <ShoppingBag size={20} />
            Incoming Orders
          </button>
          <button 
            onClick={() => setActiveTab('MENU')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'MENU' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
          >
            <BookOpen size={20} />
            Menu Editor
          </button>
          <button 
            onClick={() => setActiveTab('REPORTS')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'REPORTS' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
          >
            <BarChart3 size={20} />
            Sales Reports
          </button>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-8">
        {activeTab === 'ORDERS' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-black dark:text-white">Order Management</h1>
              <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 border dark:border-gray-700 shadow-sm overflow-x-auto hide-scrollbar">
                <button 
                  onClick={() => setOrderFilter('ONGOING_ALL')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${orderFilter === 'ONGOING_ALL' ? 'bg-orange-500 text-white shadow-md shadow-orange-100 dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Ongoing
                </button>
                <button 
                  onClick={() => setOrderFilter(OrderStatus.COMPLETED)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${orderFilter === OrderStatus.COMPLETED ? 'bg-orange-500 text-white shadow-md shadow-orange-100 dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Completed
                </button>
                <button 
                  onClick={() => setOrderFilter(OrderStatus.CANCELLED)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${orderFilter === OrderStatus.CANCELLED ? 'bg-orange-500 text-white shadow-md shadow-orange-100 dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Cancelled
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-20 text-center border border-dashed border-gray-300 dark:border-gray-700">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <ShoppingBag size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">No orders here</h3>
                  <p className="text-gray-500 dark:text-gray-400">Orders in this category will appear here.</p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-start gap-6 transition-all hover:border-orange-200">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID: {order.id}</span>
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg">
                            <Hash size={12} className="text-orange-500" />
                            <span className="text-xs font-black">Table {order.tableNumber}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-gray-400" />
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{new Date(order.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start text-sm border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">x{item.quantity} {item.name}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {item.selectedSize && <span className="text-[9px] font-black px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded uppercase tracking-tighter">Size: {item.selectedSize}</span>}
                                    {item.selectedTemp && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${item.selectedTemp === 'Hot' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>Temp: {item.selectedTemp}</span>}
                                </div>
                            </div>
                            <span className="text-gray-500 dark:text-gray-400 font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {order.remark && (
                        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-xl">
                           <div className="flex items-center gap-2 mb-1">
                              <MessageSquare size={12} className="text-orange-500" />
                              <span className="text-[9px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest">Special Remark</span>
                           </div>
                           <p className="text-xs text-gray-700 dark:text-gray-300 italic">{order.remark}</p>
                        </div>
                      )}

                      {order.status === OrderStatus.CANCELLED && order.rejectionReason && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl">
                           <div className="flex items-center gap-2 mb-1">
                              <Ban size={12} className="text-red-500" />
                              <span className="text-[9px] font-black text-red-700 dark:text-red-400 uppercase tracking-widest">Rejection Reason</span>
                           </div>
                           <p className="text-xs text-red-700 dark:text-red-300 font-bold">{order.rejectionReason}</p>
                           {order.rejectionNote && <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 italic">"{order.rejectionNote}"</p>}
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t dark:border-gray-700 flex justify-between items-center">
                        <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Grand Total</span>
                        <span className="text-2xl font-black text-gray-900 dark:text-white">${order.total.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="flex md:flex-col gap-2 min-w-[140px] mt-2 md:mt-0">
                      {order.status === OrderStatus.PENDING && (
                        <>
                          <button 
                            onClick={() => onUpdateOrder(order.id, OrderStatus.ONGOING)}
                            className="flex-1 py-3 px-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 dark:shadow-none"
                          >
                            Accept Order
                          </button>
                          <button 
                            onClick={() => setRejectingOrderId(order.id)}
                            className="flex-1 py-3 px-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-100 dark:bg-red-900/10 dark:border-red-900/20"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {order.status === OrderStatus.ONGOING && (
                        <button 
                          onClick={() => onUpdateOrder(order.id, OrderStatus.COMPLETED)}
                          className="flex-1 py-4 px-4 bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 dark:shadow-none"
                        >
                          <CheckCircle size={18} />
                          Serve Order
                        </button>
                      )}
                      {order.status === OrderStatus.COMPLETED && (
                        <div className="flex-1 py-2 text-center text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20">
                          Served Successfully
                        </div>
                      )}
                      {order.status === OrderStatus.CANCELLED && (
                        <div className="flex-1 py-2 text-center text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                          Order Cancelled
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'MENU' && (
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-2xl font-black dark:text-white">Menu Editor</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Customize your offerings and layout.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 border dark:border-gray-700 shadow-sm">
                  <button 
                    onClick={() => setMenuStatusFilter('ACTIVE')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${menuStatusFilter === 'ACTIVE' ? 'bg-orange-500 text-white shadow-md shadow-orange-100 dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <Eye size={14} />
                    Active
                  </button>
                  <button 
                    onClick={() => setMenuStatusFilter('ARCHIVED')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${menuStatusFilter === 'ARCHIVED' ? 'bg-orange-500 text-white shadow-md shadow-orange-100 dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <Archive size={14} />
                    Archived
                  </button>
                </div>

                <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 border dark:border-gray-700 shadow-sm">
                  <button 
                    onClick={() => setMenuViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${menuViewMode === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                    title="Grid View"
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button 
                    onClick={() => setMenuViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${menuViewMode === 'list' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                    title="List View"
                  >
                    <List size={18} />
                  </button>
                </div>

                <button 
                  onClick={handleOpenAddModal}
                  className="px-6 py-3 bg-black dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-white transition-all shadow-lg ml-auto"
                >
                  + Add Item
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-8 bg-white dark:bg-gray-800 px-4 py-2 border dark:border-gray-700 rounded-2xl shadow-sm overflow-x-auto hide-scrollbar">
              <Filter size={16} className="text-gray-400 shrink-0" />
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setMenuCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${menuCategoryFilter === cat ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {currentMenu.length === 0 ? (
               <div className="bg-white dark:bg-gray-800 rounded-3xl p-20 text-center border border-dashed border-gray-300 dark:border-gray-700">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <BookOpen size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">No items found</h3>
                  <p className="text-gray-500 dark:text-gray-400">Try changing your filters or add a new item.</p>
               </div>
            ) : (
              menuViewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentMenu.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border dark:border-gray-700 hover:shadow-xl transition-all group flex flex-col">
                      <div className="relative h-48">
                        <img src={item.image} className="w-full h-full object-cover" />
                        <div className="absolute top-4 right-4 flex gap-2">
                          {menuStatusFilter === 'ACTIVE' ? (
                            <>
                              <button 
                                onClick={() => handleArchiveItem(item)}
                                className="p-2.5 bg-red-50/90 dark:bg-red-900/90 backdrop-blur rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                title="Deactivate"
                              >
                                <XCircle size={18} />
                              </button>
                              <button 
                                onClick={() => handleOpenEditModal(item)}
                                className="p-2.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-xl text-gray-700 dark:text-gray-200 hover:text-orange-500 transition-colors shadow-sm"
                                title="Edit"
                              >
                                <Edit3 size={18} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleRestoreItem(item)}
                                className="p-2.5 bg-green-50/90 dark:bg-green-900/90 backdrop-blur rounded-xl text-green-600 dark:text-green-400 hover:bg-green-500 hover:text-white transition-all shadow-sm"
                                title="Restore"
                              >
                                <RotateCcw size={18} />
                              </button>
                              <button 
                                onClick={() => handlePermanentDelete(item.id)}
                                className="p-2.5 bg-red-50/90 dark:bg-red-900/90 backdrop-blur rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                title="Delete Forever"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="absolute bottom-4 left-4">
                           <span className="px-3 py-1 bg-black/50 backdrop-blur text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">{item.category}</span>
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <h3 className="font-black text-lg text-gray-900 dark:text-white mb-1">{item.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">{item.description}</p>
                        <div className="flex justify-between items-center mt-auto">
                          <span className="text-xl font-black text-orange-500">${item.price.toFixed(2)}</span>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${item.isArchived ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                            {item.isArchived ? 'Archived' : 'Live'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-xs font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-6 md:px-8 py-4 text-left">Item</th>
                        <th className="px-4 py-4 text-left hidden sm:table-cell">Category</th>
                        <th className="px-4 py-4 text-left">Price</th>
                        <th className="px-6 md:px-8 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {currentMenu.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 md:px-8 py-4">
                            <div className="flex items-center gap-4">
                              <img src={item.image} className={`w-12 h-12 rounded-xl object-cover ${item.isArchived ? 'grayscale opacity-50' : ''}`} />
                              <div className="max-w-[120px] md:max-w-md">
                                <p className={`font-bold text-gray-900 dark:text-white ${item.isArchived ? 'opacity-50' : ''}`}>{item.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate hidden md:block">{item.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 hidden sm:table-cell">
                             <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">{item.category}</span>
                          </td>
                          <td className="px-4 py-4 font-black text-gray-900 dark:text-white">${item.price.toFixed(2)}</td>
                          <td className="px-6 md:px-8 py-4 text-right">
                             <div className="flex justify-end items-center gap-2 md:gap-4">
                               {menuStatusFilter === 'ACTIVE' ? (
                                 <>
                                   <button 
                                     onClick={() => handleArchiveItem(item)}
                                     className="p-2 md:p-3 text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                     title="Deactivate"
                                   >
                                     <Power size={18} />
                                   </button>
                                   <button 
                                     onClick={() => handleOpenEditModal(item)}
                                     className="p-2 md:p-3 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 hover:text-orange-500 dark:hover:text-orange-400 rounded-xl transition-all"
                                     title="Edit"
                                   >
                                     <Edit3 size={18} />
                                   </button>
                                 </>
                               ) : (
                                 <>
                                   <button 
                                     onClick={() => handleRestoreItem(item)}
                                     className="p-2 md:p-3 text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-500 hover:text-white rounded-xl transition-all"
                                     title="Restore"
                                   >
                                     <RotateCcw size={18} />
                                   </button>
                                   <button 
                                     onClick={() => handlePermanentDelete(item.id)}
                                     className="p-2 md:p-3 text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                     title="Delete"
                                   >
                                     <Trash2 size={18} />
                                   </button>
                                 </>
                               )}
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === 'REPORTS' && (
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-black mb-8 dark:text-white">Sales Performance</h1>
            
            {/* Report Control Panel - Sharper Radius */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-center gap-6 mb-8">
              <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date Range</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="date" 
                        value={reportStart}
                        onChange={(e) => setReportStart(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border-none rounded-lg text-xs font-bold dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" 
                      />
                    </div>
                    <span className="text-gray-300 dark:text-gray-600 font-bold">to</span>
                    <div className="relative flex-1">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="date" 
                        value={reportEnd}
                        onChange={(e) => setReportEnd(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border-none rounded-lg text-xs font-bold dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" 
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-48">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Status Filter</label>
                  <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select 
                      value={reportStatus}
                      onChange={(e) => setReportStatus(e.target.value as any)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border-none rounded-lg text-xs font-bold dark:text-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="ALL">All Orders</option>
                      <option value={OrderStatus.PENDING}>Pending</option>
                      <option value={OrderStatus.ONGOING}>Ongoing</option>
                      <option value={OrderStatus.COMPLETED}>Served</option>
                      <option value={OrderStatus.CANCELLED}>Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleDownloadReport}
                disabled={filteredReports.length === 0}
                className="w-full md:w-auto px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-500 dark:hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
              >
                <Download size={18} />
                Download Report
              </button>
            </div>

            {/* Sharper summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black mb-1 uppercase tracking-widest">Total Sales (Served)</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">
                  ${filteredReports.filter(o => o.status === OrderStatus.COMPLETED).reduce((acc, o) => acc + o.total, 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black mb-1 uppercase tracking-widest">Total Orders</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{filteredReports.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black mb-1 uppercase tracking-widest">Served Rate</p>
                <p className="text-3xl font-black text-green-500">
                  {filteredReports.length > 0 
                    ? Math.round((filteredReports.filter(r => r.status === OrderStatus.COMPLETED).length / filteredReports.length) * 100) 
                    : 0}%
                </p>
              </div>
            </div>

            {/* Pagination Entries Selection - Minimal Container */}
            <div className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-500 dark:text-gray-400">
              <span>Show</span>
              <select 
                className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                value={entriesPerPage}
                onChange={(e) => setEntriesPerPage(Number(e.target.value))}
              >
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>

            {/* Transaction Table - Sharper Radius */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4 text-left">Order ID</th>
                    <th className="px-8 py-4 text-left">Time</th>
                    <th className="px-8 py-4 text-left">Status</th>
                    <th className="px-8 py-4 text-left">Menu Order</th>
                    <th className="px-8 py-4 text-right">Total Bill</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {paginatedReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-gray-500 dark:text-gray-400 italic">
                        No transactions found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedReports.map(report => (
                      <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-8 py-5">
                          <span className="font-black text-xs text-gray-900 dark:text-white">{report.id}</span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{new Date(report.timestamp).toLocaleDateString()}</p>
                          <p className="text-[10px] text-gray-400">{new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-8 py-5">
                           <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                             report.status === OrderStatus.COMPLETED ? 'bg-green-100 text-green-600 dark:bg-green-900/20' : 
                             report.status === OrderStatus.CANCELLED ? 'bg-red-100 text-red-600 dark:bg-red-900/20' : 
                             'bg-orange-100 text-orange-600 dark:bg-orange-900/20'
                           }`}>
                             {report.status === OrderStatus.COMPLETED ? 'Served' : report.status === OrderStatus.CANCELLED ? 'Cancel' : report.status}
                           </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="max-w-xs">
                             {report.items.map((item, idx) => (
                               <p key={idx} className="text-[10px] text-gray-600 dark:text-gray-400 font-medium truncate">
                                 {item.name} <span className="text-orange-500 font-bold">x{item.quantity}</span>
                                 {item.selectedSize && <span className="ml-1 text-[8px] opacity-70">({item.selectedSize})</span>}
                               </p>
                             ))}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-gray-900 dark:text-white">
                          ${report.total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls - No heavy container */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-orange-500 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                        currentPage === i + 1 
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' 
                          : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border dark:border-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-orange-500 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reject Order Modal */}
      {rejectingOrderId && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setRejectingOrderId(null)} 
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center justify-center mb-4">
                <Ban size={28} />
              </div>
              <h2 className="text-2xl font-black dark:text-white">Reject Order</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Please specify why you are unable to fulfill this order.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Rejection Reason</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-red-500 dark:text-white font-medium outline-none text-sm cursor-pointer appearance-none"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                >
                  {REJECTION_REASONS.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              {rejectionReason === 'Other' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Additional Note</label>
                  <textarea 
                    className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
                    placeholder="Enter details for the customer..."
                    rows={3}
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                  />
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setRejectingOrderId(null)}
                  className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmRejection}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-200 dark:shadow-none hover:bg-red-600 transition-all"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Form Modal (Add/Edit) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-300 custom-scrollbar">
            <button 
              onClick={() => setIsFormModalOpen(false)} 
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-black mb-1 dark:text-white">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
              {editingItem ? `Currently editing "${editingItem.name}"` : 'Create a new dish or drink for your customers.'}
            </p>

            <form onSubmit={handleSaveItem} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-600 group">
                    {formItem.image ? (
                      <img src={formItem.image} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-6">
                        <ImageIcon size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-xs text-gray-400">Preview Image</p>
                      </div>
                    )}
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white"
                    >
                      <Upload size={24} className="mb-1" />
                      <span className="text-xs font-bold">Upload from Device</span>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Image Source</label>
                    <div className="flex gap-2">
                       <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-orange-500 hover:text-white transition-all shrink-0"
                      >
                        <Upload size={18} />
                      </button>
                      <input 
                        type="text" 
                        placeholder="Or paste an image URL..."
                        className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white text-sm outline-none"
                        value={formItem.image && !formItem.image.startsWith('data:') ? formItem.image : ''}
                        onChange={(e) => setFormItem({...formItem, image: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Item Title</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Classic Latte"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none"
                      value={formItem.name}
                      onChange={(e) => setFormItem({...formItem, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Classification</label>
                      <select 
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none text-sm cursor-pointer"
                        value={formItem.category}
                        onChange={(e) => setFormItem({...formItem, category: e.target.value})}
                      >
                        <option value="Main">Main Dish</option>
                        <option value="Sides">Sides</option>
                        <option value="Drinks">Drinks</option>
                        <option value="Desserts">Desserts</option>
                        <option value="Pizza">Pizza</option>
                        <option value="Sushi">Sushi</option>
                        <option value="Rolls">Rolls</option>
                        <option value="Appetizer">Appetizer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Base Price ($)</label>
                      <input 
                        required
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none"
                        value={formItem.price || ''}
                        onChange={(e) => setFormItem({...formItem, price: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Description</label>
                    <textarea 
                      rows={2}
                      placeholder="Brief description of the item..."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white text-sm outline-none resize-none"
                      value={formItem.description}
                      onChange={(e) => setFormItem({...formItem, description: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Available Sizes (+ Price)</h3>
                  <button 
                    type="button"
                    onClick={handleAddSize}
                    className="flex items-center gap-1.5 text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg hover:bg-orange-500 hover:text-white transition-all"
                  >
                    <Plus size={14} /> Add Size
                  </button>
                </div>
                <div className="space-y-3">
                  {formItem.sizes?.map((size, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl animate-in slide-in-from-left duration-200">
                      <input 
                        type="text" 
                        placeholder="e.g. Large"
                        className="flex-1 bg-white dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm outline-none dark:text-white"
                        value={size.name}
                        onChange={(e) => handleSizeChange(idx, 'name', e.target.value)}
                      />
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-3 py-2">
                        <span className="text-gray-400 text-xs">$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="Price"
                          className="w-20 bg-transparent border-none text-sm outline-none dark:text-white"
                          value={size.price || ''}
                          onChange={(e) => handleSizeChange(idx, 'price', Number(e.target.value))}
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleRemoveSize(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!formItem.sizes || formItem.sizes.length === 0) && (
                    <p className="text-xs text-gray-400 italic text-center py-2">No custom sizes added.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Thermometer size={18} className="text-blue-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Hot / Cold (+ Price)</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formItem.tempOptions?.enabled}
                      onChange={(e) => setFormItem({...formItem, tempOptions: {...formItem.tempOptions!, enabled: e.target.checked}})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                {formItem.tempOptions?.enabled && (
                  <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top duration-300">
                    <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                      <p className="text-xs font-black text-orange-600 dark:text-orange-400 mb-2 uppercase tracking-widest">Hot (+ $)</p>
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 border dark:border-gray-700">
                        <span className="text-gray-400 text-xs">+$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00"
                          className="w-full bg-transparent text-sm outline-none dark:text-white"
                          value={formItem.tempOptions?.hot || ''}
                          onChange={(e) => setFormItem({...formItem, tempOptions: {...formItem.tempOptions!, hot: Number(e.target.value)}})}
                        />
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                      <p className="text-xs font-black text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-widest">Cold (+ $)</p>
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 border dark:border-gray-700">
                        <span className="text-gray-400 text-xs">+$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00"
                          className="w-full bg-transparent text-sm outline-none dark:text-white"
                          value={formItem.tempOptions?.cold || ''}
                          onChange={(e) => setFormItem({...formItem, tempOptions: {...formItem.tempOptions!, cold: Number(e.target.value)}})}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsFormModalOpen(false)} 
                  className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-100 dark:shadow-none hover:bg-orange-600 transition-all"
                >
                  {editingItem ? 'Save All Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorView;