import type { LineBank } from '../brain/lines';

export const NAV_LINES: LineBank = {
  'nav.going': {
    en: ['Taking you to {place}!', 'On my way to {place}!'],
    hi: ['{place} पर ले चलता हूँ!'],
    hinglish: ['{place} pe le chalta hoon!'],
    ta: ['{place}க்கு அழைத்துச் செல்கிறேன்!'],
    te: ['{place}కి తీసుకెళ్తున్నాను!'],
    bn: ['{place}-এ নিয়ে যাচ্ছি!'],
    mr: ['{place} वर नेतो!'],
    gu: ['{place} પર લઈ જાઉં છું!'],
    kn: ['{place}ಗೆ ಕರೆದೊಯ್ಯುತ್ತಿದ್ದೇನೆ!'],
    ml: ['{place}ലേക്ക് കൊണ്ടുപോകുന്നു!'],
    pa: ['{place} ਤੇ ਲੈ ਚੱਲਦਾ ਹਾਂ!'],
  },
  'nav.section': {
    en: ['Here’s {place}.'],
    hi: ['यह रहा {place}।'],
    hinglish: ['Yeh raha {place}.'],
  },
  'nav.back': {
    en: ['Going back.'],
    hi: ['पीछे चलते हैं।'],
    hinglish: ['Peeche chalte hain.'],
    ta: ['பின்னால் போகிறேன்.'],
    te: ['వెనక్కి వెళ్తున్నాను.'],
    bn: ['ফিরে যাচ্ছি।'],
    mr: ['मागे जातो.'],
    gu: ['પાછા જઈએ છીએ.'],
    kn: ['ಹಿಂದೆ ಹೋಗುತ್ತಿದ್ದೇನೆ.'],
    ml: ['പിന്നോട്ട് പോകുന്നു.'],
    pa: ['ਪਿੱਛੇ ਜਾ ਰਹੇ ਹਾਂ।'],
  },
  'nav.notFound': {
    en: ['I couldn’t find a page called “{place}”. Here are the main ones:'],
    hi: ['“{place}” नाम का पेज नहीं मिला। ये मुख्य पेज हैं:'],
    hinglish: ['“{place}” naam ka page nahi mila. Yeh main pages hain:'],
  },
};
