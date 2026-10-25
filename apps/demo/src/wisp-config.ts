import type { GuideConfig } from '@veloceai/wisp-web';

export const demoConfig: GuideConfig = {
  siteId: 'petal-demo',
  siteName: 'Petal & Thread',
  ai: { endpoint: '/wisp' },
  voice: { mode: 'browser' },
  character: 'wisp',
  idle: { sleepyAfterMs: 30000, sleepAfterMs: 50000 },
  tour: [
    { target: '#search', text: { en: 'Search any dress here. You can set a max price too.', hi: 'यहाँ कोई भी ड्रेस खोजें। आप अधिकतम कीमत भी डाल सकते हैं।', hinglish: 'Yahan koi bhi dress search karo. Max price bhi daal sakte ho.' } },
    { target: '#sort', text: { en: 'Sort by price to find the best deal.', hi: 'सबसे अच्छी डील के लिए कीमत से छाँटें।', hinglish: 'Best deal ke liye price se sort karo.' } },
    { target: '#cart', text: { en: 'Your cart lives up here.', hi: 'आपकी कार्ट यहाँ ऊपर है।', hinglish: 'Aapki cart yahan upar hai.' } },
    { target: '#delivery', text: { en: 'Delivery and free returns, all explained here.', hi: 'डिलीवरी और फ्री रिटर्न की पूरी जानकारी यहाँ है।', hinglish: 'Delivery aur free returns ki saari info yahan hai.' }, mood: 'happy' },
  ],
  sections: [
    { id: 'shop', tip: { en: 'Tip: tap “Sort by” to see the cheapest first.', hi: 'टिप: सबसे सस्ता पहले देखने के लिए “Sort by” दबाएँ।', hinglish: 'Tip: sabse sasta pehle dekhne ke liye “Sort by” dabao.' }, advanced: 'Pro tip: type a max price in the search bar to filter instantly.' },
    { id: 'delivery', tip: { en: 'Returns are free for 7 days. No questions asked.', hi: '7 दिन तक रिटर्न मुफ़्त है।', hinglish: '7 din tak return free hai.' } },
    { id: 'account', tip: { en: 'An account saves your address for faster checkout.', hi: 'अकाउंट से आपका पता सेव रहता है, चेकआउट जल्दी होता है।', hinglish: 'Account se address save rehta hai, checkout fast hota hai.' }, mood: 'happy' },
  ],
  errors: [
    { match: 'card_declined', fix: { en: 'Your card was declined. Check the card details, or pay with UPI instead.', hi: 'आपका कार्ड अस्वीकार हो गया। कार्ड की जानकारी जाँचें, या UPI से भुगतान करें।', hinglish: 'Card decline ho gaya. Card details check karo, ya UPI se pay karo.' } },
  ],
  reactions: {
    'cart-add': { mood: 'happy', line: [{ en: 'Nice pick!', hi: 'बढ़िया चुनाव!', hinglish: 'Badhiya choice!' }, { en: 'Added to your cart.', hi: 'कार्ट में जुड़ गया।', hinglish: 'Cart mein add ho gaya.' }] },
  },
  faq: [
    {
      id: 'returns',
      q: ['How do I return an item?', { hi: 'सामान वापस कैसे करें?', hinglish: 'Return kaise karein?' }],
      a: { en: 'Go to My Orders and tap Return. Returns are free within 7 days.', hi: 'My Orders में जाकर Return दबाएँ। 7 दिन तक रिटर्न मुफ़्त है।', hinglish: 'My Orders mein jaake Return dabao. 7 din tak return free hai.' },
      link: { href: '#delivery' },
    },
    {
      id: 'delivery',
      q: ['How long does delivery take?', { hi: 'डिलीवरी में कितने दिन लगते हैं?', hinglish: 'Delivery kitne din mein hogi?' }],
      a: { en: '3 to 5 days in metros, up to 7 days elsewhere.', hi: 'मेट्रो शहरों में 3 से 5 दिन, बाकी जगह 7 दिन तक।', hinglish: 'Metro cities mein 3-5 din, baaki jagah 7 din tak.' },
    },
    {
      id: 'payment',
      q: ['Which payment methods do you accept?', { hi: 'भुगतान कैसे करें?', hinglish: 'Payment kaise karein?' }],
      a: { en: 'UPI, cards, net banking and cash on delivery.', hi: 'UPI, कार्ड, नेट बैंकिंग और कैश ऑन डिलीवरी।', hinglish: 'UPI, card, net banking aur cash on delivery.' },
    },
    {
      id: 'size',
      q: ['How do I pick my size?', { hi: 'सही साइज़ कैसे चुनें?', hinglish: 'Size kaise choose karein?' }],
      a: { en: 'Each dress has a size chart. If it doesn’t fit, exchange it free within 7 days.', hi: 'हर ड्रेस के साथ साइज़ चार्ट है। फिट न हो तो 7 दिन में मुफ़्त बदलें।', hinglish: 'Har dress ke saath size chart hai. Fit na ho toh 7 din mein free exchange.' },
      keywords: ['fit', 'chart', 'exchange'],
    },
  ],
  content: [
    { title: 'About Petal & Thread', text: 'Petal & Thread started in 2021 in Jaipur. We work with 40 small studios that hand-block print every dress.' },
  ],
};
