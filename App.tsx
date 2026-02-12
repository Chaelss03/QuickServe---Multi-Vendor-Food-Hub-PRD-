import React, { useState, useEffect, useCallback } from 'react';
import { User, Role, Restaurant, Order, OrderStatus, CartItem, MenuItem, Area } from './types';
import CustomerView from './pages/CustomerView';
import VendorView from './pages/VendorView';
import AdminView from './pages/AdminView';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import { supabase } from './lib/supabase';
import { LogOut, Sun, Moon, MapPin, LogIn, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  // --- HYDRATED STATE (Instant Boot from Cache) ---
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

  const persistCache = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage quota exceeded or unavailable.");
    }
  };

  const parseTimestamp = (ts: any): number => {
    if (!ts) return Date.now();
    const date = new Date(ts);
    const time = date.getTime();
    return isNaN(time) ? (typeof ts === 'number' ? ts : Date.now()) : time;
  };

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      if (data) {
        const mapped = data.map(u => ({
          id: u.id,
          username: u.username,
          role: u.role as Role,
          restaurantId: u.restaurant_id,
          password: u.password,
          isActive: u.is_active,
          email: u.email,
          phone: u.phone
        }));
        setAllUsers(mapped);
        persistCache('qs_cache_users', mapped);
      }
    } catch (e) { console.error("Fetch Users Failed", e); }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('areas').select('*').order('name');
      if (error) throw error;
      if (data) {
        const mapped = data.map(l => ({
          id: l.id,
          name: l.name,
          city: l.city,
          state: l.state,
          code: l.code,
          isActive: l.is_active ?? true
        }));
        setLocations(mapped);
        persistCache('qs_cache_locations', mapped);
      }
    } catch (e) { console.error("Fetch Locations Failed", e); }
  }, []);

  const fetchRestaurants = useCallback(async () => {
    try {
      const { data: resData, error: resError } = await supabase.from('restaurants').select('*');
      const { data: menuData, error: menuError } = await supabase.from('menu_items').select('*');
      
      if (resError || menuError) throw (resError || menuError);

      if (resData && menuData) {
        const formatted: Restaurant[] = resData.map(res => ({
          id: res.id,
          name: res.name,
          logo: res.logo,
          vendorId: res.vendor_id,
          location: res.location_name,
          created_at: res.created_at,
          menu: menuData
            .filter(m => m.restaurant_id === res.id)
            .map(m => ({
              id: m.id,
              name: m.name,
              description: m.description,
              price: Number(m.price),
              image: m.image,
              category: m.category,
              isArchived: m.is_archived,
              sizes: m.sizes,
              tempOptions: m.temp_options
            }))
        }));
        setRestaurants(formatted);
        persistCache('qs_cache_restaurants', formatted);
      }
    } catch (e) { console.error("Fetch Restaurants Failed", e); }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('timestamp', { ascending: false }).limit(300);
      if (error) throw error;
      if (data) {
        const mapped = data.map(o => ({
          id: o.id,
          items: o.items || [],
          total: Number(o.total || 0),
          status: o.status as OrderStatus,
          timestamp: parseTimestamp(o.timestamp),
          customerId: o.customer_id,
          restaurantId: o.restaurant_id,
          tableNumber: o.table_number,
          locationName: o.location_name,
          remark: o.remark,
          rejectionReason: o.rejection_reason,
          rejectionNote: o.rejection_note
        }));
        setOrders(mapped);
        setLastSyncTime(new Date());
        persistCache('qs_cache_orders', mapped);
      }
    } catch (e) { console.error("Fetch Orders Failed", e); }
  }, []);

  useEffect(() => {
    const bootTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 4500);

    const initApp = async () => {
      Promise.allSettled([fetchUsers(), fetchLocations(), fetchRestaurants(), fetchOrders()])
        .finally(() => {
          clearTimeout(bootTimeout);
          setIsLoading(false);
        });
    };
    initApp();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.debug('Realtime Update Received:', payload);
          fetchOrders();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchOrders();
    }, 8000); 

    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(interval);
      clearTimeout(bootTimeout);
    };
  }, [fetchUsers, fetchLocations, fetchRestaurants, fetchOrders]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loc = params.get('loc');
    const table = params.get('table');
    if (loc && table) {
      handleScanSimulation(loc, table);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    setView('APP');
    localStorage.setItem('qs_user', JSON.stringify(user));
    localStorage.setItem('qs_role', user.role);
    localStorage.setItem('qs_view', 'APP');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRole(null);
    setSessionLocation(null);
    setSessionTable(null);
    setView('LANDING');
    localStorage.clear();
  };

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

  const updateOrderStatus = async (orderId: string, status: OrderStatus, reason?: string, note?: string) => {
    setOrders(prev => {
      const updated = prev.map(o => 
        o.id === orderId ? { ...o, status, rejectionReason: reason, rejectionNote: note } : o
      );
      persistCache('qs_cache_orders', updated);
      return updated;
    });

    supabase.from('orders')
      .update({ status, rejection_reason: reason, rejection_note: note })
      .eq('id', orderId)
      .then(({ error }) => {
        if (error) {
          console.error("Order Sync Failure", error);
          fetchOrders();
        }
      });
  };

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.selectedSize === item.selectedSize && i.selectedTemp === item.selectedTemp);
      if (existing) {
        return prev.map(i => (i.id === item.id && i.selectedSize === item.selectedSize && i.selectedTemp === item.selectedTemp) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const placeOrder = async (remark: string) => {
    if (cart.length === 0) return;
    
    // Improved Global Uniqueness for Order IDs
    const area = locations.find(l => l.name === sessionLocation);
    const code = area?.code || 'QS';
    const timestampSegment = Date.now().toString(36).toUpperCase().slice(-5);
    const randomSegment = Math.random().toString(36).substring(2, 5).toUpperCase();
    const orderId = `${code}-${timestampSegment}-${randomSegment}`;

    const now = Date.now(); // Numeric Unix Milliseconds

    const newOrder = {
      id: orderId,
      items: cart,
      total: cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
      status: OrderStatus.PENDING,
      timestamp: now, // FIX: Use number instead of ISO string for BigInt column
      customer_id: 'guest_user',
      restaurant_id: cart[0].restaurantId,
      table_number: sessionTable || 'N/A',
      location_name: sessionLocation || 'Unspecified',
      remark: remark
    };
    
    const { error } = await supabase.from('orders').insert([newOrder]);
    if (error) {
      console.error("Critical Database Rejection:", error);
      alert("Placement Error: " + error.message);
    } else {
      setCart([]);
      setOrders(prev => [{
        id: newOrder.id,
        items: newOrder.items,
        total: Number(newOrder.total),
        status: newOrder.status,
        timestamp: now,
        customerId: newOrder.customer_id,
        restaurantId: newOrder.restaurant_id,
        tableNumber: newOrder.table_number,
        locationName: newOrder.location_name,
        remark: newOrder.remark
      }, ...prev]);
      
      fetchOrders();
      alert(`Order ${orderId} submitted!`);
    }
  };

  const handleAddVendor = async (newUser: User, newRestaurant: Restaurant) => {
    try {
      const { data: userData, error: userError } = await supabase.from('users').insert([{
        username: newUser.username,
        password: newUser.password,
        role: 'VENDOR',
        email: newUser.email,
        phone: newUser.phone,
        is_active: true
      }]).select();

      if (userError) throw userError;

      if (userData && userData[0]) {
        const createdUserId = userData[0].id;
        const { data: resData, error: resError } = await supabase.from('restaurants').insert([{
          name: newRestaurant.name, 
          logo: newRestaurant.logo, 
          vendor_id: createdUserId, 
          location_name: newRestaurant.location
        }]).select();

        if (resError) {
          await supabase.from('users').delete().eq('id', createdUserId);
          throw resError;
        } else {
          if (resData && resData[0]) {
             await supabase.from('users').update({ restaurant_id: resData[0].id }).eq('id', createdUserId);
          }
          await Promise.all([fetchUsers(), fetchRestaurants()]);
          alert("Vendor profile initialized.");
        }
      }
    } catch (e: any) { alert("Admin Error: " + e.message); }
  };

  const handleUpdateVendor = async (u: User, r: Restaurant) => {
    try {
      const { error: userError } = await supabase.from('users').update({ 
        username: u.username, 
        email: u.email, 
        phone: u.phone, 
        is_active: u.isActive,
        password: u.password 
      }).eq('id', u.id);
      
      const { error: resError } = await supabase.from('restaurants').update({ 
        name: r.name, 
        logo: r.logo, 
        location_name: r.location 
      }).eq('id', r.id);

      if (userError || resError) throw new Error("Sync failure");
      await Promise.all([fetchUsers(), fetchRestaurants()]);
      alert("Vendor synchronized.");
    } catch (e: any) { alert("Update Error: " + e.message); }
  };

  const handleRemoveVendorFromHub = async (restaurantId: string) => {
    const { error } = await supabase.from('restaurants').update({ location_name: null }).eq('id', restaurantId);
    if (error) alert("Removal Error: " + error.message);
    else await fetchRestaurants();
  };

  const handleAddLocation = async (a: Area) => {
    const { error } = await supabase.from('areas').insert([{
      name: a.name, city: a.city, state: a.state, code: a.code, is_active: a.isActive
    }]);
    if (error) alert("Error: " + error.message); else fetchLocations();
  };

  const handleUpdateLocation = async (a: Area) => {
    const oldArea = locations.find(loc => loc.id === a.id);
    if (!oldArea) return;
    const nameChanged = oldArea.name !== a.name;
    try {
      if (nameChanged) {
        const { data: dependents } = await supabase.from('restaurants').select('id').eq('location_name', oldArea.name);
        const relinkIds = dependents?.map(d => d.id) || [];
        if (relinkIds.length > 0) {
          await supabase.from('restaurants').update({ location_name: null }).in('id', relinkIds);
          const { error: areaErr } = await supabase.from('areas').update({ 
            name: a.name, city: a.city, state: a.state, code: a.code, is_active: a.isActive 
          }).eq('id', a.id);
          if (areaErr) throw areaErr;
          await supabase.from('restaurants').update({ location_name: a.name }).in('id', relinkIds);
        } else {
          const { error: areaErr } = await supabase.from('areas').update({ 
            name: a.name, city: a.city, state: a.state, code: a.code, is_active: a.isActive 
          }).eq('id', a.id);
          if (areaErr) throw areaErr;
        }
      } else {
        const { error: areaErr } = await supabase.from('areas').update({ 
          city: a.city, state: a.state, code: a.code, is_active: a.isActive 
        }).eq('id', a.id);
        if (areaErr) throw areaErr;
      }
      await Promise.all([fetchLocations(), fetchRestaurants()]);
      alert("Hub node updated.");
    } catch (err: any) {
      alert("Sync Error: " + err.message);
      await Promise.all([fetchLocations(), fetchRestaurants()]);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    const { error } = await supabase.from('areas').delete().eq('id', id);
    if (error) alert("Error: " + error.message); else fetchLocations();
  };

  const handleUpdateMenuItem = async (restaurantId: string, item: MenuItem) => {
    const { error } = await supabase.from('menu_items').update({
      name: item.name, description: item.description, price: item.price, image: item.image, category: item.category, is_archived: item.isArchived, sizes: item.sizes, temp_options: item.tempOptions
    }).eq('id', item.id);
    if (error) alert(error.message); else fetchRestaurants();
  };

  const handleAddMenuItem = async (restaurantId: string, item: MenuItem) => {
    const { error } = await supabase.from('menu_items').insert([{
      restaurant_id: restaurantId, name: item.name, description: item.description, price: item.price, image: item.image, category: item.category, sizes: item.sizes, temp_options: item.tempOptions
    }]);
    if (error) alert(error.message); else fetchRestaurants();
  };

  const handleDeleteMenuItem = async (resId: string, itemId: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
    if (error) alert(error.message); else fetchRestaurants();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-[10px]">Assembling Engine...</p>
        <p className="text-gray-400 text-[8px] mt-2 uppercase">Connecting to Supabase Hub</p>
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
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black">Q</div>
          <h1 className="text-xl font-black dark:text-white">QuickServe</h1>
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
        {currentRole === 'CUSTOMER' && (
          <CustomerView 
            restaurants={restaurants.filter(r => r.location === sessionLocation)} cart={cart} orders={orders}
            onAddToCart={addToCart} onRemoveFromCart={removeFromCart} onPlaceOrder={placeOrder}
            locationName={sessionLocation || undefined} tableNo={sessionTable || undefined}
          />
        )}
        {currentRole === 'VENDOR' && activeVendorRes && (
          <VendorView 
            restaurant={activeVendorRes} orders={orders.filter(o => o.restaurantId === currentUser?.restaurantId)}
            onUpdateOrder={updateOrderStatus} onUpdateMenu={handleUpdateMenuItem} onAddMenuItem={handleAddMenuItem} onPermanentDeleteMenuItem={handleDeleteMenuItem}
            lastSyncTime={lastSyncTime}
          />
        )}
        {currentRole === 'ADMIN' && (
          <AdminView 
            vendors={allUsers.filter(u => u.role === 'VENDOR')} restaurants={restaurants} orders={orders} locations={locations}
            onAddVendor={handleAddVendor} onUpdateVendor={handleUpdateVendor} onImpersonateVendor={handleLogin}
            onAddLocation={handleAddLocation} onUpdateLocation={handleUpdateLocation} onDeleteLocation={handleDeleteLocation}
            onRemoveVendorFromHub={handleRemoveVendorFromHub}
          />
        )}
      </main>
    </div>
  );
};

export default App;