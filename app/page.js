'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { PlusCircle, Eye, Trash2, Search } from 'lucide-react'

export default function Dashboard() {
  const [proformas, setProformas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchProformas() }, [])

  async function fetchProformas() {
    const { data, error } = await supabase
      .from('proformas').select('*').order('created_at', { ascending: false })
    if (!error) setProformas(data)
    setLoading(false)
  }

  async function deleteProforma(id) {
    if (!confirm('Supprimer cette proforma ?')) return
    await supabase.from('proformas').delete().eq('id', id)
    fetchProformas()
  }

  const filtered = proformas.filter(p =>
    p.numero?.toLowerCase().includes(search.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1a3a5c]">Tableau de bord</h1>
            <p className="text-gray-500 text-sm">{proformas.length} proforma(s) générée(s)</p>
          </div>
          <Link
            href="/proforma/new"
            className="flex items-center gap-2 bg-[#1a3a5c] text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition w-full sm:w-auto justify-center"
          >
            <PlusCircle className="w-4 h-4" />
            Nouvelle Proforma
          </Link>
        </div>

        {/* Recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro ou client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* Tableau desktop */}
        <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1a3a5c] text-white">
              <tr>
                <th className="px-4 py-3 text-left">Numéro</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-right">Total TTC</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Aucune proforma trouvée</td></tr>
              ) : filtered.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-mono text-blue-700">{p.numero}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(p.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 font-medium">{p.client_name || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#1a3a5c]">{Number(p.total_ttc).toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-4 py-3 flex items-center justify-center gap-3">
                    <Link href={`/proforma/${p.id}`} className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></Link>
                    <button onClick={() => deleteProforma(p.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cartes mobile */}
        <div className="md:hidden flex flex-col gap-3">
          {loading ? (
            <p className="text-center py-8 text-gray-400">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-gray-400">Aucune proforma trouvée</p>
          ) : filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="font-mono text-blue-700 font-medium text-sm">{p.numero}</span>
                <span className="text-gray-400 text-xs">{new Date(p.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <p className="font-semibold text-gray-800 mb-1">{p.client_name || '-'}</p>
              <p className="text-[#1a3a5c] font-bold mb-3">{Number(p.total_ttc).toLocaleString('fr-FR')} FCFA</p>
              <div className="flex gap-2">
                <Link
                  href={`/proforma/${p.id}`}
                  className="flex-1 flex items-center justify-center gap-2 border border-[#1a3a5c] text-[#1a3a5c] py-2 rounded-lg text-sm font-medium"
                >
                  <Eye className="w-4 h-4" /> Voir
                </Link>
                <button
                  onClick={() => deleteProforma(p.id)}
                  className="flex-1 flex items-center justify-center gap-2 border border-red-400 text-red-500 py-2 rounded-lg text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}