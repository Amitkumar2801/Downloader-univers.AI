// Centralized Google Translate Integration for Downloadyfy.AI
window.googleTranslateElementInit = function() {
    new google.translate.TranslateElement({
        pageLanguage: 'en',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE
    }, 'google_translate_element');
};

function initLanguage() {
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        // Load saved language from localStorage
        const savedLang = localStorage.getItem('appLanguage') || 'en';
        languageSelect.value = savedLang;
        
        // Helper to set Google Translate cookie
        const setTranslateCookie = (lang) => {
            document.cookie = "googtrans=/en/" + lang + "; path=/";
            const host = window.location.hostname;
            document.cookie = "googtrans=/en/" + lang + "; path=/; domain=" + host;
        };

        // Set initial cookie
        setTranslateCookie(savedLang);
        
        // Polling to make sure the Google Translate combo is ready
        let attempts = 0;
        const checkInterval = setInterval(() => {
            const googCombo = document.querySelector('.goog-te-combo');
            if (googCombo) {
                clearInterval(checkInterval);
                googCombo.value = savedLang;
                googCombo.dispatchEvent(new Event('change'));
            }
            attempts++;
            if (attempts > 50) clearInterval(checkInterval); // Stop after 5 seconds
        }, 100);
        
        languageSelect.addEventListener('change', (e) => {
            const lang = e.target.value;
            localStorage.setItem('appLanguage', lang);
            setTranslateCookie(lang);
            
            const googCombo = document.querySelector('.goog-te-combo');
            if (googCombo) {
                googCombo.value = lang;
                googCombo.dispatchEvent(new Event('change'));
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguage);
} else {
    initLanguage();
}
