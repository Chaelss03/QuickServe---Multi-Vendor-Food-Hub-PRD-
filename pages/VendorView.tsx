
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Restaurant, Order, OrderStatus, MenuItem, MenuItemVariant } from '../types';
import { ShoppingBag, BookOpen, BarChart3, Edit3, CheckCircle, Clock, X, Plus, Trash2, Image as ImageIcon, Thermometer, LayoutGrid, List, Filter, Archive, RotateCcw, XCircle, Power, Eye, Upload, Hash, MessageSquare, Download, Calendar, Ban, ChevronLeft, ChevronRight, Bell, AlertTriangle, RefreshCw, Activity, Layers, Tag, Wifi, WifiOff, Timer } from 'lucide-react';

interface Props {
  restaurant: Restaurant;
  orders: Order[];
  onUpdateOrder: (orderId: string, status: OrderStatus, rejectionReason?: string, rejectionNote?: string) => void;
  onUpdateMenu: (restaurantId: string, updatedItem: MenuItem) => void;
  onAddMenuItem: (restaurantId: string, newItem: MenuItem) => void;
  onPermanentDeleteMenuItem: (restaurantId: string, itemId: string) => void;
  onToggleOnline: () => void;
  lastSyncTime?: Date;
}

const REJECTION_REASONS = [
  'Item out of stock',
  'Kitchen too busy',
  'Restaurant closed early',
  'Other'
];

