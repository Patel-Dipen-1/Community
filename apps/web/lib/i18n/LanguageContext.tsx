import React, { createContext, useContext, useState, useEffect } from 'react';

export type SupportedLanguage = 'en' | 'hi' | 'gu';

const translations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    welcome: 'Welcome to B2B Store & Chat Platform',
    chats: 'Chats',
    groups: 'Groups',
    directory: 'Business Directory',
    products: 'Products',
    status: 'Status',
    inquiries: 'Inquiries',
    type_message: 'Type a message...',
    send: 'Send',
    calling: 'Calling...',
    online: 'Online',
    offline: 'Offline',
  },
  hi: {
    welcome: 'B2B स्टोर और चैट प्लेटफ़ॉर्म में आपका स्वागत है',
    chats: 'चैट',
    groups: 'समूह',
    directory: 'व्यापार निर्देशिका',
    products: 'उत्पाद',
    status: 'स्टेटस',
    inquiries: 'पूछताछ',
    type_message: 'संदेश टाइप करें...',
    send: 'भेजें',
    calling: 'कॉल हो रही है...',
    online: 'ऑनलाइन',
    offline: 'ऑफ़लाइन',
  },
  gu: {
    welcome: 'B2B સ્ટોર અને ચેટ પ્લેટફોર્મમાં આપનું સ્વાગત છે',
    chats: 'ચેટ્સ',
    groups: 'ગ્રૂપ્સ',
    directory: 'વેપાર ડિરેક્ટરી',
    products: 'પ્રોડક્ટ્સ',
    status: 'સ્ટેટસ',
    inquiries: 'પૂછપરછ',
    type_message: 'સંદેશ ટાઇપ કરો...',
    send: 'મોકલો',
    calling: 'કોલ થઈ રહ્યો છે...',
    online: 'ઓનલાઈન',
    offline: 'ઓફલાઈન',
  },
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');

  useEffect(() => {
    const saved = localStorage.getItem('app_language') as SupportedLanguage;
    if (saved && ['en', 'hi', 'gu'].includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
