import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { productService } from '../../services/api'
import { showToast } from '../../utils/toast'
import PondChartCard from '../../components/charts/PondChartCard'
import '../../styles/product-management.css'

const emptyCategoryForm = {
  categoryName: '',
  note: '',
}

const emptyProductForm = {
  categoryId: '',
  categoryName: '',
  productName: '',
  unit: '',
  supplier: '',
  unitPrice: '',
  note: '',
}

const emptyOverview = {
  totalCategories: 0,
  totalProducts: 0,
  totalSuppliers: 0,
  topCategory: null,
  categoryStats: [],
  supplierStats: [],
  topProducts: [],
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  return `${amount.toLocaleString('vi-VN')} đ`
}

const normalizeText = (value) => String(value || '').trim().toLowerCase()

const createPalette = (baseColors) => (index) => baseColors[index % baseColors.length]

const pickCategoryColor = createPalette(['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'])
const pickSupplierColor = createPalette(['#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#f43f5e', '#64748b'])
const pickProductColor = createPalette(['#0284c7', '#0f766e', '#f59e0b', '#7c3aed', '#16a34a', '#ef4444'])

const ProductManagementPage = ({ roleLabel = 'Owner' }) => {
  const [overview, setOverview] = useState(emptyOverview)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [activeTab, setActiveTab] = useState('products')
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [search, setSearch] = useState("")
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL')
  const [categoryPage, setCategoryPage] = useState(1)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm)
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingProductId, setEditingProductId] = useState(null)
  const [detailType, setDetailType] = useState('')
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const DEFAULT_PAGE_SIZE = 10

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [overviewRes, categoriesRes, productsRes] = await Promise.all([
        productService.getProductOverview(),
        productService.getProductCategories(),
        productService.getProducts(),
      ])

      setOverview(overviewRes?.data?.data || emptyOverview)
      setCategories(categoriesRes?.data?.data || [])
      setProducts(productsRes?.data?.data || [])
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tải được dữ liệu sản phẩm', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalSuppliers = useMemo(() => {
    const suppliers = new Set(
      products
        .map((item) => String(item.supplier || '').trim())
        .filter(Boolean)
    )
    return suppliers.size
  }, [products])

  const filteredCategories = useMemo(() => {
    return categories.filter((item) => {
      const matchesSearch = !categorySearch || normalizeText(item.category_name).includes(normalizeText(categorySearch))
      const count = Number(item.product_count || 0)
      const matchesFilter =
        categoryFilter === 'ALL'
          ? true
          : categoryFilter === 'HAS_PRODUCTS'
            ? count > 0
            : count === 0
      return matchesSearch && matchesFilter
    })
  }, [categories, categorySearch, categoryFilter])

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesProduct = !search || normalizeText(item.product_name).includes(normalizeText(search))
      const matchesSupplier = !search || normalizeText(item.supplier).includes(normalizeText(search))
      const matchesCategory = productCategoryFilter === 'ALL' || String(item.category_id) === String(productCategoryFilter)
      return matchesProduct && matchesSupplier && matchesCategory
    })
  }, [products, search, productCategoryFilter])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / pageSize)
  )

  const safePage = Math.min(
    Math.max(currentPage, 1),
    totalPages
  )

  const startIndex = (safePage - 1) * pageSize
  const endIndex = startIndex + pageSize

  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  // Pagination cho categories
  const categoryTotalPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / DEFAULT_PAGE_SIZE)
  )

  const categoryPageSafe = Math.min(
    Math.max(categoryPage, 1),
    categoryTotalPages
  )

  const categoryStartIndex = (categoryPageSafe - 1) * DEFAULT_PAGE_SIZE
  const categoryEndIndex = categoryStartIndex + DEFAULT_PAGE_SIZE

  const paginatedCategories = filteredCategories.slice(
    categoryStartIndex,
    categoryEndIndex
  )

  const categoryChartData = useMemo(() => {
    return (overview.categoryStats || []).map((item, index) => ({
      label: item.label,
      value: Number(item.value || 0),
      color: pickCategoryColor(index),
    }))
  }, [overview.categoryStats])

  const supplierChartData = useMemo(() => {
    return (overview.supplierStats || []).map((item, index) => ({
      label: item.label,
      value: Number(item.value || 0),
      color: pickSupplierColor(index),
    }))
  }, [overview.supplierStats])

  const productChartData = useMemo(() => {
    return (overview.topProducts || []).map((item, index) => ({
      label: item.label,
      value: Number(item.value || 0),
      color: pickProductColor(index),
    }))
  }, [overview.topProducts])

  const openCategoryModal = (category = null) => {
    if (category) {
      setEditingCategoryId(category.category_id)
      setCategoryForm({
        categoryName: category.category_name || '',
        note: category.note || '',
      })
    } else {
      setEditingCategoryId(null)
      setCategoryForm(emptyCategoryForm)
    }
    setShowCategoryModal(true)
  }

  const openProductModal = (product = null) => {
    if (product) {
      setEditingProductId(product.product_id)
      setProductForm({
        categoryId: product.category_id ? String(product.category_id) : '',
        categoryName: '',
        productName: product.product_name || '',
        unit: product.unit || '',
        supplier: product.supplier || '',
        unitPrice: String(product.unit_price ?? ''),
        note: product.note || '',
      })
    } else {
      setEditingProductId(null)
      setProductForm(emptyProductForm)
    }
    setShowProductModal(true)
  }

  const handleCategoryChange = (field, value) => {
    setCategoryForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleProductChange = (field, value) => {
    setProductForm((prev) => {
      if (field === 'categoryId') {
        return {
          ...prev,
          categoryId: value,
          categoryName: value === 'OTHER' ? prev.categoryName : '',
        }
      }
      return { ...prev, [field]: value }
    })
  }

  const handleSubmitCategory = async (event) => {
    event.preventDefault()

    if (!window.confirm(editingCategoryId ? 'Bạn có muốn cập nhật danh mục này?' : 'Bạn có muốn thêm danh mục này?')) {
      return
    }

    if (!categoryForm.categoryName.trim()) {
      showToast({ title: 'Tên danh mục không được để trống', type: 'error' })
      return
    }

    try {
      setSavingCategory(true)
      const payload = {
        categoryName: categoryForm.categoryName.trim(),
        note: categoryForm.note.trim(),
      }

      if (editingCategoryId) {
        await productService.updateProductCategory(editingCategoryId, payload)
        showToast({ title: 'Đã cập nhật danh mục', type: 'success' })
      } else {
        await productService.createProductCategory(payload)
        showToast({ title: 'Đã tạo danh mục sản phẩm', type: 'success' })
      }

      setShowCategoryModal(false)
      setCategoryForm(emptyCategoryForm)
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không lưu được danh mục', type: 'error' })
    } finally {
      setSavingCategory(false)
    }
  }

  const handleSubmitProduct = async (event) => {
    event.preventDefault()

    if (!window.confirm(editingProductId ? 'Bạn có muốn cập nhật sản phẩm này?' : 'Bạn có muốn thêm sản phẩm này?')) {
      return
    }

    if (!productForm.productName.trim()) {
      showToast({ title: 'Tên sản phẩm không được để trống', type: 'error' })
      return
    }

    if (!productForm.unit.trim()) {
      showToast({ title: 'Đơn vị tính không được để trống', type: 'error' })
      return
    }

    if (productForm.unitPrice !== '' && Number(productForm.unitPrice) < 0) {
      showToast({ title: 'Giá đơn vị phải lớn hơn hoặc bằng 0', type: 'error' })
      return
    }

    if (!editingProductId && !productForm.categoryId) {
      showToast({ title: 'Vui lòng chọn danh mục sản phẩm', type: 'error' })
      return
    }

    if (!editingProductId && productForm.categoryId === 'OTHER' && !productForm.categoryName.trim()) {
      showToast({ title: 'Vui lòng nhập tên danh mục mới', type: 'error' })
      return
    }

    try {
      setSavingProduct(true)
      const payload = {
        categoryId: productForm.categoryId,
        categoryName: productForm.categoryName.trim(),
        productName: productForm.productName.trim(),
        unit: productForm.unit.trim(),
        supplier: productForm.supplier.trim(),
        unitPrice: productForm.unitPrice === '' ? 0 : Number(productForm.unitPrice),
        note: productForm.note.trim(),
      }

      if (editingProductId) {
        await productService.updateProduct(editingProductId, payload)
        showToast({ title: 'Đã cập nhật sản phẩm', type: 'success' })
      } else {
        await productService.createProduct(payload)
        showToast({ title: 'Đã tạo sản phẩm', type: 'success' })
      }

      setShowProductModal(false)
      setProductForm(emptyProductForm)
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không lưu được sản phẩm', type: 'error' })
    } finally {
      setSavingProduct(false)
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Bạn chắc chắn muốn xoá danh mục này?')) return

    try {
      await productService.deleteProductCategory(categoryId)
      showToast({ title: 'Đã xoá danh mục', type: 'success' })
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không thể xoá danh mục', type: 'error' })
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Bạn chắc chắn muốn xoá sản phẩm này?')) return

    try {
      await productService.deleteProduct(productId)
      showToast({ title: 'Đã xoá sản phẩm', type: 'success' })
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không thể xoá sản phẩm', type: 'error' })
    }
  }

  const openCategoryDetail = async (categoryId) => {
    try {
      setDetailType('category')
      setDetailData(null)
      setShowDetailModal(true)
      setDetailLoading(true)
      const res = await productService.getProductCategoryById(categoryId)
      setDetailData(res?.data?.data || null)
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tải được chi tiết danh mục', type: 'error' })
      setShowDetailModal(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const openProductDetail = async (productId) => {
    try {
      setDetailType('product')
      setDetailData(null)
      setShowDetailModal(true)
      setDetailLoading(true)
      const res = await productService.getProductById(productId)
      setDetailData(res?.data?.data || null)
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tải được chi tiết sản phẩm', type: 'error' })
      setShowDetailModal(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setDetailType('')
    setDetailData(null)
  }

  if (loading) {
    return (
      <div className="dashboard product-management_page">
        <div className="flex-center" style={{ height: '100vh' }}>
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard admin-page product-mgmt">
      <div className="table-container table-panel">

        <div className="table-header">
          <div>
            <h1>Quản lý sản phẩm</h1>
            <p className="table-subtitle">Quản lý danh mục và sản phẩm sử dụng trong nuôi tôm</p>
          </div>

          <div className="product-management_header-actions">
            <button className="btn btn-primary" onClick={() => openProductModal()}>
              + Thêm sản phẩm
            </button>
            <button className="btn btn-secondary" onClick={() => openCategoryModal()}>
              + Thêm danh mục
            </button>
          </div>
        </div>

        <div className="stats-grid">

          <div className="stats-card stats-card--primary">
            <span className="stats-card-label">Tổng danh mục</span>
            <strong className="stats-card-value">{overview.totalCategories}</strong>
            {/* <span className="stats-card-subtitle">Dữ liệu theo trại {roleLabel}</span> */}
          </div>

          <div className="stats-card stats-card--success">
            <span className="stats-card-label">Tổng sản phẩm</span>
            <strong className="stats-card-value">{overview.totalProducts}</strong>
            {/* <span className="stats-card-subtitle">Sẵn sàng cho nghiệp vụ khác</span> */}
          </div>

          <div className="stats-card stats-card--warning">
            <span className="stats-card-label">Tổng nhà cung cấp</span>
            <strong className="stats-card-value">{totalSuppliers}</strong>
            {/* <span className="stats-card-subtitle">Từ danh sách hiện có</span> */}
          </div>

          <div className="stats-card stats-card--info">
            <span className="stats-card-label">Danh mục nhiều sản phẩm nhất</span>
            <strong className="stats-card-value">{overview.topCategory?.label || '-'}</strong>
            {/* <span className="stats-card-subtitle">{overview.topCategory ? `${overview.topCategory.value} sản phẩm` : 'Chưa có dữ liệu'}</span> */}
          </div>
        </div>

        <div className="product-management_chart-grid">
          <PondChartCard prefix="product-management" title="Số lượng sản phẩm theo danh mục" type="doughnut" data={categoryChartData} total={overview.totalProducts} />
          <PondChartCard prefix="product-management" title="Phân bố sản phẩm theo nhà cung cấp" type="bar" data={supplierChartData} />
          <PondChartCard prefix="product-management" title="Sản phẩm được sử dụng nhiều nhất" type="bar" data={productChartData} />
        </div>

        <div className="table-toolbar product-management_toolbar">
          <div className="product-management_tabs">
            <button className={`product-management_tab ${activeTab === 'products' ? 'product-management_tab--active' : ''}`} onClick={() => setActiveTab('products')}>
              Sản phẩm
            </button>
            <button className={`product-management_tab ${activeTab === 'categories' ? 'product-management_tab--active' : ''}`} onClick={() => setActiveTab('categories')}>
              Danh mục
            </button>
          </div>
        </div>

        {activeTab === 'products' ? (
          <div className="table-panel product-management_table-panel">
            {/* <div className="table-header">
              <div>
                <h2>Danh sách sản phẩm ({filteredProducts.length})</h2>
                <p className="table-subtitle">Dữ liệu dùng chung cho toàn bộ nghiệp vụ trong trại</p>
              </div>
            </div> */}

            <div className="table-toolbar product-management_toolbar">
              <div className="table-search">
                <span className="table-search-icon">⌕</span>
                <input
                  type="search"
                  placeholder="Tìm theo tên sản phẩm hoặc nhà cung cấp"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <select
                className="table-filter"
                value={productCategoryFilter}
                onChange={(e) => {
                  setProductCategoryFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="ALL">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="table-wrapper">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Tên sản phẩm</th>
                    <th>Nhà cung cấp</th>
                    <th>Đơn vị tính</th>
                    <th>Giá đơn vị</th>
                    <th>Danh mục</th>
                    <th>Cập nhật gần nhất</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.length > 0 ? (
                    paginatedProducts.map((product) => (
                      <tr key={product.product_id}>
                        <td>
                          <strong>{product.product_name}</strong>
                          {/* <div className="product-management_row-subtext">{product.product_code}</div> */}
                        </td>
                        <td>{product.supplier || '-'}</td>
                        <td>{product.unit || '-'}</td>
                        <td>{formatCurrency(product.unit_price)}</td>
                        <td>{product.category_name || '-'}</td>
                        <td>{formatDateTime(product.updated_at || product.created_at)}</td>
                        <td>
                          <div className="table-actions product-management_actions">
                            <button className="table-action-btn table-action-btn--view" title="Xem chi tiết" onClick={() => openProductDetail(product.product_id)}>
                              👁
                            </button>
                            <button className="table-action-btn table-action-btn--edit" title="Chỉnh sửa" onClick={() => openProductModal(product)}>
                              ✎
                            </button>
                            <button className="table-action-btn table-action-btn--delete" title="Xóa" onClick={() => handleDeleteProduct(product.product_id)}>
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="product-management_empty-cell">
                        Không có sản phẩm nào phù hợp
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-pagination">
              <div className="table-pagination-left">
                <span>Số mục trên trang</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value) || DEFAULT_PAGE_SIZE)
                    setCurrentPage(1)
                  }}
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <span>{filteredProducts.length === 0 ? 0 : startIndex + 1}-{endIndex} / {filteredProducts.length}</span>
              </div>
              <div className="table-pagination-right">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safePage <= 1}
                >
                  ‹
                </button>
                <span className="table-page-pill">{safePage}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safePage >= totalPages}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="table-panel product-management_table-panel">
            {/* <div className="table-header">
              <div>
                <h2>Danh sách danh mục ({filteredCategories.length})</h2>
                <p className="table-subtitle">Mỗi danh mục là một nhóm sản phẩm dùng chung trong trại</p>
              </div>
            </div> */}

            <div className="table-toolbar product-management_toolbar">
              <div className="table-search">
                <span className="table-search-icon">⌕</span>
                <input
                  type="search"
                  placeholder="Tìm theo tên danh mục"
                  value={categorySearch}
                  onChange={(e) => {
                    setCategorySearch(e.target.value)
                    setCategoryPage(1)
                  }}
                />
              </div>
              <select
                className="table-filter"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value)
                  setCategoryPage(1)
                }}
              >
                <option value="ALL">Tất cả</option>
                <option value="HAS_PRODUCTS">Đang có sản phẩm</option>
                <option value="EMPTY">Chưa có sản phẩm</option>
              </select>
            </div>

            <div className="table-wrapper">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Tên danh mục</th>
                    <th>Số lượng sản phẩm</th>
                    <th>Người tạo</th>
                    <th>Cập nhật gần nhất</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCategories.length > 0 ? (
                    paginatedCategories.map((category) => (
                      <tr key={category.category_id}>
                        <td>
                          <strong>{category.category_name}</strong>
                          {/* <div className="product-management_row-subtext">{category.category_code}</div> */}
                        </td>
                        <td>{category.product_count || 0}</td>
                        <td>{category.created_by_name || '-'}</td>
                        <td>{formatDateTime(category.latest_activity_at || category.updated_at || category.created_at)}</td>
                        <td>
                          <div className="table-actions product-management_actions">
                            <button className="table-action-btn table-action-btn--view" title="Xem chi tiết" onClick={() => openCategoryDetail(category.category_id)}>
                              👁
                            </button>
                            <button className="table-action-btn table-action-btn--edit" title="Chỉnh sửa" onClick={() => openCategoryModal(category)}>
                              ✎
                            </button>
                            <button className="table-action-btn table-action-btn--delete" title="Xóa" onClick={() => handleDeleteCategory(category.category_id)}>
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="product-management_empty-cell">
                        Không có danh mục nào phù hợp
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-pagination">
              <div className="table-pagination-left">
                <span>Số mục trên trang</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value) || DEFAULT_PAGE_SIZE)
                    setCurrentPage(1)
                  }}
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <span>{filteredProducts.length === 0 ? 0 : startIndex + 1}-{endIndex} / {filteredProducts.length}</span>
              </div>
              <div className="table-pagination-right">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safePage <= 1}
                >
                  ‹
                </button>
                <span className="table-page-pill">{safePage}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safePage >= totalPages}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        )}

        {showCategoryModal && (
          <div className="modal" onClick={() => setShowCategoryModal(false)}>
            <div className="modal-content product-management_modal-content" onClick={(event) => event.stopPropagation()}>
              <h2>{editingCategoryId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}</h2>
              <form onSubmit={handleSubmitCategory} className="product-management_form-grid">
                <div className="product-management_form-group">
                  <label>Tên danh mục *</label>
                  <input
                    type="text"
                    value={categoryForm.categoryName}
                    onChange={(event) => handleCategoryChange('categoryName', event.target.value)}
                    placeholder="Ví dụ: Thức ăn, Men vi sinh, Hóa chất"
                  />
                </div>
                <div className="product-management_form-group product-management_form-group--full">
                  <label>Ghi chú</label>
                  <textarea
                    value={categoryForm.note}
                    onChange={(event) => handleCategoryChange('note', event.target.value)}
                    placeholder="Ghi chú thêm cho danh mục..."
                  />
                </div>
                <div className="product-management_form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingCategory}>
                    {savingCategory ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showProductModal && (
          <div className="modal" onClick={() => setShowProductModal(false)}>
            <div className="modal-content product-management_modal-content" onClick={(event) => event.stopPropagation()}>
              <h2>{editingProductId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
              <form onSubmit={handleSubmitProduct} className="product-management_form-grid">
                <div className="product-management_form-group">
                  <label>Danh mục sản phẩm *</label>
                  <select
                    value={productForm.categoryId}
                    onChange={(event) => handleProductChange('categoryId', event.target.value)}
                  >
                    <option value="">Chọn danh mục</option>
                    {!editingProductId && <option value="OTHER">Danh mục khác</option>}
                    {categories.map((category) => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                {!editingProductId && productForm.categoryId === 'OTHER' && (
                  <div className="product-management_form-group">
                    <label>Tên danh mục mới *</label>
                    <input
                      type="text"
                      value={productForm.categoryName}
                      onChange={(event) => handleProductChange('categoryName', event.target.value)}
                      placeholder="Ví dụ: Vi sinh mới, Thiết bị đo"
                    />
                  </div>
                )}

                <div className="product-management_form-group">
                  <label>Tên sản phẩm *</label>
                  <input
                    type="text"
                    value={productForm.productName}
                    onChange={(event) => handleProductChange('productName', event.target.value)}
                    placeholder="Ví dụ: Thức ăn tôm 4-6 mm"
                  />
                </div>

                <div className="product-management_form-group">
                  <label>Đơn vị tính *</label>
                  <input
                    type="text"
                    value={productForm.unit}
                    onChange={(event) => handleProductChange('unit', event.target.value)}
                    placeholder="Ví dụ: kg, chai, gói"
                  />
                </div>

                <div className="product-management_form-group">
                  <label>Nhà cung cấp</label>
                  <input
                    type="text"
                    value={productForm.supplier}
                    onChange={(event) => handleProductChange('supplier', event.target.value)}
                    placeholder="Ví dụ: Công ty A"
                  />
                </div>

                <div className="product-management_form-group">
                  <label>Giá đơn vị</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.unitPrice}
                    onChange={(event) => handleProductChange('unitPrice', event.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="product-management_form-group product-management_form-group--full">
                  <label>Ghi chú</label>
                  <textarea
                    value={productForm.note}
                    onChange={(event) => handleProductChange('note', event.target.value)}
                    placeholder="Ghi chú thêm cho sản phẩm..."
                  />
                </div>

                <div className="product-management_form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingProduct}>
                    {savingProduct ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetailModal && (
          <div className="modal" onClick={closeDetailModal}>
            <div className="modal-card product-management_detail-card" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2>{detailType === 'category' ? 'Chi tiết danh mục' : 'Chi tiết sản phẩm'}</h2>
              </div>

              {detailLoading || !detailData ? (
                <div className="product-management_detail-loading">Đang tải...</div>
              ) : detailType === 'category' ? (
                <div className="product-management_detail-grid">
                  <div className="modal-info-card">
                    <label>Mã danh mục</label>
                    <strong>{detailData.category_code || '-'}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Tên danh mục</label>
                    <strong>{detailData.category_name || '-'}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Ghi chú</label>
                    <strong>{detailData.note || '-'}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Số sản phẩm</label>
                    <strong>{detailData.product_count || 0}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Ngày tạo</label>
                    <strong>{formatDateTime(detailData.created_at)}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Người tạo</label>
                    <strong>{detailData.created_by_name || '-'}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Cập nhật gần nhất</label>
                    <strong>{formatDateTime(detailData.latest_activity_at || detailData.updated_at)}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Người cập nhật</label>
                    <strong>{detailData.updated_by_name || '-'}</strong>
                  </div>
                </div>
              ) : (
                <div className="product-management_detail-grid">
                  <div className="modal-info-card">
                    <label>Mã sản phẩm</label>
                    <strong>{detailData.product_code || '-'}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Tên sản phẩm</label>
                    <strong>{detailData.product_name || '-'}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Danh mục</label>
                    <strong>{detailData.category_name || '-'}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Đơn vị tính</label>
                    <strong>{detailData.unit || '-'}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Nhà cung cấp</label>
                    <strong>{detailData.supplier || '-'}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Giá đơn vị</label>
                    <strong>{formatCurrency(detailData.unit_price)}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Ghi chú</label>
                    <strong>{detailData.note || '-'}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Trạng thái</label>
                    <strong>{detailData.status || '-'}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Ngày tạo</label>
                    <strong>{formatDateTime(detailData.created_at)}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Người tạo</label>
                    <strong>{detailData.created_by_name || '-'}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Cập nhật gần nhất</label>
                    <strong>{formatDateTime(detailData.updated_at)}</strong>
                  </div>
                  <div className="modal-info-card">
                    <label>Người cập nhật</label>
                    <strong>{detailData.updated_by_name || '-'}</strong>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={closeDetailModal}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductManagementPage
