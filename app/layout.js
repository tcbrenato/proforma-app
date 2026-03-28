import './globals.css'

export const metadata = {
  title: 'GBEFFA REIS BE KOM - Proforma',
  description: 'Plateforme de génération de factures pro forma',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  )
}