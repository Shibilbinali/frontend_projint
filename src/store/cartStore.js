import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],
  customer: null,
  discount: 0,
  paymentMethod: 'cash',
  isRoundOff: false,

  addItem: (book) => {
    const existing = get().items.find((i) => i.id === book.id);
    if (existing) {
      if (existing.quantity >= book.stock_qty) return false;
      set({
        items: get().items.map((i) =>
          i.id === book.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      if (book.stock_qty <= 0) return false;
      set({
        items: [
          ...get().items,
          {
            ...book,
            quantity: 1,
            unit_price: parseFloat(book.price),
            tax_rate: parseFloat(book.tax_rate) || 0,
          },
        ],
      });
    }
    return true;
  },

  removeItem: (bookId) => {
    set({ items: get().items.filter((i) => i.id !== bookId) });
  },

  updateQuantity: (bookId, quantity) => {
    if (quantity <= 0) {
      set({ items: get().items.filter((i) => i.id !== bookId) });
    } else {
      set({
        items: get().items.map((i) => (i.id === bookId ? { ...i, quantity } : i)),
      });
    }
  },

  setCustomer: (customer) => set({ customer }),
  setDiscount: (discount) => set({ discount: parseFloat(discount) || 0 }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setIsRoundOff: (isRoundOff) => set({ isRoundOff }),

  clearCart: () => set({ items: [], customer: null, discount: 0, paymentMethod: 'cash', isRoundOff: false }),

  // Subtotal = sum of (unit_price × quantity) per item
  getSubtotal: () =>
    get().items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0),

  // Tax = sum of per-item tax (auto-computed from each book's tax_rate)
  getCartTax: () =>
    get().items.reduce((sum, i) => {
      const itemSubtotal = i.unit_price * i.quantity;
      return sum + itemSubtotal * ((i.tax_rate || 0) / 100);
    }, 0),

  // Per-item tax amount for display
  getItemTax: (item) =>
    item.unit_price * item.quantity * ((item.tax_rate || 0) / 100),

  // Auto round-off discount calculation
  getAutoDiscountAmount: () => {
    const grossTotal = get().getSubtotal() + get().getCartTax();
    const roundedTotal = Math.floor(grossTotal / 10) * 10;
    return Math.round((grossTotal - roundedTotal) * 100) / 100;
  },

  // Get active discount amount based on isRoundOff toggle
  getDiscountAmount: () => {
    return get().isRoundOff ? get().getAutoDiscountAmount() : get().discount;
  },

  // Grand Total = Subtotal - round-off - manual + cartTax
  getTotal: () => {
    const sub = get().getSubtotal();
    const tax = get().getCartTax();
    const roundOff = get().isRoundOff ? get().getAutoDiscountAmount() : 0;
    const manual = get().discount;
    return sub - roundOff - manual + tax;
  },

  getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
