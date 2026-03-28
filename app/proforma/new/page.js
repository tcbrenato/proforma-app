'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { PlusCircle, Trash2, Save } from 'lucide-react'

function generateNumero() {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `PF-${date}-${rand}`
}

export default function NewProforma() {
  const router = useRouter()
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tvaActive, setTvaActive] = useState(true)
  const [form, setForm] = useState({
    numero: generateNumero(),
    date: new Date().toISOString().slice(0, 10),
    client_name: '',
    client_address: '',
    client_phone: '',
    client_email: '',
    items: [{ designation: '', qty: 1, pu: 0, montant: 0 }],
    remise_percent: 0,
    tva_rate: 18,
    payment_terms: '70% À LA COMMANDE\n30% À LA LIVRAISON',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*').limit(1).single()
    if (data) {
      setSettings(data)
      setForm(f => ({
        ...f,
        tva_rate: data.tva_rate || 18,
        payment_terms: data.payment_terms || f.payment_terms,
      }))
    }
  }

  function updateItem(index, field, value) {
    const items = [...form.items]
    items[index][field] = value
    if (field === 'qty' || field === 'pu') {
      items[index].montant = items[index].qty * items[index].pu
    }
    setForm({ ...form, items })
  }

  function addItem() {
    setForm({
      ...form,
      items: [...form.items, { designation: '', qty: 1, pu: 0, montant: 0 }],
    })
  }

  function removeItem(index) {
    const items = form.items.filter((_, i) => i !== index)
    setForm({ ...form, items })
  }

  const totalHT = form.items.reduce((sum, i) => sum + i.montant, 0)
  const remiseVal = (totalHT * form.remise_percent) / 100
  const totalApresRemise = totalHT - remiseVal
  const tvaAmount = tvaActive ? (totalApresRemise * form.tva_rate) / 100 : 0
  const totalTTC = totalApresRemise + tvaAmount

  async function saveProforma() {
    setSaving(true)
    const payload = {
      ...form,
      tva_rate: tvaActive ? form.tva_rate : 0,
      total_ht: totalHT,
      remise_value: remiseVal,
      total_apres_remise: totalApresRemise,
      tva_amount: tvaAmount,
      total_ttc: totalTTC,
    }
    const { data, error } = await supabase.from('proformas').insert(payload).select().single()
    if (!error) {
      router.push(`/proforma/${data.id}`)
    } else {
      alert('Erreur : ' + error.message)
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1a3a5c]">Nouvelle Proforma</h1>
            <p className="text-gray-500 text-sm">Remplissez les informations ci-dessous</p>
          </div>
          <button
            onClick={saveProforma}
            disabled={saving}
            className="flex items-center gap-2 bg-[#1a3a5c] text-white px-5 py-2 rounded-lg hover:bg-blue-800 transition disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Numéro et date */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-[#1a3a5c] mb-3">Informations</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro</label>
                <input
                  type="text"
                  value={form.numero}
                  onChange={e => setForm({ ...form, numero: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
          </div>

          {/* Client */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-[#1a3a5c] mb-3">Client (Payable To)</h2>
            <div className="space-y-3">
              {[
                { label: 'Nom / Raison sociale', key: 'client_name' },
                { label: 'Adresse', key: 'client_address' },
                { label: 'Téléphone', key: 'client_phone' },
                { label: 'Email', key: 'client_email' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="text"
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tableau prestations */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="font-semibold text-[#1a3a5c] mb-3">Prestations</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="bg-[#1a3a5c] text-white">
                  <th className="px-3 py-2 text-left rounded-tl-lg">Désignation</th>
                  <th className="px-3 py-2 text-center w-20">QTY</th>
                  <th className="px-3 py-2 text-center w-28">P.U (FCFA)</th>
                  <th className="px-3 py-2 text-right w-32">Montant</th>
                  <th className="px-3 py-2 w-10 rounded-tr-lg"></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.designation}
                        onChange={e => updateItem(i, 'designation', e.target.value)}
                        placeholder="Description de la prestation"
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={e => updateItem(i, 'qty', Number(e.target.value))}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-300"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.pu}
                        onChange={e => updateItem(i, 'pu', Number(e.target.value))}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-300"
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-[#1a3a5c]">
                      {item.montant.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={addItem}
            className="mt-3 flex items-center gap-2 text-[#1a3a5c] hover:text-blue-800 text-sm font-medium"
          >
            <PlusCircle className="w-4 h-4" />
            Ajouter une ligne
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Modalités */}
          <div className="bg-white rounded-xl shadow p-4 space-y-3">
            <h2 className="font-semibold text-[#1a3a5c]">Modalités & Options</h2>

            {/* TVA toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">TVA ({form.tva_rate}%)</p>
                <p className="text-xs text-gray-400">Activer ou désactiver la TVA</p>
              </div>
              <button
                onClick={() => setTvaActive(!tvaActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${tvaActive ? 'bg-[#1a3a5c]' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${tvaActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {tvaActive && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taux TVA (%)</label>
                <input
                  type="number"
                  value={form.tva_rate}
                  onChange={e => setForm({ ...form, tva_rate: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remise (%)</label>
              <input
                type="number"
                value={form.remise_percent}
                onChange={e => setForm({ ...form, remise_percent: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modalités de paiement</label>
              <textarea
                value={form.payment_terms}
                onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Totaux */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-[#1a3a5c] mb-3">Récapitulatif</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Total HT</span>
                <span className="font-medium">{totalHT.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Remise ({form.remise_percent}%)</span>
                <span className="font-medium text-red-500">- {remiseVal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">Total après remise</span>
                <span className="font-medium">{totalApresRemise.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">TVA ({tvaActive ? form.tva_rate : 0}%)</span>
                <span className="font-medium">{tvaAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between bg-[#1a3a5c] text-white px-3 py-2 rounded-lg mt-2">
                <span className="font-bold">TOTAL TTC</span>
                <span className="font-bold">{totalTTC.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={saveProforma}
            disabled={saving}
            className="flex items-center gap-2 bg-[#1a3a5c] text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder et voir la proforma'}
          </button>
        </div>
      </div>
    </div>
  )
}