const OrderDeadlineTimer: React.FC<{ timestamp: number }> = ({ timestamp }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTime = () => {
      const FIFTEEN_MINUTES = 15 * 60 * 1000;
      const elapsed = Date.now() - timestamp;
      const remaining = Math.max(0, FIFTEEN_MINUTES - elapsed);
      setTimeLeft(remaining);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const isUrgent = minutes < 5;
  const isExpired = timeLeft === 0;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
      isExpired 
        ? 'bg-red-500 text-white border-red-600' 
        : isUrgent 
          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 animate-pulse' 
          : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200'
    }`}>
      <Timer size={12} className={isUrgent && !isExpired ? 'animate-spin' : ''} />
      <span className="text-[10px] font-black uppercase tracking-widest">
        {isExpired ? 'EXPIRED' : `${minutes}:${seconds.toString().padStart(2, '0')} Left`}
      </span>
    </div>
  );
};

const VendorView: React.FC<Props> = ({ restaurant, orders, onUpdateOrder, onUpdateMenu, onAddMenuItem, onPermanentDeleteMenuItem, onToggleOnline, lastSyncTime }) => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'MENU' | 'REPORTS'>('ORDERS');
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'ONGOING_ALL' | 'ALL'>('ONGOING_ALL');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING'>('IDLE');
  
  // Menu Sub-Tabs
  const [menuSubTab, setMenuSubTab] = useState<'KITCHEN' | 'CLASSIFICATION'>('KITCHEN');
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [extraCategories, setExtraCategories] = useState<string[]>([]);

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

  // New Order Alert State
  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);
  const pendingOrders = useMemo(() => orders.filter(o => o.status === OrderStatus.PENDING), [orders]);
  const prevPendingCount = useRef(pendingOrders.length);

  // Sync Timer Visual Feedback
  useEffect(() => {
    if (lastSyncTime) {
      setSyncStatus('SYNCING');
      const timer = setTimeout(() => setSyncStatus('IDLE'), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastSyncTime]);

  // Sound & Visual Alert for New Orders
  useEffect(() => {
    if (pendingOrders.length > prevPendingCount.current) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.8);
      } catch (e) {
        console.warn("Audio Context failed to start (interaction required).");
      }
      setShowNewOrderAlert(true);
      setTimeout(() => setShowNewOrderAlert(false), 5000);
    }
    prevPendingCount.current = pendingOrders.length;
  }, [pendingOrders.length]);

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

  const categories = useMemo(() => {
    const base = new Set(restaurant.menu.map(item => item.category));
    extraCategories.forEach(c => base.add(c));
    return ['All', ...Array.from(base)];
  }, [restaurant.menu, extraCategories]);

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'ALL') return true;
    if (orderFilter === 'ONGOING_ALL') return o.status === OrderStatus.PENDING || o.status === OrderStatus.ONGOING;
    return o.status === orderFilter;
  });

  const currentMenu = restaurant.menu.filter(item => {
    const statusMatch = menuStatusFilter === 'ACTIVE' ? !item.isArchived : !!item.isArchived;
    const categoryMatch = menuCategoryFilter === 'All' || item.category === menuCategoryFilter;
    return statusMatch && categoryMatch;
  });

  const filteredReports = useMemo(() => {
    return orders.filter(o => {
      const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
      const matchesDate = orderDate >= reportStart && orderDate <= reportEnd;
      const matchesStatus = reportStatus === 'ALL' || o.status === reportStatus;
      return matchesDate && matchesStatus;
    });
  }, [orders, reportStart, reportEnd, reportStatus]);

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

  const handleOpenAddModal = (initialCategory?: string) => {
    setEditingItem(null);
    setFormItem({
      name: '',
      description: '',
      price: 0,
      image: '',
      category: initialCategory || 'Main Dish',
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
      category: formItem.category || 'Main Dish',
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

  const handleAddClassification = () => {
    if (!newClassName.trim()) return;
    if (categories.includes(newClassName.trim())) {
      alert("Classification already exists.");
      return;
    }
    setExtraCategories(prev => [...prev, newClassName.trim()]);
    setNewClassName('');
    setShowAddClassModal(false);
  };

  const isOnline = restaurant.isOnline !== false;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden dark:bg-gray-900 transition-colors">
      <aside className="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col transition-colors relative z-10">
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <img src={restaurant.logo} className="w-10 h-10 rounded-lg shadow-sm" />
            <h2 className="font-bold text-gray-900 dark:text-white truncate">{restaurant.name}</h2>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('ORDERS')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'ORDERS' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
          >
            <div className="flex items-center gap-3"><ShoppingBag size={20} /> Incoming Orders</div>
            {pendingOrders.length > 0 && <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">{pendingOrders.length}</span>}
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
        <div className="p-4 mt-auto border-t dark:border-gray-700 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Store Presence</label>
            <button 
              onClick={onToggleOnline}
              className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg ${
                isOnline 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
              {isOnline ? 'Online' : 'Offline'}
            </button>
            <p className="text-[8px] text-center text-gray-400 uppercase font-bold px-2">
              {isOnline ? 'Customers can view your menu and order.' : 'Your store is hidden from customers.'}
            </p>
          </div>

          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl border dark:border-gray-600">
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${syncStatus === 'SYNCING' ? 'bg-blue-500 scale-125' : (isOnline ? 'bg-green-500' : 'bg-red-500')} transition-all duration-300 animate-pulse`}></div>
                <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Live Feed</span>
             </div>
             {syncStatus === 'SYNCING' && <RefreshCw size={10} className="animate-spin text-blue-500" />}
          </div>
          <div className="px-3">
             <p className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">Automatic Update: 5s</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-8 relative">
        {showNewOrderAlert && (
          <div className="fixed top-20 right-8 z-[100] animate-in slide-in-from-right duration-500">
            <div className="bg-orange-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-white/20 backdrop-blur-md">
              <Bell className="animate-ring" />
              <div>
                <p className="font-black uppercase tracking-widest text-[10px]">Transmission Detected</p>
                <p className="text-sm font-bold">New Order Incoming!</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ORDERS' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">kitchen order</h1>
                {lastSyncTime && (
                  <div className={`flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-full border transition-all duration-300 ${syncStatus === 'SYNCING' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                    <Activity size={12} className={syncStatus === 'SYNCING' ? 'animate-pulse' : ''} />
                    {syncStatus === 'SYNCING' ? 'SYNCING...' : `LAST SYNC: ${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                  </div>
                )}
              </div>
              <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 border dark:border-gray-700 shadow-sm overflow-x-auto hide-scrollbar">
                <button 
                  onClick={() => setOrderFilter('ONGOING_ALL')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${orderFilter === 'ONGOING_ALL' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}
                >
                  ONGOING
                </button>
                <button 
                  onClick={() => setOrderFilter(OrderStatus.COMPLETED)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${orderFilter === OrderStatus.COMPLETED ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}
                >
                  SERVED
                </button>
                <button 
                  onClick={() => setOrderFilter(OrderStatus.CANCELLED)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${orderFilter === OrderStatus.CANCELLED ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}
                >
                  CANCELLED
                </button>
                <button 
                  onClick={() => setOrderFilter('ALL')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${orderFilter === 'ALL' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}
                >
                  ALL ORDER
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-20 text-center border border-dashed border-gray-300 dark:border-gray-700">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <ShoppingBag size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tighter">Kitchen Quiet</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Waiting for incoming signals... (Autocheck every 5s)</p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-start gap-6 transition-all hover:border-orange-200">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ORDER #{order.id}</span>
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg">
                            <Hash size={12} className="text-orange-500" />
                            <span className="text-xs font-black">Table {order.tableNumber}</span>
                          </div>
                          {order.status === OrderStatus.PENDING && (
                            <OrderDeadlineTimer timestamp={order.timestamp} />
                          )}
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
                            <span className="text-gray-500 dark:text-gray-400 font-bold">RM{(item.price * item.quantity).toFixed(2)}</span>
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
                        <span className="text-2xl font-black text-gray-900 dark:text-white">RM{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex md:flex-col gap-2 min-w-[140px] mt-2 md:mt-0">
                      {order.status === OrderStatus.PENDING && (
                        <>
                          <button 
                            onClick={() => onUpdateOrder(order.id, OrderStatus.ONGOING)}
                            className="flex-1 py-3 px-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg"
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
                          className="flex-1 py-4 px-4 bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                          <CheckCircle size={18} />
                          Serve Order
                        </button>
                      )}
                      {order.status === OrderStatus.COMPLETED && (
                        <div className="flex-1 py-2 text-center text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/20">
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
                <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Kitchen Menu Editor</h1>
                <div className="flex mt-2 bg-white dark:bg-gray-800 rounded-xl p-1 border dark:border-gray-700 shadow-sm w-fit">
                  <button 
                    onClick={() => setMenuSubTab('KITCHEN')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${menuSubTab === 'KITCHEN' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}
                  >
                    Kitchen Menu
                  </button>
                  <button 
                    onClick={() => setMenuSubTab('CLASSIFICATION')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${menuSubTab === 'CLASSIFICATION' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}
                  >
                    Menu Classification
                  </button>
                </div>
              </div>

              {menuSubTab === 'KITCHEN' ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 border dark:border-gray-700 shadow-sm">
                    <button 
                      onClick={() => setMenuStatusFilter('ACTIVE')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${menuStatusFilter === 'ACTIVE' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}
                    >
                      <Eye size={14} />
                      Active
                    </button>
                    <button 
                      onClick={() => setMenuStatusFilter('ARCHIVED')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${menuStatusFilter === 'ARCHIVED' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}
                    >
                      <Archive size={14} />
                      Archived
                    </button>
                  </div>
                  <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 border dark:border-gray-700 shadow-sm">
                    <button onClick={() => setMenuViewMode('grid')} className={`p-2 rounded-lg transition-all ${menuViewMode === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}><LayoutGrid size={18} /></button>
                    <button onClick={() => setMenuViewMode('list')} className={`p-2 rounded-lg transition-all ${menuViewMode === 'list' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}><List size={18} /></button>
                  </div>
                  <button 
                    onClick={() => handleOpenAddModal()}
                    className="px-6 py-3 bg-black dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-all shadow-lg ml-auto"
                  >
                    + Add Item
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAddClassModal(true)}
                  className="px-6 py-3 bg-black dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-all shadow-lg ml-auto flex items-center gap-2"
                >
                  <Tag size={16} /> + New Classification
                </button>
              )}
            </div>

            {menuSubTab === 'KITCHEN' ? (
              <>
                <div className="flex items-center gap-2 mb-8 bg-white dark:bg-gray-800 px-4 py-2 border dark:border-gray-700 rounded-2xl shadow-sm overflow-x-auto hide-scrollbar">
                  <Filter size={16} className="text-gray-400 shrink-0" />
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setMenuCategoryFilter(cat)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${menuCategoryFilter === cat ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
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
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tighter">Inventory Empty</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Start adding your signature dishes.</p>
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
                                  <button onClick={() => handleArchiveItem(item)} className="p-2.5 bg-red-50/90 backdrop-blur rounded-xl text-red-600 shadow-sm"><Archive size={18} /></button>
                                  <button onClick={() => handleOpenEditModal(item)} className="p-2.5 bg-white/90 backdrop-blur rounded-xl text-gray-700 shadow-sm"><Edit3 size={18} /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleRestoreItem(item)} className="p-2.5 bg-green-50/90 backdrop-blur rounded-xl text-green-600 shadow-sm"><RotateCcw size={18} /></button>
                                  <button onClick={() => handlePermanentDelete(item.id)} className="p-2.5 bg-red-50/90 backdrop-blur rounded-xl text-red-600 shadow-sm"><Trash2 size={18} /></button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="p-6 flex-1 flex flex-col">
                            <h3 className="font-black text-lg text-gray-900 dark:text-white mb-1 uppercase tracking-tight">{item.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">{item.description}</p>
                            <div className="flex justify-between items-center mt-auto pt-4 border-t dark:border-gray-700">
                              <span className="text-xl font-black text-orange-500">RM{item.price.toFixed(2)}</span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.category}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 overflow-hidden shadow-sm">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                          <tr>
                            <th className="px-8 py-4 text-left">Dish Profile</th>
                            <th className="px-4 py-4 text-left">Category</th>
                            <th className="px-4 py-4 text-left">Base Cost</th>
                            <th className="px-8 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                          {currentMenu.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="px-8 py-4">
                                <div className="flex items-center gap-4">
                                  <img src={item.image} className="w-12 h-12 rounded-xl object-cover" />
                                  <div>
                                    <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{item.name}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-xs">{item.description}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-[10px] font-black uppercase text-gray-400">{item.category}</td>
                              <td className="px-4 py-4 font-black text-gray-900 dark:text-white text-sm">RM{item.price.toFixed(2)}</td>
                              <td className="px-8 py-4 text-right">
                                <div className="flex justify-end items-center gap-2">
                                  {menuStatusFilter === 'ACTIVE' ? (
                                    <button onClick={() => handleArchiveItem(item)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Archive size={18} /></button>
                                  ) : (
                                    <button onClick={() => handleRestoreItem(item)} className="p-3 text-green-600 hover:bg-green-50 rounded-xl transition-all"><RotateCcw size={18} /></button>
                                  )}
                                  <button onClick={() => handleOpenEditModal(item)} className="p-3 text-gray-400 hover:text-orange-500 rounded-xl transition-all"><Edit3 size={18} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 {categories.filter(c => c !== 'All').map(cat => {
                   const itemsInCat = restaurant.menu.filter(i => i.category === cat && !i.isArchived);
                   return (
                     <div key={cat} className="bg-white dark:bg-gray-800 rounded-[2.5rem] border dark:border-gray-700 shadow-sm overflow-hidden">
                       <div className="px-8 py-6 bg-gray-50 dark:bg-gray-700/30 border-b dark:border-gray-700 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl">
                             <Layers size={18} />
                           </div>
                           <div>
                              <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter leading-none">{cat}</h3>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{itemsInCat.length} Active Dishes</p>
                           </div>
                         </div>
                         <button 
                           onClick={() => handleOpenAddModal(cat)}
                           className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-500 hover:text-white transition-all shadow-sm flex items-center gap-2"
                         >
                           <Plus size={14} /> Add to {cat}
                         </button>
                       </div>
                       <div className="p-4 overflow-x-auto hide-scrollbar flex gap-4">
                          {itemsInCat.length === 0 ? (
                            <div className="w-full py-12 flex flex-col items-center justify-center text-gray-400">
                               <ImageIcon size={24} className="opacity-20 mb-2" />
                               <p className="text-[10px] font-black uppercase tracking-widest italic">No items in this classification</p>
                            </div>
                          ) : (
                            itemsInCat.map(item => (
                              <div key={item.id} className="min-w-[180px] max-w-[180px] bg-white dark:bg-gray-900/50 rounded-2xl border dark:border-gray-700 overflow-hidden group">
                                <div className="h-28 relative">
                                   <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                   <button 
                                      onClick={() => handleOpenEditModal(item)}
                                      className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-md text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                   >
                                      <Edit3 size={12} />
                                   </button>
                                </div>
                                <div className="p-3">
                                   <p className="text-[11px] font-black dark:text-white uppercase tracking-tight truncate">{item.name}</p>
                                   <p className="text-xs font-black text-orange-500 mt-1">RM{item.price.toFixed(2)}</p>
                                </div>
                              </div>
                            ))
                          )}
                       </div>
                     </div>
                   );
                 })}
                 
                 {categories.filter(c => c !== 'All').length === 0 && (
                   <div className="bg-white dark:bg-gray-800 rounded-3xl p-20 text-center border border-dashed border-gray-300 dark:border-gray-700">
                      <Layers size={48} className="mx-auto text-gray-200 mb-4" />
                      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase">No Classifications</h3>
                      <p className="text-gray-400 text-xs mt-1">Start by adding a classification to group your menu.</p>
                      <button onClick={() => setShowAddClassModal(true)} className="mt-6 px-8 py-3 bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl">Create Classification</button>
                   </div>
                 )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'REPORTS' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <h1 className="text-2xl font-black mb-1 dark:text-white uppercase tracking-tighter">Sales Report</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-8 uppercase tracking-widest">A comprehensive overview of your store's financial performance and order history.</p>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-center gap-6 mb-8">
              <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Period Selection</label>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-orange-500" />
                    <input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} className="flex-1 bg-gray-50 dark:bg-gray-700 border-none rounded-lg text-xs font-bold dark:text-white p-2" />
                    <span className="text-gray-400 font-bold">to</span>
                    <input type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} className="flex-1 bg-gray-50 dark:bg-gray-700 border-none rounded-lg text-xs font-bold dark:text-white p-2" />
                  </div>
                </div>
                <div className="w-48">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Order Status</label>
                  <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value as any)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border-none rounded-lg text-xs font-bold dark:text-white appearance-none cursor-pointer">
                    <option value="ALL">All Outcomes</option>
                    <option value={OrderStatus.COMPLETED}>Served</option>
                    <option value={OrderStatus.CANCELLED}>Rejected</option>
                  </select>
                </div>
              </div>
              <button onClick={handleDownloadReport} className="w-full md:w-auto px-6 py-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-orange-500 transition-all"><Download size={18} /> Export CSV</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
                <p className="text-3xl font-black dark:text-white">RM{filteredReports.filter(o => o.status === OrderStatus.COMPLETED).reduce((acc, o) => acc + o.total, 0).toFixed(2)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order Volume</p>
                <p className="text-3xl font-black dark:text-white">{filteredReports.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Serving Efficiency</p>
                <p className="text-3xl font-black text-green-500">
                  {filteredReports.length > 0 ? Math.round((filteredReports.filter(r => r.status === OrderStatus.COMPLETED).length / filteredReports.length) * 100) : 0}%
                </p>
              </div>
            </div>
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
                  {paginatedReports.map(report => (
                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-8 py-5 text-xs font-black dark:text-white uppercase tracking-widest">{report.id}</td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{new Date(report.timestamp).toLocaleDateString()}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-8 py-5">
                         <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${report.status === OrderStatus.COMPLETED ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{report.status === OrderStatus.COMPLETED ? 'Served' : report.status}</span>
                      </td>
                      <td className="px-8 py-5 text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase truncate max-w-xs">{report.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</td>
                      <td className="px-8 py-5 text-right font-black dark:text-white">RM{report.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add Classification Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl relative animate-in zoom-in fade-in duration-300">
            <button onClick={() => setShowAddClassModal(false)} className="absolute top-6 right-6 p-2 text-gray-400"><X size={20} /></button>
            <div className="mb-6">
               <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-xl flex items-center justify-center mb-4"><Tag size={24}/></div>
               <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">New Classification</h2>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Add a new category label to your menu.</p>
            </div>
            <div className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Classification Name</label>
                 <input 
                   autoFocus
                   placeholder="e.g. Beverages, Hot Snacks..."
                   className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none text-sm font-bold dark:text-white"
                   value={newClassName}
                   onChange={e => setNewClassName(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleAddClassification()}
                 />
               </div>
               <div className="flex gap-3 pt-2">
                 <button onClick={() => setShowAddClassModal(false)} className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                 <button onClick={handleAddClassification} className="flex-1 py-3.5 bg-orange-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Create</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {rejectingOrderId && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button onClick={() => setRejectingOrderId(null)} className="absolute top-6 right-6 p-2 text-gray-400"><X size={20} /></button>
            <div className="mb-6 text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><Ban size={28} /></div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Abort Fulfillment</h2>
              <p className="text-gray-500 text-xs font-medium mt-1 uppercase tracking-widest">Select rejection code for Order #{rejectingOrderId}</p>
            </div>
            <div className="space-y-4">
              <select className="w-full p-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl text-xs font-black uppercase tracking-widest outline-none" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}>
                {REJECTION_REASONS.map(reason => <option key={reason} value={reason}>{reason}</option>)}
              </select>
              <textarea className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl text-xs font-medium outline-none resize-none" placeholder="Internal memo / note..." rows={3} value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={() => setRejectingOrderId(null)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                <button onClick={handleConfirmRejection} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Confirm Rejection</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFormModalOpen && (
        <div className="fixed inset-0 z-[100] bg-[#1a1c23]/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#242731] text-gray-100 rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative overflow-y-auto max-h-[95vh] animate-in fade-in zoom-in duration-300">
            <button onClick={() => setIsFormModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors">
              <X size={22} />
            </button>
            
            <div className="mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">
                {editingItem ? 'Modify Menu' : 'Add New Item'}
              </h2>
              {editingItem ? (
                <p className="text-gray-400 text-sm">Currently editing "{editingItem.name}"</p>
              ) : (
                <p className="text-gray-400 text-sm">Create a new dish or drink for your customers.</p>
              )}
            </div>

            <form onSubmit={handleSaveItem} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left Side: Image */}
                <div className="md:col-span-5 space-y-3">
                  <div className="relative aspect-[4/3] bg-gray-800 rounded-2xl overflow-hidden border-2 border-dashed border-gray-700 group">
                    {formItem.image ? (
                      <img src={formItem.image} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <ImageIcon size={40} className="mb-2" />
                        <p className="text-[10px] font-black uppercase">No Image</p>
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()} 
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Upload size={28} className="text-white" />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Image Source</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-[#323644] p-2.5 rounded-xl hover:bg-[#3d4253] transition-colors"
                      >
                        <Upload size={16} />
                      </button>
                      <input 
                        placeholder="Or paste URL..." 
                        className="flex-1 bg-[#323644] border-none rounded-xl text-xs p-2.5 focus:ring-1 focus:ring-orange-500 outline-none"
                        value={formItem.image}
                        onChange={(e) => setFormItem({...formItem, image: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Side: Inputs */}
                <div className="md:col-span-7 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Item Title</label>
                    <input 
                      required 
                      className="w-full bg-[#323644] border-none rounded-xl text-base font-bold p-3.5 focus:ring-1 focus:ring-orange-500 outline-none"
                      value={formItem.name}
                      onChange={(e) => setFormItem({...formItem, name: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Classification</label>
                      <select 
                        className="w-full bg-[#323644] border-none rounded-xl text-xs font-bold p-3.5 focus:ring-1 focus:ring-orange-500 outline-none appearance-none"
                        value={formItem.category}
                        onChange={(e) => setFormItem({...formItem, category: e.target.value})}
                      >
                        {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Base Price (RM)</label>
                      <input 
                        required 
                        type="number" 
                        step="0.01" 
                        className="w-full bg-[#323644] border-none rounded-xl text-base font-bold p-3.5 focus:ring-1 focus:ring-orange-500 outline-none"
                        value={formItem.price || ''}
                        onChange={(e) => setFormItem({...formItem, price: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Description</label>
                    <textarea 
                      rows={2} 
                      className="w-full bg-[#323644] border-none rounded-xl text-xs p-3 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                      value={formItem.description}
                      onChange={(e) => setFormItem({...formItem, description: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Sizes Section */}
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest">Available Sizes (+ Price)</h3>
                  <button 
                    type="button" 
                    onClick={handleAddSize}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d303b] hover:bg-[#383c4a] text-orange-500 rounded-lg text-[10px] font-black uppercase transition-colors"
                  >
                    <Plus size={12} /> Add Size
                  </button>
                </div>
                
                {(!formItem.sizes || formItem.sizes.length === 0) ? (
                  <p className="text-center py-4 text-gray-500 text-[10px] italic">No custom sizes added.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formItem.sizes.map((size, idx) => (
                      <div key={idx} className="flex gap-2 bg-[#323644] p-2.5 rounded-xl border border-gray-700 shadow-inner">
                        <input 
                          placeholder="e.g. Large"
                          className="flex-1 bg-transparent border-none text-[10px] font-bold outline-none"
                          value={size.name}
                          onChange={(e) => handleSizeChange(idx, 'name', e.target.value)}
                        />
                        <div className="w-20 flex items-center gap-1 border-l border-gray-600 pl-2">
                           <span className="text-[9px] text-gray-500 font-bold">RM</span>
                           <input 
                             type="number"
                             step="0.01"
                             placeholder="0.00"
                             className="w-full bg-transparent border-none text-[10px] font-bold outline-none"
                             value={size.price || ''}
                             onChange={(e) => handleSizeChange(idx, 'price', Number(e.target.value))}
                           />
                        </div>
                        <button type="button" onClick={() => handleRemoveSize(idx)} className="text-red-400 hover:text-red-500 ml-1"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Temp Options */}
              <div className="border-t border-gray-700 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer size={16} className="text-blue-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest">Hot / Cold (+ Price)</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={formItem.tempOptions?.enabled}
                    onChange={(e) => setFormItem({
                      ...formItem, 
                      tempOptions: { ...formItem.tempOptions!, enabled: e.target.checked }
                    })}
                  />
                  <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              {formItem.tempOptions?.enabled && (
                <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-orange-400 uppercase tracking-widest ml-1">Hot Premium</label>
                      <input 
                        type="number" step="0.01"
                        className="w-full bg-[#323644] border-none rounded-xl text-[10px] font-bold p-2.5 outline-none"
                        value={formItem.tempOptions.hot || 0}
                        onChange={(e) => setFormItem({...formItem, tempOptions: {...formItem.tempOptions!, hot: Number(e.target.value)}})}
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Cold Premium</label>
                      <input 
                        type="number" step="0.01"
                        className="w-full bg-[#323644] border-none rounded-xl text-[10px] font-bold p-2.5 outline-none"
                        value={formItem.tempOptions.cold || 0}
                        onChange={(e) => setFormItem({...formItem, tempOptions: {...formItem.tempOptions!, cold: Number(e.target.value)}})}
                      />
                   </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setIsFormModalOpen(false)} 
                  className="flex-1 py-3.5 bg-[#323644] hover:bg-[#3d4253] text-gray-300 rounded-xl font-black text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs shadow-xl shadow-orange-900/20 transition-all active:scale-95"
                >
                  Save All Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        @keyframes ring {
          0% { transform: rotate(0); }
          10% { transform: rotate(15deg); }
          20% { transform: rotate(-15deg); }
          30% { transform: rotate(15deg); }
          40% { transform: rotate(-15deg); }
          50% { transform: rotate(0); }
          100% { transform: rotate(0); }
        }
        .animate-ring {
          animation: ring 1s infinite ease-in-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1c23;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #323644;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default VendorView;
