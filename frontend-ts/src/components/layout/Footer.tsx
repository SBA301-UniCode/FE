import { Link } from 'react-router-dom'
import type { MouseEvent } from 'react'

const prevent = (e: MouseEvent) => e.preventDefault()

const Footer = () => {
  return (
    <footer className="bg-primary-800 text-white/85 pt-12 px-6 pb-6 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-8">
        {/* Brand */}
        <div className="flex flex-col gap-3">
          <Link to="/" className="text-xl font-bold text-white no-underline">
            <span className="text-white/70">&lt;/&gt;</span> UniCode.com
          </Link>
          <p className="text-[0.85rem] text-white/60 leading-relaxed max-w-[280px]">
            Nền tảng học trực tuyến hàng đầu với các khóa học chất lượng cao từ các giảng viên uy tín.
          </p>
        </div>

        {/* Explore */}
        <div>
          <h4 className="text-[0.85rem] font-bold uppercase tracking-wider text-white/50 mb-3">Khám phá</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            <li><Link to="/courses" className="text-sm text-white/75 no-underline transition-colors hover:text-white">Tất cả khóa học</Link></li>
            <li><Link to="/verify-certificate" className="text-sm text-white/75 no-underline transition-colors hover:text-white">Xác minh chứng chỉ</Link></li>
          </ul>
        </div>

        {/* Community */}
        <div>
          <h4 className="text-[0.85rem] font-bold uppercase tracking-wider text-white/50 mb-3">Cộng đồng</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            <li><a href="#" className="text-sm text-white/75 no-underline transition-colors hover:text-white" onClick={prevent}>Blog</a></li>
            <li><a href="#" className="text-sm text-white/75 no-underline transition-colors hover:text-white" onClick={prevent}>Diễn đàn</a></li>
            <li><a href="#" className="text-sm text-white/75 no-underline transition-colors hover:text-white" onClick={prevent}>Hỗ trợ</a></li>
          </ul>
        </div>

        {/* Info */}
        <div>
          <h4 className="text-[0.85rem] font-bold uppercase tracking-wider text-white/50 mb-3">Thông tin</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            <li><a href="#" className="text-sm text-white/75 no-underline transition-colors hover:text-white" onClick={prevent}>Về chúng tôi</a></li>
            <li><a href="#" className="text-sm text-white/75 no-underline transition-colors hover:text-white" onClick={prevent}>Điều khoản</a></li>
            <li><a href="#" className="text-sm text-white/75 no-underline transition-colors hover:text-white" onClick={prevent}>Chính sách bảo mật</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom */}
      <div className="max-w-7xl mx-auto mt-8 pt-5 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
        <span className="text-xs text-white/45">© {new Date().getFullYear()} UniCode. All rights reserved.</span>
        <div className="flex gap-3">
          {(['f', '▶', 'in'] as const).map((icon, i) => (
            <a
              key={i}
              href="#"
              className="w-9 h-9 rounded-full bg-white/8 text-white/65 flex items-center justify-center no-underline text-[0.95rem] transition-colors hover:bg-white/15 hover:text-white"
              aria-label={['Facebook', 'YouTube', 'LinkedIn'][i]}
              onClick={prevent}
            >
              {icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}

export default Footer
