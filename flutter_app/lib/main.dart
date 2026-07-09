import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'screens/downloader_screen.dart';
import 'screens/converter_screen.dart';
import 'screens/trimmer_screen.dart';

void main() {
  runApp(const DownloaderApp());
}

class DownloaderApp extends StatefulWidget {
  const DownloaderApp({super.key});

  static _DownloaderAppState? of(BuildContext context) =>
      context.findAncestorStateOfType<_DownloaderAppState>();

  @override
  State<DownloaderApp> createState() => _DownloaderAppState();
}

class _DownloaderAppState extends State<DownloaderApp> {
  Locale _locale = const Locale('en');
  String _backendUrl = 'http://localhost:5000';

  Locale get locale => _locale;
  String get backendUrl => _backendUrl;

  void changeLanguage(String langCode) {
    setState(() {
      _locale = Locale(langCode);
    });
  }

  void updateBackendUrl(String newUrl) {
    setState(() {
      _backendUrl = newUrl;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DOWNLOADYFY.AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF030712),
        primaryColor: const Color(0xFF6366F1),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFFF97316),
          surface: Color(0xFF1F2937),
          background: Color(0xFF030712),
        ),
        cardTheme: const CardTheme(
          color: Color(0xFF111827),
          elevation: 8,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(16)),
          ),
        ),
        textTheme: const TextTheme(
          titleLarge: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold, fontSize: 24),
          bodyMedium: TextStyle(fontFamily: 'Outfit', color: Color(0xFF9CA3AF)),
        ),
      ),
      locale: _locale,
      initialRoute: '/',
      routes: {
        '/': (context) => const HomeScreen(),
        '/downloader': (context) => const DownloaderScreen(),
        '/converter': (context) => const ConverterScreen(),
        '/trimmer': (context) => const TrimmerScreen(),
      },
    );
  }
}

