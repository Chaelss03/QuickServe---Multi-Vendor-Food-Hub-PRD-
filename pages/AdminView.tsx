
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Restaurant, Order, Area, OrderStatus } from '../types';
import { Users, Store, TrendingUp, Settings, ShieldCheck, Mail, Search, Filter, X, Plus, MapPin, Power, CheckCircle2, AlertCircle, LogIn, Trash2, LayoutGrid, List, ChevronRight, Eye, Globe, Phone, ShoppingBag, Edit3, Hash, Download, Calendar, ChevronLeft, Database, Key, Image as ImageIcon } from 'lucide-react';

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
}

const AdminView: React.FC<Props> = ({ vendors, restaurants, orders, locations, onAddVendor, onUpdateVendor, onImpersonateVendor, onAddLocation, onUpdateLocation, onDeleteLocation }) => {
  const [activeTab, setActiveTab] = useState<'VENDORS' | 'LOCATIONS' | 'REPORTS' | 'SYSTEM'>('VENDORS');
  const [searchQuery, setSearchQuery] = useState('');
  const [areaSearchQuery, setAreaSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
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

  // Location Registry Form State
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [isEditAreaModalOpen, setIsEditAreaModalOpen] = useState(false);
  const [newArea, setNewArea] = useState({ name: '', city: '', state: '', code: '' });
  const [editArea, setEditArea] = useState<Area | null>(null);
  const [locationViewMode, setLocationViewMode] = useState<'grid' | 'list'>('grid');
  const [viewingLocationVendors, setViewingLocationVendors] = useState<Area | null>(null);

  // Registration Form State
  const [newVendor, setNewVendor] = useState({
    username: '',
    password: '',
    restaurantName: '',
    location: '',
    email: '',
    phone: '',
    logo: ''
  });
  const [vendorLocationSearch, setVendorLocationSearch] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  
  // Edit Form State
  const [editVendor, setEditVendor] = useState<{user: User, restaurant: Restaurant} | null>(null);
  const [editLocationSearch, setEditLocationSearch] = useState('');
  const [showEditLocationDropdown, setShowEditLocationDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const editDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowLocationDropdown(false);
      if (editDropdownRef.current && !editDropdownRef.current.contains(event.target as Node)) setShowEditLocationDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const res = restaurants.find(r => r.id === vendor.restaurantId);
      const matchesSearch = vendor.username.toLowerCase().includes(searchQuery.toLowerCase()) || res?.name.toLowerCase().includes(searchQuery.toLowerCase()) || vendor.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = locationFilter === 'All Locations' || res?.location === locationFilter;
      const matchesStatus = statusFilter === 'All Status' || (statusFilter === 'Active' && vendor.isActive) || (statusFilter === 'Deactivated' && !vendor.isActive);
      return matchesSearch && matchesLocation && matchesStatus;
    });
  }, [vendors, restaurants, searchQuery, locationFilter, statusFilter]);

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => loc.name.toLowerCase().includes(areaSearchQuery.toLowerCase()) || loc.city.toLowerCase().includes(areaSearchQuery.toLowerCase()) || loc.code.toLowerCase().includes(areaSearchQuery.toLowerCase()));
  }, [locations, areaSearchQuery]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.location || !newVendor.username || !newVendor.password) {
      alert('Please fill in all required fields (Username, Password, Location)');
      return;
    }
    const vendorId = `vendor_${Date.now()}`;
    const restaurantId = `res_${Date.now()}`;
    
    const newUser: User = {
      id: vendorId,
      username: newVendor.username,
      password: newVendor.password,
      role: 'VENDOR',
      isActive: true,
      email: newVendor.email,
      phone: newVendor.phone,
    };

    const newRestaurant: Restaurant = {
      id: restaurantId,
      name: newVendor.restaurantName,
      vendorId: vendorId,
      location: newVendor.location,
      logo: newVendor.logo || `https://picsum.photos/seed/${newVendor.restaurantName}/200/200`,
      menu: []
    };

    onAddVendor(newUser, newRestaurant);
    setIsModalOpen(false);
    setNewVendor({ username: '', password: '', restaurantName: '', location: '', email: '', phone: '', logo: '' });
    setVendorLocationSearch('');
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editVendor) {
      onUpdateVendor(editVendor.user, editVendor.restaurant);
      setIsEditModalOpen(false);
      setEditVendor(null);
    }
  };

  const toggleVendorStatus = (vendor: User) => {
    const res = restaurants.find(r => r.id === vendor.restaurantId);
    if (res) onUpdateVendor({ ...vendor, isActive: !vendor.isActive }, res);
  };

  const openEditModal = (vendor: User) => {
    const res = restaurants.find(r => r.id === vendor.restaurantId);
    if (res) {
      setEditVendor({ user: { ...vendor }, restaurant: { ...res } });
      setEditLocationSearch(res.location);
      setIsEditModalOpen(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 dark:bg-gray-900 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">System Admin</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Platform Management Dashboard</p>
        </div>
        <div className="flex bg-white dark:bg-gray-800 rounded-2xl p-1 border dark:border-gray-700 shadow-sm overflow-x-auto hide-scrollbar">
          {[
            { id: 'VENDORS', label: 'Vendors', icon: Store },
            { id: 'LOCATIONS', label: 'Locations', icon: MapPin },
            { id: 'REPORTS', label: 'Reports', icon: TrendingUp },
            { id: 'SYSTEM', label: 'DB Manager', icon: Database }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-100 dark:shadow-none' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'VENDORS' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-700/50">
            <h3 className="font-black text-lg dark:text-white">Vendor Directory</h3>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1 max-w-5xl">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search vendors..." className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <button onClick={() => setIsModalOpen(true)} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-md">+ Register Vendor</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-xs font-black uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-4 text-left">Store</th>
                  <th className="px-8 py-4 text-left">Location</th>
                  <th className="px-8 py-4 text-left">Account</th>
                  <th className="px-8 py-4 text-left">Status</th>
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
                          <img src={res?.logo} className="w-10 h-10 rounded-lg shadow-sm object-cover" />
                          <span className="font-bold text-gray-800 dark:text-white">{res?.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm text-gray-500 dark:text-gray-400">{res?.location}</td>
                      <td className="px-8 py-5 text-sm text-gray-500 dark:text-gray-400 font-medium">@{vendor.username}</td>
                      <td className="px-8 py-5">
                        <button onClick={() => toggleVendorStatus(vendor)} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${vendor.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {vendor.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => onImpersonateVendor(vendor)} className="p-2 text-gray-400 hover:text-orange-500"><LogIn size={18} /></button>
                          <button onClick={() => openEditModal(vendor)} className="p-2 text-gray-400 hover:text-blue-500"><Settings size={18} /></button>
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
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-8 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-lg dark:text-white uppercase tracking-widest">Physical Hubs</h3>
              <button onClick={() => setIsAreaModalOpen(true)} className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl font-bold">+ New Area</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLocations.map(loc => (
                <div key={loc.id} className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border dark:border-gray-600 flex flex-col group">
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-white dark:bg-gray-800 text-orange-500 rounded-xl flex items-center justify-center shadow-sm"><MapPin size={24} /></div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => { setEditArea(loc); setIsEditAreaModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-500"><Edit3 size={18} /></button>
                         <button onClick={() => onDeleteLocation(loc.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                      </div>
                   </div>
                   <h4 className="font-black text-xl text-gray-900 dark:text-white">{loc.name}</h4>
                   <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{loc.code} • {loc.city}</p>
                   <div className="mt-4 pt-4 border-t dark:border-gray-600 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-400">{restaurants.filter(r => r.location === loc.name).length} Stores</span>
                      <button onClick={() => onUpdateLocation({...loc, isActive: !loc.isActive})} className={`text-[10px] font-black uppercase tracking-widest ${loc.isActive !== false ? 'text-green-500' : 'text-red-500'}`}>
                         {loc.isActive !== false ? 'Active' : 'Offline'}
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'SYSTEM' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 p-8 shadow-sm">
           <h3 className="font-black text-lg dark:text-white uppercase tracking-widest mb-8">System Health & Raw Data</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', count: vendors.length + 1, icon: Users, color: 'text-blue-500' },
                { label: 'Active Kitchens', count: restaurants.length, icon: Store, color: 'text-orange-500' },
                { label: 'Hub Locations', count: locations.length, icon: MapPin, color: 'text-purple-500' },
                { label: 'Global Orders', count: orders.length, icon: ShoppingBag, color: 'text-green-500' }
              ].map(stat => (
                <div key={stat.label} className="p-6 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border dark:border-gray-600">
                   <stat.icon size={24} className={`${stat.color} mb-4`} />
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                   <p className="text-3xl font-black dark:text-white">{stat.count}</p>
                </div>
              ))}
           </div>
           <div className="mt-12 p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
              <div className="flex items-center gap-3 mb-4">
                 <AlertCircle size={20} className="text-red-500" />
                 <h4 className="font-black text-red-700 dark:text-red-400 uppercase tracking-widest text-sm">Danger Zone</h4>
              </div>
              <p className="text-xs text-red-600 dark:text-red-500 mb-6 font-medium">Be cautious when performing system-level maintenance. Manual database edits via this tool bypassing logic checks can lead to data inconsistency.</p>
              <div className="flex flex-wrap gap-4">
                 <button onClick={() => alert("Maintenance Mode Coming Soon")} className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-red-700">Enter Maintenance Mode</button>
                 <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs uppercase">Force Sync System State</button>
              </div>
           </div>
        </div>
      )}

      {/* Register Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-xl w-full p-8 shadow-2xl relative animate-in zoom-in fade-in duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X size={20} /></button>
            <h2 className="text-2xl font-black mb-1 dark:text-white uppercase tracking-tighter">Register Vendor</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 font-medium">Create both the account and the storefront profiles.</p>
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Username (Login)</label>
                  <div className="relative">
                     <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input required type="text" placeholder="e.g. burgers_01" className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium dark:text-white" value={newVendor.username} onChange={(e) => setNewVendor({...newVendor, username: e.target.value})} />
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                  <div className="relative">
                     <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input required type="password" placeholder="••••••••" className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium dark:text-white" value={newVendor.password} onChange={(e) => setNewVendor({...newVendor, password: e.target.value})} />
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Store Name</label>
                  <input required type="text" placeholder="Pasta Hub" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium dark:text-white" value={newVendor.restaurantName} onChange={(e) => setNewVendor({...newVendor, restaurantName: e.target.value})} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Hub Location</label>
                  <select required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium dark:text-white appearance-none" value={newVendor.location} onChange={(e) => setNewVendor({...newVendor, location: e.target.value})}>
                    <option value="">Select Location</option>
                    {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Logo Image URL</label>
                  <div className="relative">
                     <ImageIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input type="text" placeholder="https://..." className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium dark:text-white" value={newVendor.logo} onChange={(e) => setNewVendor({...newVendor, logo: e.target.value})} />
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email (Optional)</label>
                  <input type="email" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium dark:text-white" value={newVendor.email} onChange={(e) => setNewVendor({...newVendor, email: e.target.value})} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Phone (Optional)</label>
                  <input type="tel" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium dark:text-white" value={newVendor.phone} onChange={(e) => setNewVendor({...newVendor, phone: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold text-gray-500">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black shadow-xl shadow-orange-100 dark:shadow-none hover:bg-orange-600 transition-all uppercase tracking-widest text-xs">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals for Areas */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <h2 className="text-xl font-black mb-6 dark:text-white uppercase tracking-widest">Register Area</h2>
            <div className="space-y-4">
               <input placeholder="Area Name" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none dark:text-white" value={newArea.name} onChange={e => setNewArea({...newArea, name: e.target.value})} />
               <div className="grid grid-cols-2 gap-2">
                 <input placeholder="City" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none dark:text-white" value={newArea.city} onChange={e => setNewArea({...newArea, city: e.target.value})} />
                 <input placeholder="Code (SF, NY)" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none dark:text-white" value={newArea.code} onChange={e => setNewArea({...newArea, code: e.target.value})} />
               </div>
               <div className="flex gap-2 pt-4">
                 <button onClick={() => setIsAreaModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-gray-500">Cancel</button>
                 <button onClick={() => { onAddLocation({...newArea, id: `a_${Date.now()}`, state: '', isActive: true}); setIsAreaModalOpen(false); }} className="flex-1 py-3 bg-black text-white dark:bg-white dark:text-black rounded-xl font-bold">Register</button>
               </div>
            </div>
          </div>
        </div>
      )}
      {/* (Edit modals follow same logic for consistency...) */}
    </div>
  );
};

export default AdminView;
