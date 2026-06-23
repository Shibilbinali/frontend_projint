import { useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { settingsAPI } from '../../api';
import Modal from '../UI/Modal';

// Helper function to build standard UPI payload URI
const getUpiString = (sale, paymentSettings) => {
  const upiId = paymentSettings.upi_id || 'bookstorepos@upi';
  const merchantName = paymentSettings.merchant_name || 'BookStore POS';
  
  const amountVal = parseFloat(sale.total_amount || 0);
  const amount = Number.isInteger(amountVal) ? amountVal.toString() : amountVal.toFixed(2);
  
  // Format invoice number to replace slashes with dashes to avoid encoding issues in UPI apps
  const invoiceNum = (sale.invoice_number || String(sale.id)).replace(/\//g, '-');
  
  return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=Invoice-${invoiceNum}`;
};

function ReceiptContent({ sale, storeSettings, paymentSettings }) {
  const fmt = (n) => parseFloat(n || 0).toFixed(2);
  const saleDate = new Date(sale.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="receipt">
      <div className="receipt-header">
        <div className="receipt-title">📚 {storeSettings.store_name || 'BookStore POS'}</div>
        <div className="receipt-subtitle">Point of Sale Receipt</div>
        <div style={{ fontSize: '0.75rem', marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: '#1a1a1a' }}>
          <span>📧 {storeSettings.store_email || 'Bookstorepos@gmail.com'}</span>
          <span>📞 {storeSettings.store_phone || '9559440043'}</span>
        </div>
        <div style={{ fontSize: '0.7,rem', marginTop: 8, color: '#666' }}>
          {saleDate}<br />
          {sale.invoice_number ? `Invoice: ${sale.invoice_number}` : `Invoice #${String(sale.id).padStart(6, '0')}`}
        </div>
      </div>

      {sale.customer_name && (
        <div style={{ marginBottom: 12, fontSize: '0.8rem' }}>
          <strong>Customer:</strong> {sale.customer_name}<br />
          {sale.customer_phone && <span><strong>Phone:</strong> {sale.customer_phone}</span>}
        </div>
      )}

      <hr className="receipt-divider" />
      <div style={{ fontSize: '0.75rem', marginBottom: 8 }}>
        <strong>ITEMS</strong>
      </div>

      {(sale.items || []).map((item, i) => (
        <div key={i}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.book_title}</div>
          <div className="receipt-item" style={{ color: '#666', fontSize: '0.75rem' }}>
            <span>{item.quantity} × ₹{fmt(item.unit_price)}</span>
            <span>₹{fmt(item.subtotal)}</span>
          </div>
        </div>
      ))}

      <hr className="receipt-divider" />

      <div className="receipt-item">
        <span>Subtotal</span>
        <span>₹{fmt(sale.subtotal)}</span>
      </div>
      {sale.is_round_off ? (
        <>
          {(() => {
            const sub = parseFloat(sale.subtotal) || 0;
            const tax = parseFloat(sale.tax) || 0;
            const gross = sub + tax;
            const rounded = Math.floor(gross / 10) * 10;
            const roundOff = Math.round((gross - rounded) * 100) / 100;
            const manual = (parseFloat(sale.discount) || 0) - roundOff;
            return (
              <>
                {roundOff > 0 && (
                  <div className="receipt-item" style={{ color: '#2E7D32' }}>
                    <span>Round-Off Discount</span>
                    <span>- ₹{fmt(roundOff)}</span>
                  </div>
                )}
                {manual > 0 && (
                  <div className="receipt-item" style={{ color: '#2E7D32' }}>
                    <span>Manual Discount</span>
                    <span>- ₹{fmt(manual)}</span>
                  </div>
                )}
              </>
            );
          })()}
        </>
      ) : (
        parseFloat(sale.discount) > 0 && (
          <div className="receipt-item" style={{ color: '#2E7D32' }}>
            <span>Discount</span>
            <span>- ₹{fmt(sale.discount)}</span>
          </div>
        )
      )}
      {parseFloat(sale.tax) > 0 && (
        <div className="receipt-item">
          <span>Tax</span>
          <span>₹{fmt(sale.tax)}</span>
        </div>
      )}

      <hr className="receipt-divider" />
      <div className="receipt-total">
        <span>TOTAL</span>
        <span>₹{fmt(sale.total_amount)}</span>
      </div>

      <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#444' }}>
        <div className="receipt-item">
          <span>Payment</span>
          <span style={{ textTransform: 'capitalize' }}>{sale.payment_method}</span>
        </div>
        {sale.cashier_name && (
          <div className="receipt-item">
            <span>Cashier</span>
            <span>{sale.cashier_name}</span>
          </div>
        )}
      </div>

      {sale.payment_method === 'upi' && paymentSettings.upi_enabled && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <hr className="receipt-divider" />
          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scan & Pay</div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 8, background: '#fff' }}>
            <QRCodeSVG 
              value={getUpiString(sale, paymentSettings)}
              size={130}
              level="M"
              includeMargin={true}
            />
          </div>
          <div style={{ fontSize: '0.7rem', color: '#333', marginTop: 6, lineHeight: 1.4 }}>
            <strong>UPI ID:</strong> {paymentSettings.upi_id || 'bookstorepos@upi'}<br />
            <strong>Amount:</strong> ₹{fmt(sale.total_amount)}
          </div>
        </div>
      )}

      <div className="receipt-footer">
        <hr className="receipt-divider" />
        <p>Thank you for your purchase!</p>
        <p>Happy Reading! 📖</p>
      </div>
    </div>
  );
}

export default function ReceiptModal({ isOpen, onClose, sale }) {
  const printRef = useRef();
  
  const [storeSettings, setStoreSettings] = useState({
    store_name: 'BookStore POS',
    store_email: 'Bookstorepos@gmail.com',
    store_phone: '9559440043'
  });
  const [paymentSettings, setPaymentSettings] = useState({
    upi_enabled: true,
    upi_id: 'bookstorepos@upi',
    merchant_name: 'BookStore POS'
  });

  useEffect(() => {
    if (isOpen && sale) {
      settingsAPI.getStore()
        .then((res) => setStoreSettings(res.data))
        .catch((err) => console.error('Failed to load store settings in receipt:', err));

      settingsAPI.getPayment()
        .then((res) => setPaymentSettings(res.data))
        .catch((err) => console.error('Failed to load payment settings in receipt:', err));
    }
  }, [isOpen, sale]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: sale ? `Receipt-${sale.invoice_number || sale.id}` : 'Receipt',
  });

  if (!sale) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sale Receipt"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handlePrint} id="print-receipt-btn">
            <Printer size={16} /> Print Receipt
          </button>
        </>
      }
    >
      <div ref={printRef}>
        <ReceiptContent 
          sale={sale} 
          storeSettings={storeSettings} 
          paymentSettings={paymentSettings} 
        />
      </div>
    </Modal>
  );
}
