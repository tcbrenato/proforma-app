'use client'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { Save } from 'lucide-react'

export default function Settings() {
  const [settings, setSettings] = useState({
    company_name: 'GBEFFA REIS BE KOM',
    activities: 'Affichage, Décoration, Sérigraphie',
    phone: '01 96 34 64 35 / 01 94 14 52 69',
    email: 'tundetoile@gmail.com',
    website: '',
    rccm: '',
    ifu: '1201408335401',
    cip: '8382792325',
    cip_expiry: '',
    tva_rate: 18,
    validity_days: 15,
    payment_terms: '70% À LA COMMANDE\n30% À LA LIVRAISON',
    logo_url: 'https://i.ibb.co/6RCSdngF/32341d94-7f42-480c-9f21-d1d99dc18eaf-removebg-preview.png',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [settingsId, setSettingsId] = useState(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*').limit(1).single()
    if (data) {
      setSettings({
        ...data,
        logo_url: data.logo_url || 'https://i.ibb.co/6RCSdngF/32341d94-7f42-480c-9f21-d1d99dc18eaf-removebg-preview.png'
      })
      setSettingsId(data.id)
    }
    setLoading(false)
  }

  async function saveSettings() {
    setSaving(true)
    let result
    if (settingsId) {
      result = await supabase.from('settings').update(settings).eq('id', settingsId)
    } else {
      result = await supabase.from('settings').insert(settings)
    }
    if (result.error) {
      setMessage('❌ Erreur lors de la sauvegarde')
    } else {
      setMessage('✅ Paramètres sauvegardés avec succès !')
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="text-center py-20 text-gray-400">Chargement...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1a3a5c] mb-6">Paramètres de l'entreprise</h1>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">

          {/* Logo aperçu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo (URL de l'image)</label>
            <input
              type="text"
              value={settings.logo_url || ''}
              onChange={e => setSettings({ ...settings, logo_url: e.target.value })}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {settings.logo_url && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg inline-block">
                <img
                  src={settings.logo_url}
                  alt="Logo aperçu"
                  className="h-16 object-contain"
                  onError={e => e.target.style.display = 'none'}
                />
              </div>
            )}
          </div>

          {/* Champs texte */}
          {[
            { label: 'Nom commercial', key: 'company_name' },
            { label: 'Activités', key: 'activities' },
            { label: 'Téléphone', key: 'phone' },
            { label: 'Email', key: 'email' },
            { label: 'Site web', key: 'website' },
            { label: 'RCCM', key: 'rccm' },
            { label: 'IFU', key: 'ifu' },
            { label: 'N° CIP', key: 'cip' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="text"
                value={settings[key] || ''}
                onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date expiration CIP</label>
            <input
              type="date"
              value={settings.cip_expiry || ''}
              onChange={e => setSettings({ ...settings, cip_expiry: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TVA par défaut (%)</label>
            <input
              type="number"
              value={settings.tva_rate || 18}
              onChange={e => setSettings({ ...settings, tva_rate: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Validité (jours)</label>
            <input
              type="number"
              value={settings.validity_days || 15}
              onChange={e => setSettings({ ...settings, validity_days: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modalités de paiement</label>
            <textarea
              value={settings.payment_terms || ''}
              onChange={e => setSettings({ ...settings, payment_terms: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {message && (
            <div className="text-sm font-medium text-green-600 bg-green-50 px-4 py-2 rounded-lg">
              {message}
            </div>
          )}

          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 bg-[#1a3a5c] text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}