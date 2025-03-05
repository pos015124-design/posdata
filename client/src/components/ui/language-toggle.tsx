"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from "@/components/ui/button"
import { Languages } from "lucide-react"

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()

  const toggleLanguage = () => {
    const newLanguage = language === "en" ? "sw" : "en"
    setLanguage(newLanguage)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="w-9 h-9 rounded-full transition-colors hover:bg-accent"
    >
      <Languages className="h-5 w-5 transition-all" />
      <span className="sr-only">
        {language === "en" ? t("language.swahili") : t("language.english")}
      </span>
    </Button>
  )
}