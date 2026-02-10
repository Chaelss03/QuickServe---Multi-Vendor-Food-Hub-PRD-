import React, { useState, useEffect, useRef } from 'react';
import { Restaurant, CartItem, Order, OrderStatus, MenuItem } from '../types';
import { ShoppingCart, Plus, Minus, X, CheckCircle, ChevronRight, Info, ThermometerSun, Maximize2, MapPin, Hash, LayoutGrid, Grid3X3, MessageSquare, AlertTriangle } from 'lucide-react';

interface Props {
  restaurants: Restaurant[];
  cart: CartItem[];
  orders: Order[];
  onAddToCart: (item: CartItem) => void;
  onRemoveFromCart: (itemId: string) => void;
  onPlaceOrder: (remark: string) => void;
  locationName?: string;
  tableNo?: string;
}

const CustomerView: React.FC<Props> = ({ restaurants, cart, orders, onAddToCart, onRemoveFromCart, onPlaceOrder, locationName, tableNo }) => {
  const [activeRestaurant, setActiveRestaurant] = useState(restaurants[0]?.id || '');
  const [showCart, setShowCart] = useState(false);
  const [selectedItemForVariants, setSelectedItemForVariants] = useState<{item: MenuItem, resId: string} | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedTemp, setSelectedTemp] = useState<'Hot' | 'Cold' | undefined>(undefined);
  const [gridColumns, setGridColumns] = useState<2 | 3>(3);
  const [orderRemark, setOrderRemark] = useState('');
  
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const scrollToSection = (id: string) => {
    setActiveRestaurant(id);
    const element = sectionRefs.current[id];
    if (element) {
      const offset = 110; // Sticky header + Restaurant Navbar height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 150;
      for (const res of restaurants) {
        const el = sectionRefs.current[res.id];
        if (el && el.offsetTop <= scrollPos && el.offsetTop + el.offsetHeight > scrollPos) {
          setActiveRestaurant(res.id);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [restaurants]);

  useEffect(() => {
    if (restaurants.length > 0 && !activeRestaurant) {
      setActiveRestaurant(restaurants[0].id);
    }
  }, [restaurants, activeRestaurant]);

  const handleInitialAdd = (item: MenuItem, resId: string) => {
    if ((item.sizes && item.sizes.length > 0) || (item.tempOptions && item.tempOptions.enabled)) {
      setSelectedItemForVariants({ item, resId });
      setSelectedSize(item.sizes?.[0]?.name || '');
      setSelectedTemp(item.tempOptions?.enabled ? 'Hot' : undefined);
    } else {
      onAddToCart({ ...item, quantity: 1, restaurantId: resId });
    }
  };

  const confirmVariantAdd = () => {
    if (!selectedItemForVariants) return;
    const { item, resId } = selectedItemForVariants;
    
    let finalPrice = item.price;
    if (selectedSize) {
      const sizeObj = item.sizes?.find(s => s.name === selectedSize);
      if (sizeObj) finalPrice += sizeObj.price;
    }
    if (selectedTemp === 'Hot' && item.tempOptions?.hot) finalPrice += item.tempOptions.hot;
    if (selectedTemp === 'Cold' && item.tempOptions?.cold) finalPrice += item.tempOptions.cold;

    onAddToCart({
      ...item,
      price: finalPrice,
      quantity: 1,
      restaurantId: resId,
      selectedSize,
      selectedTemp
    });
    setSelectedItemForVariants(null);
  };

  const toggleGrid = () => {
    setGridColumns(prev => (prev === 3 ? 2 : 3));
  };

  const activeOrders = orders.filter(o => o.status !== OrderStatus.COMPLETED);

  return (
    <div className="relative min-h-screen pb-28 bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Restaurant Navbar - Minimalistic & High Contrast */}
      <nav className="sticky top-16 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b dark:border-gray-700 overflow-x-auto hide-scrollbar flex items-center px-4 py-2 gap-2 shadow-sm">
        {restaurants.map(res => (
          <button
            key={res.id}
            onClick={() => scrollToSection(res.id)}
            className={`whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight transition-all duration-200 ${
              activeRestaurant === res.id 
                ? 'bg-orange-500 text-white shadow-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {res.name}
          </button>
        ))}
      </nav>

      <div className="max-w-7xl mx-auto px-2 md:px-4 py-3">
        {/* Ultra-Compact Info Header with View Toggle */}
        <div className="mb-3 px-2 py-1 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm flex items-center justify-between gap-2 min-h-[36px]">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <MapPin size={12} className="text-orange-500 shrink-0" />
            <h2 className="text-[10px] font-black dark:text-white leading-tight uppercase tracking-tight truncate">
              {locationName || 'QuickServe Hub'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {tableNo && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded font-black text-[9px] uppercase tracking-tighter shrink-0">
                <Hash size={10} className="text-orange-500" />
                T-{tableNo}
              </div>
            )}
            
            {/* View Option Toggle */}
            <button 
              onClick={toggleGrid}
              className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-md hover:text-orange-500 transition-colors flex items-center gap-1 shadow-sm active:scale-95"
              title={`Switch to ${gridColumns === 3 ? '2' : '3'} columns`}
            >
              {gridColumns === 3 ? <LayoutGrid size={14} /> : <Grid3X3 size={14} />}
              <span className="text-[8px] font-black uppercase tracking-tighter">{gridColumns}X</span>
            </button>
          </div>
        </div>

        {/* Active/Cancelled Orders Ticker */}
        {activeOrders.length > 0 && (
          <div className="mb-6 space-y-2">
            {activeOrders.map(order => (
              <div key={order.id} className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                order.status === OrderStatus.CANCELLED 
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' 
                  : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30 animate-pulse'
              }`}>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${order.status === OrderStatus.CANCELLED ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${order.status === OrderStatus.CANCELLED ? 'text-red-700 dark:text-red-400' : 'text-orange-800 dark:text-orange-200'}`}>
                        {order.status === OrderStatus.CANCELLED ? `Order Rejected: ${order.id}` : `Order Processing: ${order.id}`}
                      </span>
                   </div>
                   {order.status === OrderStatus.CANCELLED && <AlertTriangle size={14} className="text-red-500" />}
                </div>
                
                {order.status === OrderStatus.CANCELLED && (
                  <div className="pl-4 border-l-2 border-red-200 dark:border-red-800">
                    <p className="text-[10px] font-bold text-red-800 dark:text-red-300">
                      Reason: <span className="font-medium">{order.rejectionReason}</span>
                    </p>
                    {order.rejectionNote && (
                      <p className="text-[9px] text-red-600 dark:text-red-400 mt-0.5 italic">
                        "{order.rejectionNote}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Menu Sections */}
        <div className="space-y-8">
          {restaurants.map(res => (
            <section 
              key={res.id} 
              id={res.id} 
              ref={el => { sectionRefs.current[res.id] = el; }}
              className="scroll-mt-32"
            >
              <div className="flex items-center gap-2 mb-3 px-1 border-l-2 border-orange-500 pl-2">
                <img src={res.logo} alt={res.name} className="w-6 h-6 rounded object-cover shadow-sm border dark:border-gray-700" />
                <h2 className="text-[11px] font-black text-gray-900 dark:text-white leading-tight tracking-tight uppercase">{res.name}</h2>
              </div>

              {/* Grid: Dynamic columns based on state */}
              <div className={`grid gap-2 md:gap-6 ${gridColumns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {res.menu.map(item => (
                  <div key={item.id} className="group bg-white dark:bg-gray-800 rounded-lg md:rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
                    <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute bottom-1 left-1 bg-black/50 backdrop-blur-sm px-1 py-0.5 rounded text-[6px] md:text-[8px] font-black text-white shadow-sm uppercase tracking-widest">
                        {item.category}
                      </div>
                    </div>
                    <div className="p-1.5 md:p-4 flex-1 flex flex-col">
                      <div className="mb-1">
                        <h4 className={`font-bold text-gray-900 dark:text-white leading-tight line-clamp-1 mb-0.5 ${gridColumns === 3 ? 'text-[9px] md:text-sm' : 'text-xs md:text-base'}`}>{item.name}</h4>
                        <div className="flex items-baseline gap-1">
                          <span className={`font-black text-orange-500 ${gridColumns === 3 ? 'text-[10px] md:text-lg' : 'text-sm md:text-xl'}`}>${item.price.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <p className={`text-gray-500 dark:text-gray-400 mb-2 line-clamp-2 leading-relaxed hidden sm:block ${gridColumns === 3 ? 'text-[8px] md:text-[10px]' : 'text-[10px] md:text-xs'}`}>
                        {item.description}
                      </p>
                      
                      <button 
                        onClick={() => handleInitialAdd(item, res.id)}
                        className={`mt-auto w-full py-1.5 md:py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md md:rounded-xl font-black uppercase tracking-tighter hover:bg-orange-500 dark:hover:bg-orange-500 hover:text-white transition-all active:scale-95 shadow-sm ${gridColumns === 3 ? 'text-[8px] md:text-[10px]' : 'text-[10px] md:text-xs'}`}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Rest of the file... */}
        {restaurants.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
            <ShoppingCart size={24} className="mx-auto mb-2 text-gray-300" />
            <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">No Vendors Online</h3>
          </div>
        )}
      </div>

      {/* Variant Selection Modal */}
      {selectedItemForVariants && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in fade-in duration-300">
            <div className="relative h-32">
              <img src={selectedItemForVariants.item.image} className="w-full h-full object-cover" />
              <button 
                onClick={() => setSelectedItemForVariants(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="p-4">
              <h3 className="text-sm font-black dark:text-white mb-1 uppercase tracking-tight">{selectedItemForVariants.item.name}</h3>
              <p className="text-[8px] text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider font-bold">{selectedItemForVariants.item.category}</p>
              
              <div className="space-y-4">
                {selectedItemForVariants.item.sizes && selectedItemForVariants.item.sizes.length > 0 && (
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Select Size</label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedItemForVariants.item.sizes.map(size => (
                        <button
                          key={size.name}
                          onClick={() => setSelectedSize(size.name)}
                          className={`p-2 rounded-lg border-2 text-left transition-all ${
                            selectedSize === size.name 
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400' 
                              : 'border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          <p className="text-[7px] font-black uppercase tracking-tighter">{size.name}</p>
                          <p className="font-black text-xs">+${size.price.toFixed(2)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedItemForVariants.item.tempOptions?.enabled && (
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Temp</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedTemp('Hot')}
                        className={`flex-1 py-2 rounded-lg border-2 flex flex-col items-center gap-0.5 transition-all ${
                          selectedTemp === 'Hot' 
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400' 
                            : 'border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <ThermometerSun size={14} className="text-orange-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Hot</span>
                      </button>
                      <button
                        onClick={() => setSelectedTemp('Cold')}
                        className={`flex-1 py-2 rounded-lg border-2 flex flex-col items-center gap-0.5 transition-all ${
                          selectedTemp === 'Cold' 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400' 
                            : 'border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <Info size={14} className="text-blue-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Cold</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t dark:border-gray-700 flex items-center justify-between gap-3">
                <div className="text-left">
                   <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Price</p>
                   <p className="text-xl font-black dark:text-white">
                      ${(
                        selectedItemForVariants.item.price + 
                        (selectedItemForVariants.item.sizes?.find(s => s.name === selectedSize)?.price || 0) +
                        (selectedTemp === 'Hot' ? (selectedItemForVariants.item.tempOptions?.hot || 0) : (selectedTemp === 'Cold' ? (selectedItemForVariants.item.tempOptions?.cold || 0) : 0))
                      ).toFixed(2)}
                   </p>
                </div>
                <button 
                  onClick={confirmVariantAdd}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-200 dark:shadow-none hover:bg-orange-600 transition-all active:scale-95"
                >
                  Confirm Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Cart FAB */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[320px] px-4 z-50">
          <button 
            onClick={() => setShowCart(true)}
            className="w-full bg-black dark:bg-gray-100 text-white dark:text-gray-900 p-3 rounded-2xl shadow-2xl flex items-center justify-between hover:scale-[1.02] active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center font-black text-[10px] text-white tracking-tighter">
                {cart.length}
              </div>
              <span className="font-black text-[10px] uppercase tracking-widest">View My Order</span>
            </div>
            <span className="font-black text-lg tracking-tight">${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col animate-slide-left transition-colors">
            <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-xs font-black dark:text-white uppercase tracking-[0.2em]">Order Review</h2>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full dark:text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.map(item => (
                <div key={`${item.id}-${item.selectedSize}-${item.selectedTemp}`} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border dark:border-gray-700">
                  <img src={item.image} className="w-14 h-14 rounded-lg object-cover shadow-sm" />
                  <div className="flex-1">
                    <div className="flex justify-between font-bold dark:text-white mb-1">
                      <p className="text-[11px] font-black uppercase tracking-tight">{item.name}</p>
                      <p className="text-[11px] font-black">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    {(item.selectedSize || item.selectedTemp) && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.selectedSize && <span className="text-[7px] font-black px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-md uppercase tracking-tighter">{item.selectedSize}</span>}
                        {item.selectedTemp && <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${item.selectedTemp === 'Hot' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>{item.selectedTemp}</span>}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border dark:border-gray-600 overflow-hidden">
                        <button onClick={() => onRemoveFromCart(item.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Minus size={10} /></button>
                        <span className="px-3 font-black text-[10px] dark:text-white">{item.quantity}</span>
                        <button onClick={() => onAddToCart(item)} className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors"><Plus size={10} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                 <div className="text-center py-20">
                    <ShoppingCart size={24} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Order tray is empty</p>
                 </div>
              )}

              {cart.length > 0 && (
                <div className="pt-4 mt-4 border-t dark:border-gray-800">
                   <div className="flex items-center gap-2 mb-2">
                     <MessageSquare size={12} className="text-orange-500" />
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Add Remark / Special Instructions</label>
                   </div>
                   <textarea 
                     className="w-full p-4 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all resize-none"
                     placeholder="e.g. No onions, less spicy, extra napkins..."
                     rows={3}
                     value={orderRemark}
                     onChange={(e) => setOrderRemark(e.target.value)}
                   />
                </div>
              )}
            </div>

            <div className="p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 backdrop-blur-lg">
              <div className="space-y-2 mb-6 text-gray-600 dark:text-gray-400">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-[0.2em]">
                  <span>Subtotal</span>
                  <span className="text-gray-900 dark:text-white font-black">${cartTotal.toFixed(2)}</span>
                </div>
                {tableNo && (
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-[0.2em]">
                    <span>Table</span>
                    <span className="text-orange-500 font-black">#{tableNo}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-black text-gray-900 dark:text-white border-t dark:border-gray-700 pt-4 mt-4 uppercase tracking-[0.1em]">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
              </div>
              <button 
                disabled={cart.length === 0}
                onClick={() => { onPlaceOrder(orderRemark); setShowCart(false); setOrderRemark(''); }}
                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] shadow-xl shadow-orange-100 dark:shadow-none hover:bg-orange-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
              >
                Place My Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerView;