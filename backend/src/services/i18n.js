const dictionary = {
  en: {
    language_changed: 'Language updated to English.',
    language_prompt: 'Choose your language.',
    language_usage: 'Use /language en, /language sw, or /language am.',
    start_pending: 'Your seller approval request is currently under review.',
    start_rejected: 'Your last seller approval request was rejected.{reason}',
    start_request: 'Request seller approval to start posting auctions.',
    start_not_approved:
      'Welcome to the Auction Bot, {name}.\n\n{approvalCopy}\n\nYou can still follow auctions, use /search to find listings, and use /watchlist once you start tracking items.',
    start_approved:
      'Welcome to the Auction Bot, {name}.\n\nUse /post to submit a new auction for admin review.\nUse /search to find live listings and /watchlist to track items you care about.',
    search_usage: 'Use /search followed by a keyword, category, or tag. Example: /search phone',
    search_empty: 'No active auctions matched "{term}".',
    watchlist_empty: 'Your watchlist is empty. Tap "Watch Auction" on a listing to start following it.',
    watchlist_title: '*Your Watchlist*',
    search_results: '*Search Results*',
    bid_prompt:
      '*Bidding on:* {item}\n\nCurrent Position: {amount} ETB\n{hint}\n\nSend your bid as `amount` or `amount/max` to enable auto-bidding when supported.\nExample: `1800/2400`',
    bid_prompt_sealed:
      '*Sealed Bid:* {item}\n\nStarting Price: {amount} ETB\nYour bid stays hidden until the auction closes.\n\nSend your sealed bid as `amount`.',
    bid_received_sealed:
      'Sealed bid received at {amount} ETB.\nYour bid remains hidden until the auction ends.{extended}',
    bid_prompt_reverse:
      '*Reverse Auction:* {item}\n\nCurrent Lowest Bid: {amount} ETB\nBid at least {step} ETB lower to take the lead.\n\nSend your bid as `amount`.',
    dutch_prompt:
      '*Dutch Auction:* {item}\n\nCurrent Price: {amount} ETB\nTap below to accept the current price before it drops again.',
    bid_invalid: 'Please enter a valid bid like 1800 or 1800/2400.',
    bid_received: 'Bid received at {amount} ETB.\nCurrent standing price: {current} ETB.{extended}',
    bid_received_auto:
      'Bid received at {amount} ETB with auto-bidding up to {max} ETB.\nCurrent standing price: {current} ETB.{extended}',
    bid_extended: '\nAuction time was extended by 5 minutes because of a last-minute bid.',
    watch_added: 'Watching {item}.',
    watch_removed: 'Removed {item} from watchlist.',
    media_prompt:
      'Almost done. Send one or more *photos or videos* of the item. Type `done` when finished or `skip` to continue without media.',
    media_added:
      'Media added. Send another file, type `done`, or type `skip` if you want to finish with what you have.',
    media_invalid: 'Please send a photo, a video, `done`, or `skip`.',
    post_type_prompt: 'Choose the auction type: standard, dutch, sealed_bid, or reverse.',
    post_type_invalid: 'Please choose one of: standard, dutch, sealed_bid, reverse.',
    post_dutch_floor: 'Enter the Dutch auction floor price (the lowest allowed price):',
    post_dutch_drop: 'Enter how much the Dutch auction price should drop each step:',
    post_dutch_interval: 'Enter the Dutch auction drop interval in minutes:',
    cancel_done: 'Current action cancelled. You can start again whenever you are ready.',
    cancel_no_state: 'Nothing is in progress right now.',
  },
  sw: {
    language_changed: 'Lugha imebadilishwa kuwa Kiswahili.',
    language_prompt: 'Chagua lugha yako.',
    language_usage: 'Tumia /language en, /language sw, au /language am.',
    start_pending: 'Ombi lako la kuidhinishwa kama muuzaji linachunguzwa.',
    start_rejected: 'Ombi lako la mwisho la muuzaji lilikataliwa.{reason}',
    start_request: 'Omba idhini ya muuzaji ili uanze kuchapisha minada.',
    start_not_approved:
      'Karibu kwenye Auction Bot, {name}.\n\n{approvalCopy}\n\nBado unaweza kufuatilia minada, kutumia /search kutafuta orodha, na /watchlist kufuatilia vitu unavyovipenda.',
    start_approved:
      'Karibu kwenye Auction Bot, {name}.\n\nTumia /post kutuma mnada mpya kwa ukaguzi wa msimamizi.\nTumia /search kutafuta minada hai na /watchlist kufuatilia vitu unavyovipenda.',
    search_usage: 'Tumia /search kisha neno kuu, kategoria, au tagi. Mfano: /search simu',
    search_empty: 'Hakuna minada hai iliyolingana na "{term}".',
    watchlist_empty: 'Watchlist yako iko tupu. Bofya "Watch Auction" kwenye orodha ili uanze kufuatilia.',
    watchlist_title: '*Watchlist Yako*',
    search_results: '*Matokeo ya Utafutaji*',
    bid_prompt:
      '*Unabid kwenye:* {item}\n\nBei ya sasa: {amount} ETB\n{hint}\n\nTuma zabuni yako kama `amount` au `amount/max` kuwezesha auto-bid inapowezekana.\nMfano: `1800/2400`',
    bid_prompt_sealed:
      '*Zabuni ya Siri:* {item}\n\nBei ya kuanzia: {amount} ETB\nZabuni yako itabaki siri hadi mnada uishe.\n\nTuma zabuni yako kama `amount`.',
    bid_received_sealed:
      'Zabuni ya siri imepokelewa kwa {amount} ETB.\nZabuni yako itabaki siri hadi mnada uishe.{extended}',
    bid_prompt_reverse:
      '*Mnada wa Reverse:* {item}\n\nBei ya chini ya sasa: {amount} ETB\nPunguza angalau {step} ETB ili kuongoza.\n\nTuma zabuni yako kama `amount`.',
    dutch_prompt:
      '*Mnada wa Dutch:* {item}\n\nBei ya sasa: {amount} ETB\nBofya hapa chini kukubali bei ya sasa kabla haijashuka tena.',
    bid_invalid: 'Tafadhali weka zabuni halali kama 1800 au 1800/2400.',
    bid_received: 'Zabuni imepokelewa kwa {amount} ETB.\nBei ya sasa ni {current} ETB.{extended}',
    bid_received_auto:
      'Zabuni imepokelewa kwa {amount} ETB na auto-bid hadi {max} ETB.\nBei ya sasa ni {current} ETB.{extended}',
    bid_extended: '\nMuda wa mnada umeongezwa kwa dakika 5 kwa sababu ya zabuni ya mwisho.',
    watch_added: 'Sasa unafuatilia {item}.',
    watch_removed: '{item} imeondolewa kwenye watchlist.',
    media_prompt:
      'Karibu kumaliza. Tuma *picha au video* moja au zaidi ya bidhaa. Andika `done` ukimaliza au `skip` kuendelea bila media.',
    media_added: 'Media imeongezwa. Tuma faili nyingine, andika `done`, au `skip` kumaliza.',
    media_invalid: 'Tafadhali tuma picha, video, `done`, au `skip`.',
    post_type_prompt: 'Chagua aina ya mnada: standard, dutch, sealed_bid, au reverse.',
    post_type_invalid: 'Tafadhali chagua mojawapo: standard, dutch, sealed_bid, reverse.',
    post_dutch_floor: 'Weka bei ya chini kabisa ya mnada wa Dutch:',
    post_dutch_drop: 'Weka kiasi kitakachopunguzwa kila hatua:',
    post_dutch_interval: 'Weka muda wa kupungua kwa dakika:',
    cancel_done: 'Kitendo cha sasa kimeghairiwa. Unaweza kuanza tena ukiwa tayari.',
    cancel_no_state: 'Hakuna kinachoendelea kwa sasa.',
  },
  am: {
    language_changed: 'ቋንቋው ወደ አማርኛ ተቀይሯል።',
    language_prompt: 'ቋንቋዎን ይምረጡ።',
    language_usage: 'ይህን ይጠቀሙ /language en, /language sw, ወይም /language am።',
    start_pending: 'የሻጭ ፈቃድ ጥያቄዎ በእይታ ላይ ነው።',
    start_rejected: 'ያለፈው የሻጭ ፈቃድ ጥያቄዎ ተቀባይነት አላገኘም።{reason}',
    start_request: 'ጨረታ ለመለጠፍ የሻጭ ፈቃድ ይጠይቁ።',
    start_not_approved:
      'ወደ Auction Bot እንኳን ደህና መጡ, {name}.\n\n{approvalCopy}\n\nእስከዚያ ድረስ ጨረታዎችን መከታተል፣ /search መጠቀም እና /watchlist መጠቀም ይችላሉ።',
    start_approved:
      'ወደ Auction Bot እንኳን ደህና መጡ, {name}.\n\nአዲስ ጨረታ ለአስተዳዳሪ ምርመራ /post በመጠቀም ያቅርቡ።\nሕያው ጨረታዎችን ለመፈለግ /search ይጠቀሙ።',
    search_usage: 'ከ /search በኋላ ቃል ወይም ምድብ ያስገቡ። ለምሳሌ /search phone',
    search_empty: '"{term}" የሚመሳሰል ሕያው ጨረታ አልተገኘም።',
    watchlist_empty: 'የእርስዎ watchlist ባዶ ነው። "Watch Auction" በመጫን መከታተል ይጀምሩ።',
    watchlist_title: '*የእርስዎ Watchlist*',
    search_results: '*የፍለጋ ውጤቶች*',
    bid_prompt:
      '*በዚህ ላይ ብድር:* {item}\n\nአሁን ያለው ዋጋ: {amount} ETB\n{hint}\n\nከሚደገፍበት ጊዜ auto-bid ለማብራት `amount` ወይም `amount/max` ይላኩ።\nለምሳሌ `1800/2400`',
    bid_prompt_sealed:
      '*ሚስጥራዊ ብድር:* {item}\n\nየመነሻ ዋጋ: {amount} ETB\nብድርዎ ጨረታው እስኪያበቃ ድረስ ሚስጥር ይሆናል።\n\n`amount` በማለት ይላኩ።',
    bid_prompt_reverse:
      '*Reverse ጨረታ:* {item}\n\nአሁን ያለው ዝቅተኛ ብድር: {amount} ETB\nለመሪ ለመሆን ቢያንስ {step} ETB ያነሱ።\n\n`amount` በማለት ይላኩ።',
    dutch_prompt: '*Dutch ጨረታ:* {item}\n\nአሁን ያለው ዋጋ: {amount} ETB\nዋጋው እንደገና ከመቀነሱ በፊት በታች ያለውን አዝራር ይጫኑ።',
    bid_invalid: 'እባክዎ እንደ 1800 ወይም 1800/2400 ያለ ትክክለኛ ብድር ያስገቡ።',
    bid_received: 'ብድርዎ {amount} ETB ተቀብሏል።\nአሁን ያለው ዋጋ {current} ETB ነው።{extended}',
    bid_received_auto: 'ብድርዎ {amount} ETB እስከ {max} ETB auto-bid ጋር ተቀብሏል።\nአሁን ያለው ዋጋ {current} ETB ነው።{extended}',
    bid_extended: '\nበመጨረሻ ጊዜ ብድር ስለተገባ የጨረታው ጊዜ በ5 ደቂቃ ተራዘመ።',
    watch_added: '{item} እየተከታተሉት ነው።',
    watch_removed: '{item} ከ watchlist ተወግዷል።',
    media_prompt: 'ማጠናቀቅ አቅርበዋል። ከእቃው *ፎቶ ወይም ቪዲዮ* አንድ ወይም ከዚያ በላይ ይላኩ። ሲጨርሱ `done` ይበሉ ወይም ያለ media `skip` ይበሉ።',
    media_added: 'Media ታክሏል። ሌላ ፋይል ይላኩ፣ `done` ይበሉ ወይም `skip` ይበሉ።',
    media_invalid: 'እባክዎ ፎቶ፣ ቪዲዮ፣ `done` ወይም `skip` ይላኩ።',
    post_type_prompt: 'የጨረታ አይነቱን ይምረጡ: standard, dutch, sealed_bid, ወይም reverse።',
    post_type_invalid: 'እባክዎ standard, dutch, sealed_bid, reverse መካከል ይምረጡ።',
    post_dutch_floor: 'የDutch ጨረታ ዝቅተኛ ዋጋ ያስገቡ:',
    post_dutch_drop: 'በእያንዳንዱ ደረጃ ምን ያህል እንዲቀንስ ያስገቡ:',
    post_dutch_interval: 'የመቀነሻ ጊዜውን በደቂቃ ያስገቡ:',
  },
};

const interpolate = (template, values = {}) =>
  Object.entries(values).reduce((message, [key, value]) => message.replaceAll(`{${key}}`, value ?? ''), template);

export const normalizeLanguage = (value) => (dictionary[value] ? value : 'en');

export const t = (language, key, values = {}) => {
  const locale = normalizeLanguage(language);
  const template = dictionary[locale][key] || dictionary.en[key] || key;
  return interpolate(template, values);
};

export const languageKeyboard = {
  inline_keyboard: [
    [
      { text: 'English', callback_data: 'lang_en' },
      { text: 'Kiswahili', callback_data: 'lang_sw' },
      { text: 'አማርኛ', callback_data: 'lang_am' },
    ],
  ],
};
