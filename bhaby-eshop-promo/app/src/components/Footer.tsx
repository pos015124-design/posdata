import Logo from "@/components/Logo";

const ESHOP_URL = process.env.NEXT_PUBLIC_ESHOP_URL || "https://e-shop.bhabygroup.co.tz";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      data-testid="site-footer"
      className="bg-[#1E3A5F] text-white"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="mb-3">
              <Logo variant="white" className="h-10" />
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Tanzania&apos;s premier mobile e-commerce experience. Shop smart, shop Bhaby.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-semibold text-slate-200 mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  data-testid="footer-eshop-link"
                  href={ESHOP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#60A5FA] hover:text-blue-300 transition-colors"
                >
                  Visit the E-Shop
                </a>
              </li>
              <li>
                <a href="#features" className="text-slate-300 hover:text-blue-300 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-slate-300 hover:text-blue-300 transition-colors">
                  How It Works
                </a>
              </li>
            </ul>
          </div>

          {/* Social / Contact */}
          <div data-testid="footer-social">
            <h4 className="font-semibold text-slate-200 mb-3">Connect with Us</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://facebook.com/bhabygroup" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-blue-300 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </a>
              </li>
              <li>
                <a href="https://instagram.com/bhabygroup" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-blue-300 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                  Instagram
                </a>
              </li>
              <li>
                <a href="mailto:info@bhabygroup.co.tz" className="text-slate-300 hover:text-blue-300 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  info@bhabygroup.co.tz
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#274B73] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p
            data-testid="footer-copyright"
            className="text-slate-400 text-sm"
          >
            &copy; {currentYear} Bhaby Group. All rights reserved.
          </p>
          <p className="text-slate-500 text-xs">
            Built with ❤️ for Tanzania&apos;s e-commerce community.
          </p>
        </div>
      </div>
    </footer>
  );
}
