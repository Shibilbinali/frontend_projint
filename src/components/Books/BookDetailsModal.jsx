import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Modal from '../UI/Modal';
import Badge from '../UI/Badge';

export default function BookDetailsModal({ isOpen, onClose, book }) {
  const [activeTab, setActiveTab] = useState('front'); // 'front' or 'back'

  // Reset tab to front when the book changes or modal is reopened
  useEffect(() => {
    if (isOpen) {
      setActiveTab('front');
    }
  }, [book, isOpen]);

  if (!book) return null;

  const getStockBadge = () => {
    if (book.stock_qty === 0) return <Badge type="danger" dot>Out of Stock</Badge>;
    if (book.stock_qty <= book.low_stock_threshold) return <Badge type="warning" dot>Low Stock ({book.stock_qty} left)</Badge>;
    return <Badge type="success" dot>In Stock ({book.stock_qty} available)</Badge>;
  };

  const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
  
  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${API_URL}${path}`;
  };

  const frontCover = getImageUrl(book.cover_image || book.front_cover_url || book.cover_image_url);
  const backCover = getImageUrl(book.back_cover_url);
  const currentCover = activeTab === 'front' ? frontCover : backCover;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Book Details"
      size="lg"
      footer={
        <button className="btn btn-primary" onClick={onClose}>Close Details</button>
      }
    >
      <div className="book-details-container">
        <style>{`
          .book-details-container {
            display: grid;
            grid-template-columns: 280px 1fr;
            gap: var(--spacing-lg);
          }
          @media (max-width: 768px) {
            .book-details-container {
              grid-template-columns: 1fr;
            }
          }
          .gallery-section {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-md);
            align-items: center;
          }
          .cover-display-box {
            width: 240px;
            height: 360px;
            border-radius: var(--radius-md);
            border: 1px solid var(--color-border);
            overflow: hidden;
            position: relative;
            background: var(--color-surface-3);
            box-shadow: var(--shadow-md);
          }
          .cover-zoom-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
            cursor: zoom-in;
          }
          .cover-display-box:hover .cover-zoom-img {
            transform: scale(1.35);
          }
          .no-cover-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            padding: var(--spacing-md);
            color: var(--color-text-muted);
            text-align: center;
            gap: var(--spacing-sm);
            background: var(--color-surface-3);
          }
          .no-cover-icon {
            font-size: 3rem;
          }
          .no-cover-text {
            font-size: 0.85rem;
            font-weight: 600;
            max-width: 180px;
          }
          .gallery-tabs {
            display: flex;
            background: var(--color-surface-2);
            padding: 4px;
            border-radius: var(--radius-sm);
            width: 240px;
          }
          .gallery-tab-btn {
            flex: 1;
            padding: 6px 12px;
            font-size: 0.8rem;
            font-weight: 600;
            border: none;
            background: none;
            color: var(--color-text-muted);
            cursor: pointer;
            border-radius: var(--radius-xs);
            transition: all 0.2s ease;
            text-align: center;
          }
          .gallery-tab-btn.active {
            background: var(--color-surface);
            color: var(--color-primary);
            box-shadow: var(--shadow-sm);
          }
          .metadata-section {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-md);
          }
          .details-title {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 1.8rem;
            color: var(--color-text);
            margin: 0;
            line-height: 1.2;
          }
          .details-author {
            font-size: 1.1rem;
            color: var(--color-text-muted);
            margin-top: -4px;
          }
          .details-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--spacing-md);
            border-top: 1px solid var(--color-border);
            border-bottom: 1px solid var(--color-border);
            padding: var(--spacing-md) 0;
          }
          .details-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .details-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--color-text-muted);
          }
          .details-value {
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--color-text);
          }
          .details-desc-box {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
          }
          .details-desc-title {
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--color-text-muted);
            text-transform: uppercase;
          }
          .details-desc-content {
            font-size: 0.9rem;
            line-height: 1.5;
            color: var(--color-text-secondary);
            margin: 0;
          }
        `}</style>

        {/* Gallery */}
        <div className="gallery-section">
          <div className="cover-display-box">
            {currentCover ? (
              <img
                src={currentCover}
                alt={`${book.title} ${activeTab} cover`}
                className="cover-zoom-img"
                onError={(e) => { e.target.src = `${API_URL}/uploads/cover-not-available.svg`; }}
              />
            ) : (
              <div className="no-cover-placeholder">
                <span className="no-cover-icon">📖</span>
                <span className="no-cover-text">
                  {activeTab === 'front' ? 'Cover Not Available' : 'Back Cover Not Available'}
                </span>
              </div>
            )}
          </div>
          
          <div className="gallery-tabs">
            <button
              className={`gallery-tab-btn ${activeTab === 'front' ? 'active' : ''}`}
              onClick={() => setActiveTab('front')}
            >
              Front Cover
            </button>
            <button
              className={`gallery-tab-btn ${activeTab === 'back' ? 'active' : ''}`}
              onClick={() => setActiveTab('back')}
            >
              Back Cover
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="metadata-section">
          <div>
            <h2 className="details-title">{book.title}</h2>
            <div className="details-author">by {book.author}</div>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', alignItems: 'center' }}>
            {book.category_name && (
              <Badge type="primary">{book.category_name}</Badge>
            )}
            {book.tags && book.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, idx) => (
              <Badge key={idx} type="secondary">{tag}</Badge>
            ))}
            {getStockBadge()}
          </div>

          <div className="details-grid">
            <div className="details-item">
              <span className="details-label">ISBN</span>
              <span className="details-value">{book.isbn || '—'}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Price / Access</span>
              <span className="details-value">
                {parseFloat(book.price) === 0 ? (
                  <Badge type="success">FREE</Badge>
                ) : (
                  <span style={{ color: 'var(--color-primary)', fontSize: '1.05rem' }}>₹{parseFloat(book.price).toFixed(2)}</span>
                )}
              </span>
            </div>
            <div className="details-item">
              <span className="details-label">GST Tax Rate</span>
              <span className="details-value">
                {parseFloat(book.tax_rate || 0) === 0 ? (
                  <Badge type="muted">Tax Exempt (0%)</Badge>
                ) : (
                  `GST ${parseFloat(book.tax_rate).toFixed(1)}%`
                )}
              </span>
            </div>
            <div className="details-item">
              <span className="details-label">Format</span>
              <span className="details-value">{book.format || 'Printed'}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Page Count</span>
              <span className="details-value">{book.page_count || '—'} pages</span>
            </div>
            <div className="details-item">
              <span className="details-label">Publisher</span>
              <span className="details-value">{book.publisher || '—'}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Publication Year</span>
              <span className="details-value">{book.published_year || '—'}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Edition</span>
              <span className="details-value">{book.edition || '—'}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Cover Source</span>
              <span className="details-value" style={{ textTransform: 'capitalize' }}>{book.cover_source || '—'}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Reading Age</span>
              <span className="details-value">{book.reading_age || 'All Ages'}</span>
            </div>
          </div>

          <div className="details-desc-box">
            <span className="details-desc-title">Synopsis</span>
            <p className="details-desc-content">{book.description || 'No description available for this book.'}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
