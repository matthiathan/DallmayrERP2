import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAuth } from '../context/AuthContext';
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
  RefreshCw,
  PlusCircle,
  X,
  History,
  FileText
} from 'lucide-react';

export default function StockPage() {
  const isOnline = useNetworkStatus();
  const { queuePayload } = useOfflineSync();
  const { profile } = useAuth();

  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Stock Transaction Modal State
  const [trxModalOpen, setTrxModalOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [trxType, setTrxType] = useState<'in' | 'out' | 'adjustment'>('adjustment');
  const [trxQtyChanged, setTrxQtyChanged] = useState<number>(1);
  const [trxNotes, setTrxNotes] = useState<string>('');
  const [trxActionLoading, setTrxActionLoading] = useState<boolean>(false);
  
  // Success states
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const loadStock = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('stock_items').order('item_name');
      
      const loaded = ((data || []) as any[]).map(item => {
        // Map current_quantity if it exists on database, else quantity
        const qty = typeof item.current_quantity === 'number' ? item.current_quantity : item.quantity;
        return {
          ...item,
          quantity: qty,
          current_quantity: qty
        };
      });

      setStocks(loaded as StockItem[]);
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
    const currentQty = item.current_quantity ?? item.quantity;
    const finalQty = Math.max(0, currentQty + delta);
    if (finalQty === currentQty) return;

    setUpdatingId(item.id);
    const updateData = { 
      current_quantity: finalQty,
      quantity: finalQty 
    };

    try {
      // 1. Update stock levels
      const { error } = await supabase
        .from('stock_items')
        .update(updateData)
        .eq('id', item.id);

      // 2. Log Transaction insertion
      const trxPayload = {
        id: `trx-${Math.random().toString(36).substr(2, 9)}`,
        stock_item_id: item.id,
        type: delta > 0 ? 'in' : 'out',
        quantity_changed: Math.abs(delta),
        performed_by: profile?.name || profile?.email || 'System FastAdj',
        created_at: new Date().toISOString(),
        notes: `Fast adjustment of ${delta > 0 ? '+' : ''}${delta} units`
      };

      const { error: trxErr } = await supabase
        .from('stock_transactions')
        .insert(trxPayload);

      if (error) {
        queuePayload('UPDATE_STOCK', 'stock_items', item.id, updateData);
        // Instant Optimistic Update locally
        setStocks(prev => prev.map(s => s.id === item.id ? { ...s, quantity: finalQty, current_quantity: finalQty } : s));
        setSuccessToast('Adjusted and queued locally structure offline!');
      } else {
        setSuccessToast(`Stock quantity updated successfully! (${delta > 0 ? '+' : ''}${delta} parts)`);
        loadStock();
      }
      
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setTrxActionLoading(true);
    setSuccessToast(null);
    setErrorToast(null);

    const currentQty = selectedItem.current_quantity ?? selectedItem.quantity;
    let finalQty = currentQty;

    if (trxType === 'in') {
      finalQty = currentQty + trxQtyChanged;
    } else if (trxType === 'out') {
      finalQty = Math.max(0, currentQty - trxQtyChanged);
    } else {
      // Direct adjustment count
      finalQty = Math.max(0, trxQtyChanged);
    }

    try {
      // Compute correct change
      const difference = finalQty - currentQty;

      const trxPayload = {
        id: `trx-${Math.random().toString(36).substr(2, 9)}`,
        stock_item_id: selectedItem.id,
        type: trxType,
        quantity_changed: Math.abs(difference),
        performed_by: profile?.name || profile?.email || 'Logistics Operator',
        created_at: new Date().toISOString(),
        notes: trxNotes.trim() || `Inventory calibration via Transaction ledger`
      };

      // 1. Insert transaction log
      const { error: trxErr } = await supabase
        .from('stock_transactions')
        .insert(trxPayload);

      if (trxErr) throw trxErr;

      // 2. Update stock item columns
      const { error: itemErr } = await supabase
        .from('stock_items')
        .update({
          current_quantity: finalQty,
          quantity: finalQty
        })
        .eq('id', selectedItem.id);

      if (itemErr) throw itemErr;

      setSuccessToast(`Stock Transaction executed! ${selectedItem.item_name} calibrated to ${finalQty} units.`);
      setTrxModalOpen(false);
      setTrxNotes('');
      setTrxQtyChanged(1);
      
      await loadStock();
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorToast(err.message || 'Error processing physical stock transaction.');
    } finally {
      setTrxActionLoading(false);
    }
  };

  const openTrxModal = (item: StockItem) => {
    setSelectedItem(item);
    setTrxQtyChanged(1);
    setTrxNotes('');
    setTrxType('adjustment');
    setTrxModalOpen(true);
  };

  const filteredStock = stocks.filter(stock => {
    const matchesSearch = 
      stock.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.warehouse_location.toLowerCase().includes(searchQuery.toLowerCase());

    const isLow = (stock.current_quantity ?? stock.quantity) <= stock.min_stock_level;
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
        
        {stocks.length > 0 && (
          <button
            type="button"
            onClick={() => openTrxModal(stocks[0])}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-amber-500 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-pointer transition-all self-stretch sm:self-auto shadow-sm"
            id="btn-trigger-stock-trx"
          >
            <PlusCircle className="h-4 w-4" /> Log Custom Transaction
          </button>
        )}
      </div>

      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center gap-2 font-semibold">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
          <span>{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4.5 w-4.5 text-rose-650" />
          <span>{errorToast}</span>
        </div>
      )}

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
            const currentQty = item.current_quantity ?? item.quantity;
            const isLow = currentQty <= item.min_stock_level;
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
                      {currentQty} units
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

                {/* Adjuster controls & transactional triggers */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => openTrxModal(item)}
                      className="text-amber-600 hover:text-amber-700 font-bold uppercase tracking-wider"
                    >
                      Log Transaction Ledger →
                    </button>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Fast Adj.</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-slate-400">Add/Remove:</span>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                      <button
                        type="button"
                        disabled={isUpdating || currentQty <= 0}
                        onClick={() => adjustQuantity(item, -5)}
                        className="p-1 px-2 hover:bg-white rounded-lg text-slate-600 disabled:opacity-30 cursor-pointer hover:shadow-xs font-mono font-bold text-xs"
                        title="Decrease by 5 units"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating || currentQty <= 0}
                        onClick={() => adjustQuantity(item, -1)}
                        className="p-1 text-slate-600 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                        title="Decrease 1 unit"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      
                      {/* loading spinner state inside value */}
                      <span className="px-2 text-xs font-bold font-mono min-w-[20px] text-center text-slate-700">
                        {isUpdating ? <RefreshCw className="h-3 w-3 animate-spin mx-auto text-amber-600" /> : currentQty}
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

              </div>
            );
          })}
        </div>
      )}

      {/* Stock transaction modal */}
      {trxModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in" id="stock-trx-modal">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 font-mono text-[9px] font-bold uppercase tracking-wider block mb-1">
                  Logistics Protocol
                </span>
                <h3 className="font-bold text-slate-800 text-sm">Execute Stock Transaction</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setTrxModalOpen(false)} 
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-650 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="p-5 space-y-4 text-xs">
              
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1">
                  Select Stock Inventory Item *
                </label>
                <select
                  value={selectedItem.id}
                  onChange={(e) => {
                    const found = stocks.find(s => s.id === e.target.value);
                    if (found) setSelectedItem(found);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer text-xs font-semibold"
                >
                  {stocks.map(item => (
                    <option key={item.id} value={item.id}>{item.item_name} (SKU: {item.sku})</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-100 border border-slate-150 rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Current Quantity In Stock</span>
                  <span className="font-bold text-slate-850">{selectedItem.current_quantity ?? selectedItem.quantity} units</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Bin Storage Location</span>
                  <span className="font-bold text-indigo-700 font-mono text-[11px] block text-right">{selectedItem.warehouse_location}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1">
                    Transaction Type *
                  </label>
                  <select
                    value={trxType}
                    onChange={(e) => setTrxType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer text-xs font-semibold"
                  >
                    <option value="in">📦 RESTOCK (IN)</option>
                    <option value="out">🔧 USAGE / DISPATCH (OUT)</option>
                    <option value="adjustment">⚖️ PHYSICAL COUNT / ADJ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1 font-sans">
                    {trxType === 'adjustment' ? 'New Quant. Value *' : 'Quantity Changed *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={trxQtyChanged}
                    onChange={(e) => setTrxQtyChanged(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 pl-1">
                  Transaction Notes / Reference
                </label>
                <textarea
                  rows={2.5}
                  placeholder="e.g. Periodic stock cycle count Calibration, restock order reference #771032..."
                  value={trxNotes}
                  onChange={(e) => setTrxNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3.5">
                <button 
                  type="button" 
                  onClick={() => setTrxModalOpen(false)} 
                  className="px-4 py-2 hover:bg-slate-100 rounded-xl text-slate-500 font-semibold cursor-pointer"
                  disabled={trxActionLoading}
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-slate-900 text-amber-500 font-bold hover:bg-slate-800 rounded-xl shadow-md cursor-pointer transition-colors"
                  disabled={trxActionLoading}
                >
                  {trxActionLoading ? 'Executing ledger write...' : 'Commit Transaction'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