// Translations helper class
class AppTranslations {
  static final Map<String, Map<String, String>> _values = {
    'en': {
      'app_title': 'DOWNLOADYFY.AI',
      'hero_title': 'Experience Intelligent Simplicity',
      'hero_subtitle': 'Paste a link below to download videos, audio, or playlists instantly.',
      'downloader_title': 'Link Downloader',
      'downloader_desc': 'Download high-quality videos and mp3 audio from YouTube, Spotify, and more.',
      'converter_title': 'Video → Audio',
      'converter_desc': 'Extract high-quality audio files from your local videos.',
      'trimmer_title': 'Audio Trimmer',
      'trimmer_desc': 'Upload and trim audio clips into custom ringtones.',
      'home': 'Home',
      'settings': 'Settings',
      'backend_url': 'Backend Server URL',
      'save': 'Save',
      'enter_url': 'Paste media URL here...',
      'fetch': 'Analyze Link',
      'download': 'Download',
      'status': 'Status',
      'language': 'Language',
      'select_file': 'Select File',
      'convert_btn': 'Convert Now',
      'trim_btn': 'Trim Audio',
      'start_time': 'Start Time (sec)',
      'end_time': 'End Time (sec)',
      'supported_platforms': 'Supported Platforms',
    },
    'hi': {
      'app_title': 'DOWNLOADYFY.AI',
      'hero_title': 'बुद्धिमान सादगी का अनुभव करें',
      'hero_subtitle': 'वीडियो, ऑडियो या प्लेलिस्ट तुरंत डाउनलोड करने के लिए नीचे एक लिंक पेस्ट करें।',
      'downloader_title': 'लिंक डाउनलोडर',
      'downloader_desc': 'यूट्यूब, स्पॉटिफ़ाई और अन्य से उच्च गुणवत्ता वाले वीडियो और एमपी3 डाउनलोड करें।',
      'converter_title': 'वीडियो → ऑडियो',
      'converter_desc': 'अपने स्थानीय वीडियो से उच्च गुणवत्ता वाली ऑडियो फाइलें निकालें।',
      'trimmer_title': 'ऑडियो ट्रिमर',
      'trimmer_desc': 'कस्टम रिंगटोन बनाने के लिए ऑडियो क्लिप को अपलोड और ट्रिम करें।',
      'home': 'होम',
      'settings': 'सेटिंग्स',
      'backend_url': 'बैकएंड सर्वर यूआरएल',
      'save': 'सहेजें',
      'enter_url': 'यहाँ मीडिया यूआरएल पेस्ट करें...',
      'fetch': 'लिंक का विश्लेषण करें',
      'download': 'डाउनलोड करें',
      'status': 'स्थिति',
      'language': 'भाषा',
      'select_file': 'फ़ाइल चुनें',
      'convert_btn': 'अभी कनवर्ट करें',
      'trim_btn': 'ऑडियो ट्रिम करें',
      'start_time': 'शुरू होने का समय (सेकंड)',
      'end_time': 'समाप्त होने का समय (सेकंड)',
      'supported_platforms': 'समर्थित प्लेटफ़ॉर्म',
    },
    'ne': {
      'app_title': 'DOWNLOADYFY.AI',
      'hero_title': 'बौद्धिक सरलताको अनुभव गर्नुहोस्',
      'hero_subtitle': 'भिडियो, अडियो वा प्लेलिस्टहरू तुरुन्तै डाउनलोड गर्न तल लिङ्क टाँस्नुहोस्।',
      'downloader_title': 'लिङ्क डाउनलोडर',
      'downloader_desc': 'यूट्यूब, स्पोटिफाई र थपबाट उच्च-गुणस्तरका भिडियोहरू र mp3 अडियो डाउनलोड गर्नुहोस्।',
      'converter_title': 'भिडियो → अडियो',
      'converter_desc': 'तपाईंको स्थानीय भिडियोहरूबाट उच्च-गुणस्तरको अडियो फाइलहरू निकाल्नुहोस्।',
      'trimmer_title': 'अडियो ट्रिमर',
      'trimmer_desc': 'अडियो क्लिपहरू अपलोड र ट्रिम गरी अनुकूलन रिङटोन बनाउनुहोस्।',
      'home': 'गृहपृष्ठ',
      'settings': 'सेटिङहरू',
      'backend_url': 'ब्याकइन्ड सर्भर URL',
      'save': 'बचत गर्नुहोस्',
      'enter_url': 'मिडिया लिङ्क यहाँ टाँस्नुहोस्...',
      'fetch': 'लिङ्क विश्लेषण गर्नुहोस्',
      'download': 'डाउनलोड गर्नुहोस्',
      'status': 'अवस्था',
      'language': 'भाषा',
      'select_file': 'फाइल चयन गर्नुहोस्',
      'convert_btn': 'अहिले कनवर्ट गर्नुहोस्',
      'trim_btn': 'अडियो ट्रिम गर्नुहोस्',
      'start_time': 'सुरु हुने समय (सेकेन्ड)',
      'end_time': 'अन्त्य हुने समय (सेकेन्ड)',
      'supported_platforms': 'समर्थित प्लेटफर्महरू',
    },
    'ur': {
      'app_title': 'DOWNLOADYFY.AI',
      'hero_title': 'ذہین سادگی کا تجربہ کریں',
      'hero_subtitle': 'ویڈیوز، آڈیو یا پلے لسٹس فوری ڈاؤن لوڈ کرنے کے لیے نیچے لنک پیسٹ کریں۔',
      'downloader_title': 'لنک ڈاؤن لوڈر',
      'downloader_desc': 'یوٹیوب، اسپاٹیفائی اور مزید سے اعلی معیار کی ویڈیوز اور ایم پی 3 ڈاؤن لوڈ کریں۔',
      'converter_title': 'ویڈیو ← آڈیو',
      'converter_desc': 'اپنے مقامی ویڈیوز سے اعلیٰ معیار کی آڈیو فائلیں نکالیں۔',
      'trimmer_title': 'آڈیو ٹرمر',
      'trimmer_desc': 'رنگ ٹونز بنانے کے لیے آڈیو کلپس اپ لوڈ اور ٹرم کریں۔',
      'home': 'ہوم',
      'settings': 'ترتیبات',
      'backend_url': 'بیک اینڈ سرور یو آر ایل',
      'save': 'محفوظ کریں',
      'enter_url': 'میڈیا لنک یہاں پیسٹ کریں...',
      'fetch': 'لنک کا تجزیہ کریں',
      'download': 'ڈاؤن لوڈ کریں',
      'status': 'حالت',
      'language': 'زبان',
      'select_file': 'فائل منتخب کریں',
      'convert_btn': 'ابھی تبدیل کریں',
      'trim_btn': 'آڈیو ٹرم کریں',
      'start_time': 'شروع کا وقت (سیکنڈ)',
      'end_time': 'ختم ہونے کا وقت (سیکنڈ)',
      'supported_platforms': 'سپورٹڈ پلیٹ فارمز',
    },
  };

  static String translate(BuildContext context, String key) {
    final state = DownloaderApp.of(context);
    final lang = state?.locale.languageCode ?? 'en';
    return _values[lang]?[key] ?? _values['en']?[key] ?? key;
  }
}
