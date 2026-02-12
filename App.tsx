
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Role, Restaurant, Order, OrderStatus, CartItem, MenuItem, Area } from './types';
import CustomerView from './pages/CustomerView';
import VendorView from './pages/VendorView';
import AdminView from './pages/AdminView';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import { supabase } from './lib/supabase';
import { LogOut, Sun, Moon, MapPin, LogIn, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  // --- HYDRATED STATE ---
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('qs_cache_users');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    try {
      const saved = localStorage.getItem('qs_cache_restaurants');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('qs_cache_orders');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [locations, setLocations] = useState<Area[]>(() => {
    try {
      const saved = localStorage.getItem('qs_cache_locations');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [isLoading, setIsLoading] = useState(() => {
    try {
      const hasRes = localStorage.getItem('qs_cache_restaurants');
      const hasLoc = localStorage.getItem('qs_cache_locations');
      return !(hasRes && hasLoc);
    } catch { return true; }
  });

  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('qs_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  
  const [currentRole, setCurrentRole] = useState<Role | null>(() => {
    return localStorage.getItem('qs_role') as Role | null;
  });
  
  const [view, setView] = useState<'LANDING' | 'LOGIN' | 'APP'>(() => {
    return (localStorage.getItem('qs_view') as any) || 'LANDING';
  });
  
  const [sessionLocation, setSessionLocation] = useState<string | null>(() => {
    return localStorage.getItem('qs_session_location');
  });
  
  const [sessionTable, setSessionTable] = useState<string | null>(() => {
    return localStorage.getItem('qs_session_table');
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const isFetchingRef = useRef(false);

  const persistCache = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage quota exceeded.");
    }
  };

  const parseTimestamp = (ts: any): number => {
    if (!ts) return Date.now();
    const date = new Date(ts);
    const time = date.getTime();
    return isNaN(time) ? (typeof ts === 'number' ? ts : Date.now()) : time;
  };

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data) {
      const mapped = data.map(u => ({
        id: u.id, username: u.username, role: u.role as Role,
        restaurantId: u.restaurant_id, password: u.password,
        isActive: u.is_active, email: u.email, phone: u.phone
      }));
      setAllUsers(mapped);
      persistCache('qs_cache_users', mapped);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    const { data, error } = await supabase.from('areas').select('*').order('name');
    if (!error && data) {
      const mapped = data.map(l => ({
        id: l.id, name: l.name, city: l.city, state: l.state, code: l.code, isActive: l.is_active ?? true
      }));
      setLocations(mapped);
      persistCache('qs_cache_locations', mapped);
    }
  }, []);

  const fetchRestaurants = useCallback(async () => {
    const { data: resData, error: resError } = await supabase.from('restaurants').select('*');
    const { data: menuData, error: menuError } = await supabase.from('menu_items').select('*');
    if (!resError && !menuError && resData && menuData) {
      const formatted: Restaurant[] = resData.map(res => ({
        id: res.id, name: res.name, logo: res.logo, vendorId: res.vendor_id,
        location: res.location_name, created_at: res.created_at,
        menu: menuData.filter(m => m.restaurant_id === res.id).map(m => ({
          id: m.id, name: m.name, description: m.description, price: Number(m.price),
          image: m.image, category: m.category, isArchived: m.is_archived,
          sizes: m.sizes, tempOptions: m.temp_options
        }))
      }));
      setRestaurants(formatted);
      persistCache('qs_cache_restaurants', formatted);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data, error } = await supabase.from('orders').select('*').order('timestamp', { ascending: false }).limit(200);
      if (!error && data) {
        const mapped = data.map(o => ({
          id: o.id, items: o.items || [], total: Number(o.total || 0),
          status: o.status as OrderStatus, timestamp: parseTimestamp(o.timestamp),
          customerId: o.customer_id, restaurantId: o.restaurant_id,
          tableNumber: o.table_number, locationName: o.location_name,
          remark: o.remark, rejectionReason: o.rejection_reason, rejectionNote: o.rejection_note
        }));
        setOrders(mapped);
        setLastSyncTime(new Date());
        persistCache('qs_cache_orders', mapped);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      await Promise.allSettled([fetchUsers(), fetchLocations(), fetchRestaurants(), fetchOrders()]);
      setIsLoading(false);
    };
    initApp();

    const channel = supabase.channel('order-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    const interval = setInterval(fetchOrders, 5000); 

    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(interval);
    };
  }, [fetchUsers, fetchLocations, fetchRestaurants, fetchOrders]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleScanSimulation = (locationName: string, tableNo: string) => {
    setSessionLocation(locationName);
    setSessionTable(tableNo);
    setCurrentRole('CUSTOMER');
    setView('APP');
    localStorage.setItem('qs_role', 'CUSTOMER');
    localStorage.setItem('qs_view', 'APP');
    localStorage.setItem('qs_session_location', locationName);
    localStorage.setItem('qs_session_table', tableNo);
  };

  const placeOrder = async (remark: string) => {
    if (cart.length === 0) return;
    
    const area = locations.find(l => l.name === sessionLocation);
    const code = area?.code || 'QS';
    
    let nextNum = 1;
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('id')
      .ilike('id', `${code}%`)
      .order('id', { ascending: false })
      .limit(1);

    if (lastOrder && lastOrder[0]) {
      const lastId = lastOrder[0].id;
      const numPart = lastId.substring(code.length);
      const parsed = parseInt(numPart);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }
    
    const orderId = `${code}${String(nextNum).padStart(7, '0')}`;
    const numericTimestamp = Date.now();

    const newOrder = {
      id: orderId,
      items: cart,
      total: cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
      status: OrderStatus.PENDING,
      timestamp: numericTimestamp, 
      customer_id: 'guest_user',
      restaurant_id: cart[0].restaurantId,
      table_number: sessionTable || 'N/A',
      location_name: sessionLocation || 'Unspecified',
      remark: remark
    };
    
    const { error } = await supabase.from('orders').insert([newOrder]);
    if (error) {
      alert("Placement Error: " + error.message);
    } else {
      setCart([]);
      setOrders(prev => [{
        id: newOrder.id, items: newOrder.items, total: Number(newOrder.total),
        status: newOrder.status as OrderStatus, timestamp: numericTimestamp,
        customerId: newOrder.customer_id, restaurantId: newOrder.restaurant_id,
        tableNumber: newOrder.table_number, locationName: newOrder.location_name,
        remark: newOrder.remark
      }, ...prev]);
      fetchOrders();
      alert(`Order ${orderId} submitted!`);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    setView('APP');
    localStorage.setItem('qs_user', JSON.stringify(user));
    localStorage.setItem('qs_role', user.role);
    localStorage.setItem('qs_view', 'APP');
  };

  const handleLogout = () => {
    setCurrentUser(null); setCurrentRole(null); setSessionLocation(null);
    setSessionTable(null); setView('LANDING'); localStorage.clear();
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, reason?: string, note?: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, rejectionReason: reason, rejectionNote: note } : o));
    await supabase.from('orders').update({ status, rejection_reason: reason, rejection_note: note }).eq('id', orderId);
    fetchOrders();
  };

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.selectedSize === item.selectedSize && i.selectedTemp === item.selectedTemp);
      if (existing) return prev.map(i => (i.id === item.id && i.selectedSize === item.selectedSize && i.selectedTemp === item.selectedTemp) ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter(i => i.id !== itemId);
    });
  };

  const handleAddVendor = async (newUser: User, newRestaurant: Restaurant) => {
    const { data: userData, error: userError } = await supabase.from('users').insert([{
      username: newUser.username, password: newUser.password, role: 'VENDOR', email: newUser.email, phone: newUser.phone, is_active: true
    }]).select();
    if (!userError && userData?.[0]) {
      const uid = userData[0].id;
      const { data: resData, error: resError } = await supabase.from('restaurants').insert([{
        name: newRestaurant.name, logo: newRestaurant.logo, vendor_id: uid, location_name: newRestaurant.location
      }]).select();
      if (!resError && resData?.[0]) await supabase.from('users').update({ restaurant_id: resData[0].id }).eq('id', uid);
      await Promise.all([fetchUsers(), fetchRestaurants()]);
    }
  };

  const handleUpdateVendor = async (u: User, r: Restaurant) => {
    await supabase.from('users').update({ username: u.username, email: u.email, phone: u.phone, is_active: u.isActive, password: u.password }).eq('id', u.id);
    await supabase.from('restaurants').update({ name: r.name, logo: r.logo, location_name: r.location }).eq('id', r.id);
    await Promise.all([fetchUsers(), fetchRestaurants()]);
  };

  const handleAddLocation = async (a: Area) => {
    await supabase.from('areas').insert([{ name: a.name, city: a.city, state: a.state, code: a.code, is_active: a.isActive }]);
    fetchLocations();
  };

  const handleUpdateLocation = async (a: Area) => {
    await supabase.from('areas').update({ name: a.name, city: a.city, state: a.state, code: a.code, is_active: a.isActive }).eq('id', a.id);
    await Promise.all([fetchLocations(), fetchRestaurants()]);
  };

  const handleDeleteLocation = async (id: string) => {
    await supabase.from('areas').delete().eq('id', id);
    fetchLocations();
  };

  const handleUpdateMenuItem = async (rid: string, item: MenuItem) => {
    await supabase.from('menu_items').update({ name: item.name, description: item.description, price: item.price, image: item.image, category: item.category, is_archived: item.isArchived, sizes: item.sizes, temp_options: item.tempOptions }).eq('id', item.id);
    fetchRestaurants();
  };

  const handleAddMenuItem = async (rid: string, item: MenuItem) => {
    await supabase.from('menu_items').insert([{ restaurant_id: rid, name: item.name, description: item.description, price: item.price, image: item.image, category: item.category, sizes: item.sizes, temp_options: item.tempOptions }]);
    fetchRestaurants();
  };

  const handleDeleteMenuItem = async (rid: string, mid: string) => {
    await supabase.from('menu_items').delete().eq('id', mid);
    fetchRestaurants();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-[10px]">Syncing Command Hub...</p>
      </div>
    );
  }

  if (view === 'LANDING') {
    return <LandingPage onScan={handleScanSimulation} onLoginClick={() => setView('LOGIN')} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} locations={locations.filter(l => l.isActive !== false)} />;
  }

  if (view === 'LOGIN') {
    return <LoginPage allUsers={allUsers} onLogin={handleLogin} onBack={() => setView('LANDING')} />;
  }

  const activeVendorRes = currentUser?.role === 'VENDOR' ? restaurants.find(r => r.id === currentUser.restaurantId) : null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b dark:border-gray-700 h-16 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('LANDING')}>
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black">S</div>
          <h1 className="text-xl font-black dark:text-white">ServeFlow</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {currentUser && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-gray-400 font-bold uppercase">{currentUser.role}</p>
                <p className="text-xs font-black dark:text-white">{currentUser.username}</p>
              </div>
              <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"><LogOut size={20} /></button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1">
        {currentRole === 'CUSTOMER' && <CustomerView restaurants={restaurants.filter(r => r.location === sessionLocation)} cart={cart} orders={orders} onAddToCart={addToCart} onRemoveFromCart={removeFromCart} onPlaceOrder={placeOrder} locationName={sessionLocation || undefined} tableNo={sessionTable || undefined} />}
        {currentRole === 'VENDOR' && activeVendorRes && <VendorView restaurant={activeVendorRes} orders={orders.filter(o => o.restaurantId === currentUser?.restaurantId)} onUpdateOrder={updateOrderStatus} onUpdateMenu={handleUpdateMenuItem} onAddMenuItem={handleAddMenuItem} onPermanentDeleteMenuItem={handleDeleteMenuItem} lastSyncTime={lastSyncTime} />}
        {currentRole === 'ADMIN' && <AdminView vendors={allUsers.filter(u => u.role === 'VENDOR')} restaurants={restaurants} orders={orders} locations={locations} onAddVendor={handleAddVendor} onUpdateVendor={handleUpdateVendor} onImpersonateVendor={handleLogin} onAddLocation={handleAddLocation} onUpdateLocation={handleUpdateLocation} onDeleteLocation={handleDeleteLocation} onRemoveVendorFromHub={(rid) => supabase.from('restaurants').update({ location_name: null }).eq('id', rid).then(() => fetchRestaurants())} />}
      </main>
    </div>
  );
};

export default App;
