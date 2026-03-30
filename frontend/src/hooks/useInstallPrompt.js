import { useState, useEffect } from 'react'

export function useInstallPrompt() {
  const [prompt, setPrompt]         = useState(null)   // evento beforeinstallprompt
  const [installed, setInstalled]   = useState(false)  // já instalado
  const [isIos, setIsIos]           = useState(false)  // iOS sem suporte nativo

  useEffect(() => {
    // Detecta iOS (Safari)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone = window.navigator.standalone === true
    setIsIos(ios)
    if (standalone) { setInstalled(true); return }

    // Android / Chrome: captura o evento de instalação
    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Detecta se já foi instalado
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setPrompt(null)
    })

    // Também considera instalado se estiver rodando em standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  const canInstall = !installed && (!!prompt || isIos)

  return { canInstall, install, isIos, installed }
}
