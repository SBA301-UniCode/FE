import React from 'react'
import { useTranslation } from 'react-i18next'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onClose: () => void
  type?: 'primary' | 'danger' | 'success'
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onClose,
  type = 'primary'
}) => {
  const { t } = useTranslation()

  if (!open) return null

  const getIcon = () => {
    switch (type) {
      case 'danger': return '⚠️'
      case 'success': return '✅'
      default: return '❓'
    }
  }

  const getConfirmBtnClass = () => {
    const base = 'px-6 py-2.5 rounded-xl font-bold text-sm border-none cursor-pointer transition-all text-white shadow-md hover:-translate-y-px active:translate-y-0 disabled:opacity-50'
    switch (type) {
      case 'danger': return `${base} bg-red-600 hover:bg-red-700 hover:shadow-[0_4px_12px_rgba(220,38,38,0.3)]`
      case 'success': return `${base} bg-green-600 hover:bg-green-700 hover:shadow-[0_4px_12px_rgba(22,163,74,0.3)]`
      default: return `${base} bg-primary-500 hover:bg-primary-600 hover:shadow-[0_4px_12px_rgba(0,86,210,0.3)]`
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className={`px-6 py-5 flex items-center justify-center relative ${
          type === 'danger' ? 'bg-gradient-to-br from-red-500 to-red-700' :
          type === 'success' ? 'bg-gradient-to-br from-green-500 to-green-700' :
          'bg-gradient-to-br from-primary-500 to-primary-700'
        }`}>
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner backdrop-blur-md">
            {getIcon()}
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors border-none bg-transparent cursor-pointer text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-8 text-center">
          <h3 className="m-0 mb-3 text-xl font-extrabold text-text-main">
            {title}
          </h3>
          <p className="m-0 mb-8 text-text-secondary leading-relaxed">
            {message}
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              className="px-6 py-2.5 rounded-xl font-bold text-sm border border-border-medium bg-white text-text-secondary cursor-pointer transition-all hover:bg-gray-50 hover:border-text-muted active:bg-gray-100"
              onClick={onClose}
            >
              {cancelText || t('common.cancel')}
            </button>
            <button
              type="button"
              className={getConfirmBtnClass()}
              onClick={() => {
                onConfirm()
                onClose()
              }}
            >
              {confirmText || t('common.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
