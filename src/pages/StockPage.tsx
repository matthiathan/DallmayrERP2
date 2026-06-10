import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { StockItem } from '../types';
import { 
  Layers, 
  Search, 
  Plus, 
  Minus, 
  AlertTriangle, 
  CheckCircle,
  Package,
  Wrench,
  CornerDownRight,
  RefreshCw
} from 'lucide-react';

export default function StockPage() {
  const isOnline = useNetworkStatus();
  const { queuePayload } = useOfflineSync();

  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadStock = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('stocks').order('item_name');
      setStocks((data as StockItem[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
    
    window.addEventListener('storage', loadStock);
    return () => window.removeEventListener('storage', loadStock);
  }, []);

  const adjustQuantity = async (item: StockItem, delta: number) => {
    const finalQty = Math.max(0, item.quantity + delta);
    if (finalQty === item.quantity) return;

    setUpdatingId(item.id);
    const updateData = { quantity: finalQty };

    try {
      const { error } = await supabase
        .from('stocks')
        .update(updateData)
        .eq('id', item.id);

      if (error) {
        queuePayload('UPDATE_STOCK', 'stocks', item.id, updateData);
        // Instant Optimistic Update locally
        setStocks(prev => prev.map(s => s.id === item.id ? { ...s, quantity: finalQty } : s));
      } else {
        loadStock();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredStock = stocks.filter(stock => {
    const matchesSearch = 
      stock.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.warehouse_location.toLowerCase().includes(searchQuery.toLowerCase());

    const isLow = stock.quantity <= stock.min_stock_level;
    const matchesLowFilter = !onlyLowStock || isLow;

    return matchesSearch && matchesLowFilter;
  });

  return (
    <div className="space-y-6" id="stock-management-root">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Dynamic Warehouse Stock Inventory</h2>
          <p className="text-xs text-slate-500 font-sans">Monitor available replacement parts, O-ring gaskets, descaling tabs, and Dallmayr artisan wholesale espresso beans.</p>
        </div>
      </div>

      {/* Query panel options */}
      <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU Code, Item Name, or Bin Location (e.g. A-12-B)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none focus:border-amber-500 focus:bg-white transition-colors"
            id="stock-search-input"
          />
        </div>

        {/* Checkbox Low Stock Alerts */}
        <div className="flex items-center gap-2 pl-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={(e) => setOnlyLowStock(e.target.checked)}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              id="low-stock-checkbox"
            />
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Filter Low Stock Levels only
            </span>
          </label>
        </div>

      </div>

      {/* Grid inventory log */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-white border border-slate-100 rounded-2xl" />
          ))}
        </div>
      ) : filteredStock.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-150 rounded-3xl p-6 flex flex-col items-center justify-center">
          <Package className="h-10 w-10 text-slate-300 mb-3" />
          <p className="font-bold text-slate-700 text-sm">No inventory records found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">Adjust search keywords or check connected active branches.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="stock-grid-items">
          {filteredStock.map(item => {
            const isLow = item.quantity <= item.min_stock_level;
            const isUpdating = updatingId === item.id;

            return (
              <div 
                key={item.id} 
                className={`bg-white border rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                  isLow ? 'border-orange-200/80 bg-orange-50/5' : 'border-slate-100'
                }`}
                id={`stock-card-${item.id}`}
              >
                
                {/* Header info */}
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-slate-400 text-[10px] uppercase font-bold tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                      SKU: {item.sku}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                      Bin: {item.warehouse_location}
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-slate-850 text-xs sm:text-sm pt-2 min-h-[40px] leading-snug line-clamp-2">
                    {item.item_name}
                  </h4>
                </div>

                {/* Stock Level meters */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <CornerDownRight className="h-3 w-3 text-slate-400" /> Current Stock level:
                    </span>
                    <span className={`font-bold font-mono text-sm ${isLow ? 'text-orange-600' : 'text-slate-800'}`}>
                      {item.quantity} units
                    </span>
                  </div>

                  {/* Safety min level alert indicator */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400/90 pl-4 border-l border-slate-200">
                    <span>Safety Margin Threshold:</span>
                    <span>Min {item.min_stock_level} units</span>
                  </div>

                  {isLow && (
                    <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[10px] flex items-center gap-1.5 font-bold animate-pulse">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span>Re-order trigger active: Below Safety limits.</span>
                    </div>
                  )}
                </div>

                {/* Adjuster controls */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                  <span className="text-[10 unit] text-slate-400 uppercase font-bold tracking-wider">Fast Adj.</span>
                  
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      disabled={isUpdating || item.quantity <= 0}
                      onClick={() => adjustQuantity(item, -5)}
                      className="p-1 px-2 hover:bg-white rounded-lg text-slate-600 disabled:opacity-30 cursor-pointer hover:shadow-xs font-mono font-bold text-xs"
                      title="Decrease by 5 units"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating || item.quantity <= 0}
                      onClick={() => adjustQuantity(item, -1)}
                      className="p-1 text-slate-600 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                      title="Decrease 1 unit"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    
                    {/* loading spinner state inside value */}
                    <span className="px-2 text-xs font-bold font-mono min-w-[20px] text-center text-slate-700">
                      {isUpdating ? <RefreshCw className="h-3 w-3 animate-spin mx-auto text-amber-600" /> : item.quantity}
                    </span>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => adjustQuantity(item, 1)}
                      className="p-1 text-slate-600 hover:bg-white rounded-lg cursor-pointer"
                      title="Increase 1 unit"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => adjustQuantity(item, 5)}
                      className="p-1 px-2 hover:bg-white rounded-lg text-slate-600 cursor-pointer font-mono font-bold text-xs"
                      title="Increase by 5 units"
                    >
                      +5
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
