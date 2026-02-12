
import React, { useState, useMemo, useEffect } from 'react';
import { User, Restaurant, Order, Area, OrderStatus } from '../types';
import { Users, Store, TrendingUp, Settings, ShieldCheck, Mail, Search, Filter, X, Plus, MapPin, Power, CheckCircle2, AlertCircle, LogIn, Trash2, LayoutGrid, List, ChevronRight, Eye, EyeOff, Globe, Phone, ShoppingBag, Edit3, Hash, Download, Calendar, ChevronLeft, Database, Image as ImageIcon, Key, QrCode, Printer, Layers } from 'lucide-react';

interface Props {
  vendors: User[];
  restaurants: Restaurant[];
  orders: Order[];
  locations: Area[];
  onAddVendor: (user: User, restaurant: Restaurant) => void;
  onUpdateVendor: (user: User, restaurant: Restaurant) => void;
  onImpersonateVendor: (user: User) => void;
  onAddLocation: (area: Area) => void;
  onUpdateLocation: (area: Area) => void;
  onDeleteLocation: (areaId: string) => void;
  onRemoveVendorFromHub: (restaurantId: string) => void;
}

const AdminView: React.FC<Props> = ({ vendors, restaurants, orders, locations, onAddVendor, onUpdateVendor, onImpersonateVendor, onAddLocation, onUpdateLocation, onDeleteLocation, onRemoveVendorFromHub }) => {
  const [activeTab, setActiveTab] = useState<'VENDORS' | 'LOCATIONS' | 'REPORTS' | 'SYSTEM'>('VENDORS');
  const [searchQuery, setSearchQuery] = useState('');
  const [hubSearchQuery, setHubSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Registration / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingVendor, setEditingVendor] = useState<{user: User, res: Restaurant} | null>(null);
  const [formVendor, setFormVendor] = useState({
    username: '',
    password: '',
    restaurantName: '',
    location: '',
    email: '',
    phone: '',
    logo: ''
  });

  // Hub Modal State
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [formArea, setFormArea] = useState({ name: '', city: '', state: '', code: '' });
  
  // Reports State
  const [reportStatus, setReportStatus] = useState<'ALL' | OrderStatus>('ALL');
  const [reportStart, setReportStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); 
    return d.toISOString().split('T')[0];
  });
  const [reportEnd, setReportEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(30);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const res = restaurants.find(r => r.id === vendor.restaurantId);
      const matchesSearch = vendor.username.toLowerCase().includes(searchQuery.toLowerCase()) || res?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = vendorFilter === 'ALL' ? true : (vendorFilter === 'ACTIVE' ? vendor.isActive : !vendor.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [vendors, restaurants, searchQuery, vendorFilter]);

  const filteredHubs = useMemo(() => {
    return locations.filter(loc => 
      loc.name.toLowerCase().includes(hubSearchQuery.toLowerCase()) ||
      loc.city.toLowerCase().includes(hubSearchQuery.toLowerCase()) ||
      loc.code.toLowerCase().includes(hubSearchQuery.toLowerCase())
    );
  }, [locations, hubSearchQuery]);

  const filteredReports = useMemo(() => {
    return orders.filter(o => {
      let orderDate = '';
      try {
        const d = new Date(o.timestamp);
        if (isNaN(d.getTime())) return false; 
        orderDate = d.toISOString().split('T')[0];
      } catch { return false; }
      const matchesDate = orderDate >= reportStart && orderDate <= reportEnd;
      const matchesStatus = reportStatus === 'ALL' || o.status === reportStatus;
      return matchesDate && matchesStatus;
    });
  }, [orders, reportStart, reportEnd, reportStatus]);

  const paginatedReports = useMemo(() => {
    const startIdx = (currentPage - 1) * entriesPerPage;
    return filteredReports.slice(startIdx, startIdx + entriesPerPage);
  }, [filteredReports, currentPage, entriesPerPage]);

  const handleDownloadReport = () => {
    if (filteredReports.length === 0) return;
    const headers = ['Order ID', 'Kitchen', 'Time', 'Status', 'Menu Order', 'Total Bill'];
    const rows = filteredReports.map(o => {
      const res = restaurants.find(r => r.id === o.restaurantId);
      return [o.id, res?.name || 'Unknown', new Date(o.timestamp).toLocaleString(), o.status, o.items.map(i => `${i.name} (x${i.quantity})`).join('; '), o.total.toFixed(2)];
    });
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `platform_sales_report_${reportStart}_to_${reportEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenEdit = (user: User) => {
    const res = restaurants.find(r => r.id === user.restaurantId);
    if (res) {
      setEditingVendor({ user, res });
      setFormVendor({
        username: user.username, password: user.password || '',
        restaurantName: res.name, location: res.location,
        email: user.email || '', phone: user.phone || '', logo: res.logo
      });
      setShowPassword(false);
      setIsModalOpen(true);
    }
  };

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormVendor({ username: '', password: '', restaurantName: '', location: '', email: '', phone: '', logo: '' });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmitVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVendor.username || !formVendor.location) return;
    const userPayload: User = { 
      id: editingVendor?.user.id || '', username: formVendor.username, 
      password: formVendor.password, role: 'VENDOR', email: formVendor.email, 
      phone: formVendor.phone, isActive: editingVendor ? editingVendor.user.isActive : true 
    };
    const resPayload: Restaurant = { 
      id: editingVendor?.res.id || '', name: formVendor.restaurantName, 
      logo: formVendor.logo, vendorId: editingVendor?.user.id || '', 
      location: formVendor.location, menu: editingVendor?.res.menu || [] 
    };
    if (editingVendor) onUpdateVendor(userPayload, resPayload);
    else onAddVendor(userPayload, resPayload);
    setIsModalOpen(false);
  };

  const handleOpenHubEdit = (loc: Area) => {
    setEditingArea(loc);
    setFormArea({ name: loc.name, city: loc.city, state: loc.state, code: loc.code });
    setIsAreaModalOpen(true);
  };

  const handleOpenHubAdd = () => {
    setEditingArea(null);
    setFormArea({ name: '', city: '', state: '', code: '' });
    setIsAreaModalOpen(true);
  };

  const handleHubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingArea) onUpdateLocation({ ...editingArea, ...formArea });
    else onAddLocation({ ...formArea, id: '', isActive: true });
    setIsAreaModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black dark:text-white tracking-tighter uppercase leading-none mb-1">Platform Master</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] ml-1">Administrative Controls</p>
        </div>
        <div className="flex bg-white dark:bg-gray-800 rounded-2xl p-1.5 border dark:border-gray-700 shadow-sm transition-colors">
          {[
            { id: 'VENDORS', label: 'Vendors', icon: Store },
            { id: 'LOCATIONS', label: 'Hubs', icon: MapPin },
            { id: 'REPORTS', label: 'Report', icon: TrendingUp },
            { id: 'SYSTEM', label: 'System', icon: Database }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-widest ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-xl' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="no-print">
        {activeTab === 'VENDORS' && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-700/50">
              <h3 className="font-black dark:text-white uppercase tracking-tighter text-lg">Vendor Directory</h3>
              <div className="flex flex-wrap gap-4">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search..." className="pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <button onClick={handleOpenAdd} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">+ Register Vendor</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4 text-left">Kitchen Identity</th>
                    <th className="px-8 py-4 text-left">Hub</th>
                    <th className="px-8 py-4 text-left">Account</th>
                    <th className="px-8 py-4 text-center">Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredVendors.map(vendor => {
                    const res = restaurants.find(r => r.id === vendor.restaurantId);
                    return (
                      <tr key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <img src={res?.logo} className="w-10 h-10 rounded-xl shadow-sm object-cover border dark:border-gray-600" />
                            <span className="font-black dark:text-white text-sm block">{res?.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-gray-500 uppercase">{res?.location || 'Unassigned'}</td>
                        <td className="px-8 py-5 text-xs text-orange-500 font-black uppercase tracking-widest">@{vendor.username}</td>
                        <td className="px-8 py-5 text-center">
                          <button onClick={() => onUpdateVendor({ ...vendor, isActive: !vendor.isActive }, res!)} className={`p-2 rounded-xl transition-all ${vendor.isActive ? 'text-green-500 bg-green-50' : 'text-gray-400 bg-gray-50'}`}>
                             {vendor.isActive ? <CheckCircle2 size={20} /> : <Power size={20} />}
                          </button>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleOpenEdit(vendor)} className="p-2 text-gray-400 hover:text-blue-500"><Edit3 size={18} /></button>
                            <button onClick={() => onImpersonateVendor(vendor)} className="p-2 text-gray-400 hover:text-orange-500"><LogIn size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'LOCATIONS' && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-700/50">
              <h3 className="font-black dark:text-white uppercase tracking-tighter text-lg">Hub Registry</h3>
              <div className="flex flex-wrap gap-4">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search hubs..." className="pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm outline-none" value={hubSearchQuery} onChange={e => setHubSearchQuery(e.target.value)} />
                </div>
                <button onClick={handleOpenHubAdd} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">+ Add Hub</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4 text-left">Hub Identity</th>
                    <th className="px-8 py-4 text-left">City / State</th>
                    <th className="px-8 py-4 text-center">Partners</th>
                    <th className="px-8 py-4 text-center">Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredHubs.map(loc => (
                    <tr key={loc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center"><MapPin size={20} /></div>
                          <div>
                            <span className="font-black dark:text-white text-sm block">{loc.name}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{loc.code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-gray-500 uppercase">{loc.city}, {loc.state}</td>
                      <td className="px-8 py-5 text-center">
                         <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-black">{restaurants.filter(r => r.location === loc.name).length} Kitchens</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <button onClick={() => onUpdateLocation({ ...loc, isActive: !loc.isActive })} className={`p-2 rounded-xl transition-all ${loc.isActive !== false ? 'text-green-500 bg-green-50' : 'text-gray-400 bg-gray-50'}`}>
                           {loc.isActive !== false ? <CheckCircle2 size={20} /> : <Power size={20} />}
                        </button>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                           <button onClick={() => handleOpenHubEdit(loc)} className="p-2 text-gray-400 hover:text-blue-500"><Edit3 size={18} /></button>
                           <button onClick={() => onDeleteLocation(loc.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'REPORTS' && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in duration-500">
             <div className="px-8 py-6 border-b dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-700/50">
              <h3 className="font-black dark:text-white uppercase tracking-tighter text-lg">Sales Report</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <input type="date" value={reportStart} onChange={e => setReportStart(e.target.value)} className="px-3 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-xs font-bold" />
                <span className="text-gray-400">to</span>
                <input type="date" value={reportEnd} onChange={e => setReportEnd(e.target.value)} className="px-3 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-xs font-bold" />
                <button onClick={handleDownloadReport} className="px-6 py-2.5 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-xl font-black uppercase tracking-widest text-[10px]"><Download size={14} className="inline mr-2" /> Export</button>
              </div>
            </div>
            <div className="p-8">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
                    <p className="text-3xl font-black dark:text-white">RM{filteredReports.reduce((acc, o) => acc + (o.status === OrderStatus.COMPLETED ? o.total : 0), 0).toFixed(2)}</p>
                 </div>
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order Volume</p>
                    <p className="text-3xl font-black dark:text-white">{filteredReports.length}</p>
                 </div>
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fulfillment Rate</p>
                    <p className="text-3xl font-black text-green-500">{filteredReports.length > 0 ? Math.round((filteredReports.filter(o => o.status === OrderStatus.COMPLETED).length / filteredReports.length) * 100) : 0}%</p>
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Register/Edit Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] max-w-lg w-full p-8 shadow-2xl relative animate-in zoom-in duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-6 dark:text-white uppercase tracking-tighter">{editingVendor ? 'Modify Vendor' : 'New Vendor Registration'}</h2>
            <form onSubmit={handleSubmitVendor} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
                  <input required placeholder="Login ID" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm font-bold dark:text-white outline-none" value={formVendor.username} onChange={e => setFormVendor({...formVendor, username: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                  <div className="relative">
                    <input required type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm font-bold dark:text-white outline-none" value={formVendor.password} onChange={e => setFormVendor({...formVendor, password: e.target.value})} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                  <input type="email" placeholder="vendor@email.com" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm font-bold dark:text-white outline-none" value={formVendor.email} onChange={e => setFormVendor({...formVendor, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone</label>
                  <input type="tel" placeholder="+60..." className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm font-bold dark:text-white outline-none" value={formVendor.phone} onChange={e => setFormVendor({...formVendor, phone: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kitchen Name</label>
                <input required placeholder="e.g. Sushi Zen" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm font-bold dark:text-white outline-none" value={formVendor.restaurantName} onChange={e => setFormVendor({...formVendor, restaurantName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Physical Hub</label>
                  <select required className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm font-bold dark:text-white outline-none appearance-none cursor-pointer" value={formVendor.location} onChange={e => setFormVendor({...formVendor, location: e.target.value})}>
                    <option value="">Select Hub</option>
                    {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Logo URL</label>
                  <input placeholder="https://..." className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm font-bold dark:text-white outline-none" value={formVendor.logo} onChange={e => setFormVendor({...formVendor, logo: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-4">Confirm Settings</button>
            </form>
          </div>
        </div>
      )}

      {/* Hub Registration/Edit Modal */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl relative animate-in zoom-in duration-300">
            <button onClick={() => setIsAreaModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-6 dark:text-white uppercase tracking-tighter">{editingArea ? 'Modify Hub' : 'Register New Hub'}</h2>
            <form onSubmit={handleHubSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Hub Name</label>
                <input required placeholder="e.g. Level 1 Zone A" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm font-bold dark:text-white outline-none" value={formArea.name} onChange={e => setFormArea({...formArea, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
                  <input required placeholder="KL" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm font-bold dark:text-white outline-none" value={formArea.city} onChange={e => setFormArea({...formArea, city: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Code</label>
                  <input required placeholder="KLY" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm font-bold dark:text-white outline-none uppercase" value={formArea.code} onChange={e => setFormArea({...formArea, code: e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">State</label>
                <input required placeholder="Selangor" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm font-bold dark:text-white outline-none" value={formArea.state} onChange={e => setFormArea({...formArea, state: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-4">Save Hub Hub</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
