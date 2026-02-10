import React, { useState, useEffect } from 'react';
import { User, Role, Restaurant, Order, OrderStatus, CartItem, MenuItem, Area } from './types';
import { MOCK_RESTAURANTS, INITIAL_USERS } from './constants';
import CustomerView from './pages/CustomerView';
import VendorView from './pages/VendorView';
import AdminView from './pages/AdminView';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import { LogOut, Sun, Moon, MapPin } from 'lucide-react';

const INITIAL_AREAS: Area[] = [
  { id: 'area_1', name: 'Floor 1 - Zone A', city: 'San Francisco', state: 'CA', code: 'SF1', isActive: true },
  { id: 'area_2', name: 'Floor 2 - Zone B', city: 'San Francisco', state: 'CA', code: 'SF2', isActive: true },
  { id: 'area_3', name: 'Floor 1 - Zone C', city: 'New York', state: 'NY', code: 'NY1', isActive: true },
  { id: 'area_4', name: 'Food Court - West', city: 'London', state: 'UK', code: 'LNW', isActive: true }
];

const App: React.FC = () => {
  const getStored = <T,>(key: string, fallback: T): T => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  };

  const [allUsers, setAllUsers] = useState<User[]>(() => getStored('qs_users', INITIAL_USERS));
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => getStored('qs_restaurants', MOCK_RESTAURANTS));
  const [orders, setOrders] = useState<Order[]>(() => getStored('qs_orders', []));
  const [locations, setLocations] = useState<Area[]>(() => getStored('qs_locations', INITIAL_AREAS));
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [view, setView] = useState<'LANDING' | 'LOGIN' | 'APP'>('LANDING');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Scanned Session State
  const [sessionLocation, setSessionLocation] = useState<string | null>(null);
  const [sessionTable, setSessionTable] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    localStorage.setItem('qs_users', JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem('qs_restaurants', JSON.stringify(restaurants));
  }, [restaurants]);

  useEffect(() => {
    localStorage.setItem('qs_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('qs_locations', JSON.stringify(locations));
  }, [locations]);

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

  const placeOrder = (remark: string) => {
    if (cart.length === 0) return;
    
    // Generate Location-based Order ID: XX000001
    const area = locations.find(l => l.name === sessionLocation);
    const code = area?.code || 'QS';
    const locationOrdersCount = orders.filter(o => o.locationName === sessionLocation).length;
    const sequence = (locationOrdersCount + 1).toString().padStart(6, '0');
    const orderId = `${code}${sequence}`;

    const newOrder: Order = {
      id: orderId,
      items: [...cart],
      total: cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
      status: OrderStatus.PENDING,
      timestamp: Date.now(),
      customerId: 'guest_user',
      restaurantId: cart[0].restaurantId,
      tableNumber: sessionTable || 'N/A',
      locationName: sessionLocation || 'Unspecified',
      remark: remark
    };
    
    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    alert(`Order ${orderId} placed successfully! Table: ${sessionTable || 'N/A'}`);
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, rejectionReason?: string, rejectionNote?: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, rejectionReason, rejectionNote } : o));
  };

  const updateMenuItem = (restaurantId: string, updatedItem: MenuItem) => {
    setRestaurants(prev => prev.map(r => {
      if (r.id === restaurantId) {
        return {
          ...r,
          menu: r.menu.map(m => m.id === updatedItem.id ? updatedItem : m)
        };
      }
      return r;
    }));
  };

  const handleAddMenuItem = (restaurantId: string, newItem: MenuItem) => {
    setRestaurants(prev => prev.map(r => {
      if (r.id === restaurantId) {
        return {
          ...r,
          menu: [...r.menu, newItem]
        };
      }
      return r;
    }));
  };

  const handlePermanentDeleteMenuItem = (restaurantId: string, itemId: string) => {
    setRestaurants(prev => prev.map(r => {
      if (r.id === restaurantId) {
        return {
          ...r,
          menu: r.menu.filter(m => m.id !== itemId)
        };
      }
      return r;
    }));
  };

  const handleAddVendor = (newUser: User, newRestaurant: Restaurant) => {
    setAllUsers(prev => [...prev, { ...newUser, isActive: true }]);
    setRestaurants(prev => [...prev, newRestaurant]);
  };

  const handleUpdateVendor = (updatedUser: User, updatedRestaurant: Restaurant) => {
    setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setRestaurants(prev => prev.map(r => r.id === updatedRestaurant.id ? updatedRestaurant : r));
  };

  const handleAddLocation = (newArea: Area) => {
    setLocations(prev => [...prev, { ...newArea, isActive: true }]);
  };

  const handleUpdateLocation = (updatedArea: Area) => {
    const oldArea = locations.find(l => l.id === updatedArea.id);
    setLocations(prev => prev.map(l => l.id === updatedArea.id ? updatedArea : l));
    // Update restaurants location string if name changed
    if (oldArea && oldArea.name !== updatedArea.name) {
      setRestaurants(prev => prev.map(r => r.location === oldArea.name ? { ...r, location: updatedArea.name } : r));
    }
  };

  const handleDeleteLocation = (areaId: string) => {
    setLocations(prev => prev.filter(l => l.id !== areaId));
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
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {currentRole === 'CUSTOMER' && (
            <button 
              onClick={() => { setSessionLocation(null); setSessionTable(null); setView('LANDING'); }} 
              className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400"
            >
              Exit Scan
            </button>
          )}
          
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-400 capitalize">{currentUser.role}</p>
                <p className="text-sm font-semibold dark:text-white">{currentUser.username}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            currentRole !== 'CUSTOMER' && (
              <button 
                onClick={() => setView('LOGIN')} 
                className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-all shadow-md shadow-orange-200"
              >
                Sign In
              </button>
            )
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