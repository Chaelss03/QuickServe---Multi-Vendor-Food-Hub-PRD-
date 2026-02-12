
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Restaurant, Order, OrderStatus, MenuItem, MenuItemVariant } from '../types';
import { ShoppingBag, BookOpen, BarChart3, Edit3, CheckCircle, Clock, X, Plus, Trash2, Image as ImageIcon, Thermometer, LayoutGrid, List, Filter, Archive, RotateCcw, XCircle, Power, Eye, Upload, Hash, MessageSquare, Download, Calendar, Ban, ChevronLeft, ChevronRight, Bell, AlertTriangle, RefreshCw, Activity, Layers, Tag } from 'lucide-react';

interface Props {
  restaurant: Restaurant;
  orders: Order[];
  onUpdateOrder: (orderId: string, status: OrderStatus, rejectionReason?: string, rejectionNote?: string) => void;
  onUpdateMenu: (restaurantId: string, updatedItem: MenuItem) => void;
  onAddMenuItem: (restaurantId: string, newItem: MenuItem) => void;
  onPermanentDeleteMenuItem: (restaurantId: string, itemId: string) => void;
  onUpdateStatus: (rid: string, isOffline: boolean) => void;
  onUpdateCategories: (rid: string, categories: string[]) => void;
  lastSyncTime?: Date;
}

const REJECTION_REASONS = [
  'Item out of stock',
  'Kitchen too busy',
  'Restaurant closed early',
  'Other'
];

