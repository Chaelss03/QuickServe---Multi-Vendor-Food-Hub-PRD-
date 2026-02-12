
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Restaurant, Order, Area, OrderStatus } from '../types';
import { Users, Store, TrendingUp, Settings, ShieldCheck, Mail, Search, Filter, X, Plus, MapPin, Power, CheckCircle2, AlertCircle, LogIn, Trash2, LayoutGrid, List, ChevronRight, Eye, Globe, Phone, ShoppingBag, Edit3, Hash, Download, Calendar, ChevronLeft, Database, Image as ImageIcon, Key } from 'lucide-react';

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
  
  // Location Form State
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [isEditAreaModalOpen, setIsEditAreaModalOpen] = useState(false);
  const [newArea, setNewArea] = useState({ name: '', city: '', state: '', code: '' });
  const [editArea, setEditArea] = useState<Area | null>(null);

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const res = restaurants.find(r => r.id === vendor.restaurantId);
      const matchesSearch = vendor.username.toLowerCase().includes(searchQuery.toLowerCase()) || res?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = locationFilter === 'All Locations' || res?.location === locationFilter;
      return matchesSearch && matchesLocation;
    });
  }, [vendors, restaurants, searchQuery, locationFilter]);

  const handleRegisterVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.username || !newVendor.password || !newVendor.location) {
      alert("Please fill in Username, Password, and Location.");
      return;
    }
    
    const newUser: User = { id: '', username: newVendor.username, password: newVendor.password, role: 'VENDOR', email: newVendor.email, phone: newVendor.phone };
    const newRes: Restaurant = { id: '', name: newVendor.restaurantName, logo: newVendor.logo, vendorId: '', location: newVendor.location, menu: [] };
    
    onAddVendor(newUser, newRes);
    setIsModalOpen(false);
    setNewVendor({ username: '', password: '', restaurantName: '', location: '', email: '', phone: '', logo: '' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-black dark:text-white tracking-tighter uppercase">Platform Master</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Administrative Oversight Controls</p>
        </div>
        <div className="flex bg-white dark:bg-gray-800 rounded-2xl p-1.5 border dark:border-gray-700 shadow-sm">
          {[
            { id: 'VENDORS', label: 'Vendors', icon: Store },
            { id: 'LOCATIONS', label: 'Hubs', icon: MapPin },
            { id: 'REPORTS', label: 'Reports', icon: TrendingUp },
            { id: 'SYSTEM', label: 'Database', icon: Database }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'VENDORS' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-700/50">
            <h3 className="font-black dark:text-white uppercase tracking-tighter">Registered Partners</h3>
            <div className="flex gap-4">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search..." className="pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <button onClick={() => setIsModalOpen(true)} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-100">+ New Vendor</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-4 text-left">Storefront</th>
                  <th className="px-8 py-4 text-left">Location</th>
                  <th className="px-8 py-4 text-left">Account</th>
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
                          <span className="font-black dark:text-white">{res?.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-gray-500">{res?.location}</td>
                      <td className="px-8 py-5 text-xs text-gray-400 font-bold">@{vendor.username}</td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => onImpersonateVendor(vendor)} className="p-2 text-gray-400 hover:text-orange-500"><LogIn size={18} /></button>
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
        <div className="space-y-6">
           <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-xl dark:text-white uppercase tracking-tighter">Zone Registry</h2>
              <button onClick={() => setIsAreaModalOpen(true)} className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black uppercase tracking-widest text-[10px]">+ Add Area</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {locations.map(loc => (
                <div key={loc.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border dark:border-gray-700 shadow-sm group">
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-500 rounded-2xl flex items-center justify-center"><MapPin size={24} /></div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditArea(loc); setIsEditAreaModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-500"><Edit3 size={18} /></button>
                        <button onClick={() => onDeleteLocation(loc.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                      </div>
                   </div>
                   <h4 className="font-black text-lg dark:text-white mb-1 uppercase tracking-tight">{loc.name}</h4>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{loc.code} • {loc.city}</p>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'SYSTEM' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 p-8 shadow-sm">
           <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter mb-8">System Telemetry</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {[
                { label: 'Total Users', count: vendors.length + 1, icon: Users, color: 'text-blue-500' },
                { label: 'Live Kitchens', count: restaurants.length, icon: Store, color: 'text-orange-500' },
                { label: 'Operational Hubs', count: locations.length, icon: MapPin, color: 'text-purple-500' },
                { label: 'Global Orders', count: orders.length, icon: ShoppingBag, color: 'text-green-500' }
              ].map(stat => (
                <div key={stat.label} className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border dark:border-gray-600">
                   <stat.icon size={24} className={`${stat.color} mb-4`} />
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                   <p className="text-3xl font-black dark:text-white mt-1">{stat.count}</p>
                </div>
              ))}
           </div>
           <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
              <div className="flex items-center gap-3 mb-4">
                 <AlertCircle size={20} className="text-red-500" />
                 <h4 className="font-black text-red-700 dark:text-red-400 uppercase tracking-widest text-xs">Danger Zone</h4>
              </div>
              <p className="text-xs text-red-600 dark:text-red-500 mb-6">Database maintenance mode restricts frontend writes while performing platform migrations.</p>
              <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px]">Force Sync Environment</button>
           </div>
        </div>
      )}

      {/* Register Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-xl w-full p-8 shadow-2xl relative animate-in zoom-in fade-in duration-300 overflow-y-auto max-h-[90vh]">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            <h2 className="text-2xl font-black mb-1 dark:text-white uppercase tracking-tighter">Vendor Initialization</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 font-medium">Provision a new account and storefront instance.</p>
            <form onSubmit={handleRegisterVendor} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border dark:border-gray-600">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-2"><Key size={14}/> Access Credentials</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input required type="text" placeholder="Username (Login)" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl outline-none text-sm dark:text-white" value={newVendor.username} onChange={e => setNewVendor({...newVendor, username: e.target.value})} />
                    <input required type="password" placeholder="Password" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl outline-none text-sm dark:text-white" value={newVendor.password} onChange={e => setNewVendor({...newVendor, password: e.target.value})} />
                  </div>
                </div>
                <div className="col-span-2 p-4 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-2"><Store size={14}/> Store Profile</h4>
                   <div className="grid grid-cols-2 gap-3">
                     <div className="col-span-2"><input required type="text" placeholder="Restaurant Name" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl outline-none text-sm dark:text-white" value={newVendor.restaurantName} onChange={e => setNewVendor({...newVendor, restaurantName: e.target.value})} /></div>
                     <select required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl outline-none text-sm dark:text-white appearance-none" value={newVendor.location} onChange={e => setNewVendor({...newVendor, location: e.target.value})}>
                       <option value="">Select Hub</option>
                       {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
                     </select>
                     <input type="text" placeholder="Logo Image URL" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl outline-none text-sm dark:text-white" value={newVendor.logo} onChange={e => setNewVendor({...newVendor, logo: e.target.value})} />
                   </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold text-gray-500 uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-orange-100 dark:shadow-none">Authorize Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Area Modal */}
      {isEditAreaModalOpen && editArea && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button onClick={() => setIsEditAreaModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400"><X size={20} /></button>
            <h2 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tighter">Edit Hub: {editArea.name}</h2>
            <div className="space-y-4">
               <input required placeholder="Area Name" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl outline-none dark:text-white" value={editArea.name} onChange={e => setEditArea({...editArea, name: e.target.value})} />
               <div className="grid grid-cols-2 gap-2">
                 <input placeholder="City" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl outline-none dark:text-white" value={editArea.city} onChange={e => setEditArea({...editArea, city: e.target.value})} />
                 <input placeholder="Code (e.g. SF)" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl outline-none dark:text-white uppercase" value={editArea.code} onChange={e => setEditArea({...editArea, code: e.target.value.toUpperCase()})} />
               </div>
               <div className="flex gap-2 pt-4">
                 <button onClick={() => setIsEditAreaModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-gray-500">Cancel</button>
                 <button onClick={() => { onUpdateLocation(editArea); setIsEditAreaModalOpen(false); }} className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Commit Hub Update</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
