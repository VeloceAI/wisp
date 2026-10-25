import type { LineBank } from '../brain/lines';

export const SHOP_LINES: LineBank = {
  'shop.found': {
    en: ['I found {count}. {list}. Which one?'],
    hi: ['{count} मिले। {list}। कौन सा चाहिए?'],
    hinglish: ['{count} mile. {list}. Kaunsa chahiye?'],
  },
  'shop.option': { en: ['{n}: {name}{unit}, {price}'], hi: ['{n}: {name}{unit}, {price}'], hinglish: ['{n}: {name}{unit}, {price}'] },
  'shop.notFound': {
    en: ['I couldn’t find “{query}”. Try another name?'],
    hi: ['“{query}” नहीं मिला। कोई दूसरा नाम बोलें?'],
    hinglish: ['“{query}” nahi mila. Koi aur naam bolo?'],
  },
  'shop.added': {
    en: ['Added {qty} × {name}. Cart total {total}. Anything else?', 'Done, {qty} × {name} is in your cart. Total {total}. What next?'],
    hi: ['{qty} × {name} डाल दिया। कुल {total}। और कुछ?'],
    hinglish: ['{qty} × {name} daal diya. Total {total}. Aur kuch?'],
  },
  'shop.addedMany': {
    en: ['Added {list}. Cart total {total}. Anything else?'],
    hi: ['{list} डाल दिया। कुल {total}। और कुछ?'],
    hinglish: ['{list} daal diya. Total {total}. Aur kuch?'],
  },
  'shop.qty': {
    en: ['{name} is now {qty}. Total {total}.'],
    hi: ['{name} अब {qty} है। कुल {total}।'],
    hinglish: ['{name} ab {qty} hai. Total {total}.'],
  },
  'shop.removed': { en: ['Removed {name}. Total {total}.'], hi: ['{name} हटा दिया। कुल {total}।'], hinglish: ['{name} hata diya. Total {total}.'] },
  'shop.notInCart': { en: ['“{query}” isn’t in your cart.'], hi: ['“{query}” कार्ट में नहीं है।'], hinglish: ['“{query}” cart mein nahi hai.'] },
  'shop.cart': { en: ['Your cart: {list}. Total {total}.'], hi: ['आपके कार्ट में: {list}। कुल {total}।'], hinglish: ['Aapke cart mein: {list}. Total {total}.'] },
  'shop.cartEmpty': { en: ['Your cart is empty. What would you like?'], hi: ['कार्ट खाली है। क्या चाहिए?'], hinglish: ['Cart khaali hai. Kya chahiye?'] },
  'shop.total': { en: ['Your total is {total} for {count} items.'], hi: ['{count} सामान, कुल {total}।'], hinglish: ['{count} items, total {total}.'] },
  'shop.pickFirst': {
    en: ['Tell me what to look for first, like “give me onions”.'],
    hi: ['पहले बताइए क्या ढूँढूँ, जैसे “प्याज़ दिखाओ”।'],
    hinglish: ['Pehle batao kya dhoondhun, jaise “pyaaz dikhao”.'],
  },
  'shop.noSuchOption': { en: ['There are only {count} options.'], hi: ['सिर्फ़ {count} विकल्प हैं।'], hinglish: ['Sirf {count} options hain.'] },
  'shop.outOfStock': {
    en: ['{name} is out of stock. {alt} is {price}. Shall I add that?'],
    hi: ['{name} अभी नहीं है। {alt} {price} में है। वह डाल दूँ?'],
    hinglish: ['{name} abhi stock mein nahi hai. {alt} {price} ka hai. Woh daal doon?'],
  },
  'shop.confirm': {
    en: ['{count} items, total {total}. Tap “Confirm order” to place it.'],
    hi: ['{count} सामान, कुल {total}। ऑर्डर के लिए “Confirm order” दबाएँ।'],
    hinglish: ['{count} items, total {total}. Order ke liye “Confirm order” dabao.'],
  },
  'shop.tapToConfirm': {
    en: ['For safety I don’t place orders by voice alone. Please tap “Confirm order”.'],
    hi: ['सुरक्षा के लिए मैं सिर्फ़ आवाज़ से ऑर्डर नहीं करता। कृपया “Confirm order” दबाएँ।'],
    hinglish: ['Safety ke liye main sirf awaaz se order nahi karta. Please “Confirm order” dabao.'],
  },
  'shop.ordered': { en: ['Order placed! 🎉'], hi: ['ऑर्डर हो गया! 🎉'], hinglish: ['Order ho gaya! 🎉'] },
  'shop.cancelled': { en: ['Okay, not now.'], hi: ['ठीक है, अभी नहीं।'], hinglish: ['Theek hai, abhi nahi.'] },
  'shop.bye': { en: ['Happy shopping!'], hi: ['खुश रहिए, फिर मिलेंगे!'], hinglish: ['Happy shopping! Phir milte hain.'] },
  'shop.failed': { en: ['That didn’t work. Please try again.'], hi: ['यह नहीं हुआ। फिर से कोशिश करें।'], hinglish: ['Yeh nahi hua. Phir try karo.'] },
};