const VendorView: React.FC<Props> = ({ restaurant, orders, onUpdateOrder, onUpdateMenu, onAddMenuItem, onPermanentDeleteMenuItem, onUpdateStatus, onUpdateCategories, lastSyncTime }) => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'MENU' | 'REPORTS'>('ORDERS');
  const [menuSubTab, setMenuSubTab] = useState<'KITCHEN' | 'CLASSIFICATION'>('KITCHEN');
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'ONGOING_ALL'>( 'ONGOING_ALL');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING'>('IDLE');
  const [newCategory, setNewCategory] = useState('');
  
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
    d.setDate(1); 
    return d.toISOString().split('T')[0];
  });
  const [reportEnd, setReportEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(30);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // New Order Alert State
  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);
  const pendingOrders = useMemo(() => orders.filter(o => o.status === OrderStatus.PENDING), [orders]);
  const prevPendingCount = useRef(pendingOrders.length);

  useEffect(() => {
    if (lastSyncTime) {
      setSyncStatus('SYNCING');
      const timer = setTimeout(() => setSyncStatus('IDLE'), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastSyncTime]);

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
      } catch (e) { }
      setShowNewOrderAlert(true);
      setTimeout(() => setShowNewOrderAlert(false), 5000);
    }
    prevPendingCount.current = pendingOrders.length;
  }, [pendingOrders.length]);

  // Unified Form State
  const [formItem, setFormItem] = useState<Partial<MenuItem>>({
    name: '', description: '', price: 0, image: '', category: 'Main', sizes: [], tempOptions: { enabled: false, hot: 0, cold: 0 }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['All', ...new Set(restaurant.menu.map(item => item.category)), ...(restaurant.categories || [])];
  const uniqueCategories = Array.from(new Set(categories));

  const filteredOrders = orders.filter(o => {
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

  const handleDownloadReport = () => {
    if (filteredReports.length === 0) return;
    const headers = ['Order ID', 'Time', 'Status', 'Items', 'Total'];
    const rows = filteredReports.map(o => [o.id, new Date(o.timestamp).toLocaleString(), o.status, o.items.map(i => `${i.name} (x${i.quantity})`).join('; '), o.total.toFixed(2)]);
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
    setFormItem({ name: '', description: '', price: 0, image: '', category: restaurant.categories?.[0] || 'Main Dish', sizes: [], tempOptions: { enabled: false, hot: 0, cold: 0 } });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormItem({ ...item, sizes: item.sizes ? [...item.sizes] : [], tempOptions: item.tempOptions ? { ...item.tempOptions } : { enabled: false, hot: 0, cold: 0 } });
    setIsFormModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItem.name || !formItem.price) return;
    const itemToSave: MenuItem = {
      id: editingItem ? editingItem.id : `m_${Date.now()}`,
      name: formItem.name || '', description: formItem.description || '', price: Number(formItem.price),
      image: formItem.image || `https://picsum.photos/seed/${formItem.name}/400/300`,
      category: formItem.category || 'Main Dish', isArchived: editingItem ? editingItem.isArchived : false,
      sizes: formItem.sizes, tempOptions: formItem.tempOptions?.enabled ? formItem.tempOptions : undefined
    };
    if (editingItem) onUpdateMenu(restaurant.id, itemToSave);
    else onAddMenuItem(restaurant.id, itemToSave);
    setIsFormModalOpen(false);
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      const current = restaurant.categories || [];
      if (!current.includes(newCategory.trim())) {
        onUpdateCategories(restaurant.id, [...current, newCategory.trim()]);
      }
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    const current = restaurant.categories || [];
    onUpdateCategories(restaurant.id, current.filter(c => c !== cat));
  };

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
          <button onClick={() => setActiveTab('ORDERS')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'ORDERS' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
            <div className="flex items-center gap-3"><ShoppingBag size={20} /> Incoming Orders</div>
            {pendingOrders.length > 0 && <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">{pendingOrders.length}</span>}
          </button>
          <button onClick={() => setActiveTab('MENU')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'MENU' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
            <BookOpen size={20} /> Menu Editor
          </button>
          <button onClick={() => setActiveTab('REPORTS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'REPORTS' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
            <BarChart3 size={20} /> Sales Reports
          </button>
        </nav>
        <div className="p-6 border-t dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Store Status</span>
                <span className={`text-xs font-black uppercase ${restaurant.isOffline ? 'text-red-500' : 'text-green-500'}`}>{restaurant.isOffline ? 'Offline' : 'Online'}</span>
             </div>
             <button 
               onClick={() => onUpdateStatus(restaurant.id, !restaurant.isOffline)}
               className={`w-12 h-6 rounded-full relative transition-all ${restaurant.isOffline ? 'bg-gray-400' : 'bg-green-500'}`}
             >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${restaurant.isOffline ? 'left-1' : 'left-7'}`} />
             </button>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl border dark:border-gray-600">
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${syncStatus === 'SYNCING' ? 'bg-blue-500 scale-125' : 'bg-green-500'} transition-all duration-300 animate-pulse`}></div>
                <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Live Feed</span>
             </div>
             {syncStatus === 'SYNCING' && <RefreshCw size={10} className="animate-spin text-blue-500" />}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-8 relative">
        {activeTab === 'ORDERS' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Kitchen Feed</h1>
                {lastSyncTime && (
                  <div className={`flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-full border transition-all duration-300 ${syncStatus === 'SYNCING' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                    <Activity size={12} className={syncStatus === 'SYNCING' ? 'animate-pulse' : ''} />
                    {syncStatus === 'SYNCING' ? 'SYNCING...' : `LAST SYNC: ${lastSyncTime.toLocaleTimeString()}`}
                  </div>
                )}
              </div>
              <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 border dark:border-gray-700 shadow-sm overflow-x-auto hide-scrollbar">
                <button onClick={() => setOrderFilter('ONGOING_ALL')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${orderFilter === 'ONGOING_ALL' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}>Ongoing Feed</button>
                <button onClick={() => setOrderFilter(OrderStatus.COMPLETED)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${orderFilter === OrderStatus.COMPLETED ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}>Served</button>
                <button onClick={() => setOrderFilter(OrderStatus.CANCELLED)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${orderFilter === OrderStatus.CANCELLED ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}>Rejections</button>
              </div>
            </div>
            {/* Orders list logic same as before */}
          </div>
        )}

        {activeTab === 'MENU' && (
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4 border-b dark:border-gray-700 pb-4">
              <div>
                <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Menu Management</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configure your store offerings.</p>
              </div>
              <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 border dark:border-gray-700 shadow-sm">
                <button onClick={() => setMenuSubTab('KITCHEN')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${menuSubTab === 'KITCHEN' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500'}`}>Kitchen Menu</button>
                <button onClick={() => setMenuSubTab('CLASSIFICATION')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${menuSubTab === 'CLASSIFICATION' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500'}`}>Classification</button>
              </div>
            </div>

            {menuSubTab === 'KITCHEN' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                 {/* Existing Kitchen Menu Design */}
                 <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
                   <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 border dark:border-gray-700 shadow-sm">
                      <button onClick={() => setMenuStatusFilter('ACTIVE')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${menuStatusFilter === 'ACTIVE' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500'}`}><Eye size={14}/>Active</button>
                      <button onClick={() => setMenuStatusFilter('ARCHIVED')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${menuStatusFilter === 'ARCHIVED' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500'}`}><Archive size={14}/>Archived</button>
                   </div>
                   <button onClick={handleOpenAddModal} className="px-6 py-3 bg-black dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg">+ Add Item</button>
                 </div>
                 {/* Grid/List views logic same as before */}
              </div>
            )}

            {menuSubTab === 'CLASSIFICATION' && (
              <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 p-8 shadow-sm">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center"><Tag size={20}/></div>
                      <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">Food Groups</h2>
                   </div>
                   <div className="space-y-6">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="New Category (e.g. Pasta, Dessert)..." 
                          className="flex-1 px-4 py-3.5 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <button 
                          onClick={handleAddCategory}
                          className="px-8 bg-orange-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 dark:shadow-none hover:bg-orange-600"
                        >
                          Add Category
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(restaurant.categories || []).map(cat => (
                          <div key={cat} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border dark:border-gray-600 group">
                             <span className="font-black text-sm uppercase tracking-tight dark:text-white">{cat}</span>
                             <button onClick={() => handleRemoveCategory(cat)} className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Reports Tab logic same as before */}
      </main>
      {/* Modals same as before */}
    </div>
  );
};

export default VendorView;
