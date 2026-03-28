'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { Download, ArrowLeft, Printer, Edit, Save, X, PlusCircle, Trash2 } from 'lucide-react'
import jsPDF from 'jspdf'

export default function ViewProforma() {
  const { id } = useParams()
  const router = useRouter()
  const printRef = useRef()
  const [proforma, setProforma] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tvaActive, setTvaActive] = useState(true)
  const [form, setForm] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('proformas').select('*').eq('id', id).single(),
      supabase.from('settings').select('*').limit(1).single(),
    ])
    setProforma(p)
    setSettings(s)
    if (p) {
      setForm({ ...p })
      setTvaActive(p.tva_rate > 0)
    }
    setLoading(false)
  }

  function updateItem(index, field, value) {
    const items = [...form.items]
    items[index][field] = value
    if (field === 'qty' || field === 'pu') {
      items[index].montant = Number(items[index].qty) * Number(items[index].pu)
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

  const totalHT = form ? form.items.reduce((sum, i) => sum + Number(i.montant), 0) : 0
  const remiseVal = form ? (totalHT * Number(form.remise_percent)) / 100 : 0
  const totalApresRemise = totalHT - remiseVal
  const tvaAmount = tvaActive ? (totalApresRemise * Number(form?.tva_rate || 18)) / 100 : 0
  const totalTTC = totalApresRemise + tvaAmount

  async function saveChanges() {
    setSaving(true)
    const payload = {
      numero: form.numero,
      date: form.date,
      client_name: form.client_name,
      client_address: form.client_address,
      client_phone: form.client_phone,
      client_email: form.client_email,
      items: form.items,
      remise_percent: form.remise_percent,
      tva_rate: tvaActive ? form.tva_rate : 0,
      payment_terms: form.payment_terms,
      total_ht: totalHT,
      remise_value: remiseVal,
      total_apres_remise: totalApresRemise,
      tva_amount: tvaAmount,
      total_ttc: totalTTC,
    }
    const { error } = await supabase.from('proformas').update(payload).eq('id', id)
    if (!error) {
      setProforma({ ...proforma, ...payload })
      setEditMode(false)
      alert('✅ Proforma modifiée avec succès !')
    } else {
      alert('❌ Erreur : ' + error.message)
    }
    setSaving(false)
  }

  async function exportPDF() {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const W = pdf.internal.pageSize.getWidth()   // exactement 210
    const H = pdf.internal.pageSize.getHeight()  // exactement 297
    const ML = 12  // marge gauche
    const MR = 12  // marge droite
    const RX = W - MR // bord droit

    const blue = [26, 58, 92]
    const white = [255, 255, 255]
    const lightGray = [248, 248, 248]
    const gray = [100, 100, 100]
    let y = 12

    // ── Charger images ────────────────────────────────────────
    const loadImg = (url) => new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = img.width; c.height = img.height
        c.getContext('2d').drawImage(img, 0, 0)
        resolve({ data: c.toDataURL('image/png'), w: img.width, h: img.height })
      }
      img.onerror = () => resolve(null)
      img.src = url
    })

    const [logoImg, signImg] = await Promise.all([
      settings?.logo_url ? loadImg(settings.logo_url) : Promise.resolve(null),
      settings?.signature_url ? loadImg(settings.signature_url) : Promise.resolve(null),
    ])

    // ── LOGO + TITRE ──────────────────────────────────────────
    if (logoImg) {
      const lh = 16
      const lw = Math.min((logoImg.w * lh) / logoImg.h, 45)
      pdf.addImage(logoImg.data, 'PNG', ML, y, lw, lh)
    } else {
      pdf.setTextColor(...blue)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.text(settings?.company_name || '', ML, y + 8)
    }

    pdf.setTextColor(...blue)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(22)
    pdf.text('PRO FORMA', RX, y + 8, { align: 'right' })

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...gray)
    pdf.text(`Numéro : ${proforma.numero}`, RX, y + 14, { align: 'right' })
    pdf.text(`Date : ${new Date(proforma.date).toLocaleDateString('fr-FR')}`, RX, y + 19, { align: 'right' })
    pdf.text(`Validité : ${settings?.validity_days || 15} jours`, RX, y + 24, { align: 'right' })
    pdf.text(`IFU : ${settings?.ifu || ''}`, RX, y + 29, { align: 'right' })
    y += 34

    // Séparateur
    pdf.setDrawColor(200, 200, 200)
    pdf.line(ML, y, RX, y)
    y += 7

    // ── CLIENT ────────────────────────────────────────────────
    pdf.setTextColor(...blue)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.text('PAYABLE TO', ML, y)
    y += 5

    pdf.setFontSize(8.5)
    const clientFields = [
      ['Nom / Raison sociale', proforma.client_name],
      ['Adresse', proforma.client_address],
      ['Téléphone', proforma.client_phone],
      ['Email', proforma.client_email],
    ]
    clientFields.forEach(([label, val]) => {
      pdf.setTextColor(...gray)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${label} :`, ML, y)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(40, 40, 40)
      pdf.text(val || '___________', ML + 38, y)
      y += 5
    })
    y += 5

    // ── TABLEAU ───────────────────────────────────────────────
    const TW = W - ML - MR  // largeur tableau = 186mm
    const cDesig = ML
    const cQty   = ML + TW * 0.50
    const cPu    = ML + TW * 0.68
    const cMnt   = RX
    const rH = 7

    // Header
    pdf.setFillColor(...blue)
    pdf.rect(ML, y, TW, rH, 'F')
    pdf.setTextColor(...white)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.text('DÉSIGNATION', cDesig + 2, y + 4.8)
    pdf.text('QTY', cQty, y + 4.8, { align: 'center' })
    pdf.text('P.U (FCFA)', cPu, y + 4.8, { align: 'center' })
    pdf.text('MONTANT (FCFA)', cMnt, y + 4.8, { align: 'right' })
    y += rH

    // Lignes items
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    proforma.items.forEach((item, i) => {
      if (i % 2 !== 0) {
        pdf.setFillColor(...lightGray)
        pdf.rect(ML, y, TW, rH, 'F')
      }
      pdf.setTextColor(40, 40, 40)
      const d = (item.designation || '').substring(0, 50)
      pdf.text(d, cDesig + 2, y + 4.8)
      pdf.text(String(item.qty), cQty, y + 4.8, { align: 'center' })
      pdf.text(Number(item.pu).toLocaleString('fr-FR'), cPu, y + 4.8, { align: 'center' })
      pdf.text(Number(item.montant).toLocaleString('fr-FR'), cMnt, y + 4.8, { align: 'right' })
      y += rH
    })
    y += 6

    // ── TOTAUX ────────────────────────────────────────────────
    const totaux = [
      [`TOTAL HT :`, Number(proforma.total_ht).toLocaleString('fr-FR') + ' FCFA'],
      [`TOTAL APRÈS REMISE :`, Number(proforma.total_apres_remise).toLocaleString('fr-FR') + ' FCFA'],
      [`TVA (${proforma.tva_rate}%) :`, Number(proforma.tva_amount).toLocaleString('fr-FR') + ' FCFA'],
    ]
    const LX = W / 2 + 10  // colonne gauche des totaux
    pdf.setFontSize(8.5)
    totaux.forEach(([label, val]) => {
      pdf.setTextColor(...gray)
      pdf.setFont('helvetica', 'normal')
      pdf.text(label, LX, y)
      pdf.setTextColor(30, 30, 30)
      pdf.setFont('helvetica', 'bold')
      pdf.text(val, cMnt, y, { align: 'right' })
      y += 6
    })

    // Total TTC
    pdf.setFillColor(...blue)
    pdf.rect(LX - 3, y - 2, RX - LX + 3 + MR, 9, 'F')
    pdf.setTextColor(...white)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text('TOTAL TTC :', LX, y + 4.5)
    pdf.text(Number(proforma.total_ttc).toLocaleString('fr-FR') + ' FCFA', cMnt, y + 4.5, { align: 'right' })
    y += 14

    // ── MODALITÉS ─────────────────────────────────────────────
    pdf.setTextColor(...blue)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.text('MODALITÉS DE PAIEMENT', ML, y)
    y += 5
    pdf.setTextColor(50, 50, 50)
    pdf.setFont('helvetica', 'normal')
    ;(proforma.payment_terms || '').split('\n').forEach(line => {
      pdf.text('• ' + line, ML, y)
      y += 5
    })

    // ── SIGNATURE ─────────────────────────────────────────────
    if (signImg) {
      const sH = 22
      const sW = Math.min((signImg.w * sH) / signImg.h, 40)
      const sX = RX - sW
      const sY = H - 45
      pdf.setTextColor(...gray)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.5)
      pdf.text('Signature autorisée', sX + sW / 2, sY - 3, { align: 'center' })
      pdf.addImage(signImg.data, 'PNG', sX, sY, sW, sH)
    }

    // ── MENTION LÉGALE ────────────────────────────────────────
    pdf.setTextColor(160, 160, 160)
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(7)
    pdf.text(
      'Cette facture pro forma est émise à titre informatif et ne constitue pas une facture définitive.',
      W / 2, H - 16, { align: 'center' }
    )

    // ── FOOTER ────────────────────────────────────────────────
    pdf.setFillColor(...blue)
    pdf.rect(0, H - 12, W, 12, 'F')
    pdf.setTextColor(...white)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.text(settings?.website || settings?.company_name || '', ML, H - 5)
    pdf.text(settings?.phone || '', W / 2, H - 5, { align: 'center' })
    pdf.text(settings?.email || '', RX, H - 5, { align: 'right' })

    // ── SAVE ──────────────────────────────────────────────────
    const entreprise = (settings?.company_name || 'GBEFFA').replace(/\s+/g, '_')
    const client = (proforma.client_name || 'Client').replace(/\s+/g, '_')
    pdf.save(`${entreprise}_${client}_${proforma.numero}.pdf`)
  }

    // ── EN-TÊTE ───────────────────────────────────────────────
    // Logo
    if (logoImg) {
      const logoH = 18
      const logoW = (logoImg.w * logoH) / logoImg.h
      pdf.addImage(logoImg.data, 'PNG', 10, 10, logoW, logoH)
    } else {
      pdf.setTextColor(...blue)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.text(settings?.company_name || '', 10, 20)
    }

    // Titre PRO FORMA
    pdf.setTextColor(...blue)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(26)
    pdf.text('PRO FORMA', W - 10, 16, { align: 'right' })

    // Infos proforma
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(...darkGray)
    pdf.text(`Numéro : ${proforma.numero}`, W - 10, 23, { align: 'right' })
    pdf.text(`Date : ${new Date(proforma.date).toLocaleDateString('fr-FR')}`, W - 10, 28, { align: 'right' })
    pdf.text(`Validité : ${settings?.validity_days || 15} jours`, W - 10, 33, { align: 'right' })
    pdf.text(`Numéro IFU : ${settings?.ifu || ''}`, W - 10, 38, { align: 'right' })

    y = 46

    // Ligne de séparation
    pdf.setDrawColor(220, 220, 220)
    pdf.line(10, y, W - 10, y)
    y += 6

    // ── CLIENT ────────────────────────────────────────────────
    pdf.setTextColor(...blue)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text('PAYABLE TO', 10, y)
    y += 5

    pdf.setTextColor(50, 50, 50)
    pdf.setFontSize(9)
    const clientFields = [
      ['Nom / Raison sociale', proforma.client_name],
      ['Adresse', proforma.client_address],
      ['Téléphone', proforma.client_phone],
      ['Email', proforma.client_email],
    ]
    clientFields.forEach(([label, val]) => {
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${label} :`, 10, y)
      pdf.setFont('helvetica', 'normal')
      pdf.text(val || '___________', 52, y)
      y += 5
    })
    y += 4

    // ── TABLEAU ───────────────────────────────────────────────
    const col = { desig: 10, qty: 130, pu: 155, montant: 200 }
    const rowH = 8

    // Header tableau
    pdf.setFillColor(...blue)
    pdf.rect(10, y, 190, rowH, 'F')
    pdf.setTextColor(...white)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text('DÉSIGNATION', col.desig + 3, y + 5.5)
    pdf.text('QTY', col.qty + 8, y + 5.5, { align: 'center' })
    pdf.text('P.U (FCFA)', col.pu + 10, y + 5.5, { align: 'center' })
    pdf.text('MONTANT (FCFA)', col.montant, y + 5.5, { align: 'right' })
    y += rowH

    // Lignes
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    proforma.items.forEach((item, i) => {
      if (i % 2 !== 0) {
        pdf.setFillColor(...lightGray)
        pdf.rect(10, y, 190, rowH, 'F')
      }
      pdf.setTextColor(40, 40, 40)
      // Désignation - tronquer si trop long
      const desig = item.designation?.length > 55 ? item.designation.substring(0, 52) + '...' : (item.designation || '')
      pdf.text(desig, col.desig + 3, y + 5.5)
      pdf.text(String(item.qty), col.qty + 8, y + 5.5, { align: 'center' })
      pdf.text(Number(item.pu).toLocaleString('fr-FR'), col.pu + 10, y + 5.5, { align: 'center' })
      pdf.text(Number(item.montant).toLocaleString('fr-FR'), col.montant, y + 5.5, { align: 'right' })
      y += rowH
    })
    y += 6

    // ── TOTAUX ────────────────────────────────────────────────
    const totaux = [
      [`TOTAL HT :`, Number(proforma.total_ht).toLocaleString('fr-FR') + ' FCFA'],
      [`TOTAL APRÈS REMISE :`, Number(proforma.total_apres_remise).toLocaleString('fr-FR') + ' FCFA'],
      [`TVA (${proforma.tva_rate}%) :`, Number(proforma.tva_amount).toLocaleString('fr-FR') + ' FCFA'],
    ]
    pdf.setFontSize(9)
    totaux.forEach(([label, val]) => {
      pdf.setTextColor(...darkGray)
      pdf.setFont('helvetica', 'normal')
      pdf.text(label, 125, y)
      pdf.setTextColor(30, 30, 30)
      pdf.setFont('helvetica', 'bold')
      pdf.text(val, W - 10, y, { align: 'right' })
      y += 6
    })

    // Total TTC
    pdf.setFillColor(...blue)
    pdf.rect(120, y - 2, 80, 9, 'F')
    pdf.setTextColor(...white)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.text('TOTAL TTC :', 125, y + 4.5)
    pdf.text(Number(proforma.total_ttc).toLocaleString('fr-FR') + ' FCFA', W - 10, y + 4.5, { align: 'right' })
    y += 14

    // ── MODALITÉS ─────────────────────────────────────────────
    pdf.setTextColor(...blue)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text('MODALITÉS DE PAIEMENT', 10, y)
    y += 5
    pdf.setTextColor(50, 50, 50)
    pdf.setFont('helvetica', 'normal')
    ;(proforma.payment_terms || '').split('\n').forEach(line => {
      pdf.text('• ' + line, 10, y)
      y += 5
    })

    // ── SIGNATURE ─────────────────────────────────────────────
    if (signImg) {
      const sigH = 25
      const sigW = (signImg.w * sigH) / signImg.h
      const sigX = W - 10 - sigW
      // "Signature autorisée" au dessus
      pdf.setTextColor(...darkGray)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.text('Signature autorisée', W - 10 - sigW / 2, 252, { align: 'center' })
      pdf.addImage(signImg.data, 'PNG', sigX, 255, sigW, sigH)
    }

    // ── MENTION LÉGALE ────────────────────────────────────────
    pdf.setTextColor(160, 160, 160)
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(7.5)
    pdf.text(
      "Cette facture pro forma est émise à titre informatif et ne constitue pas une facture définitive.",
      W / 2, 282, { align: 'center' }
    )

    // ── FOOTER ────────────────────────────────────────────────
    pdf.setFillColor(...blue)
    pdf.rect(0, 285, W, 12, 'F')
    pdf.setTextColor(...white)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text(settings?.website || settings?.company_name || '', 10, 292)
    pdf.text(settings?.phone || '', W / 2, 292, { align: 'center' })
    pdf.text(settings?.email || '', W - 10, 292, { align: 'right' })

    // ── SAVE ──────────────────────────────────────────────────
    const entreprise = (settings?.company_name || 'GBEFFA').replace(/\s+/g, '_')
    const client = (proforma.client_name || 'Client').replace(/\s+/g, '_')
    pdf.save(`${entreprise}_${client}_${proforma.numero}.pdf`)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="text-center py-20 text-gray-400">Chargement...</div>
    </div>
  )

  if (!proforma) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="text-center py-20 text-gray-400">Proforma introuvable</div>
    </div>
  )

  const displayData = editMode ? form : proforma
  const items = displayData?.items || []

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Boutons actions */}
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-[#1a3a5c] text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {!editMode ? (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 border border-[#1a3a5c] text-[#1a3a5c] px-4 py-2 rounded-lg hover:bg-blue-50 transition text-sm flex-1 sm:flex-none justify-center"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 border border-gray-400 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm flex-1 sm:flex-none justify-center"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 bg-[#1a3a5c] text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm flex-1 sm:flex-none justify-center"
              >
                <Download className="w-4 h-4" />
                Exporter PDF
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setEditMode(false); setForm({ ...proforma }) }}
                className="flex items-center gap-2 border border-red-400 text-red-500 px-4 py-2 rounded-lg hover:bg-red-50 transition text-sm flex-1 sm:flex-none justify-center"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="flex items-center gap-2 bg-[#1a3a5c] text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm flex-1 sm:flex-none justify-center disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* MODE EDITION */}
      {editMode && form && (
        <div className="max-w-5xl mx-auto px-4 pb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4 text-sm text-yellow-800 font-medium">
            ✏️ Vous êtes en mode modification. Cliquez sur "Sauvegarder les modifications" quand vous avez terminé.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Infos */}
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <h2 className="font-semibold text-[#1a3a5c]">Informations</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro</label>
                <input type="text" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>

            {/* Client */}
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <h2 className="font-semibold text-[#1a3a5c]">Client</h2>
              {[
                { label: 'Nom / Raison sociale', key: 'client_name' },
                { label: 'Adresse', key: 'client_address' },
                { label: 'Téléphone', key: 'client_phone' },
                { label: 'Email', key: 'client_email' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type="text" value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              ))}
            </div>
          </div>

          {/* Tableau édition */}
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <h2 className="font-semibold text-[#1a3a5c] mb-3">Prestations</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a3a5c] text-white">
                    <th className="px-3 py-2 text-left rounded-tl-lg">Désignation</th>
                    <th className="px-3 py-2 text-center w-20">QTY</th>
                    <th className="px-3 py-2 text-center w-28">P.U</th>
                    <th className="px-3 py-2 text-right w-32">Montant</th>
                    <th className="px-3 py-2 w-10 rounded-tr-lg"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-2 py-2">
                        <input type="text" value={item.designation}
                          onChange={e => updateItem(i, 'designation', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" value={item.qty}
                          onChange={e => updateItem(i, 'qty', Number(e.target.value))}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-300" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" value={item.pu}
                          onChange={e => updateItem(i, 'pu', Number(e.target.value))}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-300" />
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-[#1a3a5c]">
                        {Number(item.montant).toLocaleString('fr-FR')} FCFA
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
            <button onClick={addItem} className="mt-3 flex items-center gap-2 text-[#1a3a5c] hover:text-blue-800 text-sm font-medium">
              <PlusCircle className="w-4 h-4" />
              Ajouter une ligne
            </button>
          </div>

          {/* Options et totaux */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <h2 className="font-semibold text-[#1a3a5c]">Options</h2>

              {/* TVA toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">TVA ({form.tva_rate}%)</p>
                  <p className="text-xs text-gray-400">Activer ou désactiver</p>
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
                  <input type="number" value={form.tva_rate}
                    onChange={e => setForm({ ...form, tva_rate: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remise (%)</label>
                <input type="number" value={form.remise_percent}
                  onChange={e => setForm({ ...form, remise_percent: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modalités de paiement</label>
                <textarea value={form.payment_terms}
                  onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                  rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
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
              onClick={saveChanges}
              disabled={saving}
              className="flex items-center gap-2 bg-[#1a3a5c] text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition disabled:opacity-50 w-full sm:w-auto justify-center"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
            </button>
          </div>
        </div>
      )}

      {/* APERCU PROFORMA */}
      {!editMode && (
        <div className="max-w-4xl mx-auto px-4 pb-10">
          <div
  ref={printRef}
  id="proforma-print"
  className="bg-white shadow-lg"
  style={{
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    minHeight: '297mm',
    width: '210mm',        // forcer largeur A4
    margin: '0 auto',      // centrer sur desktop
    display: 'flex',
    flexDirection: 'column',
  }}
>

            {/* En-tête */}
            <div className="flex items-start justify-between px-8 pt-8 pb-4">
              <div>
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="h-16 object-contain mb-1" crossOrigin="anonymous" />
                ) : (
                  <div className="text-[#1a3a5c] font-bold text-lg">{settings?.company_name}</div>
                )}
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold text-[#1a3a5c] mb-2">PRO FORMA</h1>
                <p className="text-sm text-gray-600">Numéro : {proforma.numero}</p>
                <p className="text-sm text-gray-600">Date : {new Date(proforma.date).toLocaleDateString('fr-FR')}</p>
                <p className="text-sm text-gray-600">Validité : {settings?.validity_days || 15} jours</p>
                <p className="text-sm text-gray-600">Numéro IFU : {settings?.ifu}</p>
              </div>
            </div>

            <hr className="mx-8 border-gray-200" />

            {/* Client */}
            <div className="px-8 py-4">
              <h2 className="text-[#1a3a5c] font-bold text-sm uppercase mb-2">Payable To</h2>
              <p className="text-sm"><span className="font-medium">Nom / Raison sociale :</span> {proforma.client_name || '___________'}</p>
              <p className="text-sm"><span className="font-medium">Adresse :</span> {proforma.client_address || '___________'}</p>
              <p className="text-sm"><span className="font-medium">Téléphone :</span> {proforma.client_phone || '___________'}</p>
              <p className="text-sm"><span className="font-medium">Email :</span> {proforma.client_email || '___________'}</p>
            </div>

            {/* Tableau */}
            <div className="px-8 pb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#1a3a5c] text-white">
                    <th className="px-4 py-3 text-left">DÉSIGNATION</th>
                    <th className="px-4 py-3 text-center w-16">QTY</th>
                    <th className="px-4 py-3 text-center w-28">P.U</th>
                    <th className="px-4 py-3 text-right w-32">MONTANT</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3">{item.designation}</td>
                      <td className="px-4 py-3 text-center">{item.qty}</td>
                      <td className="px-4 py-3 text-center">{Number(item.pu).toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 text-right">{Number(item.montant).toLocaleString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totaux */}
            <div className="px-8 pb-4">
              <div className="flex flex-col items-end space-y-1 text-sm">
                <div className="flex justify-between w-72">
                  <span className="text-gray-600">TOTAL HT :</span>
                  <span className="font-medium">{Number(proforma.total_ht).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between w-72">
                  <span className="text-gray-600">TOTAL APRÈS REMISE :</span>
                  <span className="font-medium">{Number(proforma.total_apres_remise).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between w-72">
                  <span className="text-gray-600">TVA ({proforma.tva_rate}%) :</span>
                  <span className="font-medium">{Number(proforma.tva_amount).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between w-72 bg-[#1a3a5c] text-white px-3 py-2 rounded mt-1">
                  <span className="font-bold">TOTAL TTC :</span>
                  <span className="font-bold">{Number(proforma.total_ttc).toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            </div>

            {/* Modalités */}
            <div className="px-8 pb-4">
              <h2 className="text-[#1a3a5c] font-bold text-sm uppercase mb-2">Modalités de paiement</h2>
              {(proforma.payment_terms || '').split('\n').map((line, i) => (
                <p key={i} className="text-sm">• {line}</p>
              ))}
            </div>

            {/* Espaceur qui pousse le footer vers le bas */}
            <div style={{ flex: 1 }} />

            {/* Signature */}
            {settings?.signature_url && (
              <div className="px-8 pb-4 flex justify-end">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Signature autorisée</p>
                  <img 
                    src={settings.signature_url} 
                    alt="Signature" 
                    style={{ height: '100px', objectFit: 'contain' }}
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
            )}

            {/* Mention légale + Pied de page - EN FLUX NORMAL, plus de position absolute */}
            <div>
              <div className="px-8 py-2 text-center">
                <p className="text-xs text-gray-400 italic">
                  Cette facture pro forma est émise à titre informatif et ne constitue pas une facture définitive.
                </p>
              </div>
              <div className="bg-[#1a3a5c] text-white px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
                <span>{settings?.website || settings?.company_name}</span>
                <span>{settings?.phone}</span>
                <span>{settings?.email}</span>
              </div>
            </div>

          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body * { visibility: hidden; }
          #proforma-print, #proforma-print * { visibility: visible; }
          @page { margin: 0; size: A4 portrait; }

          #proforma-print {
            position: fixed;
            top: 0;
            left: 0;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            font-size: 13px !important;
          }

          /* Fixes mobile */
          #proforma-print h1 {
            font-size: 22px !important;
            white-space: nowrap !important;
          }
          #proforma-print table {
            font-size: 10px !important;
          }
          #proforma-print table th,
          #proforma-print table td {
            padding: 4px 6px !important;
          }
          #proforma-print .w-72 {
            width: 100% !important;
          }
          #proforma-print .flex.flex-col.items-end {
            align-items: stretch !important;
            padding: 0 16px !important;
          }
          #proforma-print .flex.justify-between {
            display: flex !important;
            justify-content: space-between !important;
          }
        }
      `}</style>
    </div>
  )
}