'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Settings, PlusCircle, Home, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { href: '/', label: 'Tableau de bord', icon: Home },
    { href: '/proforma/new', label: 'Nouvelle Proforma', icon: PlusCircle },
    { href: '/settings', label: 'Paramètres', icon: Settings },
  ]

  return (
    <nav className="bg-[#1a3a5c] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-300" />
          <span className="font-bold text-base tracking-wide">GBEFFA REIS BE KOM</span>
        </div>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${pathname === href ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-700'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* Bouton hamburger mobile */}
        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Menu mobile déroulant */}
      {menuOpen && (
        <div className="md:hidden bg-[#122d4a] px-4 pb-3 flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-colors
                ${pathname === href ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-700'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}