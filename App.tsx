
import React, { useState, useEffect } from 'react';
import { User, Role, Restaurant, Order, OrderStatus, CartItem, MenuItem, Area } from './types';
import CustomerView from './pages/CustomerView';
import VendorView from './pages/VendorView';
import AdminView from './pages/AdminView';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import { supabase } from './lib/supabase';
import { LogOut, Sun, Moon, MapPin } from 'lucide-react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [locations, setLocations] = useState<Area[]>([]);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [view, setView] = useState<'LANDING' | 'LOGIN' | 'APP'>('LANDING');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [sessionLocation, setSessionLocation] = useState<string | null>(null);
  const [sessionTable, setSessionTable] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // 1. Initial Data Fetching from Supabase
  useEffect(() => {
    const initApp = async () => {
      await Promise.all([
        fetchUsers(),
        fetchLocations(),
        fetchRestaurants(),
        fetchOrders()
      ]);
    };
    initApp();

    // 2. Real-time Subscription for Orders
    // Fix: Added schema and explicit payload type to satisfy TS
    const orderSubscription = supabase
      .channel('public:orders')
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        }, 
        (_payload: RealtimePostgresChangesPayload<any>) => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderSubscription);
    };
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*');
    if (data) {
      setAllUsers(data.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role as Role,
        restaurantId: u.restaurant_id,
        password: u.password,
        isActive: u.is_active,
        email: u.email,
        phone: u.phone
      })));
    }
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('areas').select('*');
    if (data) setLocations(data);
  };

  const fetchRestaurants = async () => {
    const { data: resData } = await supabase.from('restaurants').select('*');
    const { data: menuData } = await supabase.from('menu_items').select('*');
    
    if (resData && menuData) {
      const formatted: Restaurant[] = resData.map(res => ({
        id: res.id,
        name: res.name,
        logo: res.logo,
        vendorId: res.vendor_id,
        location: res.location_name,
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
    }
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (data) {
      setOrders(data.map(o => ({
        id: o.id,
        items: o.items,
        total: Number(o.total),
        status: o.status as OrderStatus,
        timestamp: Number(o.timestamp),
        customerId: o.customer_id,
        restaurantId: o.restaurant_id,
        tableNumber: o.table_number,
        locationName: o.location_name,
        remark: o.remark,
        rejectionReason: o.rejection_reason,
        rejectionNote: o.rejection_note
      })));
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    setView('APP');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRole(null);
    setSessionLocation(null);
    setSessionTable(null);
    setView('LANDING');
  };

  const handleScanSimulation = (locationName: string, tableNo: string) => {
    setSessionLocation(locationName);
    setSessionTable(tableNo);
    setCurrentRole('CUSTOMER');
    setView('APP');
  };

  const handleImpersonateVendor = (user: User) => {
    setCurrentUser(user);
    setCurrentRole('VENDOR');
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
    
    const area = locations.find(l => l.name === sessionLocation);
    const code = area?.code || 'QS';
    const locationOrdersCount = orders.filter(o => o.locationName === sessionLocation).length;
    const sequence = (locationOrdersCount + 1).toString().padStart(6, '0');
    const orderId = `${code}${sequence}`;

    const newOrder = {
      id: orderId,
      items: cart,
      total: cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
      status: OrderStatus.PENDING,
      timestamp: Date.now(),
      customer_id: 'guest_user',
      restaurant_id: cart[0].restaurantId,
      table_number: sessionTable || 'N/A',
      location_name: sessionLocation || 'Unspecified',
      remark: remark
    };
    
    const { error } = await supabase.from('orders').insert([newOrder]);
    if (error) {
      alert("Error placing order: " + error.message);
    } else {
      setCart([]);
      alert(`Order ${orderId} placed successfully!`);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, rejectionReason?: string, rejectionNote?: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ 
        status, 
        rejection_reason: rejectionReason, 
        rejection_note: rejectionNote 
      })
      .eq('id', orderId);

    if (error) alert("Error updating order: " + error.message);
  };

  const updateMenuItem = async (restaurantId: string, updatedItem: MenuItem) => {
    const { error } = await supabase
      .from('menu_items')
      .update({
        name: updatedItem.name,
        description: updatedItem.description,
        price: updatedItem.price,
        image: updatedItem.image,
        category: updatedItem.category,
        is_archived: updatedItem.isArchived,
        sizes: updatedItem.sizes,
        temp_options: updatedItem.tempOptions
      })
      .eq('id', updatedItem.id);
    
    if (error) alert("Error updating menu: " + error.message);
    else fetchRestaurants();
  };

  const handleAddMenuItem = async (restaurantId: string, newItem: MenuItem) => {
    const { error } = await supabase
      .from('menu_items')
      .insert([{
        restaurant_id: restaurantId,
        name: newItem.name,
        description: newItem.description,
        price: newItem.price,
        image: newItem.image,
        category: newItem.category,
        sizes: newItem.sizes,
        temp_options: newItem.tempOptions
      }]);
    
    if (error) alert("Error adding menu item: " + error.message);
    else fetchRestaurants();
  };

  const handlePermanentDeleteMenuItem = async (restaurantId: string, itemId: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
    if (error) alert("Error deleting item: " + error.message);
    else fetchRestaurants();
  };

  const handleAddVendor = async (newUser: User, newRestaurant: Restaurant) => {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        username: newUser.username,
        password: newUser.password,
        role: 'VENDOR',
        email: newUser.email,
        phone: newUser.phone,
        is_active: true
      }])
      .select();

    if (userData && !userError) {
      const { error: resError } = await supabase
        .from('restaurants')
        .insert([{
          name: newRestaurant.name,
          logo: newRestaurant.logo,
          vendor_id: userData[0].id,
          location_name: newRestaurant.location
        }]);
      
      if (!resError) {
        await Promise.all([fetchUsers(), fetchRestaurants()]);
      }
    }
  };

  const handleUpdateVendor = async (updatedUser: User, updatedRestaurant: Restaurant) => {
    await supabase.from('users').update({
      username: updatedUser.username,
      email: updatedUser.email,
      phone: updatedUser.phone,
      is_active: updatedUser.isActive
    }).eq('id', updatedUser.id);

    await supabase.from('restaurants').update({
      name: updatedRestaurant.name,
      location_name: updatedRestaurant.location
    }).eq('id', updatedRestaurant.id);

    await Promise.all([fetchUsers(), fetchRestaurants()]);
  };

  const handleAddLocation = async (newArea: Area) => {
    const { error } = await supabase.from('areas').insert([newArea]);
    if (!error) fetchLocations();
  };

  const handleUpdateLocation = async (updatedArea: Area) => {
    const { error } = await supabase.from('areas').update(updatedArea).eq('id', updatedArea.id);
    if (!error) fetchLocations();
  };

  const handleDeleteLocation = async (areaId: string) => {
    const { error } = await supabase.from('areas').delete().eq('id', areaId);
    if (!error) fetchLocations();
  };

  if (view === 'LANDING') {
    return (
      <LandingPage 
        onScan={handleScanSimulation} 
        onLoginClick={() => setView('LOGIN')} 
        isDarkMode={isDarkMode} 
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
        locations={locations.filter(l => l.isActive !== false)}
      />
    );
  }

  if (view === 'LOGIN') {
    return <LoginPage allUsers={allUsers} onLogin={handleLogin} onBack={() => setView('LANDING')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm h-16 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('LANDING')}>
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">Q</div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">QuickServe</h1>
        </div>

        {currentRole === 'CUSTOMER' && sessionLocation && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 rounded-full">
            <MapPin size={14} className="text-orange-500" />
            <span className="text-xs font-bold text-orange-700 dark:text-orange-300">{sessionLocation} • Table {sessionTable}</span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-400 capitalize">{currentUser.role}</p>
                <p className="text-sm font-semibold dark:text-white">{currentUser.username}</p>
              </div>
              <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><LogOut size={20} /></button>
            </div>
          ) : (
            currentRole !== 'CUSTOMER' && <button onClick={() => setView('LOGIN')} className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-all shadow-md">Sign In</button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {currentRole === 'CUSTOMER' && (
          <CustomerView 
            restaurants={restaurants.filter(r => r.location === sessionLocation)} 
            cart={cart} 
            orders={orders}
            onAddToCart={addToCart} 
            onRemoveFromCart={removeFromCart}
            onPlaceOrder={placeOrder}
            locationName={sessionLocation || undefined}
            tableNo={sessionTable || undefined}
          />
        )}
        
        {currentRole === 'VENDOR' && currentUser && (
          <VendorView 
            restaurant={restaurants.find(r => r.id === currentUser.restaurantId)!} 
            orders={orders.filter(o => o.restaurantId === currentUser.restaurantId)}
            onUpdateOrder={updateOrderStatus}
            onUpdateMenu={updateMenuItem}
            onAddMenuItem={handleAddMenuItem}
            onPermanentDeleteMenuItem={handlePermanentDeleteMenuItem}
          />
        )}

        {currentRole === 'ADMIN' && (
          <AdminView 
            vendors={allUsers.filter(u => u.role === 'VENDOR')}
            restaurants={restaurants}
            orders={orders}
            locations={locations}
            onAddVendor={handleAddVendor}
            onUpdateVendor={handleUpdateVendor}
            onImpersonateVendor={handleImpersonateVendor}
            onAddLocation={handleAddLocation}
            onUpdateLocation={handleUpdateLocation}
            onDeleteLocation={handleDeleteLocation}
          />
        )}
      </main>
    </div>
  );
};

export default App;
